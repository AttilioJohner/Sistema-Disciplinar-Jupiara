// Configurações de ambiente para o Sistema Disciplinar Jupiara

// Configurações do Supabase (serão definidas pelas variáveis de ambiente)
window.SUPABASE_URL = window.SUPABASE_URL || '';
window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || '';

// Configurações do ambiente
window.APP_CONFIG = {
  // Informações da aplicação
  name: 'Sistema Disciplinar Jupiara',
  version: '2.0.0',
  environment: window.SUPABASE_URL ? 'production' : 'development',
  
  // URLs base
  baseUrl: window.location.origin,
  apiUrl: window.SUPABASE_URL || 'local',
  
  // Configurações de autenticação
  auth: {
    redirectUrl: `${window.location.origin}/pages/login.html`,
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 horas
    rememberUser: true
  },
  
  // Configurações do banco de dados
  database: {
    useSupabase: !!(window.SUPABASE_URL && window.SUPABASE_ANON_KEY),
    fallbackToLocal: true,
    syncInterval: 30000, // 30 segundos
    retryAttempts: 3
  },
  
  // Configurações de UI
  ui: {
    theme: 'light',
    language: 'pt-BR',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm'
  },
  
  // Configurações de desenvolvimento
  debug: {
    enabled: !window.SUPABASE_URL, // Ativar debug apenas em desenvolvimento
    logLevel: 'info', // 'debug', 'info', 'warn', 'error'
    showPerformance: false
  }
};

// Função para verificar se está em produção
window.isProduction = () => {
  return window.APP_CONFIG.environment === 'production';
};

// Função para verificar se o Supabase está configurado
window.isSupabaseConfigured = () => {
  return !!(window.SUPABASE_URL && window.SUPABASE_ANON_KEY);
};

// Função para log condicional (apenas se debug estiver habilitado)
window.debugLog = (message, level = 'info', data = null) => {
  if (!window.APP_CONFIG.debug.enabled) return;
  
  const levels = ['debug', 'info', 'warn', 'error'];
  const currentLevel = levels.indexOf(window.APP_CONFIG.debug.logLevel);
  const messageLevel = levels.indexOf(level);
  
  if (messageLevel >= currentLevel) {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level.toUpperCase()}]`;
    
    if (data) {
      console[level](`${prefix} ${message}`, data);
    } else {
      console[level](`${prefix} ${message}`);
    }
  }
};

// Mostrar configuração atual no console
if (window.APP_CONFIG.debug.enabled) {
  console.group('🔧 Configuração da Aplicação');
  console.log('Nome:', window.APP_CONFIG.name);
  console.log('Versão:', window.APP_CONFIG.version);
  console.log('Ambiente:', window.APP_CONFIG.environment);
  console.log('Supabase configurado:', window.isSupabaseConfigured());
  console.log('Debug habilitado:', window.APP_CONFIG.debug.enabled);
  console.groupEnd();
}