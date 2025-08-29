// SISTEMA APENAS SUPABASE - SEM LOCALSTORAGE
console.log('🎯 Carregando sistema APENAS Supabase...');

// Configuração global
let supabase = null;
let currentUser = null;

// Inicializar Supabase
async function initSupabase() {
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
        console.error('❌ Credenciais Supabase não configuradas');
        return false;
    }
    
    supabase = window.supabase.createClient(
        window.SUPABASE_URL,
        window.SUPABASE_ANON_KEY
    );
    
    // Verificar usuário logado
    const { data: { user } } = await supabase.auth.getUser();
    currentUser = user;
    
    console.log('✅ Supabase inicializado');
    if (user) {
        console.log('✅ Usuário logado:', user.email);
    }
    
    return true;
}

// Autenticação
async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    
    if (error) throw error;
    
    currentUser = data.user;
    return data.user;
}

async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    currentUser = null;
    window.location.href = 'pages/login.html';
}

// Verificar se está logado
function requireAuth() {
    if (!currentUser) {
        window.location.href = 'pages/login.html';
        return false;
    }
    return true;
}

// Database - Alunos
const alunosDB = {
    async getAll() {
        const { data, error } = await supabase
            .from('alunos')
            .select('*')
            .order('nome_completo');
        
        if (error) throw error;
        return data || [];
    },
    
    async getById(codigo) {
        const { data, error } = await supabase
            .from('alunos')
            .select('*')
            .eq('codigo', codigo)
            .single();
        
        if (error) throw error;
        return data;
    },
    
    async create(aluno) {
        const { data, error } = await supabase
            .from('alunos')
            .insert(aluno)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },
    
    async update(codigo, aluno) {
        const { data, error } = await supabase
            .from('alunos')
            .update(aluno)
            .eq('codigo', codigo)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },
    
    async delete(codigo) {
        const { error } = await supabase
            .from('alunos')
            .delete()
            .eq('codigo', codigo);
        
        if (error) throw error;
    }
};

// Database - Medidas
const medidasDB = {
    async getAll() {
        const { data, error } = await supabase
            .from('medidas_disciplinares')
            .select('*')
            .order('data_ocorrencia', { ascending: false });
        
        if (error) throw error;
        return data || [];
    },
    
    async getByAluno(alunoId) {
        const { data, error } = await supabase
            .from('medidas_disciplinares')
            .select('*')
            .eq('aluno_codigo', alunoId)
            .order('data_ocorrencia', { ascending: false });
        
        if (error) throw error;
        return data || [];
    },
    
    async create(medida) {
        const { data, error } = await supabase
            .from('medidas_disciplinares')
            .insert(medida)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },
    
    async update(id, medida) {
        const { data, error } = await supabase
            .from('medidas_disciplinares')
            .update(medida)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },
    
    async delete(id) {
        const { error } = await supabase
            .from('medidas_disciplinares')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
    }
};

// Estatísticas
async function getStatistics() {
    try {
        // Total alunos
        const { count: totalAlunos } = await supabase
            .from('alunos')
            .select('*', { count: 'exact', head: true });
        
        // Total medidas
        const { count: totalMedidas } = await supabase
            .from('medidas_disciplinares')
            .select('*', { count: 'exact', head: true });
        
        // Turmas únicas
        const { data: turmas } = await supabase
            .from('alunos')
            .select('turma')
            .not('turma', 'is', null);
        
        const turmasUnicas = [...new Set(turmas?.map(t => t.turma) || [])].length;
        
        return {
            totalAlunos: totalAlunos || 0,
            totalMedidas: totalMedidas || 0,
            totalTurmas: turmasUnicas
        };
        
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        return {
            totalAlunos: 0,
            totalMedidas: 0,
            totalTurmas: 0
        };
    }
}

// Exportar globalmente
window.supabaseSystem = {
    init: initSupabase,
    auth: {
        login,
        logout,
        requireAuth,
        getCurrentUser: () => currentUser
    },
    db: {
        alunos: alunosDB,
        medidas: medidasDB
    },
    stats: getStatistics
};

// Auto-inicializar
window.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando sistema Supabase...');
    await initSupabase();
});

console.log('✅ Sistema Supabase carregado');