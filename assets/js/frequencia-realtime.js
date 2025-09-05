/**
 * Módulo de integração realtime para Controle de Frequência
 * Sincroniza com mudanças em alunos via Supabase
 */

console.log('🔥 FREQUENCIA-REALTIME.JS v2.1 CARREGADO!', new Date().toLocaleTimeString());

import { supabase } from './supabase-client.js';
import alunosAPI from './data/alunos.js';

// Estado
let realtimeSubscription = null;
let frequenciaCache = [];
let alunosCache = [];

// Inicialização
export async function initFrequenciaRealtime() {
    console.log('🔄 Iniciando integração realtime para frequência');
    
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
        
        // Carregar frequência usando view com LEFT JOIN (inclui alunos sem registros)
        const { data: frequencia, error: errorFreq } = await supabase
            .from('v_frequencia_acumulado_aluno_full')
            .select('*')
            .order('nome_completo');
            
        if (errorFreq) throw errorFreq;
        
        frequenciaCache = frequencia || [];
        
        console.log(`✅ Dados carregados: ${alunosCache.length} alunos, ${frequenciaCache.length} registros de frequência`);
        
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
            
            // Adicionar na lista de frequência com valores zerados
            frequenciaCache.push({
                codigo_aluno: novoAluno.codigo,
                nome_completo: novoAluno["Nome completo"],
                turma: novoAluno.turma,
                total_registros: 0,
                presencas_puras: 0,
                atestados: 0,
                faltas: 0,
                presencas_operacionais: 0,
                pct_presenca_operacional: 0
            });
            
            // Atualizar UI
            addAlunoToSelects(novoAluno);
            updateFrequenciaTable();
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
            
            // Atualizar na cache de frequência
            const freqIndex = frequenciaCache.findIndex(f => f.codigo_aluno === payload.new.codigo);
            if (freqIndex >= 0) {
                frequenciaCache[freqIndex].nome_completo = payload.new["Nome completo"];
                frequenciaCache[freqIndex].turma = payload.new.turma;
            }
            
            // Atualizar UI
            updateAlunoInUI(payload.new);
            updateFrequenciaTable();
            
        } else if (payload.eventType === 'DELETE') {
            // Aluno excluído - frequência será removida por CASCADE
            const codigo = payload.old.codigo;
            alunosCache = alunosCache.filter(a => a.codigo !== codigo);
            frequenciaCache = frequenciaCache.filter(f => f.codigo_aluno !== codigo);
            
            // Remover da UI
            removeAlunoFromUI(codigo);
            updateFrequenciaTable();
            showNotification(`Aluno removido (frequência excluída por cascata)`, 'warning');
        }
        
        // Atualizar estatísticas
        updateStatistics();
    });
    
    // Também monitorar mudanças em frequência
    const frequenciaChannel = supabase
        .channel('frequencia-changes')
        .on('postgres_changes', 
            { event: '*', schema: 'public', table: 'frequencia' },
            async (payload) => {
                console.log('📡 Mudança em frequência:', payload.eventType);
                await reloadFrequencia();
            }
        )
        .subscribe();
}

async function reloadFrequencia() {
    try {
        const { data, error } = await supabase
            .from('v_frequencia_acumulado_aluno_full')
            .select('*')
            .order('nome_completo');
            
        if (error) throw error;
        
        frequenciaCache = data || [];
        updateFrequenciaTable();
        updateStatistics();
        
    } catch (error) {
        console.error('Erro ao recarregar frequência:', error);
    }
}

function updateUI() {
    updateTableHeader();
    updateAlunosSelect();  // Este é o select principal de alunos
    updateFrequenciaTable();
    updateStatistics();
    updateTurmasFilter();
    
    // IMPORTANTE: Popular também outros selects de alunos na página
    populateAllAlunoSelects();
}

function updateTableHeader() {
    const thead = document.getElementById('tabela-head');
    if (thead) {
        thead.innerHTML = `
            <tr>
                <th>Código</th>
                <th>Nome</th>
                <th>Turma</th>
                <th>Total</th>
                <th>Presenças</th>
                <th>Atestados</th>
                <th>Faltas</th>
                <th>% Presença</th>
            </tr>
        `;
    }
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

function updateFrequenciaTable() {
    const tbody = document.getElementById('tabela-body');
    if (!tbody) return;
    
    // Filtrar por turma se houver filtro ativo
    const filtroTurma = document.getElementById('filtroTurma')?.value || 'todas';
    let dados = frequenciaCache;
    
    if (filtroTurma !== 'todas') {
        dados = frequenciaCache.filter(f => f.turma === filtroTurma);
    }
    
    if (dados.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 20px;">
                    Nenhum registro encontrado
                </td>
            </tr>
        `;
        return;
    }
    
    tbody.innerHTML = dados.map(freq => {
        const percentual = freq.pct_presenca_operacional || 0;
        const percentualClass = percentual >= 75 ? 'text-success' : 
                               percentual >= 50 ? 'text-warning' : 'text-danger';
        
        return `
            <tr>
                <td><strong>${freq.codigo_aluno || ''}</strong></td>
                <td>${freq.nome_completo || ''}</td>
                <td><span class="badge">${freq.turma || ''}</span></td>
                <td><strong>${freq.total_registros || 0}</strong></td>
                <td class="text-success"><strong>${freq.presencas_puras || 0}</strong></td>
                <td class="text-info"><strong>${freq.atestados || 0}</strong></td>
                <td class="text-danger"><strong>${freq.faltas || 0}</strong></td>
                <td class="${percentualClass}">
                    <strong>${percentual.toFixed(1)}%</strong>
                </td>
            </tr>
        `;
    }).join('');
}

function updateTurmasFilter() {
    const select = document.getElementById('filtroTurma');
    if (!select) return;
    
    const currentValue = select.value;
    
    // Obter turmas únicas
    const turmas = [...new Set(alunosCache.map(a => a.turma).filter(Boolean))].sort();
    
    // Reconstruir options
    select.innerHTML = '<option value="todas">Todas as turmas</option>';
    turmas.forEach(turma => {
        const option = document.createElement('option');
        option.value = turma;
        option.textContent = turma;
        
        // Contar alunos na turma
        const count = alunosCache.filter(a => a.turma === turma).length;
        option.textContent += ` (${count} alunos)`;
        
        select.appendChild(option);
    });
    
    // Restaurar seleção se ainda existir
    if (turmas.includes(currentValue)) {
        select.value = currentValue;
    }
}

function populateAllAlunoSelects() {
    // Procurar todos os selects que podem conter alunos
    const selectsIds = ['codigo_matricula', 'filtro-aluno', 'aluno-select'];
    
    selectsIds.forEach(id => {
        const select = document.getElementById(id);
        if (select && select !== document.getElementById('turmaLancamento')) { // Não mexer no de turmas
            // Populando select com alunos
            
            const currentValue = select.value;
            select.innerHTML = '<option value="">Selecione o aluno...</option>';
            
            // Adicionar apenas alunos ativos ordenados
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
    });
}

function updateStatistics() {
    // Calcular estatísticas gerais
    const totalAlunos = alunosCache.filter(a => a.status === 'ativo').length;
    const totalRegistros = frequenciaCache.reduce((sum, f) => sum + f.total_registros, 0);
    const totalFaltas = frequenciaCache.reduce((sum, f) => sum + f.faltas, 0);
    
    // Calcular média geral de presença
    const alunosComRegistros = frequenciaCache.filter(f => f.total_registros > 0);
    const mediaPresenca = alunosComRegistros.length > 0
        ? alunosComRegistros.reduce((sum, f) => sum + f.pct_presenca_operacional, 0) / alunosComRegistros.length
        : 0;
    
    // Alunos em risco (< 75% presença)
    const alunosRisco = frequenciaCache.filter(f => 
        f.total_registros > 0 && f.pct_presenca_operacional < 75).length;
    
    // Atualizar elementos
    const elTotalAlunos = document.getElementById('totalAlunosFreq');
    if (elTotalAlunos) elTotalAlunos.textContent = totalAlunos;
    
    const elTotalRegistros = document.getElementById('totalRegistrosFreq');
    if (elTotalRegistros) elTotalRegistros.textContent = totalRegistros;
    
    const elTotalFaltas = document.getElementById('totalFaltas');
    if (elTotalFaltas) elTotalFaltas.textContent = totalFaltas;
    
    const elMediaPresenca = document.getElementById('mediaPresenca');
    if (elMediaPresenca) {
        elMediaPresenca.textContent = `${mediaPresenca.toFixed(1)}%`;
        elMediaPresenca.className = mediaPresenca >= 75 ? 'text-success' : 
                                   mediaPresenca >= 50 ? 'text-warning' : 'text-danger';
    }
    
    const elAlunosRisco = document.getElementById('alunosRiscoFreq');
    if (elAlunosRisco) {
        elAlunosRisco.textContent = alunosRisco;
        if (alunosRisco > 0) {
            elAlunosRisco.classList.add('text-danger');
        }
    }
}

function addAlunoToSelects(aluno) {
    // Procurar TODOS os selects de alunos na página
    const selectsIds = ['codigo_matricula', 'filtro-aluno', 'aluno-select'];
    
    selectsIds.forEach(id => {
        const select = document.getElementById(id);
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
        
        // Aluno adicionado ao select
    });
}

function updateAlunoInUI(aluno) {
    const selectsIds = ['codigo_matricula', 'filtro-aluno', 'aluno-select'];
    
    selectsIds.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        
        const option = select.querySelector(`option[value="${aluno.codigo}"]`);
        if (option) {
            option.textContent = `${aluno.codigo} - ${aluno["Nome completo"]} (${aluno.turma})`;
        }
    });
}

function removeAlunoFromUI(codigo) {
    const selectsIds = ['codigo_matricula', 'filtro-aluno', 'aluno-select'];
    
    selectsIds.forEach(id => {
        const select = document.getElementById(id);
        if (!select) return;
        
        const option = select.querySelector(`option[value="${codigo}"]`);
        if (option) {
            option.remove();
        }
    });
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
export function cleanupFrequenciaRealtime() {
    if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
    }
}

// Funções globais para compatibilidade com HTML antigo
window.carregarAlunosLancamento = async function() {
    console.log('🔥 carregarAlunosLancamento() chamada!');
    
    const turmaSelect = document.getElementById('turmaLancamento');
    const turma = turmaSelect?.value;
    
    console.log('📋 Turma selecionada:', turma);
    console.log('📋 Element turmaLancamento:', turmaSelect);
    
    if (!turma) {
        console.log('⚠️ Nenhuma turma selecionada, ocultando lista');
        document.getElementById('containerListaAlunos').style.display = 'none';
        return;
    }
    
    try {
        console.log(`🔍 Buscando alunos da turma: ${turma}`);
        
        const { data, error } = await supabase
            .from('alunos')
            .select('codigo, "Nome completo", turma, status')
            .eq('turma', turma)
            .eq('status', 'ativo')
            .order('"Nome completo"');
        
        if (error) throw error;
        
        console.log(`✅ ${data.length} alunos encontrados na turma ${turma}:`, data);
        
        const container = document.getElementById('listaAlunosFrequencia');
        const titulo = document.getElementById('tituloTurmaData');
        
        if (titulo) titulo.textContent = turma;
        
        if (container) {
            if (data.length === 0) {
                container.innerHTML = '<p>Nenhum aluno encontrado nesta turma.</p>';
            } else {
                container.innerHTML = data.map(aluno => `
                    <div class="aluno-frequencia-item">
                        <div class="aluno-info">
                            <strong>${aluno.codigo} - ${aluno["Nome completo"]}</strong>
                            <span class="turma-badge">${aluno.turma}</span>
                        </div>
                        <div class="frequencia-botoes">
                            <button class="btn btn-success btn-small" onclick="marcarPresenca(${aluno.codigo})">
                                ✓ Presente
                            </button>
                            <button class="btn btn-warning btn-small" onclick="marcarAtestado(${aluno.codigo})">
                                A Atestado
                            </button>
                            <button class="btn btn-danger btn-small" onclick="marcarFalta(${aluno.codigo})">
                                ✗ Falta
                            </button>
                        </div>
                    </div>
                `).join('');
            }
        }
        
        document.getElementById('containerListaAlunos').style.display = 'block';
        
    } catch (error) {
        console.error('Erro ao carregar alunos:', error);
        showNotification('Erro ao carregar alunos da turma', 'error');
    }
};

// Funções para marcar frequência
window.marcarPresenca = async function(codigoAluno) {
    await marcarFrequencia(codigoAluno, 'P');
};

window.marcarAtestado = async function(codigoAluno) {
    await marcarFrequencia(codigoAluno, 'A');
};

window.marcarFalta = async function(codigoAluno) {
    await marcarFrequencia(codigoAluno, 'F');
};

async function marcarFrequencia(codigoAluno, status) {
    try {
        const aluno = alunosCache.find(a => a.codigo == codigoAluno);
        if (!aluno) {
            showNotification('Aluno não encontrado', 'error');
            return;
        }
        
        const hoje = new Date().toISOString().split('T')[0];
        
        const { error } = await supabase
            .from('frequencia')
            .upsert({
                codigo_matricula: codigoAluno.toString(),
                codigo_aluno: codigoAluno,
                nome_completo: aluno.nome,
                turma: aluno.turma,
                data: hoje,
                status: status
            }, {
                onConflict: 'codigo_aluno,data'
            });
        
        if (error) throw error;
        
        const statusText = status === 'P' ? 'Presente' : status === 'A' ? 'Atestado' : 'Falta';
        showNotification(`${aluno.nome}: ${statusText} registrado!`, 'success');
        
        // Recarregar dados
        await reloadFrequencia();
        
    } catch (error) {
        console.error('Erro ao marcar frequência:', error);
        showNotification('Erro ao registrar frequência', 'error');
    }
}

// Função para popular select de turmas
window.carregarTurmasLancamento = async function() {
    try {
        console.log('🔄 carregarTurmasLancamento() chamada - buscando turmas...');
        
        const { data, error } = await supabase
            .from('alunos')
            .select('turma')
            .not('turma', 'is', null)
            .neq('status', 'inativo');
        
        if (error) throw error;
        
        const turmas = [...new Set(data.map(item => item.turma))].filter(t => t).sort();
        console.log(`✅ ${turmas.length} turmas encontradas:`, turmas);
        
        const select = document.getElementById('turmaLancamento');
        if (select) {
            console.log('📝 Populando select de turmas...');
            select.innerHTML = '<option value="">Selecione uma turma...</option>';
            turmas.forEach(turma => {
                const option = document.createElement('option');
                option.value = turma;
                option.textContent = turma;
                select.appendChild(option);
            });
            console.log('✅ Select de turmas populado com sucesso');
        } else {
            console.error('❌ Element turmaLancamento não encontrado!');
        }
    } catch (error) {
        console.error('❌ Erro ao carregar turmas:', error);
    }
};

// Função para definir data padrão
function setDefaultDate() {
    const dataInput = document.getElementById('dataLancamento');
    if (dataInput && !dataInput.value) {
        const hoje = new Date().toISOString().split('T')[0];
        dataInput.value = hoje;
    }
}

// Funções adicionais de compatibilidade para HTML
window.marcarTodosPresentes = async function() {
    const container = document.getElementById('listaAlunosFrequencia');
    if (!container) return;
    
    const botoes = container.querySelectorAll('button[onclick^="marcarPresenca"]');
    for (let botao of botoes) {
        const match = botao.onclick.toString().match(/marcarPresenca\((\d+)\)/);
        if (match) {
            await marcarFrequencia(parseInt(match[1]), 'P');
        }
    }
};

window.limparMarcacoes = function() {
    showNotification('Marcações limpas (função não implementada)', 'info');
};

window.voltarSelecaoTurma = function() {
    document.getElementById('containerListaAlunos').style.display = 'none';
    document.getElementById('turmaLancamento').value = '';
};

window.salvarFrequenciaDiaria = function() {
    showNotification('Frequências já estão sendo salvas automaticamente', 'success');
};

// Auto-inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        // Iniciando sistema de frequência
        await initFrequenciaRealtime();
        await carregarTurmasLancamento();
        setDefaultDate();
        // Sistema iniciado
    });
} else {
    // DOM pronto, iniciando sistema
    initFrequenciaRealtime().then(async () => {
        await carregarTurmasLancamento();
        setDefaultDate();
        // Sistema iniciado
    });
}

// Exportar para uso global
window.frequenciaRealtime = {
    init: initFrequenciaRealtime,
    cleanup: cleanupFrequenciaRealtime,
    reload: reloadFrequencia
};