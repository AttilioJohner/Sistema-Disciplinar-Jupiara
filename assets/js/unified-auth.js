// SISTEMA DE AUTENTICAÇÃO UNIFICADO
// Usa Supabase como padrão com fallback para autenticação local
console.log('🔐 Carregando sistema de autenticação unificado...');

// Configuração global de autenticação
window.AUTH_CONFIG = {
    loginPath: 'login.html',
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 horas
    localStorage: {
        authKey: 'supabase_auth',
        sessionKey: 'current_session'
    }
};

// Sistema unificado de autenticação
class UnifiedAuth {
    constructor() {
        this.currentUser = null;
        this.isReady = false;
        this.useSupabase = false;
        this.init();
    }

    async init() {
        console.log('🚀 Inicializando sistema de auth unificado...');
        
        // Verificar se temos credenciais Supabase
        if (window.SUPABASE_URL && window.SUPABASE_ANON_KEY) {
            try {
                // Reutilizar cliente existente se disponível
                if (window.supabaseClient) {
                    this.supabase = window.supabaseClient;
                    console.log('🔄 Reutilizando cliente Supabase existente');
                } else {
                    this.supabase = window.supabase.createClient(
                        window.SUPABASE_URL,
                        window.SUPABASE_ANON_KEY
                    );
                }
                this.useSupabase = true;
                console.log('✅ Usando Supabase para autenticação');
            } catch (error) {
                console.warn('⚠️ Supabase não disponível, usando auth local');
                this.useSupabase = false;
            }
        } else {
            console.log('📱 Credenciais Supabase não encontradas, usando auth local');
            this.useSupabase = false;
        }

        // Verificar sessão existente
        await this.checkExistingSession();
        this.isReady = true;
        
        console.log('✅ Sistema de auth inicializado');
    }

    async checkExistingSession() {
        if (this.useSupabase) {
            // Verificar sessão Supabase
            try {
                const { data: { session } } = await this.supabase.auth.getSession();
                if (session) {
                    this.currentUser = session.user;
                    this.saveSession(session.user);
                    console.log('🔑 Sessão Supabase recuperada:', session.user.email);
                    return;
                }
            } catch (error) {
                console.warn('⚠️ Erro ao verificar sessão Supabase:', error);
            }
        }

        // Verificar sessão local
        const authData = localStorage.getItem(window.AUTH_CONFIG.localStorage.authKey);
        if (authData) {
            try {
                const session = JSON.parse(authData);
                if (session.user && session.expires > Date.now()) {
                    this.currentUser = session.user;
                    console.log('🔑 Sessão local recuperada:', session.user.email);
                } else {
                    localStorage.removeItem(window.AUTH_CONFIG.localStorage.authKey);
                }
            } catch (error) {
                localStorage.removeItem(window.AUTH_CONFIG.localStorage.authKey);
            }
        }
    }

    async signIn(loginInput, password) {
        console.log('🔓 Tentando fazer login...');

        if (this.useSupabase) {
            try {
                let email = loginInput;
                
                // Se não contém @, é um username - buscar email correspondente
                if (!loginInput.includes('@')) {
                    try {
                        const { data: usuario, error: userError } = await this.supabase
                            .from('usuarios_sistema')
                            .select('email')
                            .eq('username', loginInput)
                            .single();
                        
                        if (userError || !usuario) {
                            throw new Error('Usuário não encontrado');
                        }
                        
                        email = usuario.email;
                        console.log('📧 Username encontrado, usando email:', email);
                    } catch (usernameError) {
                        console.log('⚠️ Username não encontrado, tentando login local');
                        return this.localSignIn(loginInput, password);
                    }
                }

                const { data, error } = await this.supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) throw error;

                this.currentUser = data.user;
                this.saveSession(data.user);
                
                console.log('✅ Login Supabase realizado:', data.user.email);
                return { success: true, user: data.user };

            } catch (error) {
                console.error('❌ Erro no login Supabase:', error);
                // Fallback para login local em caso de erro
            }
        }

        // Login local (fallback ou modo local)
        return this.localSignIn(loginInput, password);
    }


    localSignIn(email, password) {
        // Usuários padrão do sistema
        const validCredentials = [
            { email: 'admin', password: 'admin123' },
            { email: 'admin@eecmjupiara.com.br', password: 'admin123' },
            { email: 'admin@escola.com', password: 'admin123' }
        ];

        const credential = validCredentials.find(cred => 
            cred.email === email && cred.password === password
        );

        if (credential) {
            const user = {
                id: 'local-' + Date.now(),
                email: credential.email === 'admin' ? 'admin@escola.com' : credential.email,
                displayName: 'Administrador',
                role: 'admin',
                provider: 'local'
            };

            this.currentUser = user;
            this.saveSession(user);
            
            console.log('✅ Login local realizado:', user.email);
            return { success: true, user };
        }

        return { success: false, error: 'Credenciais inválidas' };
    }

    async signOut() {
        console.log('🚪 Fazendo logout...');

        if (this.useSupabase && this.currentUser?.provider !== 'local') {
            try {
                await this.supabase.auth.signOut();
            } catch (error) {
                console.warn('⚠️ Erro no logout Supabase:', error);
            }
        }

        this.currentUser = null;
        this.clearSession();
        
        console.log('✅ Logout realizado');
        return { success: true };
    }

    isAuthenticated() {
        return !!this.currentUser;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    saveSession(user) {
        const sessionData = {
            user,
            expires: Date.now() + window.AUTH_CONFIG.sessionTimeout,
            timestamp: Date.now()
        };

        localStorage.setItem(window.AUTH_CONFIG.localStorage.authKey, JSON.stringify(sessionData));
        localStorage.setItem(window.AUTH_CONFIG.localStorage.sessionKey, JSON.stringify(user));
    }

    clearSession() {
        localStorage.removeItem(window.AUTH_CONFIG.localStorage.authKey);
        localStorage.removeItem(window.AUTH_CONFIG.localStorage.sessionKey);
    }

    async waitForReady() {
        while (!this.isReady) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }
}

// Função requireAuth unificada
async function requireAuth(options = {}) {
    const { 
        loginPath = window.AUTH_CONFIG.loginPath,
        onAuth = null,
        redirect = true 
    } = options;

    // Aguardar inicialização
    await window.unifiedAuth.waitForReady();

    if (!window.unifiedAuth.isAuthenticated()) {
        if (redirect && !window.location.pathname.includes('login.html')) {
            console.log('🔒 Usuário não autenticado, redirecionando para login');
            window.location.href = loginPath;
            return null;
        }
        return null;
    }

    const user = window.unifiedAuth.getCurrentUser();
    if (onAuth) onAuth(user);
    
    console.log('✅ Usuário autenticado:', user.email);
    return user;
}

// Função de logout global
async function logout(redirectTo = null) {
    await window.unifiedAuth.signOut();
    
    if (redirectTo) {
        window.location.href = redirectTo;
    } else {
        // Redirecionamento sempre para caminho absoluto
        window.location.href = '/pages/login.html';
    }
}

// Inicializar sistema
const unifiedAuth = new UnifiedAuth();
window.unifiedAuth = unifiedAuth;
window.requireAuth = requireAuth;
window.logout = logout;

// Compatibilidade com sistemas existentes
window.supabaseSystem = window.supabaseSystem || {};
window.supabaseSystem.auth = {
    requireAuth: (redirect = true) => requireAuth({ redirect }),
    login: (email, password) => unifiedAuth.signIn(email, password),
    logout: () => logout(),
    getCurrentUser: () => unifiedAuth.getCurrentUser(),
    isAuthenticated: () => unifiedAuth.isAuthenticated()
};

console.log('✅ Sistema de autenticação unificado carregado');