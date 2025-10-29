// gestao.js — CRUD de Alunos com Sistema Local + Modo Debug

// ===== CONTROLE DE VERSÃO PARA EVITAR CACHE AGRESSIVO =====
const APP_VERSION = '20250924-002';

function checkAppVersion() {
  const lastVersion = localStorage.getItem('app_version');
  
  if (lastVersion && lastVersion !== APP_VERSION) {
    console.log('🔄 Nova versão detectada:', APP_VERSION, '(anterior:', lastVersion + ')');
    console.log('🧹 Limpando cache antigo e recarregando...');
    
    // Limpar dados antigos que podem causar conflito
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('supabase') || key.startsWith('alunos_') || key.startsWith('turma_'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    // Salvar nova versão
    localStorage.setItem('app_version', APP_VERSION);
    
    // Mostrar notificação ao usuário
    setTimeout(() => {
      // Usar toast se disponível, senão console.log
      if (typeof window.toast === 'function') {
        window.toast('🚀 Sistema atualizado para nova versão!', 'ok');
      } else {
        console.log('🚀 Sistema atualizado para nova versão!');
      }
    }, 1000);
    
    return true; // Versão foi atualizada
  } else {
    // Primeira vez ou mesma versão
    localStorage.setItem('app_version', APP_VERSION);
    return false;
  }
}

// Executar verificação de versão
const wasUpdated = checkAppVersion();
console.log('📋 Versão do app:', APP_VERSION, wasUpdated ? '(ATUALIZADO)' : '(atual)');

// ===== PROTEÇÃO TOTAL CONTRA RECARREGAMENTO =====
if (window.GESTAO_SCRIPT_LOADED) {
  console.log('🛑 GESTAO.JS JÁ CARREGADO - ABORTAR EXECUÇÃO');
  throw new Error('Script gestao.js já foi carregado');
}
window.GESTAO_SCRIPT_LOADED = true;
console.log('🔥 CARREGANDO gestao.js ÚNICA VEZ');

// Requisitos no HTML:
// - <form id="alunoForm"> com inputs name="id", "nome", "turma", "nascimento", "responsavel", "cpf", "telefone", "email"
// - <tbody id="alunosTableBody"></tbody>
// - Botões: #btnSalvar, #btnCancelar (opcional), e input de busca #busca (opcional)
// - Elementos auxiliares (opcional): #totalAlunos, #toast
// - local-db.js deve ter inicializado window.db e window.localDb

(function () {
  'use strict';

  // =====================
  // CONFIG & FLAGS
  // =====================
  const COLLECTION = 'alunos';
  const REQUIRED_FIELDS_CREATE = ['id', 'nome', 'turma'];
  const REQUIRED_FIELDS_UPDATE = ['nome', 'turma'];

  let DEBUG_VERBOSE = false; // ligue/desligue logs verbosos via debugGestao.setVerbose(true/false)

  // =====================
  // STATE
  // =====================
  let db = null;
  // Sistema local não usa listeners
  let alunosCache = []; // snapshot local para filtros
  let editingId = null; // null -> criação; string -> edição
  let editingRows = new Set(); // controle de linhas em modo edição

  // =====================
  // ELEMENTOS
  // =====================
  const els = {};
  
  // Controle RÍGIDO de inicialização para parar loops
  let isInitialized = false;
  let initCount = 0;

  // REMOVER LISTENERS EXISTENTES (se houver)
  if (window.gestaoInitialized) {
    console.log('🛑 GESTÃO JÁ FOI INICIALIZADO - ABORTANDO');
    return;
  }
  window.gestaoInitialized = true;

  document.addEventListener('DOMContentLoaded', async () => {
    initCount++;
    console.log(`🔄 DOMContentLoaded executado ${initCount}x`);

    // HARD STOP - Máximo 1 execução
    if (isInitialized || initCount > 1) {
      console.log('🛑 INICIALIZAÇÃO BLOQUEADA - evitando loop');
      return;
    }

    try {
      isInitialized = true;
      console.log('✅ Iniciando gestão (ÚNICA VEZ)');

      await ensureLocalDb();
      mapElements();
      bindEvents();
      initPhotoPreview();
      setupUnidadeChangeListener();
      // Carregar todas as turmas globalmente (Sede + Anexa)
      await carregarTodasTurmasGlobal();
      // Garantir que botão de excluir do formulário principal fique sempre oculto
      if (els.btnExcluir) els.btnExcluir.style.display = 'none';
      // NÃO carregar alunos automaticamente - aguardar clique do usuário
      setTimeout(() => adicionarBotaoCarregamento(), 100);

      // Única atualização de estatísticas
      setTimeout(() => {
        if (!window.statsUpdated) {
          window.statsUpdated = true;
          updateStatistics();
        }
      }, 1000);

      console.log('✅ gestao.js inicializado DEFINITIVAMENTE');
    } catch (e) {
      console.error('❌ Erro na inicialização:', e);
      // NÃO resetar flag para evitar retry infinito
      toast(e.message || 'Falha ao iniciar gestao.js', 'erro');
    }
  });

  // VERSÃO ULTRA SIMPLES - SEM LOOPS, SEM ESPERAS, SEM ESCOLHAS
  async function ensureLocalDb() {
    console.log('🔧 Configurando DB (versão simples)');
    
    // APENAS usar o que estiver disponível IMEDIATAMENTE
    if (window.supabaseSystem) {
      db = window.supabaseSystem.db.alunos;
      console.log('✅ Supabase DB configurado:', typeof db);
    } else {
      console.error('❌ window.supabaseSystem não encontrado');
      // DB dummy para não quebrar
      db = {
        collection: () => ({ get: async () => ({ docs: [], size: 0, empty: true }) })
      };
    }
  }

  function mapElements() {
    els.form = document.getElementById('alunoForm');
    els.tbody = document.getElementById('alunosTableBody');
    els.btnSalvar = document.getElementById('btnSalvar') || queryByType(els.form, 'submit');
    els.btnCancelar = document.getElementById('btnCancelar');
    els.btnExcluir = document.getElementById('btnExcluir');
    els.busca = document.getElementById('busca');
    els.total = document.getElementById('totalAlunos');
    els.toast = document.getElementById('toast');
    els.filtroTurma = document.getElementById('filtroTurma');

    if (!els.form) debugWarn('#alunoForm não encontrado');
    if (!els.tbody) debugWarn('#alunosTableBody não encontrado');
  }

  function bindEvents() {
    if (els.form) {
      els.form.addEventListener('submit', onSubmitForm);
    }
    if (els.btnCancelar) {
      els.btnCancelar.addEventListener('click', (e) => {
        e.preventDefault();
        resetForm();
      });
    }
    if (els.btnExcluir) {
      els.btnExcluir.addEventListener('click', async (e) => {
        e.preventDefault();
        if (editingId) {
          await onDelete(editingId);
        }
      });
    }
    // Listeners com throttling para evitar execução excessiva
    let searchTimeout;
    if (els.busca) {
      els.busca.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => renderTable(), 300);
      });
    }
    // Removido listener automático - usuário precisa clicar em "Carregar Alunos"
    // if (els.filtroTurma) {
    //   els.filtroTurma.addEventListener('change', () => renderTable());
    // }
    
    console.log('✅ Listeners reativados com throttling');

    // Listeners da tabela de consulta
    const btnMostrarConsulta = document.getElementById('btnMostrarConsulta');
    const btnOcultarConsulta = document.getElementById('btnOcultarConsulta');
    const buscaConsulta = document.getElementById('buscaConsulta');
    
    if (btnMostrarConsulta) {
      btnMostrarConsulta.addEventListener('click', mostrarConsultaGeral);
    }
    if (btnOcultarConsulta) {
      btnOcultarConsulta.addEventListener('click', ocultarConsultaGeral);
    }
    if (buscaConsulta) {
      let consultaTimeout;
      buscaConsulta.addEventListener('input', () => {
        clearTimeout(consultaTimeout);
        consultaTimeout = setTimeout(() => renderConsultaTable(), 200);
      });
    }

    if (els.tbody) {
      // Delegação para Editar/Excluir (fotos agora são exibidas diretamente)
      els.tbody.addEventListener('click', async (e) => {
        // Botões com data-action (editar/excluir)
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.dataset.action;
        const idRaw = btn.dataset.id;
        const id = idRaw ? decodeURIComponent(idRaw) : idRaw;
        if (!action || !id) return;
        if (action === 'edit') {
          onEdit(id);
        } else if (action === 'delete') {
          onDelete(id);
        } else if (action === 'delete-edit') {
          onDeleteInlineEdit(id);
        } else if (action === 'toggle-edit') {
          toggleRowEditMode(id);
        } else if (action === 'save-edit') {
          // Mostrar indicador de salvamento
          const saveBtn = document.querySelector(`button[data-action="save-edit"][data-id="${cssEscape(id)}"]`);
          if (saveBtn) {
            const originalText = saveBtn.innerHTML;
            saveBtn.innerHTML = '⏳ Salvando...';
            saveBtn.disabled = true;

            try {
              await onSaveInlineEdit(id);
            } finally {
              // Restaurar botão mesmo se houver erro
              if (saveBtn) {
                saveBtn.innerHTML = originalText;
                saveBtn.disabled = false;
              }
            }
          } else {
            await onSaveInlineEdit(id);
          }
        } else if (action === 'cancel-edit') {
          onCancelInlineEdit(id);
        }
      });
    }
  }

  // =====================
  // LISTENER DE MUDANÇA DE UNIDADE
  // =====================
  function setupUnidadeChangeListener() {
    if (!window.unidadeSelector) {
      console.warn('⚠️ Sistema de seleção de unidade não disponível');
      return;
    }

    window.unidadeSelector.onChange(async () => {
      const novaUnidade = window.unidadeSelector.getUnidade();
      console.log(`🔄 Unidade alterada para: ${novaUnidade} - Recarregando gestão de alunos...`);

      // Limpar caches
      alunosCache = [];
      consultaCache = [];
      clearCache('cache_');

      // Resetar filtro de turma
      if (els.filtroTurma) {
        els.filtroTurma.value = '';
      }

      // Limpar tabela principal
      if (els.tbody) {
        els.tbody.innerHTML = `
          <tr>
            <td colspan="9" style="text-align: center; padding: 40px;">
              <div style="color: #666;">
                <h4 style="margin: 0 0 15px 0;">🎯 Unidade alterada para ${novaUnidade}</h4>
                <p style="margin: 0;">Selecione uma turma no filtro acima e clique em <strong>"🚀 Carregar Alunos"</strong></p>
              </div>
            </td>
          </tr>
        `;
      }

      // Limpar tabela de consulta
      consultaCache = [];
      const consultaTableBody = document.getElementById('consultaTableBody');
      if (consultaTableBody) {
        consultaTableBody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: #666;">Digite o nome do aluno para buscar...</td></tr>';
      }

      // Ocultar consulta geral se estiver visível
      const consultaContainer = document.getElementById('consultaContainer');
      const btnMostrarConsulta = document.getElementById('btnMostrarConsulta');
      if (consultaContainer && consultaContainer.style.display !== 'none') {
        consultaContainer.style.display = 'none';
        if (btnMostrarConsulta) btnMostrarConsulta.style.display = 'block';
      }

      // Remover botões de ação
      const botaoLimpar = document.getElementById('btnLimparLista');
      const botaoAtualizar = document.getElementById('btnAtualizarDados');
      const botaoAtualizarConsulta = document.getElementById('btnAtualizarConsulta');
      if (botaoLimpar) botaoLimpar.remove();
      if (botaoAtualizar) botaoAtualizar.remove();
      if (botaoAtualizarConsulta) botaoAtualizarConsulta.remove();

      // Recriar botão de carregamento
      const tableActions = document.querySelector('.table-actions');
      if (tableActions && !document.getElementById('btnCarregarAlunos')) {
        const botaoCarregar = document.createElement('button');
        botaoCarregar.id = 'btnCarregarAlunos';
        botaoCarregar.innerHTML = '🚀 Carregar Alunos';
        botaoCarregar.className = 'btn btn-primary';
        botaoCarregar.style.cssText = 'margin-left: 10px; padding: 8px 16px; font-size: 14px;';
        botaoCarregar.onclick = carregarAlunosPorTurma;
        tableActions.appendChild(botaoCarregar);
      }

      // Atualizar estatísticas
      updateStatistics();

      // Resetar total
      if (els.total) {
        els.total.textContent = '0';
      }

      console.log(`✅ Dados atualizados para ${novaUnidade}`);
      toast(`📍 Unidade alterada para ${novaUnidade}`, 'ok');
    });

    console.log('✅ Listener de mudança de unidade configurado');
  }

  // =====================
  // SISTEMA DE CACHE INTELIGENTE (2 minutos)
  // =====================
  const CACHE_DURATION = 2 * 60 * 1000; // 2 minutos em ms
  
  function getCacheKey(type, identifier) {
    return `cache_${type}_${identifier}`;
  }
  
  function setCache(key, data) {
    const cacheData = {
      data: data,
      timestamp: Date.now(),
      version: APP_VERSION
    };
    try {
      localStorage.setItem(key, JSON.stringify(cacheData));
      console.log('💾 Cache salvo:', key, '(' + data.length + ' registros)');
    } catch (error) {
      console.warn('⚠️ Erro ao salvar cache:', error);
    }
  }
  
  function getCache(key) {
    try {
      const cached = localStorage.getItem(key);
      if (!cached) return null;
      
      const cacheData = JSON.parse(cached);
      
      // Verificar se é da versão atual
      if (cacheData.version !== APP_VERSION) {
        localStorage.removeItem(key);
        console.log('🧹 Cache inválido removido (versão diferente):', key);
        return null;
      }
      
      // Verificar se não expirou
      const age = Date.now() - cacheData.timestamp;
      if (age > CACHE_DURATION) {
        localStorage.removeItem(key);
        console.log('⏰ Cache expirado removido:', key, '(idade:', Math.round(age/1000) + 's)');
        return null;
      }
      
      console.log('⚡ Cache válido encontrado:', key, '(idade:', Math.round(age/1000) + 's)');
      return cacheData.data;
    } catch (error) {
      console.warn('⚠️ Erro ao ler cache:', error);
      return null;
    }
  }
  
  function clearCache(pattern) {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.includes(pattern)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    if (keysToRemove.length > 0) {
      console.log('🧹 Caches limpos:', keysToRemove);
    }
  }

  // =====================
  // CARREGAMENTO FILTRADO POR TURMA
  // =====================
  async function carregarAlunosFiltrados(turma, forceRefresh = false) {
    try {
      const cacheKey = getCacheKey('turma', turma);
      
      // Verificar cache primeiro (se não for refresh forçado)
      if (!forceRefresh) {
        const cachedData = getCache(cacheKey);
        if (cachedData) {
          console.log('⚡ Usando dados do cache para turma:', turma);
          processarDadosTurma(cachedData, turma);
          return;
        }
      }
      
      console.log('📡 Fazendo query filtrada para turma:', turma, forceRefresh ? '(REFRESH FORÇADO)' : '');
      
      if (!db) {
        console.error('❌ db não está disponível');
        throw new Error('Sistema de banco não inicializado');
      }
      
      // Usar função otimizada do Supabase
      const data = await window.supabaseSystem.db.alunos.getByTurma(turma);
      console.log('📊 Resultado da query filtrada:', {
        turma: turma,
        total: data.length
      });
      
      // Salvar no cache
      setCache(cacheKey, data);
      
          // Processar dados
      processarDadosTurma(data, turma);
      
    } catch (err) {
      console.error('Erro ao carregar alunos filtrados:', err);
      toast('Erro ao carregar alunos da turma ' + turma, 'erro');
    }
  }
  
  // Função para processar dados da turma (evita duplicação de código)
  function processarDadosTurma(data, turma) {
    console.log('📊 Processando dados da turma:', turma, '(' + data.length + ' alunos)');
    
    // Mapear dados para o formato esperado
    alunosCache = data.map((item) => {
      // Estrutura vinda do Supabase otimizado
      return {
        id: item['código (matrícula)'] || item.codigo || '',
        codigo: item['código (matrícula)'] || item.codigo || '',
        nome: item['Nome completo'] || item.nome_completo || item.nome || '',
        nome_completo: item['Nome completo'] || item.nome_completo || item.nome || '',
        turma: item.turma || '',
        status: 'ativo', // Campo fixo já que não existe na tabela
        responsavel: item.responsável || item.responsavel || '',
        telefone1: item['Telefone do responsável'] || item.telefone1 || item.telefone_responsavel || item.telefone || '',
        telefone2: item['Telefone do responsável 2'] || item.telefone2 || '',
        foto_url: item.foto_url || '', // Incluir foto no cache
        createdAt: new Date().toISOString(), // Campo fixo já que não existe na tabela
        updatedAt: new Date().toISOString() // Campo fixo já que não existe na tabela
      };
    });
    
    // Atualizar interface
    renderTable();
    updateStatistics();
    updateFormTurmaSelect(); // Atualizar select de turmas do formulário

    console.log('✅ Turma processada:', {
      turma: turma,
      total: alunosCache.length,
      primeiros: alunosCache.slice(0, 3).map(a => ({ codigo: a.codigo, nome: a.nome }))
    });

    // Mostrar resumo para o usuário
    toast(`Turma ${turma}: ${alunosCache.length} alunos carregados`, 'ok');
  }

  // =====================
  // CARREGAR TODAS AS TURMAS (SEDE + ANEXA) GLOBALMENTE
  // =====================
  async function carregarTodasTurmasGlobal() {
    console.log('🔄 carregarTodasTurmasGlobal iniciado');
    console.log('🔌 window.supabaseClient disponível?', !!window.supabaseClient);

    if (!window.supabaseClient) {
      console.warn('⚠️ Supabase não disponível para buscar turmas');
      return;
    }

    try {
      console.log('📡 Fazendo query para buscar turmas...');
      // Query para buscar todas as turmas únicas (Sede + Anexa)
      const { data, error } = await window.supabaseClient
        .from('alunos')
        .select('turma, unidade');

      console.log('📊 Query retornou:', {
        temDados: !!data,
        tamanho: data?.length,
        temErro: !!error
      });

      if (error) {
        console.error('❌ Erro ao buscar turmas:', error);
        return;
      }

      console.log('📄 Primeiros 5 registros:', data.slice(0, 5));

      // Criar mapa de turma -> unidade(s)
      const turmaUnidadeMap = {};
      data.forEach(item => {
        if (item.turma) {
          if (!turmaUnidadeMap[item.turma]) {
            turmaUnidadeMap[item.turma] = new Set();
          }
          turmaUnidadeMap[item.turma].add(item.unidade);
        }
      });

      console.log('🗺️ Mapa de turmas criado:', turmaUnidadeMap);

      // Criar array de turmas com suas unidades
      const todasTurmas = [];
      Object.keys(turmaUnidadeMap).sort().forEach(turma => {
        const unidades = Array.from(turmaUnidadeMap[turma]);
        unidades.forEach(unidade => {
          todasTurmas.push({ turma, unidade });
        });
      });

      console.log('📚 Array final de turmas:', todasTurmas);

      // Salvar globalmente
      window.todasTurmasGlobal = todasTurmas;
      window.turmaUnidadeMap = turmaUnidadeMap;

      console.log(`✅ Carregadas ${todasTurmas.length} turmas globalmente`);
      console.log('🔍 Verificação: window.todasTurmasGlobal =', window.todasTurmasGlobal);
    } catch (err) {
      console.error('❌ Erro ao carregar turmas globais:', err);
    }
  }

  // =====================
  // ATUALIZAR SELECT DE TURMAS DO FORMULÁRIO
  // =====================
  function updateFormTurmaSelect() {
    const selectTurma = document.getElementById('fld-turma');
    if (!selectTurma) return;

    // Buscar TODAS as turmas de TODAS as unidades do banco
    if (!window.supabaseClient) {
      console.warn('⚠️ Supabase não disponível para buscar turmas');
      return;
    }

    // Query para buscar todas as turmas únicas (Sede + Anexa)
    window.supabaseClient
      .from('alunos')
      .select('turma, unidade')
      .then(({ data, error }) => {
        if (error) {
          console.error('❌ Erro ao buscar turmas:', error);
          return;
        }

        // Extrair turmas únicas e ordenar
        const turmasUnicas = [...new Set(data.map(a => a.turma).filter(Boolean))].sort();

        // Agrupar por unidade para exibir organizado
        const turmasSede = turmasUnicas.filter(t => {
          const alunosDaTurma = data.filter(a => a.turma === t);
          return alunosDaTurma.some(a => a.unidade === 'Sede');
        });

        const turmasAnexa = turmasUnicas.filter(t => {
          const alunosDaTurma = data.filter(a => a.turma === t);
          return alunosDaTurma.some(a => a.unidade === 'Anexa');
        });

        // Salvar valor atual
        const valorAtual = selectTurma.value;

        // Limpar select
        selectTurma.innerHTML = '<option value="">Selecione uma turma...</option>';

        // Adicionar turmas da Sede
        if (turmasSede.length > 0) {
          const optgroupSede = document.createElement('optgroup');
          optgroupSede.label = '🏫 Sede';
          turmasSede.forEach(turma => {
            const option = document.createElement('option');
            option.value = turma;
            option.textContent = turma;
            optgroupSede.appendChild(option);
          });
          selectTurma.appendChild(optgroupSede);
        }

        // Adicionar turmas da Anexa
        if (turmasAnexa.length > 0) {
          const optgroupAnexa = document.createElement('optgroup');
          optgroupAnexa.label = '🏫 Anexa';
          turmasAnexa.forEach(turma => {
            const option = document.createElement('option');
            option.value = turma;
            option.textContent = turma;
            optgroupAnexa.appendChild(option);
          });
          selectTurma.appendChild(optgroupAnexa);
        }

        // Restaurar valor se ainda existir
        if (turmasUnicas.includes(valorAtual)) {
          selectTurma.value = valorAtual;
        }

        console.log(`✅ Select de turmas atualizado: ${turmasUnicas.length} turmas (${turmasSede.length} Sede, ${turmasAnexa.length} Anexa)`);
      })
      .catch(err => {
        console.error('❌ Erro ao atualizar select de turmas:', err);
      });
  }

  // =====================
  // LISTENER EM TEMPO REAL
  // =====================
  async function startLiveList() {
    try {
      console.log('🔄 Iniciando carregamento de alunos...');
      debugLog('Carregando alunos do sistema local...');
      
      if (!db) {
        console.error('❌ db não está disponível');
        throw new Error('Sistema de banco não inicializado');
      }
      
      console.log('📡 Fazendo query para coleção:', COLLECTION);
      const snap = await db.get();
      console.log('📊 Resultado da query:', {
        size: snap.size,
        empty: snap.empty,
        docs: snap.docs?.length
      });
      
      alunosCache = snap.docs.map((d) => {
        const data = d.data();
        const turma = data.turma || '';
        const turno = getTurnoByTurma(turma);
        const status = data.status || 'ativo'; // Padrão ativo para dados existentes
        
        return {
          id: d.id,
          codigo: data.codigo || d.id, // Código da matrícula
          nome: data.nome_completo || data.nome || '',
          turma: turma,
          turno: turno,
          status: status,
          nascimento: data.nascimento || '',
          responsavel: data.responsável || data.responsavel || '',
          cpf: data.cpf_responsavel || data.cpf || '',
          telefone: data.telefone_responsavel || data.telefone || '',
          telefone1: data['Telefone do responsável'] || data.telefone1 || data.telefone_responsavel || data.telefone || '',
          telefone2: data['Telefone do responsável 2'] || data.telefone2 || '',
          email: data.email || '',
          ...data // Manter campos originais também
        };
      });
      
      window.alunosCache = alunosCache.slice();
      console.log('✅ Alunos processados:', {
        total: alunosCache.length,
        primeiros3: alunosCache.slice(0, 3).map(a => ({ codigo: a.codigo, nome: a.nome, turma: a.turma }))
      });
      debugLog('Alunos carregados:', snap.size);
      updateClassFilter();
      renderTable();
      
      // Aguardar um pouco para garantir que os elementos existam
      setTimeout(() => {
        updateStatistics();
      }, 100);
      
    } catch (err) {
      console.error('Erro detalhado ao carregar lista:', err);
      console.error('Código do erro:', err?.code);
      console.error('Mensagem do erro:', err?.message);
      
      let mensagem = 'Erro ao carregar alunos.';
      
      if (err?.code === 'permission-denied') {
        mensagem = 'Sem permissão para ler dados. Verifique as regras do sistema e se está logado.';
      } else if (err?.code === 'failed-precondition') {
        mensagem = 'Índice do banco necessário. Tentando carregar sem ordenação...';
      } else if (err?.message) {
        mensagem = `Erro: ${err.message}`;
      }
      
      toast(mensagem, 'erro');

      // Apenas para permission-denied, mostrar informações de debug
      if (err?.code === 'permission-denied') {
        console.log('Usuário atual:', window.localAuth ? window.localAuth.getCurrentUser() : null);
        console.log('Sistema Local inicializado?', !!window.db);
      }
    }
  }

  function stopLiveList() {
    // Sistema local não usa listeners em tempo real
    debugLog('stopLiveList: nada para parar (sistema local)');
  }

  // =====================
  // CRUD
  // =====================
  async function onSubmitForm(ev) {
    ev.preventDefault();
    console.log('💾 INICIANDO onSubmitForm...');
    
    const data = getFormData();
    console.log('💾 getFormData concluído');

    try {
      if (editingId) {
        console.log('💾 MODO: Edição - editingId:', editingId);
        validateRequired(data, REQUIRED_FIELDS_UPDATE);
        // Não permitir troca de docId durante edição
        if (data.id && data.id !== editingId) {
          data.id = editingId;
        }
        console.log('💾 Chamando updateAluno...');
        await updateAluno(editingId, data);
        toast('Aluno atualizado com sucesso!');
      } else {
        console.log('💾 MODO: Criação');
        validateRequired(data, REQUIRED_FIELDS_CREATE);
        const docId = String(data.id).trim();
        console.log('💾 Chamando createAluno...');
        await createAluno(docId, data);
        toast('Aluno cadastrado com sucesso!');
      }
      console.log('💾 SALVAMENTO CONCLUÍDO!');
      resetForm();
      // Recarregar dados após operação
      await startLiveList();
    } catch (err) {
      console.error('💾 ERRO NO onSubmitForm:', err);
      toast(err.message || 'Falha ao salvar aluno.', 'erro');
    }
  }

  async function createAluno(docId, data) {
    const ref = db.doc(docId);
    const snap = await ref.get();
    if (snap.exists) {
      throw new Error('Já existe um aluno com ID "' + docId + '".');
    }
    const payload = sanitizeData(data, { forCreate: true });
    await ref.set(payload, { merge: false });
    debugLog('CREATE ok', { id: docId, payload });
  }

  async function updateAluno(docId, data) {
    console.log('💾 updateAluno chamado - usando Supabase diretamente');
    console.log('💾 docId recebido:', docId);
    const payload = sanitizeData(data, { forUpdate: true });
    console.log('💾 payload para Supabase:', payload);
    
    // Usar Supabase diretamente - passar o docId como primeiro parâmetro
    const result = await window.supabaseSystem.db.alunos.update(docId, payload);
    console.log('💾 resultado do Supabase:', result);
    
    debugLog('UPDATE ok', { id: docId, payload });
  }

  async function onEdit(id) {
    // Função antiga desabilitada - agora usa edição inline
    console.log('📝 Função onEdit desabilitada - usando edição inline');
    toast('Use o botão "Editar" na linha da tabela para edição inline', 'info');
  }
  
  async function toggleRowEditMode(id) {
    const stringId = String(id); // Garantir que sempre seja string
    console.log('🔧 toggleRowEditMode chamado para ID:', id, 'tipo:', typeof id);
    console.log('🔧 stringId:', stringId, 'tipo:', typeof stringId);
    console.log('🔧 editingRows antes:', Array.from(editingRows));

    if (editingRows.has(stringId)) {
      editingRows.delete(stringId);
      console.log('🔧 Removido do modo edição:', stringId);
    } else {
      // Permitir apenas uma linha em edição por vez
      editingRows.clear();
      editingRows.add(stringId);
      console.log('🔧 Adicionado ao modo edição:', stringId);

      // Carregar todas as turmas antes de renderizar (para garantir que o select esteja populado)
      if (!window.todasTurmasGlobal || window.todasTurmasGlobal.length === 0) {
        console.log('📚 Carregando turmas antes de entrar em modo edição...');
        await carregarTodasTurmasGlobal();
      }
    }

    console.log('🔧 editingRows depois:', Array.from(editingRows));
    renderTable();
  }

  function onCancelInlineEdit(id) {
    editingRows.delete(String(id));
    renderTable();
    toast('Edição cancelada', 'info');
  }

  async function onDeleteInlineEdit(id) {
    try {
      // Buscar dados do aluno para mostrar na confirmação
      const aluno = alunosCache.find(a =>
        a.id === id || a.codigo === id ||
        a.id === parseInt(id) || a.codigo === parseInt(id)
      );

      const nomeAluno = aluno ? (aluno.nome_completo || aluno.nome || 'Aluno desconhecido') : 'Aluno desconhecido';
      const codigoAluno = aluno ? (aluno.codigo || aluno.id || id) : id;

      // Confirmação dupla para segurança
      const confirmacao1 = confirm(
        `⚠️ ATENÇÃO: Você tem certeza que deseja EXCLUIR definitivamente o aluno?\n\n` +
        `Código: ${codigoAluno}\n` +
        `Nome: ${nomeAluno}\n\n` +
        `Esta ação NÃO PODE SER DESFEITA!`
      );

      if (!confirmacao1) {
        toast('Exclusão cancelada', 'info');
        return;
      }

      // Segunda confirmação para evitar exclusão acidental
      const confirmacao2 = confirm(
        `🚨 ÚLTIMA CONFIRMAÇÃO!\n\n` +
        `Você está prestes a EXCLUIR DEFINITIVAMENTE:\n` +
        `${nomeAluno} (${codigoAluno})\n\n` +
        `Clique OK apenas se tiver ABSOLUTA CERTEZA!`
      );

      if (!confirmacao2) {
        toast('Exclusão cancelada', 'info');
        return;
      }

      console.log('🗑️ Iniciando exclusão do aluno:', id);

      // Mostrar indicador de exclusão no botão
      const deleteBtn = document.querySelector(`button[data-action="delete-edit"][data-id="${cssEscape(id)}"]`);
      if (deleteBtn) {
        const originalText = deleteBtn.innerHTML;
        deleteBtn.innerHTML = '⏳ Excluindo...';
        deleteBtn.disabled = true;

        try {
          // Usar a API do Supabase para exclusão
          if (window.supabaseSystem && window.supabaseSystem.db && window.supabaseSystem.db.alunos) {
            const resultado = await window.supabaseSystem.db.alunos.delete(id);
            console.log('🗑️ Resultado da exclusão:', resultado);

            if (resultado && resultado.error) {
              throw new Error(resultado.error.message || 'Erro ao excluir aluno');
            }
          } else {
            // Fallback para função local
            await onDelete(id);
          }

          // Remover do cache local
          const alunoIndex = alunosCache.findIndex(a => {
            const match = a.id === parseInt(id) || a.codigo === parseInt(id) || a.id === id || a.codigo === id;
            return match;
          });

          if (alunoIndex !== -1) {
            alunosCache.splice(alunoIndex, 1);
            console.log('✅ Aluno removido do cache local');
          }

          // Sair do modo de edição
          editingRows.delete(String(id));

          // Atualizar interface
          renderTable();
          updateStatistics();

          toast(`Aluno ${nomeAluno} excluído com sucesso!`, 'ok');
          console.log('✅ Exclusão concluída com sucesso');

        } finally {
          // Restaurar botão mesmo se houver erro
          if (deleteBtn) {
            deleteBtn.innerHTML = originalText;
            deleteBtn.disabled = false;
          }
        }
      } else {
        // Se não encontrou o botão, executar exclusão diretamente
        if (window.supabaseSystem && window.supabaseSystem.db && window.supabaseSystem.db.alunos) {
          await window.supabaseSystem.db.alunos.delete(id);
        } else {
          await onDelete(id);
        }

        // Atualizar cache e interface
        const alunoIndex = alunosCache.findIndex(a =>
          a.id === parseInt(id) || a.codigo === parseInt(id) || a.id === id || a.codigo === id
        );
        if (alunoIndex !== -1) {
          alunosCache.splice(alunoIndex, 1);
        }

        editingRows.delete(String(id));
        renderTable();
        updateStatistics();

        toast(`Aluno ${nomeAluno} excluído com sucesso!`, 'ok');
      }

    } catch (error) {
      console.error('🗑️ Erro ao excluir aluno:', error);
      toast('Erro ao excluir aluno: ' + (error.message || 'Erro desconhecido'), 'erro');
    }
  }

  async function onSaveInlineEdit(id) {
    try {
      console.log('💾 Salvando edição inline para aluno:', id);

      // Buscar a linha sendo editada
      const row = document.querySelector(`tr[data-id="${cssEscape(id)}"]`);
      if (!row) {
        toast('Erro: linha não encontrada', 'erro');
        return;
      }

      // Extrair dados dos campos de input
      const data = {
        id: id,
        nome_completo: row.querySelector('[data-field="nome"]')?.value || '',
        turma: row.querySelector('[data-field="turma"]')?.value || '',
        responsavel: row.querySelector('[data-field="responsavel"]')?.value || '',
        telefone1: row.querySelector('[data-field="telefone1"]')?.value || '',
        telefone2: row.querySelector('[data-field="telefone2"]')?.value || ''
      };

      // Processar foto se foi selecionada
      const fotoInput = row.querySelector('[data-field="foto"]');
      if (fotoInput && fotoInput.files && fotoInput.files[0]) {
        const file = fotoInput.files[0];

        // Validar arquivo
        if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
          toast('Formato inválido. Use JPG, PNG ou WebP.', 'erro');
          return;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast('Arquivo muito grande. Máximo: 5MB', 'erro');
          return;
        }

        // Converter para base64
        data.foto_url = await fileToBase64(file);
      }

      console.log('💾 Dados para salvar:', data);

      // Validar campos obrigatórios
      if (!data.nome_completo.trim()) {
        toast('Nome é obrigatório', 'erro');
        return;
      }
      if (!data.turma.trim()) {
        toast('Turma é obrigatória', 'erro');
        return;
      }

      // Salvar no banco usando a API do supabase-only.js
      console.log('🚀 Chamando updateAluno via supabaseSystem com:', { id, data });

      // Detectar unidade baseada na turma escolhida
      let unidadeDetectada = null;
      if (data.turma && data.turma.trim()) {
        // Usar o mapa global de turmas para detectar a unidade
        if (window.turmaUnidadeMap && window.turmaUnidadeMap[data.turma.trim()]) {
          const unidades = Array.from(window.turmaUnidadeMap[data.turma.trim()]);
          if (unidades.length === 1) {
            // Turma existe em apenas uma unidade
            unidadeDetectada = unidades[0];
          } else if (unidades.length > 1) {
            // Turma existe em mais de uma unidade - usar a primeira (ou pode preferir manter a atual)
            console.warn(`⚠️ Turma ${data.turma} existe em múltiplas unidades:`, unidades);
            unidadeDetectada = unidades[0];
          }
          console.log(`🎯 Unidade detectada para turma ${data.turma}: ${unidadeDetectada}`);
        } else {
          console.warn(`⚠️ Turma ${data.turma} não encontrada no mapa global`);
        }
      }

      // Filtrar campos vazios/undefined para evitar erro bigint
      const updatePayload = {};
      if (data.nome_completo && data.nome_completo.trim()) {
        updatePayload["Nome completo"] = data.nome_completo.trim();
      }
      if (data.turma && data.turma.trim()) {
        updatePayload.turma = data.turma.trim();
      }
      // ATUALIZAR UNIDADE automaticamente baseado na turma
      if (unidadeDetectada) {
        updatePayload.unidade = unidadeDetectada;
        console.log(`✅ Atualizando unidade para: ${unidadeDetectada}`);
      }
      if (data.responsavel && data.responsavel.trim()) {
        updatePayload.responsavel = data.responsavel.trim();
      }
      if (data.telefone1 && data.telefone1.trim()) {
        updatePayload.telefone1 = data.telefone1.trim();
      }
      if (data.telefone2 && data.telefone2.trim()) {
        updatePayload.telefone2 = data.telefone2.trim();
      }
      if (data.foto_url && data.foto_url.trim()) {
        updatePayload.foto_url = data.foto_url.trim();
      }

      console.log('🧹 Payload filtrado:', updatePayload);

      // Usar diretamente a API do Supabase
      let resultado;
      if (window.supabaseSystem && window.supabaseSystem.db && window.supabaseSystem.db.alunos) {
        resultado = await window.supabaseSystem.db.alunos.update(id, updatePayload);
        console.log('📝 Resultado direto Supabase:', resultado);
      } else {
        console.log('🚀 Usando função updateAluno local');
        resultado = await updateAluno(id, data);
        console.log('📝 Resultado updateAluno local:', resultado);
      }

      if (resultado && resultado.error) {
        throw resultado.error;
      }

      // Atualizar cache local - converter ID para number para comparação
      const idNumber = parseInt(id);
      console.log('🔍 Buscando aluno no cache. ID original:', id, 'ID convertido:', idNumber);
      console.log('🔍 Cache atual tem', alunosCache.length, 'alunos');
      const alunoIndex = alunosCache.findIndex(a => {
        const match = a.id === idNumber || a.codigo === idNumber || a.id === id || a.codigo === id;
        if (match) {
          console.log('✅ MATCH! a.id:', a.id, 'a.codigo:', a.codigo, 'buscando:', id, 'convertido:', idNumber);
        }
        return match;
      });
      console.log('🔍 Índice encontrado:', alunoIndex);

      // Salvar unidade anterior para verificar transferência
      let unidadeAnterior = null;
      let houveTransferencia = false;

      if (alunoIndex !== -1) {
        console.log('🔄 Atualizando cache para aluno:', alunosCache[alunoIndex]);
        unidadeAnterior = alunosCache[alunoIndex].unidade;

        const atualizacao = {
          ...alunosCache[alunoIndex],
          "Nome completo": data.nome_completo,
          nome_completo: data.nome_completo,
          turma: data.turma,
          responsavel: data.responsavel,
          "responsável": data.responsavel, // Campo com acento usado no Supabase
          telefone1: data.telefone1,
          telefone2: data.telefone2,
          "Telefone do responsável": data.telefone1,
          "Telefone secundário": data.telefone2,
          foto_url: data.foto_url || alunosCache[alunoIndex].foto_url
        };

        // Atualizar unidade se foi detectada
        if (unidadeDetectada) {
          atualizacao.unidade = unidadeDetectada;
          console.log(`🔄 Cache: Unidade atualizada para ${unidadeDetectada}`);

          // Verificar se houve transferência
          if (unidadeAnterior && unidadeAnterior !== unidadeDetectada) {
            houveTransferencia = true;
            console.log(`🔄 Transferência detectada: ${unidadeAnterior} → ${unidadeDetectada}`);
          }
        }

        alunosCache[alunoIndex] = atualizacao;
        console.log('✅ Cache local atualizado:', alunosCache[alunoIndex]);
      } else {
        console.log('❌ Aluno não encontrado no cache!');
      }

      // Sair do modo de edição
      editingRows.delete(String(id));
      renderTable();

      // Mensagem personalizada se houve transferência de unidade
      if (houveTransferencia && unidadeAnterior && unidadeDetectada) {
        toast(`✅ Aluno transferido de ${unidadeAnterior} para ${unidadeDetectada}!`, 'ok');
        console.log(`🔄 Transferência confirmada: ${unidadeAnterior} → ${unidadeDetectada}`);

        // Recarregar turmas globais para refletir mudanças
        setTimeout(() => carregarTodasTurmasGlobal(), 500);
      } else {
        toast('Aluno atualizado com sucesso!', 'ok');
      }

    } catch (error) {
      console.error('💾 Erro ao salvar edição inline:', error);
      toast('Erro ao salvar: ' + (error.message || 'Erro desconhecido'), 'erro');
    }
  }

  // Função helper para converter arquivo para base64
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  
  function updateClassFilter() {
    if (!els.filtroTurma) return;
    
    // Obter todas as turmas únicas
    const turmas = [...new Set(alunosCache.map(a => a.turma).filter(Boolean))]
      .sort();
    
    const currentValue = els.filtroTurma.value;
    els.filtroTurma.innerHTML = '<option value="todos">Todos os alunos</option>';
    
    turmas.forEach(turma => {
      const option = document.createElement('option');
      option.value = turma;
      option.textContent = turma;
      els.filtroTurma.appendChild(option);
    });
    
    // Restaurar valor se ainda existir
    if (turmas.includes(currentValue)) {
      els.filtroTurma.value = currentValue;
    }
  }
  
  // Função global para ser chamada pelo HTML
  window.filtrarAlunosPorTurma = function() {
    renderTable();
  };
  
  function getTurnoByTurma(turma) {
    if (!turma) return '';
    const turmasVespertinas = ['6A', '6B', '7B'];
    return turmasVespertinas.includes(turma) ? 'Vespertino' : 'Matutino';
  }
  
  function updateStatistics() {
    // Filtrar apenas alunos ativos
    const alunosAtivos = alunosCache.filter(a => a.status === 'ativo');
    
    // Total de alunos ativos
    const totalAtivos = alunosAtivos.length;
    const elTotalAlunosAtivos = document.getElementById('totalAlunosAtivos');
    if (elTotalAlunosAtivos) {
      elTotalAlunosAtivos.textContent = totalAtivos;
    }
    
    // Total de turmas únicas (apenas alunos ativos)
    const turmasUnicas = [...new Set(alunosAtivos.map(a => a.turma).filter(Boolean))];
    const totalTurmas = turmasUnicas.length;
    const elTotalTurmas = document.getElementById('totalTurmas');
    if (elTotalTurmas) {
      elTotalTurmas.textContent = totalTurmas + '/12';
    }
    
    // Cadastros hoje (apenas alunos ativos)
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const cadastrosHoje = alunosAtivos.filter(aluno => {
      if (!aluno.createdAt) return false;
      const dataAluno = aluno.createdAt.toDate ? aluno.createdAt.toDate() : new Date(aluno.createdAt);
      dataAluno.setHours(0, 0, 0, 0);
      return dataAluno.getTime() === hoje.getTime();
    }).length;
    
    const elCadastrosHoje = document.getElementById('cadastrosHoje');
    if (elCadastrosHoje) elCadastrosHoje.textContent = cadastrosHoje;
    
    // Dados incompletos (alunos ativos sem responsável, CPF ou telefone)
    const dadosIncompletos = alunosAtivos.filter(aluno => {
      return !aluno.responsavel || !aluno.cpf || !aluno.telefone;
    }).length;
    
    const elDadosIncompletos = document.getElementById('dadosIncompletos');
    if (elDadosIncompletos) elDadosIncompletos.textContent = dadosIncompletos;
    
    // Log para debug
    debugLog('Estatísticas atualizadas:', {
      totalAtivos,
      totalTurmas: totalTurmas + '/12',
      cadastrosHoje,
      dadosIncompletos
    });
  }

  async function onDelete(id) {
    const ok = confirm('Excluir definitivamente o aluno ID "' + id + '"?');
    if (!ok) return;
    try {
      await db.doc(id).delete();
      toast('Aluno excluído.');
      if (editingId === id) resetForm();
      debugLog('DELETE ok', { id: id });
      // Recarregar dados após exclusão
      await startLiveList();
    } catch (err) {
      console.error(err);
      toast('Falha ao excluir aluno.', 'erro');
    }
  }

  // =====================
  // RENDER
  // =====================
  function renderTable() {
    console.log('🔄 renderTable chamada', {
      tbody: !!els.tbody,
      cacheSize: alunosCache.length
    });
    
    if (!els.tbody) {
      console.warn('❌ tbody não encontrado');
      return;
    }
    
    const termo = normalize((els.busca && els.busca.value) || '');
    const turmaFiltro = (els.filtroTurma && els.filtroTurma.value) || 'todos';

    const lista = alunosCache.filter((a) => {
      // Filtro por busca
      if (termo) {
        const alvo = normalize(
          [a.codigo, a.nome, a.turma, a.nascimento, a.responsavel, a.cpf, a.telefone]
            .filter(Boolean)
            .join(' ')
        );
        if (!alvo.includes(termo)) return false;
      }
      
      // Filtro por turma
      if (turmaFiltro !== 'todos' && a.turma !== turmaFiltro) {
        return false;
      }
      
      return true;
    });

    console.log('📋 Lista filtrada:', {
      total: lista.length,
      filtros: { termo, turmaFiltro }
    });

    if (lista.length === 0) {
      els.tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; padding: 20px; color: #666;">Nenhum aluno encontrado</td></tr>';
      console.log('⚠️ Nenhum aluno na lista filtrada');
    } else {
      els.tbody.innerHTML = lista
        .map((a) => {
          const alunoId = String(a.id || a.codigo);
          const isEditing = editingRows.has(alunoId) || editingRows.has(String(a.id)) || editingRows.has(String(a.codigo));

          console.log(`🔍 Verificando edição para aluno ${alunoId}: isEditing=${isEditing}, editingRows:`, Array.from(editingRows));
          console.log(`🔍 Tipos: alunoId=${typeof alunoId}, a.id=${typeof a.id}, a.codigo=${typeof a.codigo}`);

          if (isEditing) {
            return renderEditableRow(a);
          } else {
            return renderViewRow(a);
          }
        })
        .join('');
    }

    if (els.total) {
      els.total.textContent = String(lista.length);
    }
  }

  // =====================
  // RENDER FUNCTIONS
  // =====================
  function renderViewRow(a) {
    console.log('📋 renderViewRow para aluno:', a.id || a.codigo);
    const statusClass = a.status === 'ativo' ? 'text-success' : 'text-muted';
    const statusIcon = a.status === 'ativo' ? '✓' : '✗';

    // Preparar célula da foto
    const fotoCell = a.foto_url
      ? '<img src="' + escapeHtml(a.foto_url) + '" alt="Foto" style="width: 50px; height: 65px; object-fit: cover; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">'
      : '<span style="color: #999; font-size: 12px;">Sem foto</span>';

    return (
      '<tr data-id="' + escapeHtml(a.id) + '">' +
        '<td>' + escapeHtml(a.codigo || a.id || '') + '</td>' +
        '<td>' + escapeHtml(a.nome_completo || a.nome || '') + '</td>' +
        '<td>' + escapeHtml(a.turma || '') + '</td>' +
        '<td class="' + statusClass + '">' + statusIcon + ' ' + escapeHtml(a.status || 'ativo') + '</td>' +
        '<td>' + escapeHtml(a.responsavel || '') + '</td>' +
        '<td>' + escapeHtml(a.telefone1 || '') + '</td>' +
        '<td>' + escapeHtml(a.telefone2 || '') + '</td>' +
        '<td style="text-align: center; padding: 8px;">' + fotoCell + '</td>' +
        '<td style="white-space:nowrap">' +
          '<button type="button" class="btn btn-small btn-primary" style="background: #6f42c1; color: white; border: 1px solid #5e35a8;" data-action="toggle-edit" data-id="' + encodeURIComponent(a.id) + '">✏️ Editar</button>' +
        '</td>' +
      '</tr>'
    );
  }

  function renderEditableRow(a) {
    console.log('✏️ renderEditableRow para aluno:', a.id || a.codigo);
    console.log('📚 Cache global disponível?', !!window.todasTurmasGlobal);
    console.log('📚 Tamanho do cache:', window.todasTurmasGlobal?.length || 0);
    console.log('📚 Conteúdo:', window.todasTurmasGlobal);

    // Buscar TODAS as turmas do banco (Sede + Anexa)
    // Usar variável global ou fazer query se disponível
    let turmaOptions = '';

    if (window.todasTurmasGlobal && window.todasTurmasGlobal.length > 0) {
      // Usar cache global de turmas se disponível
      console.log('✅ Usando cache global de turmas:', window.todasTurmasGlobal.length, 'turmas');
      turmaOptions = window.todasTurmasGlobal.map(item =>
        '<option value="' + item.turma + '"' + (item.turma === a.turma ? ' selected' : '') + '>' +
        item.turma + ' - ' + item.unidade + '</option>'
      ).join('');
      console.log('📝 HTML gerado:', turmaOptions.substring(0, 200) + '...');
    } else {
      // Fallback: usar cache local (não ideal, mas funciona)
      console.log('⚠️ Usando fallback - cache local');
      const todasTurmas = [...new Set(alunosCache.map(aluno => aluno.turma).filter(Boolean))].sort();
      const turmasDisponiveis = todasTurmas.length > 0 ? todasTurmas : [
        '1B', '1C', '2A', '6A', '6B', '7A', '7B', '8A', '8B', '9A', '9B', '9E'
      ];

      turmaOptions = turmasDisponiveis.map(turma =>
        '<option value="' + turma + '"' + (turma === a.turma ? ' selected' : '') + '>' + turma + '</option>'
      ).join('');
    }

    // Foto editável
    const fotoCell = a.foto_url
      ? '<img src="' + escapeHtml(a.foto_url) + '" alt="Foto" style="width: 40px; height: 52px; object-fit: cover; border-radius: 4px; margin-bottom: 4px;"><br><input type="file" accept="image/*" style="font-size: 10px; width: 100%;" data-field="foto">'
      : '<input type="file" accept="image/*" style="font-size: 10px; width: 100%;" data-field="foto">';

    return (
      '<tr data-id="' + escapeHtml(a.id) + '" class="editing-row" style="background-color: #f8f9fa; border: 2px solid #007bff;">' +
        '<td style="font-weight: bold; color: #007bff;">' + escapeHtml(a.codigo || a.id || '') + '</td>' +
        '<td><input type="text" value="' + escapeHtml(a.nome_completo || a.nome || '') + '" data-field="nome" style="width: 100%; padding: 4px; border: 1px solid #ddd; border-radius: 3px;"></td>' +
        '<td><select data-field="turma" style="width: 100%; padding: 4px; border: 1px solid #ddd; border-radius: 3px;">' + turmaOptions + '</select></td>' +
        '<td><span style="color: #28a745;">✓ Ativo</span></td>' +
        '<td><input type="text" value="' + escapeHtml(a.responsavel || '') + '" data-field="responsavel" style="width: 100%; padding: 4px; border: 1px solid #ddd; border-radius: 3px;"></td>' +
        '<td><input type="text" value="' + escapeHtml(a.telefone1 || '') + '" data-field="telefone1" style="width: 100%; padding: 4px; border: 1px solid #ddd; border-radius: 3px;"></td>' +
        '<td><input type="text" value="' + escapeHtml(a.telefone2 || '') + '" data-field="telefone2" style="width: 100%; padding: 4px; border: 1px solid #ddd; border-radius: 3px;"></td>' +
        '<td style="text-align: center; padding: 4px;">' + fotoCell + '</td>' +
        '<td style="white-space:nowrap">' +
          '<button type="button" class="btn btn-small btn-success" style="background: #28a745; color: white; border: 1px solid #1e7e34; margin-right: 2px; font-size: 11px;" data-action="save-edit" data-id="' + encodeURIComponent(a.id) + '">✅ Salvar</button>' +
          '<button type="button" class="btn btn-small btn-danger" style="background: #dc3545; color: white; border: 1px solid #c82333; margin-right: 2px; font-size: 11px;" data-action="delete-edit" data-id="' + encodeURIComponent(a.id) + '">🗑️ Excluir</button>' +
          '<button type="button" class="btn btn-small btn-secondary" style="background: #6c757d; color: white; border: 1px solid #545b62; font-size: 11px;" data-action="cancel-edit" data-id="' + encodeURIComponent(a.id) + '">❌ Cancelar</button>' +
        '</td>' +
      '</tr>'
    );
  }

  // =====================
  // FORM HELPERS
  // =====================
  function getFormData() {
    if (!els.form) return {};
    const fd = new FormData(els.form);
    const data = Object.fromEntries(fd.entries());
    
    // DEBUG: ver dados coletados do formulário
    console.log('🔍 Dados coletados do formulário:', data);
    
    if (data.id != null) data.id = String(data.id).trim();
    if (data.nome != null) data.nome = cleanSpaces(data.nome);
    if (data.turma != null) data.turma = cleanSpaces(data.turma).toUpperCase();
    if (data.cpf != null) data.cpf = data.cpf.replace(/\D/g, '');
    if (data.telefone1 != null) data.telefone1 = data.telefone1.trim();
    if (data.telefone2 != null) data.telefone2 = data.telefone2.trim();
    if (data.email != null) data.email = data.email.trim().toLowerCase();

    // Manter compatibilidade com telefone (telefone1)
    if (data.telefone1) data.telefone = data.telefone1;
    
    // Processar foto: converter File para base64 URL
    const fotoInput = els.form.querySelector('input[name="foto"]');
    if (fotoInput && fotoInput.files && fotoInput.files[0]) {
      // Se tem arquivo, pegar do preview que já foi processado
      const previewContainer = document.getElementById('foto-preview');
      const previewImg = previewContainer ? previewContainer.querySelector('img') : null;
      if (previewImg && previewImg.src) {
        data.foto_url = previewImg.src; // Base64 data URL
        console.log('📸 Foto processada para salvar:', data.foto_url.substring(0, 50) + '...');
      }
    }
    
    // Remover o campo 'foto' pois não precisamos do File object
    delete data.foto;
    
    console.log('🔍 Dados após limpeza:', data);
    return data;
  }

  function fillForm(data) {
    if (!els.form) return;
    
    // Mapear campos corretamente
    const mappedData = {
      id: data.codigo || data.id || '',
      nome: data.nome_completo || data.nome || '',
      turma: data.turma || '',
      status: data.status || 'ativo',
      responsavel: data.responsavel || '',
      telefone1: data.telefone1 || data['Telefone do responsável'] || data.telefone_responsavel || data.telefone || '',
      telefone2: data.telefone2 || data['Telefone do responsável 2'] || ''
    };
    
    for (const k in mappedData) {
      if (!Object.prototype.hasOwnProperty.call(mappedData, k)) continue;
      const v = mappedData[k];
      const input = els.form.querySelector('[name="' + cssEscape(k) + '"]');
      if (input) input.value = v == null ? '' : String(v);
    }
    
    // Carregar foto se existir
    if (data.foto_url) {
      loadPhotoPreview(data.foto_url);
    }
    
    debugLog('fillForm mapeado:', mappedData);
  }

  function resetForm() {
    if (els.form) els.form.reset();
    editingId = null;
    toggleFormMode('create');
    clearPhotoPreview();
  }

  function toggleFormMode(mode) {
    const idInput = els.form && els.form.querySelector('[name="id"]');
    if (mode === 'edit') {
      if (idInput) {
        idInput.disabled = true; // docId não muda
        idInput.classList.add('is-disabled');
      }
      if (els.btnSalvar) els.btnSalvar.textContent = '✅ Atualizar';
      // MANTER BOTÃO DE EXCLUIR SEMPRE OCULTO - usamos apenas edição inline
      if (els.btnExcluir) els.btnExcluir.style.display = 'none';
    } else {
      if (idInput) {
        idInput.disabled = false;
        idInput.classList.remove('is-disabled');
      }
      if (els.btnSalvar) els.btnSalvar.textContent = '✅ Salvar';
      if (els.btnExcluir) els.btnExcluir.style.display = 'none';
    }
  }

  function validateRequired(data, fields) {
    const faltando = [];
    for (var i = 0; i < fields.length; i++) {
      var f = fields[i];
      if (!data[f] || String(data[f]).trim() === '') faltando.push(f);
    }
    if (faltando.length) {
      throw new Error('Preencha os campos obrigatórios: ' + faltando.join(', '));
    }
  }

  function sanitizeData(data, opts) {
    opts = opts || {}; var forCreate = !!opts.forCreate; var forUpdate = !!opts.forUpdate;
    
    // DEBUG: ver dados recebidos
    console.log('🧹 SANITIZE - Dados recebidos:', data);
    console.log('🧹 SANITIZE - Campo foto_url:', data.foto_url);
    
    // Mapear campos do formulário para a estrutura do banco
    var out = {};
    
    // Campos obrigatórios
    if (data.id) out.codigo = String(data.id).trim();
    if (data.nome) out.nome_completo = String(data.nome).trim();
    if (data.nome_completo) out.nome_completo = String(data.nome_completo).trim();
    if (data.turma) out.turma = String(data.turma).trim();
    
    // Campos opcionais
    if (data.status) out.status = String(data.status).trim();
    if (data.responsavel) out.responsavel = String(data.responsavel).trim();
    if (data.telefone1) out.telefone1 = String(data.telefone1).trim();
    if (data.telefone2) out.telefone2 = String(data.telefone2).trim();
    if (data.foto_url) out.foto_url = String(data.foto_url).trim();

    // Campos para compatibilidade
    if (data.telefone1) out.telefone = String(data.telefone1).trim();
    if (data.telefone1) out.telefone_responsavel = String(data.telefone1).trim();
    if (data.telefone1) out['Telefone do responsável'] = String(data.telefone1).trim();
    if (data.telefone2) out['Telefone do responsável 2'] = String(data.telefone2).trim();
    
    // DEBUG: ver resultado
    console.log('🧹 SANITIZE - Dados sanitizados:', out);
    console.log('🧹 SANITIZE - foto_url no out:', out.foto_url);

    // Campo telefone combinado
    const telefones = [data.telefone1, data.telefone2].filter(t => t && t.trim()).join(' / ');
    if (telefones) out.telefone_combinado = telefones;
    
    // Garantir que status seja sempre definido
    if (!out.status) out.status = 'ativo';
    
    var ts = new Date().toISOString();
    if (forCreate) { 
      out.created_at = ts; 
      out.updated_at = ts;
      out.createdAt = ts; // compatibilidade
      out.updatedAt = ts; // compatibilidade
    }
    if (forUpdate) { 
      out.updated_at = ts;
      out.updatedAt = ts; // compatibilidade
    }
    
    debugLog('sanitizeData mapeado:', out);
    return out;
  }

  // =====================
  // DEBUG TOOLS (console: debugGestao.*)
  // =====================
  function buildDebugAPI() {
    const api = {
      help: function() {
        console.log('\ndebugGestao disponível. Funções úteis:\n\n'
          + 'debugGestao.info()               -> resumo do ambiente DOM/Sistema Local\n'
          + 'debugGestao.setVerbose(true)     -> liga logs verbosos\n'
          + 'debugGestao.checkLocalDb()      -> testa leitura/escrita básicas\n'
          + 'debugGestao.readOnce()           -> lê uma vez (sem listener) e mostra documentos\n'
          + 'debugGestao.test.writeSample()   -> grava aluno DEBUG_SAMPLE\n'
          + 'debugGestao.test.clearSample()   -> apaga aluno DEBUG_SAMPLE\n'
          + 'debugGestao.toggleLive(false)    -> desliga listener em tempo real\n'
          + 'debugGestao.toggleLive(true)     -> religa listener em tempo real\n'
          + 'debugGestao.getCache()           -> retorna array alunoCache atual\n'
          + 'debugGestao.forceRender()        -> força re-render da tabela\n');
      },
      setVerbose: function(v) { DEBUG_VERBOSE = !!v; console.log('DEBUG_VERBOSE =', DEBUG_VERBOSE); },
      info: function() {
        const info = {
          hasForm: !!els.form,
          hasTbody: !!els.tbody,
          buscaId: !!els.busca,
          totalId: !!els.total,
          toastId: !!els.toast,
          localDbReady: !!(window.localDb && window.localDb.loaded),
          localAuth: !!(window.localAuth),
          hasDb: !!db,
          collection: COLLECTION,
          user: (window.localAuth && window.localAuth.getCurrentUser()) ? window.localAuth.getCurrentUser().email : null,
          cacheSize: alunosCache.length,
          systemType: 'local-storage'
        };
        console.table(info);
        return info;
      },
      checkLocalDb: async function() {
        const out = { ready: false, read: null, write: null };
        try {
          out.ready = !!(window.localDbReady && window.localDbReady() && db);
          const r = await db.limit(1).get();
          out.read = { ok: true, size: r.size };
        } catch (e) {
          out.read = { ok: false, code: e.code, msg: e.message };
        }
        try {
          await db.doc('DEBUG_CHECK').set({
            nome: 'Debug Check', turma: 'DZ',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          out.write = { ok: true };
          await db.doc('DEBUG_CHECK').delete();
        } catch (e2) {
          out.write = { ok: false, code: e2.code, msg: e2.message };
        }
        console.table(out);
        return out;
      },
      readOnce: async function() {
        try {
          const snap = await db.get();
          const rows = snap.docs.map(function(d){ return { id: d.id, ...d.data() }; });
          
          // Debug: verificar estrutura dos telefones
          if (rows.length > 0) {
            console.log('📱 Debug telefones - Primeiro aluno:', {
              telefone1: rows[0].telefone1,
              telefone2: rows[0].telefone2,
              telefone_responsavel: rows[0].telefone_responsavel,
              campos_disponiveis: Object.keys(rows[0]).filter(k => k.includes('tel'))
            });
          }
          
          // Ordenar por nome no JavaScript e limitar a 25
          rows.sort((a, b) => (a.nome_completo || a.nome || '').localeCompare(b.nome_completo || b.nome || ''));
          const limitedRows = rows.slice(0, 25);
          
          console.log('readOnce ->', limitedRows.length, 'doc(s)');
          alunosCache = limitedRows;
          renderTable();
          return limitedRows;
        } catch (e) {
          console.error('readOnce err:', e.code, e.message);
        }
      },
      test: {
        writeSample: async function() {
          const id = 'DEBUG_SAMPLE';
          await db.doc(id).set({
            id: id,
            nome: 'Aluno de Teste',
            turma: '1A',
            nascimento: '2010-01-01',
            responsavel: 'Resp Teste',
            cpf: '00000000000',
            telefone: '(00) 00000-0000',
            email: 'debug@example.com',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
          console.log('DEBUG_SAMPLE gravado');
        },
        clearSample: async function() {
          await db.doc('DEBUG_SAMPLE').delete();
          console.log('DEBUG_SAMPLE removido');
        }
      },
      toggleLive: function(on) {
        if (on) { startLiveList(); console.log('listener ligado'); }
        else { stopLiveList(); console.log('listener desligado'); }
      },
      getCache: function() { return alunosCache.map(function(x){ return Object.assign({}, x); }); },
      forceRender: function() { renderTable(); }
    };
    return api;
  }

  // expõe API de debug no window
  window.debugGestao = buildDebugAPI();
  // dica rápida no console
  setTimeout(function(){ if (typeof console !== 'undefined' && window.debugGestao) window.debugGestao.help(); }, 500);
  
  // Expor funções necessárias globalmente
  window.filtrarAlunosPorTurma = function() {
    renderTable();
  };
  
  // Função de debug para verificar elementos
  window.debugEstatisticas = function() {
    const elementos = {
      totalAlunosAtivos: document.getElementById('totalAlunosAtivos'),
      totalTurmas: document.getElementById('totalTurmas'),
      cadastrosHoje: document.getElementById('cadastrosHoje'),
      dadosIncompletos: document.getElementById('dadosIncompletos')
    };
    
    console.log('Elementos de estatísticas:', elementos);
    console.log('Cache de alunos:', alunosCache.length);
    updateStatistics();
    return elementos;
  };
  
  // Função para migrar dados existentes
  window.migrarDadosExistentes = async function() {
    try {
      console.log('Iniciando migração de dados...');
      const snapshot = await db.get();
      let updated = 0;
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (!data.status) {
          await doc.ref.update({ 
            status: 'ativo',
            updatedAt: new Date().toISOString()
          });
          updated++;
        }
      }
      
      console.log(`Migração concluída: ${updated} alunos atualizados com status ativo`);
      return { updated };
    } catch (error) {
      console.error('Erro na migração:', error);
      throw error;
    }
  };

  // Funções de foto desabilitadas - fotos agora são exibidas diretamente na tabela

  window.visualizarFoto = function(alunoId) {
    // Função desabilitada - fotos são exibidas automaticamente na tabela
    console.log('📸 Função visualizarFoto desabilitada - fotos exibidas diretamente');
  }

  window.ocultarFoto = function(alunoId) {
    // Função desabilitada - fotos são exibidas automaticamente na tabela
    console.log('📸 Função ocultarFoto desabilitada - fotos exibidas diretamente');
  }

  // =====================
  // CARREGAMENTO MANUAL COM FILTRO DE TURMA
  // =====================
  
  function adicionarBotaoCarregamento() {
    if (!els.tbody) {
      console.error('❌ tbody não encontrado para adicionar botão');
      return;
    }
    
    // Adicionar opções ao filtro existente e botão na área de ações
    const tableActions = document.querySelector('.table-actions');
    if (tableActions) {
      // Adicionar botão de carregamento na área de ações
      const botaoCarregar = document.createElement('button');
      botaoCarregar.id = 'btnCarregarAlunos';
      botaoCarregar.innerHTML = '🚀 Carregar Alunos';
      botaoCarregar.className = 'btn btn-primary';
      botaoCarregar.style.cssText = 'margin-left: 10px; padding: 8px 16px; font-size: 14px;';
      botaoCarregar.onclick = carregarAlunosPorTurma;
      
      tableActions.appendChild(botaoCarregar);
    }
    
    // Atualizar opções do filtro existente (apenas turmas específicas)
    if (els.filtroTurma) {
      els.filtroTurma.innerHTML = `
        <option value="">🎯 Selecione uma Turma</option>
        <option value="1B">1º B</option>
        <option value="1C">1º C</option>
        <option value="2A">2º A</option>
        <option value="6A">6º A</option>
        <option value="6B">6º B</option>
        <option value="7A">7º A</option>
        <option value="7B">7º B</option>
        <option value="8A">8º A</option>
        <option value="8B">8º B</option>
        <option value="9A">9º A</option>
        <option value="9B">9º B</option>
        <option value="9E">9º E</option>
      `;
    }
    
    // Mensagem na tabela
    els.tbody.innerHTML = `
      <tr>
        <td colspan="9" style="text-align: center; padding: 40px;">
          <div style="color: #666;">
            <h4 style="margin: 0 0 15px 0;">🎯 Selecione uma turma específica</h4>
            <p style="margin: 0;">Escolha uma turma no filtro acima e clique em <strong>"🚀 Carregar Alunos"</strong></p>
          </div>
        </td>
      </tr>
    `;
  }
  
  window.carregarAlunosPorTurma = async function() {
    try {
      // Usar o filtro existente
      const turmaSelecionada = els.filtroTurma ? els.filtroTurma.value : '';
      
      // Validar se uma turma foi selecionada
      if (!turmaSelecionada || turmaSelecionada === '') {
        toast('Por favor, selecione uma turma específica', 'erro');
        return;
      }
      
      console.log('🚀 Carregando alunos para turma:', turmaSelecionada);
      
      // Mostrar loading
      if (els.tbody) {
        els.tbody.innerHTML = `
          <tr>
            <td colspan="9" style="text-align: center; padding: 40px;">
              <div class="loading">
                ⏳ Carregando turma ${turmaSelecionada}...
              </div>
            </td>
          </tr>
        `;
      }
      
      // Aguardar um pouco para mostrar o loading
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Carregar dados FILTRADOS por turma
      await carregarAlunosFiltrados(turmaSelecionada);
      
      // Adicionar botão "Limpar Lista" no cabeçalho da tabela
      adicionarBotaoLimpar();
      
      console.log(`✅ Alunos carregados com sucesso para: ${turmaSelecionada}`);
      
    } catch (error) {
      console.error('❌ Erro ao carregar alunos:', error);
      if (els.tbody) {
        els.tbody.innerHTML = `
          <tr>
            <td colspan="9" style="text-align: center; padding: 30px; color: red;">
              ❌ Erro ao carregar alunos. 
              <br><br>
              <button onclick="adicionarBotaoCarregamento()" class="btn btn-secondary">
                🔄 Tentar Novamente
              </button>
            </td>
          </tr>
        `;
      }
    }
  }
  
  function adicionarBotaoLimpar() {
    // Remover botão "Carregar Alunos" e adicionar "Limpar Lista"
    const tableActions = document.querySelector('.table-actions');
    if (tableActions) {
      // Remover botão de carregamento
      const botaoCarregar = document.getElementById('btnCarregarAlunos');
      if (botaoCarregar) botaoCarregar.remove();
      
      // Remover botão limpar existente se houver
      const botaoExistente = document.getElementById('btnLimparLista');
      if (botaoExistente) botaoExistente.remove();
      
      // Criar botão de atualizar dados
      const botaoAtualizar = document.createElement('button');
      botaoAtualizar.id = 'btnAtualizarDados';
      botaoAtualizar.innerHTML = '🔄 Atualizar';
      botaoAtualizar.className = 'btn btn-info';
      botaoAtualizar.style.cssText = 'margin-left: 10px; padding: 8px 16px; font-size: 14px;';
      botaoAtualizar.onclick = function() {
        const turmaSelecionada = els.filtroTurma ? els.filtroTurma.value : '';
        if (turmaSelecionada && turmaSelecionada !== '') {
          toast('Atualizando dados da turma ' + turmaSelecionada + '...', 'ok');
          carregarAlunosFiltrados(turmaSelecionada, true); // forçar refresh
        } else {
          toast('Selecione uma turma para atualizar', 'erro');
        }
      };
      
      // Criar novo botão para nova busca
      const botaoLimpar = document.createElement('button');
      botaoLimpar.id = 'btnLimparLista';
      botaoLimpar.innerHTML = '🔄 Nova Busca';
      botaoLimpar.className = 'btn btn-secondary';
      botaoLimpar.style.cssText = 'margin-left: 10px; padding: 8px 16px; font-size: 14px;';
      botaoLimpar.onclick = limparListaAlunos;
      
      tableActions.appendChild(botaoAtualizar);
      tableActions.appendChild(botaoLimpar);
    }
  }
  
  window.limparListaAlunos = function() {
    // Limpar cache de alunos
    alunosCache = [];

    // NÃO resetar filtro de turma - permitir trocar facilmente
    // Manter turma selecionada para facilitar troca

    // Remover botões de ação
    const botaoLimpar = document.getElementById('btnLimparLista');
    if (botaoLimpar) botaoLimpar.remove();
    const botaoAtualizar = document.getElementById('btnAtualizarDados');
    if (botaoAtualizar) botaoAtualizar.remove();

    // Mostrar novamente o botão de carregamento
    const tableActions = document.querySelector('.table-actions');
    if (tableActions && !document.getElementById('btnCarregarAlunos')) {
      const botaoCarregar = document.createElement('button');
      botaoCarregar.id = 'btnCarregarAlunos';
      botaoCarregar.innerHTML = '🚀 Carregar Alunos';
      botaoCarregar.className = 'btn btn-primary';
      botaoCarregar.style.cssText = 'margin-left: 10px; padding: 8px 16px; font-size: 14px;';
      botaoCarregar.onclick = carregarAlunosPorTurma;
      tableActions.appendChild(botaoCarregar);
    }

    // Mostrar mensagem inicial
    if (els.tbody) {
      els.tbody.innerHTML = `
        <tr>
          <td colspan="9" style="text-align: center; padding: 40px;">
            <div style="color: #666;">
              <h4 style="margin: 0 0 15px 0;">🎯 Selecione uma turma específica</h4>
              <p style="margin: 0;">Escolha uma turma no filtro acima e clique em <strong>"🚀 Carregar Alunos"</strong></p>
            </div>
          </td>
        </tr>
      `;
    }

    // Resetar total
    if (els.total) {
      els.total.textContent = '0';
    }

    console.log('🗑️ Lista de alunos limpa (filtro mantido)');
  }

  // =====================
  // TABELA DE CONSULTA GERAL
  // =====================
  let consultaCache = [];
  
  window.mostrarConsultaGeral = async function() {
    try {
      const container = document.getElementById('consultaContainer');
      const btn = document.getElementById('btnMostrarConsulta');
      
      if (container && btn) {
        container.style.display = 'block';
        btn.style.display = 'none';
        
        // Adicionar botão de atualizar na consulta se ainda não existe
        const consultaActions = container.querySelector('.table-actions');
        if (consultaActions && !document.getElementById('btnAtualizarConsulta')) {
          const botaoAtualizarConsulta = document.createElement('button');
          botaoAtualizarConsulta.id = 'btnAtualizarConsulta';
          botaoAtualizarConsulta.innerHTML = '🔄 Atualizar';
          botaoAtualizarConsulta.className = 'btn btn-info';
          botaoAtualizarConsulta.style.cssText = 'margin-left: 10px; padding: 8px 16px; font-size: 14px;';
          botaoAtualizarConsulta.onclick = function() {
            toast('Atualizando lista geral de alunos...', 'ok');
            carregarConsultaGeral(true); // forçar refresh
          };
          
          consultaActions.appendChild(botaoAtualizarConsulta);
        }
        
        // Carregar dados básicos se ainda não carregou
        if (consultaCache.length === 0) {
          await carregarConsultaGeral();
        } else {
          renderConsultaTable(); // Apenas renderizar se já tem cache
        }
      }
    } catch (error) {
      console.error('Erro ao mostrar consulta geral:', error);
      toast('Erro ao carregar consulta geral', 'erro');
    }
  };
  
  async function carregarConsultaGeral(forceRefresh = false) {
    try {
      const cacheKey = getCacheKey('consulta', 'todos');
      
      // Verificar cache primeiro (se não for refresh forçado)
      if (!forceRefresh) {
        const cachedData = getCache(cacheKey);
        if (cachedData) {
          console.log('⚡ Usando dados do cache para consulta geral');
          consultaCache = cachedData;
          renderConsultaTable();
          return;
        }
      }
      
      const tbody = document.getElementById('consultaTableBody');
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px;">⏳ Carregando todos os alunos...</td></tr>';
      }
      
      console.log('📡 Fazendo query para consulta geral', forceRefresh ? '(REFRESH FORÇADO)' : '');
      
      // Buscar dados básicos otimizados
      const data = await window.supabaseSystem.db.alunos.getAllBasic();
      
      consultaCache = data.map(item => ({
        codigo: item['código (matrícula)'] || item.codigo,
        nome: item['Nome completo'] || '',
        turma: item.turma || ''
      }));
      
      // Salvar no cache
      setCache(cacheKey, consultaCache);
      
      renderConsultaTable();
      console.log('✅ Consulta geral carregada:', consultaCache.length, 'alunos');
      
    } catch (error) {
      console.error('Erro ao carregar consulta geral:', error);
      const tbody = document.getElementById('consultaTableBody');
      if (tbody) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: red;">❌ Erro ao carregar dados</td></tr>';
      }
    }
  }
  
  function renderConsultaTable() {
    const tbody = document.getElementById('consultaTableBody');
    const buscaConsulta = document.getElementById('buscaConsulta');
    
    if (!tbody) return;
    
    const termo = normalize((buscaConsulta && buscaConsulta.value) || '');
    
    let lista = consultaCache;
    if (termo) {
      lista = consultaCache.filter(a => {
        const alvo = normalize([a.codigo, a.nome, a.turma].join(' '));
        return alvo.includes(termo);
      });
    }
    
    if (lista.length === 0) {
      tbody.innerHTML = '<tr><td colspan="3" style="text-align: center; padding: 20px; color: #666;">Nenhum aluno encontrado</td></tr>';
    } else {
      tbody.innerHTML = lista.map(a => 
        '<tr>' +
          '<td>' + escapeHtml(a.codigo || '') + '</td>' +
          '<td>' + escapeHtml(a.nome || '') + '</td>' +
          '<td><strong>' + escapeHtml(a.turma || '') + '</strong></td>' +
        '</tr>'
      ).join('');
    }
  }
  
  window.ocultarConsultaGeral = function() {
    const container = document.getElementById('consultaContainer');
    const btn = document.getElementById('btnMostrarConsulta');
    
    if (container && btn) {
      container.style.display = 'none';
      btn.style.display = 'block';
      
      // Remover botão de atualizar da consulta
      const botaoAtualizarConsulta = document.getElementById('btnAtualizarConsulta');
      if (botaoAtualizarConsulta) {
        botaoAtualizarConsulta.remove();
      }
    }
  };

  // =====================
  // UTILITÁRIOS
  // =====================
  function toast(msg, tipo) {
    if (tipo == null) tipo = 'ok';
    if (els.toast) {
      els.toast.textContent = msg;
      els.toast.dataset.tipo = tipo; // CSS [data-tipo="erro"]
      els.toast.classList.add('show');
      setTimeout(function(){ if (els.toast) els.toast.classList.remove('show'); }, 3500);
    } else if (tipo === 'erro') {
      alert(msg);
    } else {
      console.log('[OK]', msg);
    }
  }

  function debugLog(){ if (DEBUG_VERBOSE) console.log.apply(console, ['[GESTAO]'].concat([].slice.call(arguments))); }
  function debugWarn(){ if (DEBUG_VERBOSE) console.warn.apply(console, ['[GESTAO]'].concat([].slice.call(arguments))); }

  function sleep(ms) { return new Promise(function(res){ setTimeout(res, ms); }); }

  function queryByType(root, type) { return root ? root.querySelector('[type="' + cssEscape(type) + '"]') : null; }

  function cleanSpaces(str) { return String(str || '').replace(/\s+/g, ' ').trim(); }

  function normalize(str) {
    // remove acentos via faixa unicode combinante
    return String(str || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Polyfill simples para CSS.escape que evita contrabarras
  function cssEscape(value) {
    if (window.CSS && typeof window.CSS.escape === 'function') return window.CSS.escape(value);
    var out = '';
    var s = String(value);
    for (var i = 0; i < s.length; i++) {
      var ch = s.charCodeAt(i);
      var c = s.charAt(i);
      if ((ch >= 48 && ch <= 57) || (ch >= 65 && ch <= 90) || (ch >= 97 && ch <= 122) || c === '_' || c === '-') {
        out += c;
      } else {
        out += '_' + ch.toString(16);
      }
    }
    return out;
  }

  function scrollIntoViewSmooth(el) {
    if (!el) return;
    try { el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    catch (_) { el.scrollIntoView(); }
  }

  // =====================
  // SISTEMA DE FOTOS
  // =====================
  function initPhotoPreview() {
    const fotoInput = document.getElementById('fld-foto');
    if (!fotoInput) return;
    
    fotoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      const preview = document.getElementById('foto-preview');
      
      if (!file) {
        clearPhotoPreview();
        return;
      }
      
      // Validar tipo
      if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)) {
        toast('Formato inválido. Use JPG, PNG ou WebP.', 'erro');
        fotoInput.value = '';
        return;
      }
      
      // Validar tamanho (5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast('Arquivo muito grande. Máximo: 5MB', 'erro');
        fotoInput.value = '';
        return;
      }
      
      // Mostrar preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (preview) {
          preview.innerHTML = `<img src="${e.target.result}" alt="Foto 3x4" style="width: 100%; height: 100%; object-fit: cover;">`;
        }
      };
      reader.readAsDataURL(file);
    });
  }
  
  function clearPhotoPreview() {
    const preview = document.getElementById('foto-preview');
    const input = document.getElementById('fld-foto');
    
    if (preview) {
      preview.innerHTML = '<span style="color: #999; font-size: 12px; text-align: center;">Preview<br>3x4</span>';
    }
    if (input) {
      input.value = '';
    }
  }
  
  function loadPhotoPreview(url) {
    const preview = document.getElementById('foto-preview');
    if (preview && url) {
      preview.innerHTML = `<img src="${url}" alt="Foto 3x4" style="width: 100%; height: 100%; object-fit: cover;">`;
    }
  }

  // LIMPEZA
  window.addEventListener('beforeunload', function(){ stopLiveList(); });
})();
