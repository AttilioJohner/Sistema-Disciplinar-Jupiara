// Carregamento de variáveis de ambiente para o Sistema Disciplinar Jupiara
// Este arquivo gerencia as configurações de ambiente tanto localmente quanto na produção

(function() {
  'use strict';

  // Função para carregar variáveis do Netlify
  function loadNetlifyEnv() {
    // No Netlify, as variáveis de ambiente são injetadas automaticamente
    // e ficam disponíveis em window.env ou como variáveis globais
    
    if (window.env) {
      // Método 1: Variáveis injetadas pelo Netlify via script
      return window.env;
    }
    
    // Método 2: Variáveis definidas diretamente (para compatibilidade)
    return {
      SUPABASE_URL: window.NETLIFY_SUPABASE_URL || window.VITE_SUPABASE_URL || '',
      SUPABASE_ANON_KEY: window.NETLIFY_SUPABASE_ANON_KEY || window.VITE_SUPABASE_ANON_KEY || '',
      NODE_ENV: window.NODE_ENV || (window.location.hostname.includes('localhost') ? 'development' : 'production'),
      APP_BASE_URL: window.URL || window.location.origin,
      DEBUG_ENABLED: window.DEBUG_ENABLED === 'true' || window.location.hostname.includes('localhost'),
      LOG_LEVEL: window.LOG_LEVEL || 'info'
    };
  }

  // Função para detectar ambiente
  function detectEnvironment() {
    const hostname = window.location.hostname;
    
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'development';
    }
    
    if (hostname.includes('netlify.app') || hostname.includes('netlify.com')) {
      if (window.CONTEXT === 'deploy-preview' || hostname.includes('deploy-preview')) {
        return 'staging';
      }
      return 'production';
    }
    
    // Domínio personalizado
    return 'production';
  }

  // Carregar configurações
  const env = loadNetlifyEnv();
  const environment = detectEnvironment();
  
  // Atribuir variáveis globalmente
  window.SUPABASE_URL = env.SUPABASE_URL || '';
  window.SUPABASE_ANON_KEY = env.SUPABASE_ANON_KEY || '';
  window.NODE_ENV = env.NODE_ENV || environment;
  window.APP_BASE_URL = env.APP_BASE_URL || window.location.origin;
  window.DEBUG_ENABLED = env.DEBUG_ENABLED || (environment === 'development');
  window.LOG_LEVEL = env.LOG_LEVEL || 'info';

  // Configurações específicas do ambiente
  const environmentConfig = {
    development: {
      apiUrl: 'local',
      enableDebug: true,
      logLevel: 'debug',
      mockData: true,
      hotReload: true
    },
    staging: {
      apiUrl: window.SUPABASE_URL || 'local',
      enableDebug: true,
      logLevel: 'info',
      mockData: false,
      hotReload: false
    },
    production: {
      apiUrl: window.SUPABASE_URL || 'local',
      enableDebug: false,
      logLevel: 'warn',
      mockData: false,
      hotReload: false
    }
  };

  // Aplicar configurações do ambiente atual
  const currentConfig = environmentConfig[environment] || environmentConfig.development;
  
  // Atualizar APP_CONFIG global
  if (window.APP_CONFIG) {
    Object.assign(window.APP_CONFIG, {
      environment: environment,
      database: {
        ...window.APP_CONFIG.database,
        useSupabase: !!(window.SUPABASE_URL && window.SUPABASE_ANON_KEY),
        apiUrl: currentConfig.apiUrl
      },
      debug: {
        ...window.APP_CONFIG.debug,
        enabled: window.DEBUG_ENABLED === 'true' || currentConfig.enableDebug,
        logLevel: window.LOG_LEVEL || currentConfig.logLevel
      }
    });
  }

  // Log das configurações carregadas (apenas em desenvolvimento)
  if (environment === 'development' || window.DEBUG_ENABLED === 'true') {
    console.group('🌍 Configurações de Ambiente');
    console.log('Ambiente detectado:', environment);
    console.log('Supabase URL:', window.SUPABASE_URL ? '✅ Configurada' : '❌ Não configurada');
    console.log('Supabase Key:', window.SUPABASE_ANON_KEY ? '✅ Configurada' : '❌ Não configurada');
    console.log('Debug habilitado:', window.DEBUG_ENABLED || currentConfig.enableDebug);
    console.log('Nível de log:', window.LOG_LEVEL || currentConfig.logLevel);
    console.log('URL base:', window.APP_BASE_URL);
    
    if (window.NETLIFY) {
      console.log('🌐 Informações do Netlify:');
      console.log('- Contexto:', window.CONTEXT || 'N/A');
      console.log('- Branch:', window.BRANCH || 'N/A');
      console.log('- Deploy URL:', window.DEPLOY_URL || 'N/A');
    }
    
    console.groupEnd();
  }

  // Validação das configurações críticas
  function validateConfig() {
    const issues = [];
    
    if (environment === 'production') {
      if (!window.SUPABASE_URL) {
        issues.push('SUPABASE_URL não está configurada para produção');
      }
      
      if (!window.SUPABASE_ANON_KEY) {
        issues.push('SUPABASE_ANON_KEY não está configurada para produção');
      }
    }
    
    return issues;
  }

  // Executar validação
  const configIssues = validateConfig();
  
  if (configIssues.length > 0 && (window.DEBUG_ENABLED || environment === 'development')) {
    console.group('⚠️ Problemas de Configuração');
    configIssues.forEach(issue => console.warn(issue));
    console.groupEnd();
  }

  // Disparar evento quando as configurações estiverem prontas
  window.dispatchEvent(new CustomEvent('envConfigReady', {
    detail: {
      environment,
      supabaseConfigured: !!(window.SUPABASE_URL && window.SUPABASE_ANON_KEY),
      config: currentConfig
    }
  }));

})();