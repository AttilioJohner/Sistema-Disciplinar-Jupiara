// SISTEMA APENAS SUPABASE - SEM LOCALSTORAGE
console.log('🎯 Carregando sistema APENAS Supabase...');

// Configuração global
let supabase = null;
let currentUser = null;

// Inicializar Supabase
async function initSupabase() {
    // Evitar múltiplas inicializações (singleton global)
    if (supabase || window.supabaseClient) {
        console.log('🔄 Supabase já inicializado, reutilizando instância');
        if (!supabase && window.supabaseClient) {
            supabase = window.supabaseClient;
        }
        return true;
    }
    
    // Aguardar variáveis de ambiente estarem disponíveis
    let tentativas = 0;
    while ((!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) && tentativas < 50) {
        console.log(`⏳ Aguardando variáveis Supabase... tentativa ${tentativas + 1}/50`);
        await new Promise(resolve => setTimeout(resolve, 100));
        tentativas++;
    }
    
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
        console.error('❌ Timeout: Credenciais Supabase não configuradas após 5s');
        
        // Debug das variáveis disponíveis
        console.log('🔍 Debug Variáveis:');
        console.log('- window.SUPABASE_URL:', window.SUPABASE_URL);
        console.log('- window.SUPABASE_ANON_KEY:', window.SUPABASE_ANON_KEY ? '✅ Existe' : '❌ Não existe');
        console.log('- window.NETLIFY_ENV:', window.NETLIFY_ENV);
        console.log('- window.env:', window.env);
        
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
    window.location.href = '/pages/login.html';
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
        window.location.href = '/pages/login.html';
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

// Helper para aplicar filtro de unidade
function aplicarFiltroUnidade(query) {
    // Se existir o seletor de unidade, aplicar filtro
    if (window.unidadeSelector && typeof window.unidadeSelector.getUnidade === 'function') {
        const unidade = window.unidadeSelector.getUnidade();
        return query.eq('unidade', unidade);
    }
    // Se não existe, retornar query sem filtro (comportamento padrão)
    return query;
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

        let query = supabase
            .from('alunos')
            .select('codigo, "código (matrícula)", "Nome completo", turma, responsável, "Telefone do responsável", "Telefone do responsável 2", unidade')
            .order('"Nome completo"');

        // Aplicar filtro de unidade
        query = aplicarFiltroUnidade(query);

        const { data, error } = await query;

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
            .select('codigo, "código (matrícula)", "Nome completo", turma, responsável, "Telefone do responsável", "Telefone do responsável 2"');
        
        if (error) throw error;
        
        const data = allData?.find(item => 
            item['código (matrícula)'] === codigo
        ) || null;
        
        if (error) throw error;
        return data;
    },
    
    // Função otimizada para buscar apenas uma turma específica
    async getByTurma(turma) {
        if (!supabase) {
            await initSupabase();
        }

        if (!supabase) {
            console.error('❌ Supabase não disponível em alunosDB.getByTurma()');
            return [];
        }

        let query = supabase
            .from('alunos')
            .select('codigo, "código (matrícula)", "Nome completo", turma, "responsável", "Telefone do responsável", "Telefone do responsável 2", foto_url, unidade')
            .eq('turma', turma)
            .order('"Nome completo"');

        // Aplicar filtro de unidade
        query = aplicarFiltroUnidade(query);

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
    },
    
    // Função para consulta geral (apenas código, nome, turma) - ultra otimizada
    async getAllBasic() {
        if (!supabase) {
            await initSupabase();
        }

        if (!supabase) {
            console.error('❌ Supabase não disponível em alunosDB.getAllBasic()');
            return [];
        }

        let query = supabase
            .from('alunos')
            .select('codigo, "código (matrícula)", "Nome completo", turma, unidade')
            .order('"Nome completo"');

        // Aplicar filtro de unidade
        query = aplicarFiltroUnidade(query);

        const { data, error } = await query;

        if (error) throw error;
        return data || [];
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
        // Procurando aluno para atualização...
        
        // Buscar primeiro para obter registro completo
        const { data: allData } = await supabase
            .from('alunos')
            .select('codigo, "código (matrícula)", "Nome completo", turma, responsável, "Telefone do responsável", "Telefone do responsável 2"');
        
        // Dados carregados do Supabase
        
        // Procurar por diferentes campos possíveis (convertendo tipos)
        const existing = allData?.find(item => {
            const codigoStr = String(codigo);
            const codigoNum = Number(codigo);
            
            const matches = (
                item['código (matrícula)'] === codigoStr || 
                item['código (matrícula)'] === codigoNum ||
                item.codigo === codigoStr ||
                item.codigo === codigoNum ||
                item.id === codigoStr ||
                item.id === codigoNum
            );
            // Debug removido para limpar console
            return matches;
        });
        
        if (!existing) {
            console.log('❌ UPDATE - Nenhum aluno encontrado para:', codigo);
            throw new Error('Aluno não encontrado');
        }
        
        console.log('✅ UPDATE - Aluno encontrado:', existing);
        
        // Mapear dados igual ao create (campos com nomes corretos do Supabase)
        const mappedData = {
            'código (matrícula)': codigo,  // Primary key
            'codigo': codigo,              // Coluna simples
            'Nome completo': aluno.nome_completo || aluno.nome || aluno['Nome completo'],
            'turma': aluno.turma,
            'responsável': aluno.responsavel || aluno.responsável,
            'Telefone do responsável': aluno.telefone1 || aluno.telefone,
            'Telefone do responsável 2': aluno.telefone2,
            'foto_url': aluno.foto_url || null
        };
        
        // Dados mapeados para atualização
        
        const { data, error } = await supabase
            .from('alunos')
            .upsert(mappedData)
            .select()
            .single();
        
        if (error) throw error;
        return data;
    },
    
    async delete(codigo) {
        // Buscar primeiro para verificar existência
        const { data: allData } = await supabase
            .from('alunos')
            .select('codigo, "código (matrícula)", "Nome completo", turma, responsável, "Telefone do responsável", "Telefone do responsável 2"');

        const existing = allData?.find(item =>
            item['código (matrícula)'] == codigo || item.codigo == codigo
        );
        
        if (!existing) {
            throw new Error('Aluno não encontrado');
        }
        
        // Fazer delete real usando código (matrícula)
        console.log('🗑️ Excluindo aluno:', existing);

        const { error } = await supabase
            .from('alunos')
            .delete()
            .eq('codigo', existing['código (matrícula)'] || existing.codigo);

        console.log('🗑️ Resultado exclusão Supabase:', error ? 'ERRO: ' + error.message : 'SUCESSO');

        if (error) throw error;

        return { success: true, deleted: existing };
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
                    
                    // Buscar pelo código usando estratégia segura (busca geral + filtro) - incluindo foto_url para função doc().get()
                    const { data: allData, error } = await supabase
                        .from('alunos')
                        .select('codigo, "código (matrícula)", "Nome completo", turma, responsável, "Telefone do responsável", "Telefone do responsável 2", foto_url');
                    
                    let data = null;
                    if (!error && allData) {
                        data = allData.find(item => 
                            item['código (matrícula)'] === parseInt(id) ||
                            item.codigo === parseInt(id)
                        ) || null;
                    }
                    
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
                                id: data['código (matrícula)'] || data.codigo,
                                codigo: data['código (matrícula)'] || data.codigo,
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
                    'código (matrícula)': codigo,  // Coluna com espaços e parênteses
                    'codigo': codigo,              // Coluna simples (obrigatória também)
                    'Nome completo': data.nome_completo || data.nome || data['Nome completo'],
                    'turma': data.turma,
                    'responsável': data.responsavel || data.responsável,
                    'Telefone do responsável': parseTelefone(data.telefone1 || data.telefone),
                    'Telefone do responsável 2': parseTelefone(data.telefone2),
                    'foto_url': data.foto_url || null
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
                    .select('codigo, "código (matrícula)", "Nome completo", turma, responsável, "Telefone do responsável", "Telefone do responsável 2"');
                
                const record = allData?.find(item => 
                    item['código (matrícula)'] === parseInt(id) ||
                    item.codigo === parseInt(id)
                );
                
                if (!record) {
                    throw new Error('Registro não encontrado');
                }
                
                // Mapear dados para update
                const updateData = {
                    'código (matrícula)': parseInt(id),  // Coluna com espaços e parênteses
                    'codigo': parseInt(id),              // Coluna simples (obrigatória também)
                    'Nome completo': data.nome_completo || data.nome || data['Nome completo'],
                    'turma': data.turma,
                    'responsável': data.responsavel || data.responsável,
                    'Telefone do responsável': parseTelefone(data.telefone1 || data.telefone),
                    'Telefone do responsável 2': parseTelefone(data.telefone2)
                };
                
                const { error } = await supabase
                    .from('alunos')
                    .update(updateData)
                    .eq('codigo', parseInt(id));  // Usar coluna simples para evitar problemas com caracteres especiais
                
                if (error) throw error;
                return true;
            },
            
            async delete() {
                // Buscar o registro primeiro para verificar se existe
                const { data, error: fetchError } = await supabase
                    .from('alunos')
                    .select('codigo, "código (matrícula)", "Nome completo", turma, responsável, "Telefone do responsável", "Telefone do responsável 2"')
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
                    .select('codigo, "código (matrícula)", "Nome completo", turma, responsável, "Telefone do responsável", "Telefone do responsável 2"')
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
        // Buscar códigos dos alunos da unidade atual
        let queryAlunos = supabase.from('alunos').select('codigo');
        queryAlunos = aplicarFiltroUnidade(queryAlunos);
        const { data: alunosDaUnidade } = await queryAlunos;
        const codigosDaUnidade = alunosDaUnidade?.map(a => a.codigo) || [];

        if (codigosDaUnidade.length === 0) {
            return [];
        }

        // Buscar medidas apenas desses alunos
        const { data, error } = await supabase
            .from('medidas')
            .select('*')
            .in('codigo_matricula', codigosDaUnidade)
            .order('data_ocorrencia', { ascending: false });

        if (error) throw error;
        return data || [];
    },

    async getByAluno(alunoId) {
        // Verificar se aluno pertence à unidade atual
        let queryAluno = supabase
            .from('alunos')
            .select('codigo')
            .eq('codigo', alunoId);
        queryAluno = aplicarFiltroUnidade(queryAluno);
        const { data: alunoData } = await queryAluno;

        // Se aluno não pertence à unidade, retornar vazio
        if (!alunoData || alunoData.length === 0) {
            return [];
        }

        const { data, error } = await supabase
            .from('medidas')
            .select('*')
            .eq('codigo_matricula', alunoId)
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
            return { totalAlunos: 0, totalMedidas: 0, totalFaltas: 0, totalTurmas: 0 };
        }

        const unidade = window.unidadeSelector ? window.unidadeSelector.getUnidade() : 'Sede';
        console.log(`📊 Carregando estatísticas do Supabase para unidade: ${unidade}`);

        // Total alunos - FILTRADO POR UNIDADE
        let queryAlunos = supabase
            .from('alunos')
            .select('*', { count: 'exact', head: true });
        queryAlunos = aplicarFiltroUnidade(queryAlunos);
        const { count: totalAlunos } = await queryAlunos;

        // Total medidas - FILTRADO POR UNIDADE (via join com alunos)
        // Precisa buscar códigos dos alunos da unidade primeiro
        let queryAlunosCodigos = supabase
            .from('alunos')
            .select('codigo');
        queryAlunosCodigos = aplicarFiltroUnidade(queryAlunosCodigos);
        const { data: alunosDaUnidade } = await queryAlunosCodigos;
        const codigosDaUnidade = alunosDaUnidade?.map(a => a.codigo) || [];

        let totalMedidas = 0;
        let totalFaltas = 0;

        if (codigosDaUnidade.length > 0) {
            // Contar medidas apenas dos alunos desta unidade
            const { count: countMedidas } = await supabase
                .from('medidas')
                .select('*', { count: 'exact', head: true })
                .in('codigo_matricula', codigosDaUnidade);

            totalMedidas = countMedidas || 0;

            // Total faltas (da tabela frequencia)
            const { count: countFaltas } = await supabase
                .from('frequencia')
                .select('*', { count: 'exact', head: true })
                .in('codigo_matricula', codigosDaUnidade)
                .in('status', ['F', 'FC']);

            totalFaltas = countFaltas || 0;
        }

        // Turmas únicas - FILTRADO POR UNIDADE
        let queryTurmas = supabase
            .from('alunos')
            .select('turma')
            .not('turma', 'is', null);
        queryTurmas = aplicarFiltroUnidade(queryTurmas);
        const { data: turmas } = await queryTurmas;

        const turmasUnicas = [...new Set(turmas?.map(t => t.turma) || [])].length;

        return {
            totalAlunos: totalAlunos || 0,
            totalMedidas: totalMedidas,
            totalFaltas: totalFaltas,
            totalTurmas: turmasUnicas
        };

    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
        return {
            totalAlunos: 0,
            totalMedidas: 0,
            totalFaltas: 0,
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
        alunos: alunosDB
    },
    stats: getStatistics
};

// Auto-inicializar
window.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 Inicializando sistema Supabase...');
    await initSupabase();
});

console.log('✅ Sistema Supabase carregado');