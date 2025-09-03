/**
 * Camada de dados para Notas Disciplinares
 * 
 * Fonte da verdade: Views do Supabase Postgres
 * - v_nota_disciplinar_atual: dados atuais da nota de cada aluno
 * - v_nota_disciplinar_contadores: contadores detalhados por tipo de medida
 * 
 * IMPORTANTE: Este módulo substitui todos os cálculos de nota do frontend.
 * A fonte da verdade agora são as views no Postgres.
 */

// Configuração do Supabase (será injetada pelo sistema principal)
let supabaseClient = null;

/**
 * Inicializa a conexão com o Supabase
 * @param {Object} client - Cliente do Supabase
 */
export function initSupabaseConnection(client) {
    supabaseClient = client;
    console.log('✅ Camada de dados de notas inicializada');
}

/**
 * Obtém cliente do Supabase (aguarda se necessário)
 * @returns {Promise<Object>} Cliente do Supabase
 */
async function getClient() {
    if (!supabaseClient) {
        // Aguardar client global estar disponível
        if (typeof window !== 'undefined' && window.supabaseClient) {
            supabaseClient = window.supabaseClient;
        } else {
            await new Promise(resolve => {
                const check = setInterval(() => {
                    if (window?.supabaseClient) {
                        supabaseClient = window.supabaseClient;
                        clearInterval(check);
                        resolve();
                    }
                }, 100);
            });
        }
    }
    return supabaseClient;
}

/**
 * Lista notas disciplinares com filtros e paginação
 * @param {Object} options - Opções de filtro e paginação
 * @param {string} options.turma - Filtrar por turma
 * @param {string} options.codigo_aluno - Filtrar por código do aluno
 * @param {number} options.limit - Limite de registros (padrão: 50)
 * @param {number} options.offset - Offset para paginação (padrão: 0)
 * @param {string} options.orderBy - Campo para ordenação (padrão: 'nome_completo')
 * @param {boolean} options.asc - Ordem ascendente (padrão: true)
 * @returns {Promise<{data: Array, error: any, count: number}>}
 */
export async function listNotasDisciplinares({
    turma = null,
    codigo_aluno = null,
    limit = 50,
    offset = 0,
    orderBy = 'nome_completo',
    asc = true
} = {}) {
    try {
        const client = await getClient();
        
        let query = client
            .from('v_nota_disciplinar_atual')
            .select('*', { count: 'exact' });
        
        // Aplicar filtros
        if (turma) {
            query = query.eq('turma', turma);
        }
        
        if (codigo_aluno) {
            query = query.eq('codigo_aluno', codigo_aluno);
        }
        
        // Aplicar ordenação
        if (orderBy === 'nome_completo' && !turma) {
            // Ordenação padrão: turma ASC, nome_completo ASC
            query = query.order('turma', { ascending: true })
                         .order('nome_completo', { ascending: true });
        } else {
            query = query.order(orderBy, { ascending: asc });
        }
        
        // Aplicar paginação
        query = query.range(offset, offset + limit - 1);
        
        const { data, error, count } = await query;
        
        console.log(`📊 Notas disciplinares consultadas: ${data?.length || 0} de ${count || 0} total`);
        
        return { data, error, count };
    } catch (error) {
        console.error('❌ Erro ao listar notas disciplinares:', error);
        return { data: null, error, count: 0 };
    }
}

/**
 * Obtém a nota disciplinar atual de um aluno específico
 * @param {string} codigo_aluno - Código do aluno
 * @returns {Promise<{data: Object|null, error: any}>}
 */
export async function getNotaDisciplinar(codigo_aluno) {
    try {
        const client = await getClient();
        
        const { data, error } = await client
            .from('v_nota_disciplinar_atual')
            .select('*')
            .eq('codigo_aluno', codigo_aluno)
            .limit(1);
        
        const result = data?.[0] ?? null;
        
        console.log(`📋 Nota disciplinar obtida para aluno ${codigo_aluno}:`, result?.nota_atual);
        
        return { data: result, error };
    } catch (error) {
        console.error(`❌ Erro ao obter nota do aluno ${codigo_aluno}:`, error);
        return { data: null, error };
    }
}

/**
 * Obtém os contadores detalhados de medidas disciplinares de um aluno
 * @param {string} codigo_aluno - Código do aluno
 * @returns {Promise<{data: Object|null, error: any}>}
 */
export async function getContadoresDisciplinar(codigo_aluno) {
    try {
        const client = await getClient();
        
        const { data, error } = await client
            .from('v_nota_disciplinar_contadores')
            .select('*')
            .eq('codigo_aluno', codigo_aluno)
            .limit(1);
        
        const result = data?.[0] ?? null;
        
        console.log(`📈 Contadores obtidos para aluno ${codigo_aluno}:`, result);
        
        return { data: result, error };
    } catch (error) {
        console.error(`❌ Erro ao obter contadores do aluno ${codigo_aluno}:`, error);
        return { data: null, error };
    }
}

/**
 * Obtém lista de turmas disponíveis (para filtros)
 * @returns {Promise<{data: Array, error: any}>}
 */
export async function getTurmasDisponiveis() {
    try {
        const client = await getClient();
        
        const { data, error } = await client
            .from('v_nota_disciplinar_atual')
            .select('turma')
            .order('turma', { ascending: true });
        
        // Remover duplicatas
        const turmasUnicas = [...new Set(data?.map(item => item.turma) || [])];
        
        console.log(`🎯 Turmas disponíveis: ${turmasUnicas.length}`);
        
        return { data: turmasUnicas, error };
    } catch (error) {
        console.error('❌ Erro ao obter turmas:', error);
        return { data: [], error };
    }
}

/**
 * Obtém estatísticas gerais de notas disciplinares
 * @param {Object} options - Opções de filtro
 * @param {string} options.turma - Filtrar por turma específica
 * @returns {Promise<{data: Object, error: any}>}
 */
export async function getEstatisticasNotas({ turma = null } = {}) {
    try {
        const client = await getClient();
        
        let query = client
            .from('v_nota_disciplinar_atual')
            .select('nota_atual, turma, data_ultima_negativa');
        
        if (turma) {
            query = query.eq('turma', turma);
        }
        
        const { data, error } = await query;
        
        if (error) {
            return { data: null, error };
        }
        
        // Calcular estatísticas
        const hoje = new Date();
        const difDias = (d) => d ? Math.floor((hoje - new Date(d)) / (1000*60*60*24)) : Infinity;
        
        const notas = data.map(item => item.nota_atual).filter(nota => nota !== null);
        const media = notas.length > 0 ? (notas.reduce((a, b) => a + b, 0) / notas.length) : 0;
        const notaMax = notas.length > 0 ? Math.max(...notas) : 0;
        const notaMin = notas.length > 0 ? Math.min(...notas) : 0;
        
        // Distribuição por faixas
        const excelentes = notas.filter(n => n >= 9.0).length;
        const bons = notas.filter(n => n >= 7.0 && n < 9.0).length;
        const regulares = notas.filter(n => n >= 5.0 && n < 7.0).length;
        const criticos = notas.filter(n => n < 5.0).length;
        
        // Calcular bônus ativo (60+ dias sem negativas)
        let bonusAtivo = 0;
        for (const item of data) {
            const dias = difDias(item.data_ultima_negativa);
            if (dias > 60) {
                bonusAtivo++;
            }
        }
        
        // Por turma (se não filtrado)
        let estatisticasPorTurma = [];
        if (!turma) {
            const turmas = [...new Set(data.map(item => item.turma))];
            estatisticasPorTurma = turmas.map(t => {
                const alunosTurma = data.filter(item => item.turma === t);
                const notasTurma = alunosTurma.map(item => item.nota_atual);
                const mediaTurma = notasTurma.length > 0 ? 
                    (notasTurma.reduce((a, b) => a + b, 0) / notasTurma.length) : 0;
                
                let bonusTurma = 0;
                for (const aluno of alunosTurma) {
                    if (difDias(aluno.data_ultima_negativa) > 60) {
                        bonusTurma++;
                    }
                }
                
                return {
                    turma: t,
                    totalAlunos: notasTurma.length,
                    mediaNota: parseFloat(mediaTurma.toFixed(2)),
                    alunosExcelentes: notasTurma.filter(n => n >= 9.0).length,
                    alunosCriticos: notasTurma.filter(n => n < 5.0).length,
                    alunosComBonus: bonusTurma
                };
            });
        }
        
        const estatisticas = {
            totalAlunos: data.length,
            mediaNota: parseFloat(media.toFixed(2)),
            notaMaxima: notaMax,
            notaMinima: notaMin,
            distribuicao: {
                excelentes,
                bons,
                regulares,
                criticos
            },
            bonusAtivo,
            bonusAtivoPct: data.length > 0 ? parseFloat((100 * bonusAtivo / data.length).toFixed(2)) : 0,
            porTurma: estatisticasPorTurma
        };
        
        console.log(`📊 Estatísticas gerais calculadas:`, estatisticas);
        
        return { data: estatisticas, error: null };
    } catch (error) {
        console.error('❌ Erro ao calcular estatísticas:', error);
        return { data: null, error };
    }
}

/**
 * Função de debug para desenvolvedores
 * Lista as primeiras 10 notas para verificação
 */
export async function debugNotas() {
    console.log('🔍 DEBUG: Consultando primeiras 10 notas disciplinares...');
    
    const { data, error, count } = await listNotasDisciplinares({ limit: 10 });
    
    if (error) {
        console.error('❌ Erro no debug:', error);
        return;
    }
    
    console.log(`📊 Total de registros: ${count}`);
    console.table(data);
    
    return { data, count };
}

/**
 * Utilitários para formatação e exibição
 */
export const NotasUtils = {
    /**
     * Formata a nota para exibição
     * @param {number} nota - Nota numérica
     * @returns {string} Nota formatada
     */
    formatarNota(nota) {
        if (typeof nota !== 'number') return 'N/A';
        return nota.toFixed(2);
    },
    
    /**
     * Retorna a cor da badge baseada na nota
     * @param {number} nota - Nota numérica
     * @returns {string} Classe CSS para a cor
     */
    getCorNota(nota) {
        if (typeof nota !== 'number') return 'badge-secondary';
        if (nota >= 9.0) return 'badge-success';
        if (nota >= 7.0) return 'badge-primary';
        if (nota >= 5.0) return 'badge-warning';
        return 'badge-danger';
    },
    
    /**
     * Retorna o texto descritivo da nota
     * @param {number} nota - Nota numérica
     * @returns {string} Descrição da nota
     */
    getDescricaoNota(nota) {
        if (typeof nota !== 'number') return 'Indefinida';
        if (nota >= 9.5) return 'Exemplar';
        if (nota >= 8.5) return 'Muito Bom';
        if (nota >= 7.0) return 'Bom';
        if (nota >= 6.0) return 'Regular';
        if (nota >= 4.0) return 'Insuficiente';
        return 'Crítico';
    },
    
    /**
     * Verifica se o bônus está ativo (60+ dias sem negativas)
     * @param {string|Date} dataUltimaNegativa - Data da última medida negativa
     * @returns {boolean} Se o bônus está ativo
     */
    isBonusAtivo(dataUltimaNegativa) {
        if (!dataUltimaNegativa) return true; // Nunca teve negativa = bônus ativo
        
        const ultimaNegativa = new Date(dataUltimaNegativa);
        const hoje = new Date();
        const diffTime = Math.abs(hoje - ultimaNegativa);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        return diffDays > 60;
    },
    
    /**
     * Calcula dias desde a última negativa
     * @param {string|Date} dataUltimaNegativa - Data da última medida negativa
     * @returns {number} Número de dias
     */
    diasSemNegativas(dataUltimaNegativa) {
        if (!dataUltimaNegativa) return Infinity;
        
        const ultimaNegativa = new Date(dataUltimaNegativa);
        const hoje = new Date();
        const diffTime = Math.abs(hoje - ultimaNegativa);
        
        return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
};

// Exportar função debug globalmente para console (apenas em desenvolvimento)
if (typeof window !== 'undefined') {
    window.debugNotas = debugNotas;
}

console.log('✅ Camada de dados de notas disciplinares carregada');