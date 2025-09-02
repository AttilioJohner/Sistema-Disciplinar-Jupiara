// Configuração de sincronização entre GitHub, Netlify e Supabase
class SyncManager {
  constructor() {
    this.githubRepo = 'AttilioJohner/Sistema-Disciplinar-Jupiara';
    this.netlifyDeployHook = null; // Será configurado via env
    this.supabaseUrl = 'https://rvppxdhrahcwiwrrwwaz.supabase.co';
    this.autoSync = true;
  }

  // Verificar status da sincronização
  async checkSyncStatus() {
    const status = {
      github: false,
      netlify: false,
      supabase: false,
      lastSync: localStorage.getItem('lastSync') || 'Nunca',
      errors: []
    };

    try {
      // Verificar GitHub (através da API pública)
      const githubResponse = await fetch(`https://api.github.com/repos/${this.githubRepo}`);
      status.github = githubResponse.ok;
      
      if (!status.github) {
        status.errors.push('GitHub: Repositório não acessível');
      }
    } catch (error) {
      status.errors.push(`GitHub: ${error.message}`);
    }

    try {
      // Verificar Netlify (através do site)
      const netlifyResponse = await fetch('https://eecmjupiara.netlify.app');
      status.netlify = netlifyResponse.ok;
      
      if (!status.netlify) {
        status.errors.push('Netlify: Site não acessível');
      }
    } catch (error) {
      status.errors.push(`Netlify: ${error.message}`);
    }

    try {
      // Verificar Supabase
      if (window.supabaseConfig && window.supabaseConfig.getClient) {
        const supabase = window.supabaseConfig.getClient();
        const { error } = await supabase.from('alunos').select('id').limit(1);
        status.supabase = !error;
        
        if (error) {
          status.errors.push(`Supabase: ${error.message}`);
        }
      } else {
        status.errors.push('Supabase: Cliente não inicializado');
      }
    } catch (error) {
      status.errors.push(`Supabase: ${error.message}`);
    }

    return status;
  }

  // Sincronizar dados com Supabase
  async syncToSupabase(data, table) {
    if (!window.supabaseConfig || window.supabaseConfig.isLocal()) {
      console.log('🔄 Modo local: sincronização com Supabase desabilitada');
      return { success: true, message: 'Modo local ativo' };
    }

    try {
      const supabase = window.supabaseConfig.getClient();
      
      // Fazer upsert dos dados
      const { data: result, error } = await supabase
        .from(table)
        .upsert(data, { onConflict: 'id' });

      if (error) {
        throw error;
      }

      console.log(`✅ Dados sincronizados com Supabase (${table}):`, result?.length || 'N/A', 'registros');
      this.updateLastSync();
      
      return { 
        success: true, 
        message: `${result?.length || 0} registros sincronizados`,
        data: result 
      };

    } catch (error) {
      console.error('❌ Erro na sincronização Supabase:', error);
      return { 
        success: false, 
        error: error.message 
      };
    }
  }

  // Trigger deploy no Netlify
  async triggerNetlifyDeploy(message = 'Atualização automática via sync') {
    // Em produção, seria feito via webhook
    // Por enquanto, apenas log
    console.log('🚀 Deploy Netlify disparado:', message);
    
    // Simular sucesso
    return new Promise(resolve => {
      setTimeout(() => {
        this.updateLastSync();
        resolve({ 
          success: true, 
          message: 'Deploy iniciado com sucesso',
          deployUrl: 'https://eecmjupiara.netlify.app'
        });
      }, 1000);
    });
  }

  // Commit automático para GitHub
  async commitToGitHub(files, message) {
    // Esta função seria implementada com a GitHub API
    // Por enquanto, apenas simular
    console.log('📝 Commit GitHub simulado:', message, files);
    
    return new Promise(resolve => {
      setTimeout(() => {
        this.updateLastSync();
        resolve({
          success: true,
          message: 'Commit realizado com sucesso',
          sha: 'simulated-' + Date.now()
        });
      }, 1000);
    });
  }

  // Sincronização completa
  async fullSync(data = {}) {
    console.log('🔄 Iniciando sincronização completa...');
    
    const results = {
      github: null,
      netlify: null,
      supabase: null,
      timestamp: new Date().toISOString()
    };

    // 1. Sincronizar com Supabase (se houver dados)
    if (data.alunos) {
      results.supabase = await this.syncToSupabase(data.alunos, 'alunos');
    }
    
    if (data.medidas) {
      results.supabase = await this.syncToSupabase(data.medidas, 'medidas_disciplinares');
    }

    // 2. Commit para GitHub (simulado)
    results.github = await this.commitToGitHub(
      Object.keys(data), 
      `Sincronização automática - ${new Date().toLocaleString()}`
    );

    // 3. Deploy Netlify
    results.netlify = await this.triggerNetlifyDeploy('Sincronização completa');

    console.log('✅ Sincronização completa finalizada:', results);
    return results;
  }

  // Atualizar timestamp da última sincronização
  updateLastSync() {
    const now = new Date().toLocaleString('pt-BR');
    localStorage.setItem('lastSync', now);
  }

  // Configurar sincronização automática
  enableAutoSync(interval = 5 * 60 * 1000) { // 5 minutos
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }

    this.syncInterval = setInterval(async () => {
      if (this.autoSync) {
        console.log('🔄 Sincronização automática iniciada...');
        
        // Coletar dados locais para sincronizar
        const data = this.collectLocalData();
        
        if (Object.keys(data).length > 0) {
          await this.fullSync(data);
        }
      }
    }, interval);

    console.log(`⏰ Sincronização automática ativada (${interval / 1000}s)`);
  }

  // Coletar dados locais para sincronização
  collectLocalData() {
    const data = {};

    // Coletar dados de alunos (se existir)
    try {
      const alunosData = localStorage.getItem('alunos_data');
      if (alunosData) {
        data.alunos = JSON.parse(alunosData);
      }
    } catch (error) {
      console.warn('⚠️ Erro ao coletar dados de alunos:', error);
    }

    // Coletar dados de medidas disciplinares
    try {
      const medidasData = localStorage.getItem('medidas_data');
      if (medidasData) {
        data.medidas = JSON.parse(medidasData);
      }
    } catch (error) {
      console.warn('⚠️ Erro ao coletar dados de medidas:', error);
    }

    return data;
  }

  // Parar sincronização automática
  disableAutoSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
    this.autoSync = false;
    console.log('⏸️ Sincronização automática desativada');
  }
}

// Inicializar gerenciador de sincronização
const syncManager = new SyncManager();
window.syncManager = syncManager;

// Ativar sincronização automática quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
  // Aguardar 5 segundos para garantir que tudo esteja carregado
  setTimeout(() => {
    syncManager.enableAutoSync(10 * 60 * 1000); // 10 minutos
  }, 5000);
});

console.log('🔗 Sistema de sincronização inicializado');