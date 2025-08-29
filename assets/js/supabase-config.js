import { supabase } from '../../scripts/supabaseClient.js';

// Configuração do Supabase para o Sistema Disciplinar Jupiara
class SupabaseConfig {
  constructor() {
    this.supabaseUrl = window.SUPABASE_URL || '';
    this.supabaseKey = window.SUPABASE_ANON_KEY || '';

    if (!this.supabaseUrl || !this.supabaseKey) {
      console.warn('⚠️ Variáveis do Supabase não configuradas. Usando modo local.');
      this.useLocal = true;
      this.supabase = null;
      return;
    }

    this.useLocal = false;
    this.supabase = supabase;
    this.dispatchReadyEvent();
  }

  // Disparar evento quando estiver pronto
  dispatchReadyEvent() {
    window.dispatchEvent(new CustomEvent('supabaseReady', {
      detail: { supabase: this.supabase }
    }));
  }

  // Verificar se está usando modo local
  isLocal() {
    return this.useLocal;
  }

  // Obter instância do Supabase
  getClient() {
    return this.supabase;
  }

  // Verificar conexão
  async testConnection() {
    if (this.useLocal) {
      return { success: false, message: 'Modo local ativo' };
    }

    try {
      const { data, error } = await this.supabase.from('alunos').select('count').limit(1);

      if (error && error.code === 'PGRST116') {
        // Tabela não existe ainda, mas conexão está OK
        return { success: true, message: 'Conectado (tabelas não criadas)' };
      } else if (error) {
        throw error;
      }

      return { success: true, message: 'Conectado com sucesso' };
    } catch (error) {
      console.error('Erro na conexão com Supabase:', error);
      return { success: false, message: error.message };
    }
  }
}

// Adapter para compatibilidade com código existente
class SupabaseAdapter {
  constructor(supabaseConfig) {
    this.config = supabaseConfig;
    this.isReady = false;

    // Aguardar inicialização
    window.addEventListener('supabaseReady', () => {
      this.isReady = true;
    });
  }

  // Simular interface do Firestore/LocalDB
  collection(name) {
    return new SupabaseCollection(this.config, name);
  }

  // Operações batch
  batch() {
    return new SupabaseBatch(this.config);
  }

  // Métodos de rede (compatibilidade)
  enableNetwork() {
    return Promise.resolve();
  }

  disableNetwork() {
    return Promise.resolve();
  }
}
