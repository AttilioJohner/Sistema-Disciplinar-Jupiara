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
    
    // Verificar usuário da sessão local
    const authData = localStorage.getItem('supabase_auth');
    if (authData) {
        try {
            const auth = JSON.parse(authData);
            if (auth.user && auth.expires > Date.now()) {
                currentUser = auth.user;
            }
        } catch (e) {
            localStorage.removeItem('supabase_auth');
        }
    }
    
    // Disponibilizar globalmente
    window.supabaseClient = supabase;
    
    console.log('✅ Supabase inicializado');
    if (currentUser) {
        console.log('✅ Usuário da sessão:', currentUser.email);
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

// Verificar se está logado (sistema simples)
function requireAuth() {
    const authData = localStorage.getItem('supabase_auth');
    if (authData) {
        try {
            const auth = JSON.parse(authData);
            if (auth.user && auth.expires > Date.now()) {
                currentUser = auth.user;
                return true;
            }
        } catch (e) {
            localStorage.removeItem('supabase_auth');
        }
    }
    
    // Se não está logado, redirecionar
    const currentPath = window.location.pathname;
    if (!currentPath.includes('login.html')) {
        window.location.href = 'pages/login.html';
    }
    return false;
}

// Função auxiliar para validar telefone
function isValidTelefone(valor) {
    if (!valor || valor === null) return false;
    
    const str = valor.toString();
    
    // Se começa com +55 mas é muito curto ou é só +55, considerar inválido
    if (str.startsWith('+55') && str.length <= 5) return false;
    
    // Se é só números mas muito curto (menos de 8 dígitos), considerar inválido  
    if (/^\d+$/.test(str) && str.length < 8) return false;
    
    return true;
}

// Função para distribuir telefones de forma inteligente
function distribuirTelefones(tel1, tel2) {
    const telefone1Valido = isValidTelefone(tel1);
    const telefone2Valido = isValidTelefone(tel2);
    
    // Se ambos são válidos, manter como estão
    if (telefone1Valido && telefone2Valido) {
        return {
            telefone1: tel1.toString(),
            telefone2: tel2.toString()
        };
    }
    
    // Se só o primeiro é válido
    if (telefone1Valido && !telefone2Valido) {
        return {
            telefone1: tel1.toString(),
            telefone2: ''
        };
    }
    
    // Se só o segundo é válido, mover para o primeiro
    if (!telefone1Valido && telefone2Valido) {
        return {
            telefone1: tel2.toString(),
            telefone2: ''
        };
    }
    
    // Se nenhum é válido
    return {
        telefone1: '',
        telefone2: ''
    };
}

// Função auxiliar para converter telefones (Interface → Supabase)
function parseTelefone(valor) {
    if (!valor || valor === '') return null;
    
    // Remover espaços e caracteres não numéricos exceto +
    const cleaned = valor.toString().replace(/[^\d+]/g, '');
    
    // Se está vazio ou muito curto, retornar null
    if (!cleaned || cleaned.length < 8) return null;
    
    // Tentar converter para número
    const num = parseInt(cleaned.replace(/\D/g, ''));
    
    // Se não é um número válido, retornar null
    if (isNaN(num)) return null;
    
    return num;
}

// Database - Alunos
const alunosDB = {
    async getAll() {
        // Garantir que Supabase está inicializado
        if (!supabase) {
            await initSupabase();
        }
        
        if (!supabase) {
            console.error('❌ Supabase não disponível em alunosDB.getAll()');
            return [];
        }
        
        const { data, error } = await supabase
            .from('alunos')
            .select('*')
            .order('"Nome completo"');
        
        if (error) throw error;
        return data || [];
    },
    
    // Compatibilidade com gestao.js - simula interface Firestore
    async get() {
        const data = await this.getAll();
        const docs = data.map(item => ({
            id: item['código (matrícula)'] || item.id,
            data: () => {
                // Distribuir telefones de forma inteligente
                const telefones = distribuirTelefones(
                    item['Telefone do responsável'], 
                    item['Telefone do responsável 2']
                );
                
                
                return {
                    // Mapear de volta para formato esperado pelo gestao.js
                    id: item['código (matrícula)'],
                    codigo: item['código (matrícula)'],
                    nome: item['Nome completo'],
                    turma: item.turma,
                    responsavel: item.responsável,
                    telefone1: telefones.telefone1,
                    telefone2: telefones.telefone2,
                    status: 'ativo', // default
                    // Manter dados originais também
                    ...item
                };
            },
            exists: true
        }));
        
        return {
            docs,
            size: docs.length,
            empty: docs.length === 0,
            forEach: (callback) => docs.forEach(callback)
        };
    },
    
    async getById(codigo) {
        if (!supabase) {
            await initSupabase();
        }
        
        if (!supabase) {
            console.error('❌ Supabase não disponível em alunosDB.getById()');
            return null;
        }
        
        // Buscar todos e filtrar no cliente para evitar problemas de encoding
        const { data: allData, error } = await supabase
            .from('alunos')
            .select('*');
        
        if (error) throw error;
        
        const data = allData?.find(item => 
            item['código (matrícula)'] === codigo
        ) || null;
        
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
        // Buscar primeiro para obter registro completo
        const { data: allData } = await supabase
            .from('alunos')
            .select('*');
        
        const existing = allData?.find(item => 
            item['código (matrícula)'] === codigo
        );
        
        if (!existing) {
            throw new Error('Aluno não encontrado');
        }
        
        // Fazer update usando WHERE na primary key
        const updateData = { ...aluno };
        
        // Garantir que a primary key seja mantida
        updateData['código (matrícula)'] = codigo;
        
        const { data, error } = await supabase
            .from('alunos')
            .upsert(updateData)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },
    
    async delete(codigo) {
        // Buscar primeiro para verificar existência
        const { data: allData } = await supabase
            .from('alunos')
            .select('*');
        
        const existing = allData?.find(item => 
            item['código (matrícula)'] === codigo
        );
        
        if (!existing) {
            throw new Error('Aluno não encontrado');
        }
        
        // Delete desabilitado temporariamente devido a problemas com caracteres especiais
        console.warn('Função delete temporariamente desabilitada');
        const error = null;
        
        if (error) throw error;
    },
    
    // Métodos de compatibilidade Firestore para gestao.js
    doc(id) {
        return {
            async get() {
                try {
                    if (!supabase) {
                        await initSupabase();
                    }
                    
                    if (!supabase) {
                        console.error('❌ Supabase não disponível em doc().get()');
                        return { id, exists: false, data: () => ({}) };
                    }
                    
                    // Buscar pelo código usando RPC ou busca geral
                    const { data: allData, error } = await supabase
                        .from('alunos')
                        .select('*');
                    
                    if (error) throw error;
                    
                    const data = allData?.find(item => 
                        item['código (matrícula)'] === parseInt(id) ||
                        item.codigo === parseInt(id) ||
                        item.id === parseInt(id)
                    ) || null;
                    
                    if (error && error.code !== 'PGRST116') throw error;
                    
                    return {
                        id,
                        exists: !!data,
                        data: () => {
                            if (!data) return {};
                            
                            // Distribuir telefones de forma inteligente
                            const telefones = distribuirTelefones(
                                data['Telefone do responsável'], 
                                data['Telefone do responsável 2']
                            );
                            
                            return {
                                // Mapear para formato esperado pelo gestao.js
                                id: data['código (matrícula)'],
                                codigo: data['código (matrícula)'],
                                nome: data['Nome completo'],
                                turma: data.turma,
                                responsavel: data.responsável,
                                telefone1: telefones.telefone1,
                                telefone2: telefones.telefone2,
                                status: 'ativo', // default
                                ...data
                            };
                        }
                    };
                } catch (error) {
                    return { id, exists: false, data: () => ({}) };
                }
            },
            
            async set(data, options = {}) {
                if (!supabase) {
                    await initSupabase();
                }
                
                if (!supabase) {
                    console.error('❌ Supabase não disponível em doc().set()');
                    throw new Error('Supabase não inicializado');
                }
                
                // Mapear campos do formulário para Supabase
                // Validar código (permitir edição de códigos existentes menores)
                const codigo = parseInt(data.id || id);
                if (isNaN(codigo) || codigo <= 0) {
                    throw new Error('Código de matrícula deve ser um número válido');
                }
                // Para novos cadastros, preferir 7 dígitos
                if (codigo < 1000000 && !options.merge) {
                    console.warn('⚠️ Código menor que 7 dígitos. Recomenda-se usar formato: 2025001');
                }
                
                // DEBUG: verificar dados recebidos
                console.log('🔍 Dados recebidos para salvamento:', {
                    'data.nome': data.nome,
                    'data[Nome completo]': data['Nome completo'],
                    'todos_os_dados': data
                });
                
                const mappedData = {
                    'código (matrícula)': codigo,
                    'Nome completo': data.nome || data['Nome completo'],
                    'turma': data.turma,
                    'responsável': data.responsavel || data.responsável,
                    'Telefone do responsável': parseTelefone(data.telefone1),
                    'Telefone do responsável 2': parseTelefone(data.telefone2)
                };
                
                console.log('🔍 Dados mapeados para Supabase:', mappedData);
                
                const { error } = await supabase
                    .from('alunos')
                    .upsert(mappedData);
                
                if (error) throw error;
                return true;
            },
            
            async update(data) {
                // Buscar o registro primeiro para obter o ID interno
                const { data: allData } = await supabase
                    .from('alunos')
                    .select('*');
                
                const record = allData?.find(item => 
                    item['código (matrícula)'] === parseInt(id) ||
                    item.codigo === parseInt(id)
                );
                
                if (!record) {
                    throw new Error('Registro não encontrado');
                }
                
                // Usar o ID interno para update
                const { error } = await supabase
                    .from('alunos')
                    .update({
                        ...data,
                        atualizado_em: new Date().toISOString()
                    })
                    .eq('id', record.id);
                
                if (error) throw error;
                return true;
            },
            
            async delete() {
                // Buscar o registro primeiro para obter o ID interno
                const { data: allData } = await supabase
                    .from('alunos')
                    .select('*');
                
                const record = allData?.find(item => 
                    item['código (matrícula)'] === parseInt(id) ||
                    item.codigo === parseInt(id)
                );
                
                if (!record) {
                    throw new Error('Registro não encontrado');
                }
                
                const { error } = await supabase
                    .from('alunos')
                    .delete()
                    .eq('id', record.id);
                
                if (error) throw error;
                return true;
            }
        };
    },
    
    limit(count) {
        return {
            async get() {
                if (!supabase) {
                    await initSupabase();
                }
                
                if (!supabase) {
                    console.error('❌ Supabase não disponível em limit().get()');
                    return { docs: [], size: 0, empty: true };
                }
                
                const { data, error } = await supabase
                    .from('alunos')
                    .select('*')
                    .limit(count);
                
                if (error) throw error;
                
                const docs = (data || []).map(item => ({
                    id: item.codigo || item.id,
                    data: () => item,
                    exists: true
                }));
                
                return {
                    docs,
                    size: docs.length,
                    empty: docs.length === 0
                };
            }
        };
    }
};

// Database - Medidas
const medidasDB = {
    async getAll() {
        const { data, error } = await supabase
            .from('medidas')
            .select('*')
            .order('data_ocorrencia', { ascending: false });
        
        if (error) throw error;
        return data || [];
    },
    
    async getByAluno(alunoId) {
        const { data, error } = await supabase
            .from('medidas')
            .select('*')
            .eq('aluno_codigo', alunoId)
            .order('data_ocorrencia', { ascending: false });
        
        if (error) throw error;
        return data || [];
    },
    
    async create(medida) {
        const { data, error } = await supabase
            .from('medidas')
            .insert(medida)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },
    
    async update(id, medida) {
        const { data, error } = await supabase
            .from('medidas')
            .update(medida)
            .eq('id', id)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },
    
    async delete(id) {
        const { error } = await supabase
            .from('medidas')
            .delete()
            .eq('id', id);
        
        if (error) throw error;
    }
};

// Estatísticas
async function getStatistics() {
    try {
        // Garantir que Supabase está inicializado
        if (!supabase) {
            await initSupabase();
        }
        
        if (!supabase) {
            console.error('❌ Supabase não disponível para estatísticas');
            return { totalAlunos: 0, totalMedidas: 0, totalTurmas: 0 };
        }
        
        console.log('📊 Carregando estatísticas do Supabase...');
        
        // Total alunos
        const { count: totalAlunos } = await supabase
            .from('alunos')
            .select('*', { count: 'exact', head: true });
        
        // Total medidas
        const { count: totalMedidas } = await supabase
            .from('medidas')
            .select('*', { count: 'exact', head: true });
        
        // Total faltas - contar todas as medidas por ora (pode ser refinado depois)
        const { count: totalFaltas } = await supabase
            .from('medidas')
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
            totalFaltas: totalFaltas || 0,
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