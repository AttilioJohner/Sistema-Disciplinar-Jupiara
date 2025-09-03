/**
 * Camada de dados para Frequência Escolar
 * 
 * Fontes da verdade: Views e Materialized Views do Supabase Postgres
 * - v_frequencia_diaria_turma: estatísticas diárias por turma (P, A, F, %)
 * - v_frequencia_acumulado_aluno: acumulado por aluno (P, A, F, %)
 * - mv_frequencia_mensal_aluno: resumo mensal por aluno (materializada)
 * - frequencia: tabela base para consultas específicas
 * 
 * IMPORTANTE: Regra operacional - A (atestado) é tratado como presença
 * % presença operacional = (P + A) / (P + A + F) * 100
 */

// Configuração do Supabase (será injetada pelo sistema principal)
let supabaseClient = null;

/**
 * Inicializa a conexão com o Supabase
 * @param {Object} client - Cliente do Supabase
 */
export function initSupabaseConnection(client) {
    supabaseClient = client;
    console.log('✅ Camada de dados de frequência inicializada');
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
 * Lista todas as FALTAS (datas) de um aluno
 * @param {string} codigo_matricula - Código de matrícula do aluno
 * @param {number} limit - Limite de registros (padrão: 100)
 * @returns {Promise<{data: Array, error: any}>}
 */
export async function getFaltasAluno(codigo_matricula, limit = 100) {
    try {
        const client = await getClient();
        
        const { data, error } = await client
            .from('frequencia')
            .select('data, status, turma, nome_completo')
            .eq('codigo_matricula', codigo_matricula)
            .eq('status', 'F')
            .order('data', { ascending: false })
            .limit(limit);
        
        console.log(`📅 Faltas obtidas para aluno ${codigo_matricula}: ${data?.length || 0} registros`);
        
        return { data, error };
    } catch (error) {
        console.error(`❌ Erro ao obter faltas do aluno ${codigo_matricula}:`, error);
        return { data: null, error };
    }
}

/**
 * Resumo acumulado por aluno (P, A, F, %)
 * @param {string} codigo_matricula - Código de matrícula do aluno
 * @returns {Promise<{data: Object|null, error: any}>}
 */
export async function getResumoAcumuladoAluno(codigo_matricula) {
    try {
        const client = await getClient();
        
        const { data, error } = await client
            .from('v_frequencia_acumulado_aluno')
            .select('*')
            .eq('codigo_matricula', codigo_matricula)
            .limit(1);
        
        const result = data?.[0] ?? null;
        
        console.log(`📊 Resumo acumulado obtido para aluno ${codigo_matricula}:`, 
                   result ? `${result.pct_presenca_operacional}%` : 'não encontrado');
        
        return { data: result, error };
    } catch (error) {
        console.error(`❌ Erro ao obter resumo acumulado do aluno ${codigo_matricula}:`, error);
        return { data: null, error };
    }
}

/**
 * Resumo mensal de um aluno específico
 * @param {string} codigo_matricula - Código de matrícula do aluno
 * @param {string} mes - Mês no formato 'YYYY-MM-DD' (dia sempre 01)
 * @returns {Promise<{data: Array, error: any}>}
 */
export async function getResumoMensalAluno(codigo_matricula, mes = null) {
    try {
        const client = await getClient();
        
        let query = client
            .from('mv_frequencia_mensal_aluno')
            .select('*')
            .eq('codigo_matricula', codigo_matricula);
        
        if (mes) {
            query = query.eq('mes', mes);
        }
        
        query = query.order('mes', { ascending: false });
        
        const { data, error } = await query;
        
        console.log(`📅 Resumo mensal obtido para aluno ${codigo_matricula}: ${data?.length || 0} meses`);
        
        return { data, error };
    } catch (error) {
        console.error(`❌ Erro ao obter resumo mensal do aluno ${codigo_matricula}:`, error);
        return { data: null, error };
    }
}

/**
 * Resumo mensal do mês atual de um aluno
 * @param {string} codigo_matricula - Código de matrícula do aluno
 * @returns {Promise<{data: Object|null, error: any}>}
 */
export async function getResumoMensalAtualAluno(codigo_matricula) {
    try {
        // Obter primeiro dia do mês atual
        const hoje = new Date();
        const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const mesAtual = primeiroDiaMes.toISOString().split('T')[0];
        
        const { data, error } = await getResumoMensalAluno(codigo_matricula, mesAtual);
        
        const result = data?.[0] ?? null;
        
        return { data: result, error };
    } catch (error) {
        console.error(`❌ Erro ao obter resumo mensal atual do aluno ${codigo_matricula}:`, error);
        return { data: null, error };
    }
}

/**
 * Comparativo de frequência por turma no mês
 * @param {string} mes - Mês no formato 'YYYY-MM-DD' (dia sempre 01)
 * @returns {Promise<{data: Array, error: any}>}
 */
export async function getComparativoTurmas(mes = null) {
    try {
        const client = await getClient();
        
        // Se não especificar mês, usar o atual
        if (!mes) {
            const hoje = new Date();
            const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
            mes = primeiroDiaMes.toISOString().split('T')[0];
        }
        
        const { data, error } = await client
            .from('mv_frequencia_mensal_aluno')
            .select('turma, codigo_matricula, pct_presenca_operacional, total_aulas, presencas, atestados, faltas')
            .eq('mes', mes)
            .order('turma');
        
        if (error) {
            return { data: null, error };
        }
        
        // Agrupar por turma e calcular médias
        const turmaStats = {};
        
        data.forEach(registro => {
            const turma = registro.turma;
            
            if (!turmaStats[turma]) {
                turmaStats[turma] = {
                    turma,
                    totalAlunos: 0,
                    somaPresenca: 0,
                    totalAulas: 0,
                    totalPresencas: 0,
                    totalAtestados: 0,
                    totalFaltas: 0,
                    alunos: []
                };
            }
            
            turmaStats[turma].totalAlunos++;
            turmaStats[turma].somaPresenca += registro.pct_presenca_operacional || 0;
            turmaStats[turma].totalAulas += registro.total_aulas || 0;
            turmaStats[turma].totalPresencas += registro.presencas || 0;
            turmaStats[turma].totalAtestados += registro.atestados || 0;
            turmaStats[turma].totalFaltas += registro.faltas || 0;
            turmaStats[turma].alunos.push({
                codigo: registro.codigo_matricula,
                presenca: registro.pct_presenca_operacional
            });
        });
        
        // Calcular médias e estatísticas finais
        const resultado = Object.values(turmaStats).map(turma => ({
            turma: turma.turma,
            totalAlunos: turma.totalAlunos,
            mediaPresenca: turma.totalAlunos > 0 ? 
                (turma.somaPresenca / turma.totalAlunos).toFixed(2) : 0,
            totalAulas: turma.totalAulas,
            totalPresencas: turma.totalPresencas,
            totalAtestados: turma.totalAtestados,
            totalFaltas: turma.totalFaltas,
            percentualPresencaGeral: turma.totalAulas > 0 ? 
                (((turma.totalPresencas + turma.totalAtestados) / turma.totalAulas) * 100).toFixed(2) : 0
        }));
        
        console.log(`📊 Comparativo de turmas calculado para ${mes}: ${resultado.length} turmas`);
        
        return { data: resultado, error: null };
    } catch (error) {
        console.error(`❌ Erro ao obter comparativo de turmas:`, error);
        return { data: null, error };
    }
}

/**
 * Frequência diária de uma turma específica
 * @param {string} turma - Nome da turma
 * @param {string} inicio - Data de início (YYYY-MM-DD) - opcional
 * @param {string} fim - Data de fim (YYYY-MM-DD) - opcional
 * @returns {Promise<{data: Array, error: any}>}
 */
export async function getFrequenciaDiariaTurma(turma, inicio = null, fim = null) {
    try {
        const client = await getClient();
        
        let query = client
            .from('v_frequencia_diaria_turma')
            .select('*')
            .eq('turma', turma)
            .order('data', { ascending: true });
        
        const { data, error } = await query;
        
        if (error) {
            return { data: null, error };
        }
        
        // Filtrar por intervalo de datas no frontend (mais flexível)
        let dataFiltrada = data;
        
        if (inicio) {
            dataFiltrada = dataFiltrada.filter(item => item.data >= inicio);
        }
        
        if (fim) {
            dataFiltrada = dataFiltrada.filter(item => item.data <= fim);
        }
        
        console.log(`📅 Frequência diária obtida para turma ${turma}: ${dataFiltrada.length} dias`);
        
        return { data: dataFiltrada, error: null };
    } catch (error) {
        console.error(`❌ Erro ao obter frequência diária da turma ${turma}:`, error);
        return { data: null, error };
    }
}

/**
 * Lista de turmas disponíveis para filtros
 * @returns {Promise<{data: Array, error: any}>}
 */
export async function getTurmasDisponiveisFrequencia() {
    try {
        const client = await getClient();
        
        const { data, error } = await client
            .from('v_frequencia_acumulado_aluno')
            .select('turma')
            .order('turma', { ascending: true });
        
        // Remover duplicatas
        const turmasUnicas = [...new Set(data?.map(item => item.turma) || [])];
        
        console.log(`🎯 Turmas disponíveis (frequência): ${turmasUnicas.length}`);
        
        return { data: turmasUnicas, error };
    } catch (error) {
        console.error('❌ Erro ao obter turmas disponíveis:', error);
        return { data: [], error };
    }
}

/**
 * Estatísticas gerais de frequência
 * @param {string} turma - Filtrar por turma (opcional)
 * @returns {Promise<{data: Object, error: any}>}
 */
export async function getEstatisticasFrequencia(turma = null) {
    try {
        const client = await getClient();
        
        let query = client
            .from('v_frequencia_acumulado_aluno')
            .select('*');
        
        if (turma) {
            query = query.eq('turma', turma);
        }
        
        const { data, error } = await query;
        
        if (error) {
            return { data: null, error };
        }
        
        // Calcular estatísticas
        const presencas = data.map(item => item.pct_presenca_operacional).filter(p => p !== null);
        const mediaPresenca = presencas.length > 0 ? 
            (presencas.reduce((a, b) => a + b, 0) / presencas.length).toFixed(2) : 0;
        
        // Distribuição por faixas
        const excelentes = presencas.filter(p => p >= 95).length; // 95%+
        const bons = presencas.filter(p => p >= 85 && p < 95).length; // 85-94%
        const regulares = presencas.filter(p => p >= 75 && p < 85).length; // 75-84%
        const criticos = presencas.filter(p => p < 75).length; // <75%
        
        // Totais gerais
        const totalPresencas = data.reduce((sum, item) => sum + (item.presencas || 0), 0);
        const totalAtestados = data.reduce((sum, item) => sum + (item.atestados || 0), 0);
        const totalFaltas = data.reduce((sum, item) => sum + (item.faltas || 0), 0);
        const totalAulas = totalPresencas + totalAtestados + totalFaltas;
        
        const estatisticas = {
            totalAlunos: data.length,
            mediaPresenca: parseFloat(mediaPresenca),
            maiorPresenca: presencas.length > 0 ? Math.max(...presencas) : 0,
            menorPresenca: presencas.length > 0 ? Math.min(...presencas) : 0,
            distribuicao: {
                excelentes,
                bons,
                regulares,
                criticos
            },
            totaisGerais: {
                totalAulas,
                totalPresencas,
                totalAtestados,
                totalFaltas,
                percentualPresencaGeral: totalAulas > 0 ? 
                    (((totalPresencas + totalAtestados) / totalAulas) * 100).toFixed(2) : 0
            }
        };
        
        console.log(`📊 Estatísticas de frequência calculadas:`, estatisticas);
        
        return { data: estatisticas, error: null };
    } catch (error) {
        console.error('❌ Erro ao calcular estatísticas de frequência:', error);
        return { data: null, error };
    }
}

/**
 * Alunos com baixa frequência (menos de 75%)
 * @param {string} turma - Filtrar por turma (opcional)
 * @param {number} limite - Limite de presença para considerar "baixa" (padrão: 75)
 * @returns {Promise<{data: Array, error: any}>}
 */
export async function getAlunosComBaixaFrequencia(turma = null, limite = 75) {
    try {
        const client = await getClient();
        
        let query = client
            .from('v_frequencia_acumulado_aluno')
            .select('*')
            .lt('pct_presenca_operacional', limite)
            .order('pct_presenca_operacional', { ascending: true });
        
        if (turma) {
            query = query.eq('turma', turma);
        }
        
        const { data, error } = await query;
        
        console.log(`⚠️ Alunos com baixa frequência (<${limite}%): ${data?.length || 0}`);
        
        return { data, error };
    } catch (error) {
        console.error('❌ Erro ao obter alunos com baixa frequência:', error);
        return { data: null, error };
    }
}

/**
 * Refresh da Materialized View mensal (requer permissões administrativas)
 * @returns {Promise<{success: boolean, error: any}>}
 */
export async function refreshMaterializedView() {
    try {
        const client = await getClient();
        
        // Executar refresh da MV
        const { data, error } = await client
            .rpc('refresh_mv_frequencia_mensal');
        
        if (error) {
            console.error('❌ Erro ao fazer refresh da MV:', error);
            return { success: false, error };
        }
        
        console.log('✅ Materialized View refreshed com sucesso');
        return { success: true, error: null };
    } catch (error) {
        console.error('❌ Erro no refresh da MV:', error);
        return { success: false, error };
    }
}

/**
 * Função de debug para desenvolvedores - frequência
 * Lista os primeiros 10 registros do resumo mensal atual
 */
export async function debugFreq() {
    console.log('🔍 DEBUG: Consultando resumo mensal atual (primeiros 10)...');
    
    try {
        const hoje = new Date();
        const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        const mesAtual = primeiroDiaMes.toISOString().split('T')[0];
        
        const client = await getClient();
        
        const { data, error } = await client
            .from('mv_frequencia_mensal_aluno')
            .select('*')
            .eq('mes', mesAtual)
            .order('pct_presenca_operacional', { ascending: true })
            .limit(10);
        
        if (error) {
            console.error('❌ Erro no debug:', error);
            return;
        }
        
        console.log(`📊 Mês atual (${mesAtual}): ${data?.length || 0} registros`);
        console.table(data);
        
        // Estatísticas rápidas
        if (data && data.length > 0) {
            const presencas = data.map(d => d.pct_presenca_operacional);
            const media = (presencas.reduce((a, b) => a + b, 0) / presencas.length).toFixed(2);
            console.log(`📈 Média de presença nesta amostra: ${media}%`);
        }
        
        return { data, mesAtual };
    } catch (error) {
        console.error('❌ Erro no debug de frequência:', error);
        return null;
    }
}

/**
 * Utilitários para formatação de frequência
 */
export const FrequenciaUtils = {
    /**
     * Formata percentual de presença
     * @param {number} percentual - Percentual numérico
     * @returns {string} Percentual formatado
     */
    formatarPercentual(percentual) {
        if (typeof percentual !== 'number') return 'N/A';
        return percentual.toFixed(1) + '%';
    },
    
    /**
     * Retorna cor da badge baseada no percentual de presença
     * @param {number} percentual - Percentual de presença
     * @returns {string} Classe CSS para a cor
     */
    getCorPresenca(percentual) {
        if (typeof percentual !== 'number') return 'badge-secondary';
        if (percentual >= 95) return 'badge-success';
        if (percentual >= 85) return 'badge-primary';
        if (percentual >= 75) return 'badge-warning';
        return 'badge-danger';
    },
    
    /**
     * Retorna descrição da situação de frequência
     * @param {number} percentual - Percentual de presença
     * @returns {string} Descrição da situação
     */
    getDescricaoPresenca(percentual) {
        if (typeof percentual !== 'number') return 'Indefinida';
        if (percentual >= 95) return 'Excelente';
        if (percentual >= 85) return 'Boa';
        if (percentual >= 75) return 'Regular';
        if (percentual >= 50) return 'Baixa';
        return 'Crítica';
    },
    
    /**
     * Formata data para exibição brasileira
     * @param {string} data - Data no formato ISO
     * @returns {string} Data formatada
     */
    formatarData(data) {
        if (!data) return 'N/A';
        try {
            return new Date(data).toLocaleDateString('pt-BR');
        } catch {
            return data;
        }
    },
    
    /**
     * Formata mês/ano para exibição
     * @param {string} mes - Mês no formato YYYY-MM-DD
     * @returns {string} Mês formatado
     */
    formatarMesAno(mes) {
        if (!mes) return 'N/A';
        try {
            const data = new Date(mes);
            return data.toLocaleDateString('pt-BR', { 
                year: 'numeric', 
                month: 'long' 
            });
        } catch {
            return mes;
        }
    }
};

/**
 * Lista frequência acumulada por aluno (compatibilidade com legado)
 * @param {Object} options - Opções de filtro
 * @param {string} options.turma - Filtrar por turma
 * @param {number} options.limit - Limite de registros (padrão: 1000)
 * @param {number} options.offset - Offset para paginação (padrão: 0)
 * @returns {Promise<{data: Array, error: any, count: number}>}
 */
export async function listFrequenciaAcumulada({ turma = null, limit = 1000, offset = 0 } = {}) {
    try {
        const client = await getClient();
        
        let query = client
            .from('v_frequencia_acumulado_aluno')
            .select('*', { count: 'exact' });
        
        if (turma) {
            query = query.eq('turma', turma);
        }
        
        query = query
            .order('turma', { ascending: true })
            .order('nome_completo', { ascending: true })
            .range(offset, offset + limit - 1);
        
        const { data, error, count } = await query;
        
        console.log(`📊 Frequência acumulada consultada: ${data?.length || 0} de ${count || 0} total`);
        
        return { data, error, count };
    } catch (error) {
        console.error('❌ Erro ao listar frequência acumulada:', error);
        return { data: null, error, count: 0 };
    }
}

/**
 * Lista datas de faltas de um aluno específico
 * @param {string} codigo_matricula - Código do aluno
 * @returns {Promise<{data: Array, error: any}>}
 */
export async function listFaltasDoAluno(codigo_matricula) {
    try {
        const client = await getClient();
        
        const { data, error } = await client
            .from('frequencia')
            .select('data, status')
            .eq('codigo_matricula', codigo_matricula)
            .eq('status', 'F')
            .order('data', { ascending: false });
        
        console.log(`📅 Faltas consultadas para ${codigo_matricula}: ${data?.length || 0} registros`);
        
        return { data, error };
    } catch (error) {
        console.error(`❌ Erro ao listar faltas do aluno ${codigo_matricula}:`, error);
        return { data: null, error };
    }
}

/**
 * Lista resumo mensal da turma
 * @param {Object} options - Opções de filtro
 * @param {string} options.turma - Turma específica
 * @param {string} options.mes - Mês no formato 'YYYY-MM-01'
 * @returns {Promise<{data: Array, error: any}>}
 */
export async function listMensalDaTurma({ turma = null, mes = null } = {}) {
    try {
        const client = await getClient();
        
        let query = client.from('mv_frequencia_mensal_aluno').select('*');
        
        if (turma) {
            query = query.eq('turma', turma);
        }
        
        if (mes) {
            query = query.eq('mes', mes); // formato 'YYYY-MM-01'
        }
        
        const { data, error } = await query
            .order('pct_presenca_operacional', { ascending: false });
        
        console.log(`📊 Resumo mensal consultado: ${data?.length || 0} registros`);
        
        return { data, error };
    } catch (error) {
        console.error('❌ Erro ao listar resumo mensal:', error);
        return { data: null, error };
    }
}

/**
 * Lista comparativo de frequência por turma no mês
 * @param {string} mes - Mês no formato 'YYYY-MM-01'
 * @returns {Promise<{data: Array, error: any}>}
 */
export async function listComparativoTurmas(mes) {
    try {
        const client = await getClient();
        
        // Como o Supabase não suporta GROUP BY direto no JS client,
        // vamos buscar todos os dados e agregar no cliente
        const { data, error } = await client
            .from('mv_frequencia_mensal_aluno')
            .select('turma, pct_presenca_operacional')
            .eq('mes', mes);
        
        if (error) {
            return { data: null, error };
        }
        
        // Agregar por turma no cliente
        const turmasMap = new Map();
        
        (data || []).forEach(row => {
            const turma = row.turma;
            if (!turmasMap.has(turma)) {
                turmasMap.set(turma, {
                    turma,
                    totalAlunos: 0,
                    somaPresenca: 0
                });
            }
            const stats = turmasMap.get(turma);
            stats.totalAlunos++;
            stats.somaPresenca += (row.pct_presenca_operacional || 0);
        });
        
        // Calcular médias
        const resultado = Array.from(turmasMap.values()).map(stats => ({
            turma: stats.turma,
            totalAlunos: stats.totalAlunos,
            media_presenca: stats.totalAlunos > 0 ? 
                stats.somaPresenca / stats.totalAlunos : 0
        })).sort((a, b) => a.turma.localeCompare(b.turma));
        
        console.log(`📊 Comparativo de turmas para ${mes}: ${resultado.length} turmas`);
        
        return { data: resultado, error: null };
    } catch (error) {
        console.error('❌ Erro ao listar comparativo de turmas:', error);
        return { data: null, error };
    }
}

// Exportar função debug globalmente para console (apenas em desenvolvimento)
if (typeof window !== 'undefined') {
    window.debugFreq = debugFreq;
    window.getResumoAcumuladoAluno = getResumoAcumuladoAluno;
    window.getFaltasAluno = getFaltasAluno;
    window.getResumoMensalAtualAluno = getResumoMensalAtualAluno;
    window.getResumoMensalAluno = getResumoMensalAluno;
    window.getEstatisticasFrequencia = getEstatisticasFrequencia;
    window.FrequenciaUtils = FrequenciaUtils;
    
    // Adicionar novas funções para compatibilidade
    window.listFrequenciaAcumulada = listFrequenciaAcumulada;
    window.listFaltasDoAluno = listFaltasDoAluno;
    window.listMensalDaTurma = listMensalDaTurma;
    window.listComparativoTurmas = listComparativoTurmas;
}

console.log('✅ Camada de dados de frequência carregada');