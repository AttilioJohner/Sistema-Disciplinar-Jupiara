// Sistema de Autenticação Supabase para Sistema Disciplinar Jupiara
class SupabaseAuth {
  constructor() {
    this.user = null;
    this.isReady = false;
    
    // Aguardar inicialização do Supabase
    window.addEventListener('supabaseReady', () => {
      this.initAuth();
    });
    
    // Se já está pronto, inicializar imediatamente
    if (window.supabaseConfig && window.supabaseConfig.getClient()) {
      this.initAuth();
    }
  }

  async initAuth() {
    if (window.supabaseConfig.isLocal()) {
      console.log('📱 Modo local: usando autenticação local');
      this.isReady = true;
      return;
    }

    try {
      const supabase = window.supabaseConfig.getClient();
      
      // Verificar sessão atual
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        this.user = session.user;
        console.log('👤 Usuário já autenticado:', this.user.email);
      }
      
      // Listener para mudanças de autenticação
      supabase.auth.onAuthStateChange((event, session) => {
        console.log('🔄 Estado de autenticação mudou:', event);
        
        if (session) {
          this.user = session.user;
          this.saveUserSession(session.user);
        } else {
          this.user = null;
          this.clearUserSession();
        }
      });
      
      this.isReady = true;
      console.log('✅ Sistema de autenticação Supabase inicializado');
      
    } catch (error) {
      console.error('❌ Erro ao inicializar autenticação Supabase:', error);
      this.isReady = true; // Continuar em modo local
    }
  }

  // Fazer login
  async signIn(email, password) {
    // Modo local: usar sistema existente
    if (window.supabaseConfig.isLocal()) {
      if (window.localAuth) {
        return window.localAuth.signIn(email, password);
      }
      
      // Fallback simples para desenvolvimento
      if (email && password) {
        const user = { email, id: 'local-user', name: email.split('@')[0] };
        this.user = user;
        this.saveUserSession(user);
        return { success: true, user };
      }
      
      return { success: false, error: 'Email e senha obrigatórios' };
    }

    try {
      const supabase = window.supabaseConfig.getClient();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error('Erro no login:', error);
        return { success: false, error: error.message };
      }

      this.user = data.user;
      this.saveUserSession(data.user);
      
      console.log('✅ Login realizado com sucesso:', data.user.email);
      return { success: true, user: data.user };
      
    } catch (error) {
      console.error('❌ Erro no login:', error);
      return { success: false, error: error.message };
    }
  }

  // Fazer cadastro
  async signUp(email, password, displayName = '') {
    // Modo local: usar sistema existente
    if (window.supabaseConfig.isLocal()) {
      if (window.localAuth) {
        return window.localAuth.signUp(email, password, displayName);
      }
      
      // Fallback simples
      const user = { 
        email, 
        id: 'local-user-' + Date.now(), 
        name: displayName || email.split('@')[0] 
      };
      this.user = user;
      this.saveUserSession(user);
      return { success: true, user };
    }

    try {
      const supabase = window.supabaseConfig.getClient();
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName
          }
        }
      });

      if (error) {
        console.error('Erro no cadastro:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Cadastro realizado. Verifique seu email para confirmar.');
      return { 
        success: true, 
        user: data.user,
        needsConfirmation: !data.session 
      };
      
    } catch (error) {
      console.error('❌ Erro no cadastro:', error);
      return { success: false, error: error.message };
    }
  }

  // Fazer logout
  async signOut() {
    try {
      // Modo local
      if (window.supabaseConfig.isLocal()) {
        this.user = null;
        this.clearUserSession();
        console.log('👋 Logout local realizado');
        return { success: true };
      }

      const supabase = window.supabaseConfig.getClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Erro no logout:', error);
        return { success: false, error: error.message };
      }

      this.user = null;
      this.clearUserSession();
      
      console.log('✅ Logout realizado com sucesso');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Erro no logout:', error);
      return { success: false, error: error.message };
    }
  }

  // Redefinir senha
  async resetPassword(email) {
    if (window.supabaseConfig.isLocal()) {
      console.log('⚠️ Reset de senha não disponível no modo local');
      return { success: false, error: 'Não disponível no modo local' };
    }

    try {
      const supabase = window.supabaseConfig.getClient();
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/pages/login.html`
      });

      if (error) {
        console.error('Erro ao redefinir senha:', error);
        return { success: false, error: error.message };
      }

      console.log('📧 Email de redefinição enviado');
      return { success: true };
      
    } catch (error) {
      console.error('❌ Erro ao redefinir senha:', error);
      return { success: false, error: error.message };
    }
  }

  // Obter usuário atual
  getCurrentUser() {
    return this.user;
  }

  // Verificar se está autenticado
  isAuthenticated() {
    return !!this.user;
  }

  // Salvar sessão do usuário (compatibilidade com sistema local)
  saveUserSession(user) {
    try {
      const userData = {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.display_name || user.email.split('@')[0],
        timestamp: Date.now()
      };
      
      localStorage.setItem('currentUser', JSON.stringify(userData));
      localStorage.setItem('loginSuccess', JSON.stringify(userData));
      
    } catch (error) {
      console.error('Erro ao salvar sessão:', error);
    }
  }

  // Limpar sessão do usuário
  clearUserSession() {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('loginSuccess');
  }

  // Aguardar inicialização
  async waitForReady() {
    while (!this.isReady) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

// Função de guarda de autenticação (compatibilidade com sistema existente)
async function requireAuth(options = {}) {
  const { loginPath = 'pages/login.html', onAuth = null } = options;
  
  await window.supabaseAuth.waitForReady();
  
  // Verificar se está autenticado
  if (!window.supabaseAuth.isAuthenticated()) {
    // Tentar recuperar sessão salva (fallback)
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        const isExpired = (Date.now() - userData.timestamp) > (24 * 60 * 60 * 1000);
        
        if (!isExpired) {
          window.supabaseAuth.user = userData;
          console.log('📝 Sessão recuperada:', userData.email);
          
          if (onAuth) onAuth(userData);
          return userData;
        } else {
          localStorage.removeItem('currentUser');
        }
      } catch (error) {
        console.error('Erro ao recuperar sessão:', error);
      }
    }
    
    // Redirecionar para login
    console.log('🔒 Usuário não autenticado, redirecionando...');
    window.location.href = loginPath;
    return null;
  }
  
  const user = window.supabaseAuth.getCurrentUser();
  if (onAuth) onAuth(user);
  return user;
}

// Inicializar sistema de autenticação
const supabaseAuth = new SupabaseAuth();
window.supabaseAuth = supabaseAuth;

// Compatibilidade com sistema local existente
window.localAuth = {
  signIn: (email, password) => supabaseAuth.signIn(email, password),
  signUp: (email, password, displayName) => supabaseAuth.signUp(email, password, displayName),
  signOut: () => supabaseAuth.signOut(),
  getCurrentUser: () => supabaseAuth.getCurrentUser(),
  isAuthenticated: () => supabaseAuth.isAuthenticated()
};

// Disponibilizar globalmente
window.requireAuth = requireAuth;

console.log('🔐 Sistema de autenticação híbrido (Supabase + Local) inicializado');