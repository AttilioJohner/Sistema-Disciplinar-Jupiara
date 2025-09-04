// Configuração temporária do Supabase para o Portal dos Pais
// IMPORTANTE: Substitua pelas suas credenciais reais do Supabase

window.SUPABASE_CONFIG_TEMP = {
    // URL do seu projeto Supabase
    url: 'https://rvppxdhrahcwiwrrwwaz.supabase.co', 
    
    // Chave anônima (public key) do Supabase
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2cHB4ZGhyYWhjd2l3cnJ3d2F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MDUyMzAsImV4cCI6MjA3MTk4MTIzMH0.JhNGeLdbaRiL_CHCLiVcExc62Hd7MYhLeycJSQyr9nM'
};

// Aplicar configuração se as variáveis não estiverem definidas
if (!window.SUPABASE_URL) {
    window.SUPABASE_URL = window.SUPABASE_CONFIG_TEMP.url;
}

if (!window.SUPABASE_ANON_KEY) {
    window.SUPABASE_ANON_KEY = window.SUPABASE_CONFIG_TEMP.anonKey;
}

console.log('🔧 Configuração temporária do Supabase carregada');