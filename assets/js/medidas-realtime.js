/**
 * Módulo de integração realtime para Medidas Disciplinares
 * Sincroniza com mudanças em alunos via Supabase
 */

import { supabase } from './supabase-client.js';
import alunosAPI from './data/alunos.js';

// Estado
let realtimeSubscription = null;
let medidasCache = [];
let alunosCache = [];

// Inicialização
export async function initMedidasRealtime() {
    console.log('🔄 Iniciando integração realtime para medidas');
    
    // Carregar dados iniciais
    await loadInitialData();
    
    // Configurar realtime
    setupRealtime();
    
    // Atualizar UI
    updateUI();
}

async function loadInitialData() {
    try {
        // Carregar alunos
        const { data: alunos, error: errorAlunos } = await alunosAPI.getAlunos();
        if (errorAlunos) throw errorAlunos;
        
        alunosCache = alunos.map(a => ({
            codigo: a.codigo,
            nome: a["Nome completo"],
            turma: a.turma,
            status: a.status || 'ativo'
        }));
        
        // Carregar medidas usando view normalizada
        const { data: medidas, error: errorMedidas } = await supabase
            .from('v_nota_disciplinar_atual')
            .select('*')
            .order('nome_completo');
            
        if (errorMedidas) throw errorMedidas;
        
        medidasCache = medidas || [];
        
        console.log(`✅ Dados carregados: ${alunosCache.length} alunos, ${medidasCache.length} registros de medidas`);
        
    } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
        showNotification('Erro ao carregar dados', 'error');
    }
}

function setupRealtime() {
    // Inscrever-se para mudanças em alunos
    realtimeSubscription = alunosAPI.subscribeAlunosChanges(async (payload) => {
        console.log('📡 Mudança em alunos detectada:', payload.eventType);
        
        if (payload.eventType === 'INSERT') {
            // Novo aluno adicionado
            const novoAluno = payload.new;
            alunosCache.push({
                codigo: novoAluno.codigo,
                nome: novoAluno["Nome completo"],
                turma: novoAluno.turma,
                status: novoAluno.status || 'ativo'
            });
            
            // Adicionar na UI
            addAlunoToSelects(novoAluno);
            showNotification(`Novo aluno: ${novoAluno["Nome completo"]}`, 'info');
            
        } else if (payload.eventType === 'UPDATE') {
            // Aluno atualizado
            const index = alunosCache.findIndex(a => a.codigo === payload.new.codigo);
            if (index >= 0) {
                alunosCache[index] = {
                    codigo: payload.new.codigo,
                    nome: payload.new["Nome completo"],
                    turma: payload.new.turma,
                    status: payload.new.status || 'ativo'
                };
            }
            
            // Atualizar UI
            updateAlunoInUI(payload.new);
            
        } else if (payload.eventType === 'DELETE') {
            // Aluno excluído - medidas serão removidas por CASCADE
            const codigo = payload.old.codigo;
            alunosCache = alunosCache.filter(a => a.codigo !== codigo);
            
            // Remover da UI
            removeAlunoFromUI(codigo);
            showNotification(`Aluno removido (medidas excluídas por cascata)`, 'warning');
        }
        
        // Recarregar dados de medidas
        await reloadMedidas();
    });
    
    // Também monitorar mudanças em medidas
    const medidasChannel = supabase
        .channel('medidas-changes')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'medidas' },
            async (payload) => {
                console.log('📡 Mudança em medidas:', payload.eventType);
                await reloadMedidas();
            }
        )
        .subscribe();
}

async function reloadMedidas() {
    try {
        const { data, error } = await supabase
            .from('v_nota_disciplinar_atual')
            .select('*')
            .order('nome_completo');
            
        if (error) throw error;
        
        medidasCache = data || [];
        updateMedidasTable();
        updateStatistics();
        
    } catch (error) {
        console.error('Erro ao recarregar medidas:', error);
    }
}

function updateUI() {
    updateAlunosSelect();
    updateMedidasTable();
    updateStatistics();
}

function updateAlunosSelect() {
    const select = document.getElementById('codigo_matricula');
    if (!select) return;
    
    // Limpar e reconstruir
    const currentValue = select.value;
    select.innerHTML = '<option value="">Selecione o aluno...</option>';
    
    // Adicionar apenas alunos ativos
    const alunosAtivos = alunosCache
        .filter(a => a.status === 'ativo')
        .sort((a, b) => a.nome.localeCompare(b.nome));
    
    alunosAtivos.forEach(aluno => {
        const option = document.createElement('option');
        option.value = aluno.codigo;
        option.textContent = `${aluno.codigo} - ${aluno.nome} (${aluno.turma})`;
        select.appendChild(option);
    });
    
    // Restaurar seleção se ainda existir
    if (alunosAtivos.some(a => a.codigo == currentValue)) {
        select.value = currentValue;
    }
}

function updateMedidasTable() {
    const tbody = document.getElementById('medidasTableBody');
    if (!tbody) return;
    
    if (medidasCache.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 20px;">
                    Nenhum registro de medida disciplinar
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = medidasCache.map(medida => {
        const notaClass = medida.nota_disciplinar >= 7 ? 'text-success' : 
                         medida.nota_disciplinar >= 5 ? 'text-warning' : 'text-danger';
        
        return `
            <tr>
                <td>${medida.codigo_aluno || ''}</td>
                <td>${medida.nome_completo || ''}</td>
                <td>${medida.turma || ''}</td>
                <td>${medida.advertencias || 0}</td>
                <td>${medida.suspensoes || 0}</td>
                <td>${medida.encaminhamentos || 0}</td>
                <td>${medida.total_agravantes || 0}</td>
                <td>${medida.total_atenuantes || 0}</td>
                <td class="${notaClass}">
                    <strong>${medida.nota_disciplinar.toFixed(1)}</strong>
                    <small class="text-muted">(${medida.classificacao})</small>
                </td>
            </tr>
        `;
    }).join('');
}

function updateStatistics() {
    // Calcular estatísticas
    const totalMedidas = medidasCache.reduce((sum, m) => 
        sum + m.advertencias + m.suspensoes + m.encaminhamentos, 0);
    
    const alunosComMedidas = medidasCache.filter(m => 
        m.advertencias > 0 || m.suspensoes > 0 || m.encaminhamentos > 0).length;
    
    const notaMedia = medidasCache.length > 0 
        ? medidasCache.reduce((sum, m) => sum + m.nota_disciplinar, 0) / medidasCache.length
        : 10;
    
    // Atualizar elementos
    const elTotalMedidas = document.getElementById('totalMedidas');
    if (elTotalMedidas) elTotalMedidas.textContent = totalMedidas;
    
    const elAlunosComMedidas = document.getElementById('alunosComMedidas');
    if (elAlunosComMedidas) elAlunosComMedidas.textContent = alunosComMedidas;
    
    const elNotaMedia = document.getElementById('notaMediaDisciplinar');
    if (elNotaMedia) elNotaMedia.textContent = notaMedia.toFixed(1);
}

function addAlunoToSelects(aluno) {
    const select = document.getElementById('codigo_matricula');
    if (!select) return;
    
    const option = document.createElement('option');
    option.value = aluno.codigo;
    option.textContent = `${aluno.codigo} - ${aluno["Nome completo"]} (${aluno.turma})`;
    
    // Inserir ordenadamente
    const options = Array.from(select.options);
    const insertIndex = options.findIndex(opt => 
        opt.textContent > option.textContent && opt.value !== '');
    
    if (insertIndex >= 0) {
        select.insertBefore(option, options[insertIndex]);
    } else {
        select.appendChild(option);
    }
}

function updateAlunoInUI(aluno) {
    const select = document.getElementById('codigo_matricula');
    if (!select) return;
    
    const option = select.querySelector(`option[value="${aluno.codigo}"]`);
    if (option) {
        option.textContent = `${aluno.codigo} - ${aluno["Nome completo"]} (${aluno.turma})`;
    }
}

function removeAlunoFromUI(codigo) {
    const select = document.getElementById('codigo_matricula');
    if (!select) return;
    
    const option = select.querySelector(`option[value="${codigo}"]`);
    if (option) {
        option.remove();
    }
}

function showNotification(message, type = 'info') {
    // Usar sistema de toast existente ou criar notificação simples
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.className = `toast toast-${type} show`;
        setTimeout(() => toast.classList.remove('show'), 3500);
    } else {
        console.log(`[${type.toUpperCase()}]`, message);
    }
}

// Cleanup
export function cleanupMedidasRealtime() {
    if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
    }
}

// Auto-inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMedidasRealtime);
} else {
    initMedidasRealtime();
}

// Exportar para uso global
window.medidasRealtime = {
    init: initMedidasRealtime,
    cleanup: cleanupMedidasRealtime,
    reload: reloadMedidas
};