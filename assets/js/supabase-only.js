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
                    id: item.codigo,
                    codigo: item.codigo,
                    nome: item['Nome completo'],
                    nome_completo: item['Nome completo'], // para compatibilidade
                    turma: item.turma,
                    responsavel: item.responsável,
                    telefone1: telefones.telefone1,
                    telefone2: telefones.telefone2,
                    telefone: telefones.telefone1, // para compatibilidade
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
        
        // Fazer delete usando código (usar query SQL direta se necessário)
        // Por enquanto, só marcar como inativo
        const updateData = {
            'código (matrícula)': codigo,
            'Nome completo': existing['Nome completo'],
            'turma': existing.turma,
            'responsável': existing.responsável,
            'Telefone do responsável': existing['Telefone do responsável'], 
            'Telefone do responsável 2': existing['Telefone do responsável 2']
        };
        
        // Como delete é complexo, vamos desabilitar por enquanto
        console.warn('⚠️ Função delete temporariamente desabilitada. Use o Supabase diretamente.');
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
                    const { data, error } = await supabase
                        .from('alunos')
                        .select('*')
                        .eq('codigo', parseInt(id))
                        .single();
                    
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
                    'data.nome_completo': data.nome_completo,
                    'data[Nome completo]': data['Nome completo'],
                    'todos_os_dados': data
                });
                
                const mappedData = {
                    'codigo': codigo,
                    'Nome completo': data.nome_completo || data.nome || data['Nome completo'],
                    'turma': data.turma,
                    'responsável': data.responsavel || data.responsável,
                    'Telefone do responsável': parseTelefone(data.telefone1 || data.telefone),
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
                
                // Mapear dados para update
                const updateData = {
                    'codigo': parseInt(id),
                    'Nome completo': data.nome_completo || data.nome || data['Nome completo'],
                    'turma': data.turma,
                    'responsável': data.responsavel || data.responsável,
                    'Telefone do responsável': parseTelefone(data.telefone1 || data.telefone),
                    'Telefone do responsável 2': parseTelefone(data.telefone2)
                };
                
                const { error } = await supabase
                    .from('alunos')
                    .update(updateData)
                    .eq('codigo', parseInt(id));
                
                if (error) throw error;
                return true;
            },
            
            async delete() {
                // Buscar o registro primeiro para verificar se existe
                const { data, error: fetchError } = await supabase
                    .from('alunos')
                    .select('*')
                    .eq('codigo', parseInt(id))
                    .single();
                
                if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;
                
                if (!data) {
                    throw new Error('Registro não encontrado');
                }
                
                const { error } = await supabase
                    .from('alunos')
                    .delete()
                    .eq('codigo', parseInt(id));
                
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

// ===== MEDIDAS DISCIPLINARES =====
const medidasDB = {
    collection(name) {
        if (name === 'medidas') {
            return {
                async add(data) {
                    try {
                        const mappedData = {
                            codigo_matricula: data.codigo_aluno || data.codigo_matricula,
                            nome_completo: data.nome_aluno || data.nome_completo,
                            turma: data.turma,
                            data: data.data,
                            especificacao: data.especificacao || data.motivo,
                            observacao: data.observacao || data.acoes,
                            tipo_medida: data.tipo_medida,
                            criado_em: new Date().toISOString()
                        };

                        const { data: result, error } = await supabase
                            .from('medidas')
                            .insert([mappedData])
                            .select();

                        if (error) throw error;
                        return { id: result[0].id };
                    } catch (error) {
                        console.error('Erro ao adicionar medida:', error);
                        throw error;
                    }
                },

                where(field, operator, value) {
                    return {
                        async get() {
                            try {
                                let query = supabase.from('medidas').select('*');
                                
                                if (field === 'codigo_aluno') {
                                    query = query.eq('codigo_matricula', value);
                                } else {
                                    query = query.eq(field, value);
                                }

                                const { data, error } = await query;
                                if (error) throw error;

                                return {
                                    size: data?.length || 0,
                                    empty: !data || data.length === 0,
                                    forEach: (callback) => {
                                        if (data) {
                                            data.forEach(item => callback({
                                                id: item.id,
                                                data: () => ({
                                                    codigo_aluno: item.codigo_matricula,
                                                    nome_aluno: item.nome_completo,
                                                    turma: item.turma,
                                                    data: item.data,
                                                    especificacao: item.especificacao,
                                                    observacao: item.observacao,
                                                    tipo_medida: item.tipo_medida,
                                                    data_registro: item.criado_em
                                                })
                                            }));
                                        }
                                    }
                                };
                            } catch (error) {
                                console.error('Erro ao buscar medidas:', error);
                                throw error;
                            }
                        }
                    };
                },

                async get() {
                    try {
                        const { data, error } = await supabase
                            .from('medidas')
                            .select('*')
                            .order('criado_em', { ascending: false });

                        if (error) throw error;

                        return {
                            size: data?.length || 0,
                            empty: !data || data.length === 0,
                            forEach: (callback) => {
                                if (data) {
                                    data.forEach(item => callback({
                                        id: item.id,
                                        data: () => ({
                                            codigo_aluno: item.codigo_matricula,
                                            nome_aluno: item.nome_completo,
                                            turma: item.turma,
                                            data: item.data,
                                            especificacao: item.especificacao,
                                            observacao: item.observacao,
                                            tipo_medida: item.tipo_medida,
                                            data_registro: item.criado_em
                                        })
                                    }));
                                }
                            }
                        };
                    } catch (error) {
                        console.error('Erro ao carregar medidas:', error);
                        throw error;
                    }
                }
            };
        }
        return null;
    }
};

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

// ===== SISTEMA HÍBRIDO =====
// Compatibilidade com código que espera Firebase
window.db = {
    collection(name) {
        if (name === 'alunos') {
            return alunosDB.collection('alunos');
        }
        if (name === 'medidas_disciplinares' || name === 'medidas') {
            return medidasDB.collection('medidas');
        }
        return null;
    }
};

// Auto-inicializar
window.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando sistema Supabase...');
    await initSupabase();
});

console.log('✅ Sistema Supabase carregado');