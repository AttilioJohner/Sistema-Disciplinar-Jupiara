/**
 * Módulo de dados para gestão de alunos
 * Implementa CRUD completo + realtime subscriptions
 * Usa alunos.codigo como chave canônica (bigint)
 */

import { supabase } from '../supabase-client.js';

/**
 * Buscar todos os alunos
 */
export async function getAlunos() {
    try {
        const { data, error } = await supabase
            .from('alunos')
            .select('*')
            .order('"Nome completo"');
        
        if (error) throw error;
        return { data: data || [], error: null };
    } catch (error) {
        console.error('Erro ao buscar alunos:', error);
        return { data: [], error };
    }
}

/**
 * Buscar aluno por código
 */
export async function getAlunoByCodigo(codigo) {
    try {
        const { data, error } = await supabase
            .from('alunos')
            .select('*')
            .eq('codigo', codigo)
            .single();
        
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Erro ao buscar aluno:', error);
        return { data: null, error };
    }
}

/**
 * Criar novo aluno
 * @param {Object} aluno - Dados do aluno
 * @param {bigint} aluno.codigo - Código único do aluno (PK)
 * @param {string} aluno.nome_completo - Nome completo
 * @param {string} aluno.turma - Turma do aluno
 * @param {bigint} [aluno.codigo_matricula] - Código de matrícula alternativo
 */
export async function createAluno({ codigo, nome_completo, turma, codigo_matricula }) {
    try {
        // Validar campos obrigatórios
        if (!codigo || !nome_completo || !turma) {
            throw new Error('Campos obrigatórios: codigo, nome_completo, turma');
        }

        const payload = {
            codigo: BigInt(codigo),
            "Nome completo": nome_completo,
            turma,
            // Sincronizar código (matrícula) se não fornecido
            "código (matrícula)": codigo_matricula ? BigInt(codigo_matricula) : BigInt(codigo)
        };

        const { data, error } = await supabase
            .from('alunos')
            .insert(payload)
            .select()
            .single();
        
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Erro ao criar aluno:', error);
        return { data: null, error };
    }
}

/**
 * Atualizar aluno existente
 */
export async function updateAluno(codigo, updates) {
    try {
        // Mapear campos para nomes das colunas
        const payload = {};
        if (updates.nome_completo !== undefined) {
            payload["Nome completo"] = updates.nome_completo;
        }
        if (updates.turma !== undefined) {
            payload.turma = updates.turma;
        }
        if (updates.codigo_matricula !== undefined) {
            payload["código (matrícula)"] = BigInt(updates.codigo_matricula);
        }
        if (updates.responsavel !== undefined) {
            payload.responsavel = updates.responsavel;
        }
        if (updates.telefone1 !== undefined) {
            payload.telefone1 = updates.telefone1;
        }
        if (updates.telefone2 !== undefined) {
            payload.telefone2 = updates.telefone2;
        }
        if (updates.foto_url !== undefined) {
            payload.foto_url = updates.foto_url;
        }

        const { data, error } = await supabase
            .from('alunos')
            .update(payload)
            .eq('codigo', codigo)
            .select()
            .single();
        
        if (error) throw error;
        return { data, error: null };
    } catch (error) {
        console.error('Erro ao atualizar aluno:', error);
        return { data: null, error };
    }
}

/**
 * Excluir aluno (CASCADE deletará medidas e frequência automaticamente)
 */
export async function deleteAluno(codigo) {
    try {
        const { error } = await supabase
            .from('alunos')
            .delete()
            .eq('codigo', codigo);
        
        if (error) throw error;
        return { error: null };
    } catch (error) {
        console.error('Erro ao excluir aluno:', error);
        return { error };
    }
}

/**
 * Verificar se aluno tem registros relacionados
 * Útil para mostrar aviso antes de excluir
 */
export async function checkAlunoRelations(codigo) {
    try {
        // Verificar medidas
        const { data: medidas, error: errorMedidas } = await supabase
            .from('medidas')
            .select('id', { count: 'exact' })
            .eq('codigo_aluno', codigo)
            .limit(1);

        // Verificar frequência
        const { data: frequencia, error: errorFrequencia } = await supabase
            .from('frequencia')
            .select('id', { count: 'exact' })
            .eq('codigo_aluno', codigo)
            .limit(1);

        const hasMedidas = medidas && medidas.length > 0;
        const hasFrequencia = frequencia && frequencia.length > 0;

        return {
            hasMedidas,
            hasFrequencia,
            hasAnyRelation: hasMedidas || hasFrequencia,
            error: errorMedidas || errorFrequencia
        };
    } catch (error) {
        console.error('Erro ao verificar relações:', error);
        return { hasMedidas: false, hasFrequencia: false, hasAnyRelation: false, error };
    }
}

/**
 * Buscar alunos por turma
 */
export async function getAlunosByTurma(turma) {
    try {
        const { data, error } = await supabase
            .from('alunos')
            .select('*')
            .eq('turma', turma)
            .order('"Nome completo"');
        
        if (error) throw error;
        return { data: data || [], error: null };
    } catch (error) {
        console.error('Erro ao buscar alunos por turma:', error);
        return { data: [], error };
    }
}

/**
 * Buscar turmas distintas
 */
export async function getTurmasDistintas() {
    try {
        const { data, error } = await supabase
            .from('alunos')
            .select('turma')
            .order('turma');
        
        if (error) throw error;
        
        // Extrair turmas únicas
        const turmas = [...new Set(data.map(item => item.turma))].filter(t => t);
        return { data: turmas, error: null };
    } catch (error) {
        console.error('Erro ao buscar turmas:', error);
        return { data: [], error };
    }
}

/**
 * Inscrever-se para mudanças em tempo real na tabela alunos
 * @param {Function} onChange - Callback chamado quando há mudanças
 * @returns {Object} Subscription object (chamar .unsubscribe() para parar)
 */
export function subscribeAlunosChanges(onChange) {
    const channel = supabase
        .channel('alunos-realtime')
        .on('postgres_changes', 
            { 
                event: '*', 
                schema: 'public', 
                table: 'alunos' 
            }, 
            (payload) => {
                console.log('Mudança em alunos:', payload);
                if (onChange) {
                    onChange(payload);
                }
            }
        )
        .subscribe();
    
    return channel;
}

/**
 * Inscrever-se para mudanças específicas de um aluno
 */
export function subscribeAlunoChanges(codigo, onChange) {
    const channel = supabase
        .channel(`aluno-${codigo}`)
        .on('postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'alunos',
                filter: `codigo=eq.${codigo}`
            },
            (payload) => {
                console.log(`Mudança no aluno ${codigo}:`, payload);
                if (onChange) {
                    onChange(payload);
                }
            }
        )
        .subscribe();
    
    return channel;
}

/**
 * Helpers para estatísticas
 */
export async function getEstatisticasAlunos() {
    try {
        const { data: alunos, error } = await supabase
            .from('alunos')
            .select('turma');
        
        if (error) throw error;

        const totalAlunos = alunos.length;
        const alunosPorTurma = alunos.reduce((acc, aluno) => {
            const turma = aluno.turma || 'Sem turma';
            acc[turma] = (acc[turma] || 0) + 1;
            return acc;
        }, {});

        return {
            totalAlunos,
            alunosPorTurma,
            totalTurmas: Object.keys(alunosPorTurma).length,
            error: null
        };
    } catch (error) {
        console.error('Erro ao buscar estatísticas:', error);
        return {
            totalAlunos: 0,
            alunosPorTurma: {},
            totalTurmas: 0,
            error
        };
    }
}

/**
 * Buscar aluno com suas medidas e frequência (JOIN)
 */
export async function getAlunoCompleto(codigo) {
    try {
        // Buscar dados do aluno
        const { data: aluno, error: errorAluno } = await supabase
            .from('alunos')
            .select('*')
            .eq('codigo', codigo)
            .single();

        if (errorAluno) throw errorAluno;

        // Buscar medidas do aluno
        const { data: medidas, error: errorMedidas } = await supabase
            .from('medidas')
            .select('*')
            .eq('codigo_aluno', codigo)
            .order('data_ocorrencia', { ascending: false });

        // Buscar frequência do aluno
        const { data: frequencia, error: errorFrequencia } = await supabase
            .from('frequencia')
            .select('*')
            .eq('codigo_aluno', codigo)
            .order('data', { ascending: false });

        return {
            data: {
                ...aluno,
                medidas: medidas || [],
                frequencia: frequencia || []
            },
            error: null
        };
    } catch (error) {
        console.error('Erro ao buscar aluno completo:', error);
        return { data: null, error };
    }
}

// Exportar todas as funções como default também
export default {
    getAlunos,
    getAlunoByCodigo,
    createAluno,
    updateAluno,
    deleteAluno,
    checkAlunoRelations,
    getAlunosByTurma,
    getTurmasDistintas,
    subscribeAlunosChanges,
    subscribeAlunoChanges,
    getEstatisticasAlunos,
    getAlunoCompleto
};