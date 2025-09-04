// Configuração temporária do Supabase para o Portal dos Pais
// IMPORTANTE: Substitua pelas suas credenciais reais do Supabase

window.SUPABASE_CONFIG_TEMP = {
    // Substitua pela URL do seu projeto Supabase
    url: 'https://xyzabc123.supabase.co', 
    
    // Substitua pela sua chave anônima (public key) do Supabase
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' 
};

// Aplicar configuração se as variáveis não estiverem definidas
if (!window.SUPABASE_URL) {
    window.SUPABASE_URL = window.SUPABASE_CONFIG_TEMP.url;
}

if (!window.SUPABASE_ANON_KEY) {
    window.SUPABASE_ANON_KEY = window.SUPABASE_CONFIG_TEMP.anonKey;
}

console.log('🔧 Configuração temporária do Supabase carregada');