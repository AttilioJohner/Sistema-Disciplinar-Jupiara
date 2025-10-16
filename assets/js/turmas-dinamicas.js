// ========================================
// SISTEMA DE TURMAS DINÂMICAS POR UNIDADE
// Carrega turmas do banco baseado na unidade selecionada
// ========================================

class TurmasDinamicas {
  constructor() {
    this.turmasCache = null;
    this.unidadeAtual = null;
  }

  // Carregar turmas do Supabase filtradas por unidade
  async carregarTurmas() {
    try {
      // Aguardar Supabase estar disponível
      if (!window.supabaseClient) {
        await this.aguardarSupabase();
      }

      // Obter unidade atual
      const unidade = window.unidadeSelector ? window.unidadeSelector.getUnidade() : 'Sede';

      console.log(`📚 Carregando turmas da unidade: ${unidade}`);

      // Buscar turmas únicas da unidade
      const { data, error } = await window.supabaseClient
        .from('alunos')
        .select('turma')
        .eq('unidade', unidade)
        .not('turma', 'is', null)
        .order('turma');

      if (error) {
        console.error('❌ Erro ao carregar turmas:', error);
        return this.getTurmasDefault(unidade);
      }

      // Obter turmas únicas
      const turmasUnicas = [...new Set(data.map(a => a.turma))].sort();

      console.log(`✅ ${turmasUnicas.length} turmas encontradas:`, turmasUnicas);

      this.turmasCache = turmasUnicas;
      this.unidadeAtual = unidade;

      return turmasUnicas;

    } catch (error) {
      console.error('❌ Erro ao carregar turmas:', error);
      return this.getTurmasDefault(unidade || 'Sede');
    }
  }

  // Turmas padrão (fallback)
  getTurmasDefault(unidade) {
    if (unidade === 'Anexa') {
      return ['6C', '6D', '7C', '7D', '8C', '8D', '9C', '9D', '1B - Adib', '2A'];
    } else {
      return ['1B', '1C', '2A', '6A', '6B', '7A', '7B', '8A', '8B', '9A', '9B', '9E'];
    }
  }

  // Popular dropdown de turmas
  async popularDropdown(selectId) {
    const select = document.getElementById(selectId);
    if (!select) {
      console.warn(`⚠️ Dropdown ${selectId} não encontrado`);
      return;
    }

    // Carregar turmas
    const turmas = await this.carregarTurmas();

    // Salvar valor selecionado (se houver)
    const valorSelecionado = select.value;

    // Limpar dropdown (manter só a opção padrão)
    const opcaoPadrao = select.querySelector('option[value=""]');
    select.innerHTML = '';
    if (opcaoPadrao) {
      select.appendChild(opcaoPadrao);
    } else {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'Selecione a turma...';
      select.appendChild(opt);
    }

    // Adicionar turmas
    turmas.forEach(turma => {
      const option = document.createElement('option');
      option.value = turma;
      option.textContent = turma;
      select.appendChild(option);
    });

    // Restaurar valor selecionado (se ainda existir)
    if (valorSelecionado && turmas.includes(valorSelecionado)) {
      select.value = valorSelecionado;
    }

    console.log(`✅ Dropdown ${selectId} populado com ${turmas.length} turmas`);
  }

  // Popular múltiplos dropdowns
  async popularTodosDropdowns() {
    // IDs comuns de dropdowns de turma
    const dropdownIds = [
      'fld-turma',           // Gestão de alunos
      'filtroTurma',         // Filtro de turmas
      'turmaLancamento',     // Lançamento de frequência
      'lancamento-turma',    // Boletim
      'consulta-turma'       // Consulta de boletim
    ];

    for (const id of dropdownIds) {
      const select = document.getElementById(id);
      if (select && !select.classList.contains('turmas-dinamicas-processado')) {
        await this.popularDropdown(id);
        select.classList.add('turmas-dinamicas-processado');
      }
    }
  }

  // Aguardar Supabase estar pronto
  async aguardarSupabase() {
    return new Promise((resolve) => {
      const check = () => {
        if (window.supabaseClient) {
          resolve(true);
        } else {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }
}

// Instância global
window.turmasDinamicas = new TurmasDinamicas();

// Auto-inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', async () => {
  console.log('🏫 Inicializando sistema de turmas dinâmicas...');

  // Aguardar Supabase e unidade selector estarem prontos
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Popular dropdowns
  await window.turmasDinamicas.popularTodosDropdowns();

  console.log('✅ Sistema de turmas dinâmicas inicializado');
});

// Recarregar turmas quando unidade mudar (se o seletor existir)
if (window.unidadeSelector) {
  window.unidadeSelector.onChange(async (novaUnidade) => {
    console.log(`🔄 Unidade mudou para ${novaUnidade}, recarregando turmas...`);
    await window.turmasDinamicas.popularTodosDropdowns();
  });
}

console.log('📚 Sistema de Turmas Dinâmicas carregado');
