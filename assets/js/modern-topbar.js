// Script para funcionalidades da barra superior moderna
// - Toggle da sidebar com app-launcher
// - Iniciais do usuário no perfil
// - Adição do nome da escola

document.addEventListener('DOMContentLoaded', function() {
    console.log('🎨 Inicializando barra superior moderna...');
    
    // ===== TOGGLE SIDEBAR =====
    const appLauncher = document.querySelector('.app-launcher');
    const sidebar = document.querySelector('.sidebar');
    const contentArea = document.querySelector('.content-area');
    
    if (appLauncher && sidebar && contentArea) {
        appLauncher.addEventListener('click', function() {
            sidebar.classList.toggle('hidden');
            contentArea.classList.toggle('expanded');
            
            // Salvar estado no localStorage
            const isHidden = sidebar.classList.contains('hidden');
            localStorage.setItem('sidebarHidden', isHidden);
            
            console.log('📱 Sidebar toggled:', isHidden ? 'Hidden' : 'Visible');
        });
        
        // Restaurar estado da sidebar
        const savedState = localStorage.getItem('sidebarHidden');
        if (savedState === 'true') {
            sidebar.classList.add('hidden');
            contentArea.classList.add('expanded');
        }
    }
    
    // ===== ADICIONAR NOME DA ESCOLA =====
    const appName = document.querySelector('.app-name');
    if (appName && !document.querySelector('.school-name')) {
        const schoolName = document.createElement('span');
        schoolName.className = 'school-name';
        schoolName.textContent = 'Escola Estadual Cívico-Militar Jupiara';
        appName.parentNode.insertBefore(schoolName, appName.nextSibling);
        console.log('🏫 Nome da escola adicionado');
    }
    
    // ===== INICIAIS DO USUÁRIO =====
    const userProfile = document.querySelector('.user-profile');
    if (userProfile) {
        // Função para obter iniciais de diferentes fontes de usuário
        function getUserInitials() {
            // Tentar obter de diferentes sistemas de autenticação
            let username = null;
            
            // 1. Tentar unifiedAuth
            if (window.unifiedAuth && window.unifiedAuth.getCurrentUser) {
                const user = window.unifiedAuth.getCurrentUser();
                if (user && user.email) {
                    username = user.email.split('@')[0];
                } else if (user && user.user_metadata && user.user_metadata.full_name) {
                    username = user.user_metadata.full_name;
                }
            }
            
            // 2. Tentar localStorage
            if (!username) {
                const authData = localStorage.getItem('supabase_auth') || localStorage.getItem('auth_session');
                if (authData) {
                    try {
                        const parsed = JSON.parse(authData);
                        if (parsed.user && parsed.user.email) {
                            username = parsed.user.email.split('@')[0];
                        }
                    } catch (e) {
                        console.log('Erro ao parsear dados de auth:', e);
                    }
                }
            }
            
            // 3. Default
            if (!username) {
                username = 'Admin'; // Fallback
            }
            
            // Gerar iniciais
            if (username.includes('_') || username.includes('.')) {
                // Para usernames como "ten_castro" ou "john.doe"
                const parts = username.split(/[_\.]/);
                return parts.map(part => part.charAt(0).toUpperCase()).join('').substring(0, 2);
            } else if (username.includes(' ')) {
                // Para nomes como "João Silva"
                const parts = username.split(' ');
                return parts.map(part => part.charAt(0).toUpperCase()).join('').substring(0, 2);
            } else {
                // Para usernames simples como "admin"
                return username.substring(0, 2).toUpperCase();
            }
        }
        
        const initials = getUserInitials();
        userProfile.textContent = initials;
        userProfile.title = `Usuário: ${initials}`;
        console.log('👤 Iniciais do usuário definidas:', initials);
    }
    
    console.log('✅ Barra superior moderna inicializada!');
});