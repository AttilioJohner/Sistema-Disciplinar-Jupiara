/**
 * Adaptadores Globais para Compatibilidade com Código Legado
 * 
 * Este arquivo mapeia as funções modernas das camadas de dados
 * para os nomes esperados pelo código legado, expondo-as no window.*
 * 
 * IMPORTANTE: Importar este arquivo antes de usar as funções globais
 */

// Importar funções das camadas de dados
import { 
    listFrequenciaAcumulada, 
    listFaltasDoAluno, 
    listMensalDaTurma, 
    listComparativoTurmas,
    getEstatisticasFrequencia as getEstatisticasFrequenciaModern
} from '../data/frequencia.js';

import { 
    getEstatisticasNotas,
    listNotasDisciplinares,
    getTurmasDisponiveis as getTurmasDisponiveisNotas
} from '../data/notas.js';

/**
 * Obtém lista de turmas disponíveis (busca do mês atual)
 * @returns {Promise<{data: Array, error: any}>}
 */
async function getTurmasDisponiveis() {
    try {
        // Primeiro tentar buscar das notas (mais abrangente)
        const { data: turmasNotas, error: errorNotas } = await getTurmasDisponiveisNotas();
        
        if (!errorNotas && turmasNotas && turmasNotas.length > 0) {
            return { data: turmasNotas, error: null };
        }
        
        // Se não houver turmas nas notas, tentar buscar da frequência mensal
        if (!window.supabaseClient) {
            throw new Error('Supabase client não inicializado');
        }
        
        const mesAtual = new Date();
        const mesStr = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1)
            .toISOString().slice(0, 10); // 'YYYY-MM-01'
        
        const { data, error } = await window.supabaseClient
            .from('mv_frequencia_mensal_aluno')
            .select('turma')
            .eq('mes', mesStr);
        
        if (error) {
            console.error('❌ Erro ao buscar turmas da MV:', error);
            return { data: [], error };
        }
        
        const turmasUnicas = [...new Set((data || []).map(r => r.turma).filter(Boolean))].sort();
        
        console.log(`🎯 Turmas disponíveis encontradas: ${turmasUnicas.length}`);
        return { data: turmasUnicas, error: null };
        
    } catch (error) {
        console.error('❌ Erro ao obter turmas disponíveis:', error);
        return { data: [], error };
    }
}

/**
 * Wrapper para getEstatisticasFrequencia com estrutura esperada pelo legado
 */
async function getEstatisticasFrequenciaWrapper(turmaFiltro = null) {
    try {
        const resultado = await getEstatisticasFrequenciaModern(turmaFiltro);
        
        // Se der erro, retornar estrutura vazia mas válida
        if (resultado.error || !resultado.data) {
            return {
                data: {
                    mediaGeral: 0,
                    totaisGerais: {
                        totalPresencas: 0,
                        totalFaltas: 0,
                        totalAtestados: 0
                    },
                    distribuicao: {
                        excelente: 0,
                        boa: 0,
                        regular: 0,
                        critica: 0
                    },
                    porTurma: [],
                    alunos: []
                },
                error: resultado.error
            };
        }
        
        return resultado;
    } catch (error) {
        console.error('❌ Erro no wrapper de estatísticas de frequência:', error);
        return {
            data: {
                mediaGeral: 0,
                totaisGerais: { totalPresencas: 0, totalFaltas: 0, totalAtestados: 0 },
                distribuicao: { excelente: 0, boa: 0, regular: 0, critica: 0 },
                porTurma: [],
                alunos: []
            },
            error
        };
    }
}

// ===========================================================================
// EXPOR FUNÇÕES NO WINDOW PARA COMPATIBILIDADE COM CÓDIGO LEGADO
// ===========================================================================

if (typeof window !== 'undefined') {
    
    // Funções de turmas
    window.getTurmasDisponiveis = async () => {
        const { data, error } = await getTurmasDisponiveis();
        if (error) {
            console.error('❌ Erro em getTurmasDisponiveis:', error);
            return { data: [], error };
        }
        return { data, error: null };
    };
    
    // Funções de notas
    window.getEstatisticasNotas = async (params = {}) => {
        const { data, error } = await getEstatisticasNotas(params);
        if (error) {
            console.error('❌ Erro em getEstatisticasNotas:', error);
            throw error;
        }
        return { data, error: null };
    };
    
    window.listNotasDisciplinares = async (params = {}) => {
        const { data, error, count } = await listNotasDisciplinares(params);
        if (error) {
            console.error('❌ Erro em listNotasDisciplinares:', error);
            throw error;
        }
        return { data, error: null, count };
    };
    
    // Funções de frequência
    window.getEstatisticasFrequencia = async (turmaFiltro = null) => {
        return await getEstatisticasFrequenciaWrapper(turmaFiltro);
    };
    
    window.listFrequenciaAcumulada = async (params = {}) => {
        const { data, error, count } = await listFrequenciaAcumulada(params);
        if (error) {
            console.error('❌ Erro em listFrequenciaAcumulada:', error);
            throw error;
        }
        return { data, error: null, count };
    };
    
    window.listMensalDaTurma = async (params = {}) => {
        const { data, error } = await listMensalDaTurma(params);
        if (error) {
            console.error('❌ Erro em listMensalDaTurma:', error);
            throw error;
        }
        return { data, error: null };
    };
    
    window.listComparativoTurmas = async (mes) => {
        const { data, error } = await listComparativoTurmas(mes);
        if (error) {
            console.error('❌ Erro em listComparativoTurmas:', error);
            throw error;
        }
        return { data, error: null };
    };
    
    window.listFaltasDoAluno = async (codigo) => {
        const { data, error } = await listFaltasDoAluno(codigo);
        if (error) {
            console.error('❌ Erro em listFaltasDoAluno:', error);
            throw error;
        }
        return { data, error: null };
    };
    
    console.log('✅ Adaptadores globais carregados - Compatibilidade com código legado ativada');
}

export {
    getTurmasDisponiveis,
    getEstatisticasFrequenciaWrapper
};