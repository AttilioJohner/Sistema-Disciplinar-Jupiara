import { supabase } from './scripts/supabaseClient.js';

// REGISTRO DE USUÁRIO NO SUPABASE
// Execute no console: registrarUsuario()

async function registrarUsuario() {
    console.log('🔧 Registrando usuário no Supabase...');
    
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY || !supabase) {
        console.error('❌ Supabase não configurado');
        return;
    }
    
    try {
        // Registrar usuário admin da escola
        const { data, error } = await supabase.auth.signUp({
            email: 'admin@eecmjupiara.com.br',
            password: 'JupiaraAdmin2024!'
        });
        
        if (error) {
            console.error('❌ Erro ao registrar:', error.message);
            
            // Se já existe, tentar fazer login
            if (error.message.includes('already registered')) {
                console.log('📧 Usuário já existe, fazendo login...');
                
                const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
                    email: 'admin@eecmjupiara.com.br',
                    password: 'JupiaraAdmin2024!'
                });
                
                if (loginError) {
                    console.error('❌ Erro no login:', loginError.message);
                } else {
                    console.log('✅ Login realizado:', loginData.user.email);
                    console.log('🎉 Usuário autenticado! Pode usar o sistema normalmente.');
                }
            }
        } else {
            console.log('✅ Usuário registrado:', data.user.email);
            console.log('📧 Verifique seu email para confirmar o registro.');
        }
        
    } catch (error) {
        console.error('❌ Erro inesperado:', error);
    }
}

// Função para login direto
async function fazerLogin() {
    console.log('🔑 Fazendo login...');

    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'admin@eecmjupiara.com.br',
        password: 'JupiaraAdmin2024!'
    });
    
    if (error) {
        console.error('❌ Erro no login:', error.message);
    } else {
        console.log('✅ Login realizado:', data.user.email);
        location.reload(); // Recarregar página
    }
}

// Verificar status do usuário
async function verificarUsuario() {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        console.log('✅ Usuário logado:', user.email);
    } else {
        console.log('❌ Nenhum usuário logado');
    }
    
    return user;
}

// Exportar funções
window.registrarUsuario = registrarUsuario;
window.fazerLogin = fazerLogin;
window.verificarUsuario = verificarUsuario;

console.log('🎯 Funções de usuário carregadas:');
console.log('- registrarUsuario() // Registra admin@eecmjupiara.com.br');
console.log('- fazerLogin() // Login direto');
console.log('- verificarUsuario() // Verificar status');