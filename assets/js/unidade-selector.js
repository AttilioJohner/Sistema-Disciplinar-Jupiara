// ========================================
// SISTEMA DE SELEÇÃO DE UNIDADE (Sede/Anexa)
// Permite alternar entre visualização da Sede e Anexa
// ========================================

class UnidadeSelector {
  constructor() {
    this.unidadeAtual = this.carregarUnidade();
    this.listeners = [];
    this.init();
  }

  init() {
    // Aguardar DOM carregar
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.criarSeletor());
    } else {
      this.criarSeletor();
    }
  }

  criarSeletor() {
    const topBar = document.querySelector('.top-bar-right');
    if (!topBar) {
      console.warn('⚠️ Top bar não encontrada');
      return;
    }

    // Criar container do seletor
    const container = document.createElement('div');
    container.className = 'unidade-selector-container';
    container.style.cssText = `
      display: flex;
      align-items: center;
      gap: 10px;
      margin-right: 15px;
      padding: 8px 15px;
      background: rgba(255, 255, 255, 0.15);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      border: 1px solid rgba(255, 255, 255, 0.2);
    `;

    // Ícone
    const icon = document.createElement('span');
    icon.textContent = '🏫';
    icon.style.fontSize = '18px';

    // Select
    const select = document.createElement('select');
    select.id = 'unidadeSelect';
    select.style.cssText = `
      background: rgba(255, 255, 255, 0.9);
      border: none;
      padding: 6px 12px;
      border-radius: 12px;
      font-weight: 600;
      color: #667eea;
      cursor: pointer;
      outline: none;
      font-size: 14px;
    `;

    // Opções
    const opcaoSede = document.createElement('option');
    opcaoSede.value = 'Sede';
    opcaoSede.textContent = '🏛️ Sede';

    const opcaoAnexa = document.createElement('option');
    opcaoAnexa.value = 'Anexa';
    opcaoAnexa.textContent = '📚 Anexa';

    select.appendChild(opcaoSede);
    select.appendChild(opcaoAnexa);
    select.value = this.unidadeAtual;

    // Event listener
    select.addEventListener('change', (e) => {
      this.setUnidade(e.target.value);
    });

    container.appendChild(icon);
    container.appendChild(select);

    // Inserir antes do user-profile
    const userProfile = topBar.querySelector('.user-profile');
    if (userProfile) {
      topBar.insertBefore(container, userProfile);
    } else {
      topBar.insertBefore(container, topBar.firstChild);
    }

    console.log(`✅ Seletor de unidade criado - Atual: ${this.unidadeAtual}`);
  }

  carregarUnidade() {
    const saved = localStorage.getItem('unidade_atual');
    return saved || 'Sede'; // Default: Sede
  }

  setUnidade(unidade) {
    if (unidade !== 'Sede' && unidade !== 'Anexa') {
      console.error('❌ Unidade inválida:', unidade);
      return;
    }

    const anterior = this.unidadeAtual;
    this.unidadeAtual = unidade;
    localStorage.setItem('unidade_atual', unidade);

    console.log(`🔄 Unidade alterada: ${anterior} → ${unidade}`);

    // Notificar listeners
    this.listeners.forEach(callback => callback(unidade, anterior));

    // Recarregar página para atualizar dados
    setTimeout(() => {
      window.location.reload();
    }, 300);
  }

  getUnidade() {
    return this.unidadeAtual;
  }

  // Registrar callback para quando unidade mudar
  onChange(callback) {
    this.listeners.push(callback);
  }

  // Filtrar query do Supabase por unidade
  filtrarQuery(query) {
    return query.eq('unidade', this.unidadeAtual);
  }

  // Helper para adicionar filtro em queries existentes
  aplicarFiltro(queryBuilder) {
    return queryBuilder.eq('unidade', this.unidadeAtual);
  }
}

// Instância global
window.unidadeSelector = new UnidadeSelector();

// Funções de conveniência globais
window.getUnidadeAtual = () => window.unidadeSelector.getUnidade();
window.filtrarPorUnidade = (query) => window.unidadeSelector.filtrarQuery(query);

// Helper para queries do Supabase
window.aplicarFiltroUnidade = (queryBuilder) => {
  const unidade = window.unidadeSelector.getUnidade();
  return queryBuilder.eq('unidade', unidade);
};

console.log('🏫 Sistema de Unidades carregado');
console.log(`📍 Unidade atual: ${window.unidadeSelector.getUnidade()}`);
