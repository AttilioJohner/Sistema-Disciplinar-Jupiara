/**
 * Gestão de Alunos v2 - Sistema com Supabase Realtime
 * Usa módulo data/alunos.js para CRUD e sincronização em tempo real
 */

import { supabase } from './supabase-client.js';
import alunosAPI from './data/alunos.js';

// =====================
// ESTADO GLOBAL
// =====================
let alunosCache = [];
let editingId = null;
let realtimeSubscription = null;

// =====================
// ELEMENTOS DOM
// =====================
const els = {};

// =====================
// INICIALIZAÇÃO
// =====================
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Iniciando Gestão de Alunos v2');
    
    try {
        mapElements();
        bindEvents();
        await loadAlunos();
        setupRealtime();
        updateStatistics();
    } catch (error) {
        console.error('Erro na inicialização:', error);
        showToast('Erro ao inicializar sistema', 'error');
    }
});

function mapElements() {
    els.form = document.getElementById('alunoForm');
    els.tbody = document.getElementById('alunosTableBody');
    els.btnSalvar = document.getElementById('btnSalvar');
    els.btnCancelar = document.getElementById('btnCancelar');
    els.btnExcluir = document.getElementById('btnExcluir');
    els.busca = document.getElementById('busca');
    els.total = document.getElementById('totalAlunos');
    els.filtroTurma = document.getElementById('filtroTurma');
    
    // Elementos de estatísticas
    els.totalAlunosAtivos = document.getElementById('totalAlunosAtivos');
    els.totalTurmas = document.getElementById('totalTurmas');
    els.cadastrosHoje = document.getElementById('cadastrosHoje');
    els.dadosIncompletos = document.getElementById('dadosIncompletos');
}

function bindEvents() {
    // Formulário
    if (els.form) {
        els.form.addEventListener('submit', handleFormSubmit);
    }
    
    // Botões
    if (els.btnCancelar) {
        els.btnCancelar.addEventListener('click', resetForm);
    }
    
    if (els.btnExcluir) {
        els.btnExcluir.addEventListener('click', handleDelete);
    }
    
    // Busca com debounce
    let searchTimeout;
    if (els.busca) {
        els.busca.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(renderTable, 300);
        });
    }
    
    // Filtro de turma
    if (els.filtroTurma) {
        els.filtroTurma.addEventListener('change', renderTable);
    }
    
    // Delegação de eventos para tabela
    if (els.tbody) {
        els.tbody.addEventListener('click', handleTableClick);
    }
}

// =====================
// CRUD OPERATIONS
// =====================
async function loadAlunos() {
    try {
        console.log('📥 Carregando alunos...');
        const { data, error } = await alunosAPI.getAlunos();
        
        if (error) throw error;
        
        alunosCache = data.map(aluno => ({
            id: aluno.codigo,
            codigo: aluno.codigo,
            nome: aluno["Nome completo"] || '',
            turma: aluno.turma || '',
            status: aluno.status || 'ativo',
            responsavel: aluno.responsavel || '',
            telefone1: aluno.telefone || aluno.telefone_responsavel || '',
            telefone2: aluno.telefone2 || '',
            ...aluno
        }));
        
        console.log(`✅ ${alunosCache.length} alunos carregados`);
        updateTurmasFilter();
        renderTable();
        updateStatistics();
        
    } catch (error) {
        console.error('Erro ao carregar alunos:', error);
        showToast('Erro ao carregar alunos', 'error');
    }
}

async function handleFormSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(els.form);
    const data = Object.fromEntries(formData.entries());
    
    // Limpar e validar dados
    const codigo = data.id?.trim();
    const nome = data.nome?.trim();
    const turma = data.turma?.trim();
    const status = data.status || 'ativo';
    const responsavel = data.responsavel?.trim();
    const telefone1 = data.telefone1?.trim();
    const telefone2 = data.telefone2?.trim();
    
    // Validação
    if (!codigo || !nome || !turma) {
        showToast('Preencha todos os campos obrigatórios', 'error');
        return;
    }
    
    // Verificar se código tem 7 dígitos
    if (!/^\d{7}$/.test(codigo)) {
        showToast('Matrícula deve ter exatamente 7 dígitos', 'error');
        return;
    }
    
    try {
        if (editingId) {
            // Atualizar aluno
            const { error } = await alunosAPI.updateAluno(editingId, {
                nome_completo: nome,
                turma,
                status,
                responsavel,
                telefone: telefone1,
                telefone2
            });
            
            if (error) throw error;
            showToast('Aluno atualizado com sucesso!', 'success');
        } else {
            // Criar novo aluno
            const { error } = await alunosAPI.createAluno({
                codigo: parseInt(codigo),
                nome_completo: nome,
                turma,
                status,
                responsavel,
                telefone: telefone1,
                telefone2
            });
            
            if (error) {
                if (error.message?.includes('duplicate')) {
                    throw new Error('Já existe um aluno com esta matrícula');
                }
                throw error;
            }
            showToast('Aluno cadastrado com sucesso!', 'success');
        }
        
        resetForm();
        await loadAlunos();
        
    } catch (error) {
        console.error('Erro ao salvar aluno:', error);
        showToast(error.message || 'Erro ao salvar aluno', 'error');
    }
}

async function handleEdit(codigo) {
    try {
        const aluno = alunosCache.find(a => a.codigo == codigo);
        if (!aluno) {
            showToast('Aluno não encontrado', 'error');
            return;
        }
        
        // Preencher formulário
        els.form.querySelector('[name="id"]').value = aluno.codigo;
        els.form.querySelector('[name="nome"]').value = aluno.nome || aluno["Nome completo"];
        els.form.querySelector('[name="turma"]').value = aluno.turma;
        els.form.querySelector('[name="status"]').value = aluno.status || 'ativo';
        els.form.querySelector('[name="responsavel"]').value = aluno.responsavel || '';
        els.form.querySelector('[name="telefone1"]').value = aluno.telefone1 || aluno.telefone || '';
        els.form.querySelector('[name="telefone2"]').value = aluno.telefone2 || '';
        
        // Modo edição
        editingId = codigo;
        els.form.querySelector('[name="id"]').disabled = true;
        els.btnSalvar.textContent = '✅ Atualizar';
        els.btnExcluir.style.display = 'inline-block';
        
        // Scroll para o formulário
        els.form.scrollIntoView({ behavior: 'smooth', block: 'start' });
        
    } catch (error) {
        console.error('Erro ao editar aluno:', error);
        showToast('Erro ao carregar aluno para edição', 'error');
    }
}

async function handleDelete() {
    if (!editingId) return;
    
    // Verificar se aluno tem registros relacionados
    const { hasMedidas, hasFrequencia } = await alunosAPI.checkAlunoRelations(editingId);
    
    let mensagem = `Confirma a exclusão do aluno?`;
    if (hasMedidas || hasFrequencia) {
        mensagem = `⚠️ ATENÇÃO: Este aluno possui:\n`;
        if (hasMedidas) mensagem += `- Medidas disciplinares\n`;
        if (hasFrequencia) mensagem += `- Registros de frequência\n`;
        mensagem += `\nTODOS os registros serão excluídos permanentemente.\nDeseja continuar?`;
    }
    
    if (!confirm(mensagem)) return;
    
    try {
        const { error } = await alunosAPI.deleteAluno(editingId);
        if (error) throw error;
        
        showToast('Aluno excluído com sucesso', 'success');
        resetForm();
        await loadAlunos();
        
    } catch (error) {
        console.error('Erro ao excluir aluno:', error);
        showToast('Erro ao excluir aluno', 'error');
    }
}

function handleTableClick(event) {
    const btn = event.target.closest('[data-action]');
    if (!btn) return;

    const action = btn.dataset.action;
    const codigo = btn.dataset.codigo;

    if (action === 'edit') {
        handleEdit(codigo);
    } else if (action === 'delete') {
        editingId = codigo;
        handleDelete();
    } else if (action === 'photo') {
        handleShowPhoto(codigo);
    }
}

async function handleShowPhoto(codigo) {
    try {
        const aluno = alunosCache.find(a => a.codigo == codigo);
        if (!aluno) {
            showToast('Aluno não encontrado', 'error');
            return;
        }

        // Buscar foto do aluno
        if (aluno.foto_url) {
            // Se há foto, mostrar em modal
            const modal = document.createElement('div');
            modal.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                background: rgba(0,0,0,0.8); display: flex; align-items: center;
                justify-content: center; z-index: 10000;
            `;
            modal.innerHTML = `
                <div style="background: white; padding: 20px; border-radius: 8px; max-width: 400px; text-align: center;">
                    <h3>${aluno.nome}</h3>
                    <img src="${aluno.foto_url}" style="max-width: 100%; max-height: 400px; border-radius: 8px; border: 2px solid #ddd;">
                    <br><br>
                    <button onclick="this.closest('[style*=\"fixed\"]').remove()" class="btn btn-primary">Fechar</button>
                </div>
            `;
            document.body.appendChild(modal);
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
        } else {
            showToast('Este aluno não possui foto cadastrada', 'info');
        }

    } catch (error) {
        console.error('Erro ao mostrar foto:', error);
        showToast('Erro ao carregar foto', 'error');
    }
}

// =====================
// REALTIME SYNC
// =====================
function setupRealtime() {
    console.log('🔄 Configurando sincronização em tempo real...');
    
    // Inscrever-se para mudanças na tabela alunos
    realtimeSubscription = alunosAPI.subscribeAlunosChanges(async (payload) => {
        console.log('📡 Mudança detectada:', payload.eventType);
        
        // Recarregar dados quando houver mudança
        await loadAlunos();
        
        // Notificar outras abas/janelas
        if (payload.eventType === 'INSERT') {
            console.log('Novo aluno adicionado');
        } else if (payload.eventType === 'UPDATE') {
            console.log('Aluno atualizado');
        } else if (payload.eventType === 'DELETE') {
            console.log('Aluno excluído');
        }
    });
}

// =====================
// UI RENDERING
// =====================
function renderTable() {
    if (!els.tbody) return;
    
    const searchTerm = els.busca?.value?.toLowerCase() || '';
    const turmaFilter = els.filtroTurma?.value || 'todos';
    
    // Filtrar alunos
    let filtered = alunosCache.filter(aluno => {
        // Filtro de busca
        if (searchTerm) {
            const searchFields = [
                aluno.codigo?.toString(),
                aluno.nome,
                aluno.turma,
                aluno.responsavel,
                aluno.telefone1,
                aluno.telefone2
            ].filter(Boolean).join(' ').toLowerCase();
            
            if (!searchFields.includes(searchTerm)) return false;
        }
        
        // Filtro de turma
        if (turmaFilter !== 'todos' && aluno.turma !== turmaFilter) {
            return false;
        }
        
        return true;
    });
    
    // Ordenar por nome
    filtered.sort((a, b) => (a.nome || '').localeCompare(b.nome || ''));
    
    // Renderizar tabela
    if (filtered.length === 0) {
        els.tbody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 20px; color: #666;">
                    Nenhum aluno encontrado
                </td>
            </tr>
        `;
    } else {
        els.tbody.innerHTML = filtered.map(aluno => {
            const statusClass = aluno.status === 'ativo' ? 'text-success' : 'text-muted';
            const statusIcon = aluno.status === 'ativo' ? '✓' : '✗';

            return `
                <tr data-codigo="${aluno.codigo}">
                    <td>${aluno.codigo || ''}</td>
                    <td>${aluno.nome || ''}</td>
                    <td>${aluno.turma || ''}</td>
                    <td class="${statusClass}">${statusIcon} ${aluno.status || 'ativo'}</td>
                    <td>${aluno.responsavel || ''}</td>
                    <td>${aluno.telefone1 || ''}</td>
                    <td>${aluno.telefone2 || ''}</td>
                    <td style="text-align: center;">
                        <button class="btn btn-small btn-info" style="background: #6f42c1; color: white; border: 1px solid #5e35a8;" data-action="photo" data-codigo="${aluno.codigo}">
                            📷 Foto
                        </button>
                    </td>
                    <td style="white-space: nowrap">
                        <button class="btn btn-small btn-primary" style="background: #6f42c1; color: white; border: 1px solid #5e35a8;" data-action="edit" data-codigo="${aluno.codigo}">
                            ✏️ Editar
                        </button>
                        <button class="btn btn-small btn-danger" style="background: #dc3545; color: white; border: 1px solid #c82333;" data-action="delete" data-codigo="${aluno.codigo}">
                            🗑️ Excluir
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
    
    // Atualizar contador
    if (els.total) {
        els.total.textContent = filtered.length;
    }
}

function updateTurmasFilter() {
    if (!els.filtroTurma) return;
    
    const currentValue = els.filtroTurma.value;
    
    // Obter turmas únicas
    const turmas = [...new Set(alunosCache.map(a => a.turma).filter(Boolean))].sort();
    
    // Reconstruir options
    els.filtroTurma.innerHTML = '<option value="todos">Todas as turmas</option>';
    turmas.forEach(turma => {
        const option = document.createElement('option');
        option.value = turma;
        option.textContent = turma;
        els.filtroTurma.appendChild(option);
    });
    
    // Restaurar seleção se ainda existir
    if (turmas.includes(currentValue)) {
        els.filtroTurma.value = currentValue;
    }
}

function updateStatistics() {
    // Filtrar apenas alunos ativos
    const alunosAtivos = alunosCache.filter(a => a.status === 'ativo');
    
    // Total de alunos ativos
    if (els.totalAlunosAtivos) {
        els.totalAlunosAtivos.textContent = alunosAtivos.length;
    }
    
    // Total de turmas únicas
    const turmasUnicas = [...new Set(alunosAtivos.map(a => a.turma).filter(Boolean))];
    if (els.totalTurmas) {
        els.totalTurmas.textContent = turmasUnicas.length;
    }
    
    // Cadastros hoje
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    
    const cadastrosHoje = alunosAtivos.filter(aluno => {
        if (!aluno.created_at) return false;
        const dataAluno = new Date(aluno.created_at);
        dataAluno.setHours(0, 0, 0, 0);
        return dataAluno.getTime() === hoje.getTime();
    }).length;
    
    if (els.cadastrosHoje) {
        els.cadastrosHoje.textContent = cadastrosHoje;
    }
    
    // Dados incompletos
    const dadosIncompletos = alunosAtivos.filter(aluno => {
        return !aluno.responsavel || (!aluno.telefone1 && !aluno.telefone);
    }).length;
    
    if (els.dadosIncompletos) {
        els.dadosIncompletos.textContent = dadosIncompletos;
    }
}

function resetForm() {
    if (els.form) {
        els.form.reset();
    }
    
    editingId = null;
    
    // Modo criação
    const idInput = els.form?.querySelector('[name="id"]');
    if (idInput) {
        idInput.disabled = false;
    }
    
    if (els.btnSalvar) {
        els.btnSalvar.textContent = '✅ Salvar';
    }
    
    if (els.btnExcluir) {
        els.btnExcluir.style.display = 'none';
    }
}

// =====================
// UTILITIES
// =====================
function showToast(message, type = 'info') {
    const toast = document.getElementById('toast');
    if (!toast) {
        console.log(`[${type.toUpperCase()}]`, message);
        return;
    }
    
    toast.textContent = message;
    toast.className = `toast toast-${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3500);
}

// =====================
// CLEANUP
// =====================
window.addEventListener('beforeunload', () => {
    if (realtimeSubscription) {
        realtimeSubscription.unsubscribe();
    }
});

// =====================
// EXPORTS GLOBAIS
// =====================
window.filtrarAlunosPorTurma = renderTable;
window.gestaoAlunosV2 = {
    loadAlunos,
    renderTable,
    updateStatistics,
    resetForm
};