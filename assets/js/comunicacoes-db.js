/**
 * ===============================================================================
 * MÓDULO DE COMUNICAÇÕES - INTEGRAÇÃO COM BANCO SUPABASE
 * Escola Estadual Cívico-Militar Jupiara
 * ===============================================================================
 */

// Configurações e inicialização
let supabaseClient = null;

// Inicializar cliente Supabase
async function initComunicacoesDB() {
    try {
        if (window.supabaseClient) {
            supabaseClient = window.supabaseClient;
            console.log('✅ Cliente Supabase inicializado para comunicações');
            return true;
        }
        
        // Aguardar inicialização
        return new Promise((resolve) => {
            const checkClient = setInterval(() => {
                if (window.supabaseClient) {
                    supabaseClient = window.supabaseClient;
                    clearInterval(checkClient);
                    console.log('✅ Cliente Supabase inicializado (delayed)');
                    resolve(true);
                }
            }, 100);
            
            // Timeout após 5 segundos
            setTimeout(() => {
                clearInterval(checkClient);
                console.warn('⚠️ Timeout ao aguardar Supabase - usando modo offline');
                resolve(false);
            }, 5000);
        });
    } catch (error) {
        console.error('❌ Erro ao inicializar comunicações DB:', error);
        return false;
    }
}

// ===============================================================================
// FUNÇÕES DE CONSULTA
// ===============================================================================

/**
 * Buscar comunicações pendentes de hoje
 */
async function getComunicacoesPendentesHoje() {
    try {
        if (!supabaseClient) {
            console.warn('⚠️ Supabase não disponível - usando dados mock');
            return getMockComunicacoes();
        }

        const { data, error } = await supabaseClient
            .from('v_comunicacoes_pendentes_hoje')
            .select('*');

        if (error) {
            console.error('❌ Erro ao buscar comunicações pendentes:', error);
            return getMockComunicacoes();
        }

        console.log('✅ Comunicações pendentes carregadas:', data.length);
        return data || [];
        
    } catch (error) {
        console.error('❌ Erro ao buscar comunicações:', error);
        return getMockComunicacoes();
    }
}

/**
 * Buscar estatísticas do dia
 */
async function getEstatisticasDiarias() {
    try {
        if (!supabaseClient) return getMockEstatisticas();

        const hoje = new Date().toISOString().split('T')[0];
        
        const { data, error } = await supabaseClient
            .from('v_comunicacoes_estatisticas_diarias')
            .select('*')
            .eq('data_ocorrencia', hoje)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows
            console.error('❌ Erro ao buscar estatísticas:', error);
            return getMockEstatisticas();
        }

        return data || getMockEstatisticas();
        
    } catch (error) {
        console.error('❌ Erro ao buscar estatísticas:', error);
        return getMockEstatisticas();
    }
}

/**
 * Buscar histórico de comunicações
 */
async function getHistoricoComunicacoes(dataInicial, dataFinal) {
    try {
        if (!supabaseClient) return [];

        let query = supabaseClient
            .from('comunicacoes_whatsapp')
            .select('*')
            .order('data_envio', { ascending: false });

        if (dataInicial) {
            query = query.gte('data_ocorrencia', dataInicial);
        }
        
        if (dataFinal) {
            query = query.lte('data_ocorrencia', dataFinal);
        }

        const { data, error } = await query.limit(100);

        if (error) {
            console.error('❌ Erro ao buscar histórico:', error);
            return [];
        }

        return data || [];
        
    } catch (error) {
        console.error('❌ Erro ao buscar histórico:', error);
        return [];
    }
}

// ===============================================================================
// FUNÇÕES DE INSERÇÃO E ATUALIZAÇÃO
// ===============================================================================

/**
 * Registrar nova comunicação
 */
async function registrarComunicacao(dadosComunicacao) {
    try {
        if (!supabaseClient) {
            console.warn('⚠️ Supabase não disponível - comunicação não foi salva');
            return null;
        }

        const { data, error } = await supabaseClient
            .rpc('registrar_comunicacao', {
                p_aluno_codigo: dadosComunicacao.codigo,
                p_aluno_nome: dadosComunicacao.nome,
                p_turma: dadosComunicacao.turma,
                p_tipo: dadosComunicacao.tipo,
                p_descricao: dadosComunicacao.descricao,
                p_telefone: dadosComunicacao.telefone,
                p_data_ocorrencia: dadosComunicacao.data || new Date().toISOString().split('T')[0]
            });

        if (error) {
            console.error('❌ Erro ao registrar comunicação:', error);
            return null;
        }

        console.log('✅ Comunicação registrada com ID:', data);
        return data;
        
    } catch (error) {
        console.error('❌ Erro ao registrar comunicação:', error);
        return null;
    }
}

/**
 * Marcar comunicação como enviada
 */
async function marcarComoEnviada(comunicacaoId, metodoEnvio = 'evolution', responseApi = null) {
    try {
        if (!supabaseClient) {
            console.warn('⚠️ Supabase não disponível - status não foi atualizado');
            return false;
        }

        const { data, error } = await supabaseClient
            .rpc('marcar_comunicacao_enviada', {
                p_id: comunicacaoId,
                p_metodo_envio: metodoEnvio,
                p_response_api: responseApi
            });

        if (error) {
            console.error('❌ Erro ao marcar como enviada:', error);
            return false;
        }

        console.log('✅ Comunicação marcada como enviada');
        return data;
        
    } catch (error) {
        console.error('❌ Erro ao marcar como enviada:', error);
        return false;
    }
}

/**
 * Atualizar status de erro
 */
async function marcarComErro(comunicacaoId, erro) {
    try {
        if (!supabaseClient) return false;

        const { error } = await supabaseClient
            .from('comunicacoes_whatsapp')
            .update({
                status: 'erro',
                ultimo_erro: erro,
                tentativas_envio: supabaseClient.raw('tentativas_envio + 1'),
                data_atualizacao: new Date().toISOString()
            })
            .eq('id', comunicacaoId);

        if (error) {
            console.error('❌ Erro ao marcar erro:', error);
            return false;
        }

        console.log('⚠️ Comunicação marcada com erro');
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao marcar erro:', error);
        return false;
    }
}

// ===============================================================================
// TRIGGERS AUTOMÁTICOS (para integrar com outros sistemas)
// ===============================================================================

/**
 * Auto-registrar quando uma falta é lançada
 * Deve ser chamada pela página de frequência
 */
async function autoRegistrarFalta(alunoData, dataFalta) {
    console.log('🔄 Auto-registrando falta para comunicação:', alunoData.nome);
    
    return await registrarComunicacao({
        codigo: alunoData.id,
        nome: alunoData.nome,
        turma: alunoData.turma,
        tipo: 'falta',
        descricao: 'Falta não justificada',
        telefone: alunoData.telefone1 || alunoData.telefone2,
        data: dataFalta
    });
}

/**
 * Auto-registrar quando uma medida disciplinar é aplicada
 * Deve ser chamada pela página de medidas
 */
async function autoRegistrarMedida(alunoData, medidaData) {
    console.log('🔄 Auto-registrando medida para comunicação:', alunoData.nome);
    
    return await registrarComunicacao({
        codigo: alunoData.id,
        nome: alunoData.nome,
        turma: alunoData.turma,
        tipo: 'medida',
        descricao: `${medidaData.tipo} - ${medidaData.descricao}`,
        telefone: alunoData.telefone1 || alunoData.telefone2,
        data: medidaData.data
    });
}

// ===============================================================================
// DADOS MOCK PARA DESENVOLVIMENTO/FALLBACK
// ===============================================================================

function getMockComunicacoes() {
    const hoje = new Date().toISOString().split('T')[0];
    return [
        {
            id: 1,
            aluno_codigo: '2025001',
            aluno_nome: 'João Silva Santos',
            turma: '1A',
            tipo: 'falta',
            descricao: 'Falta não justificada',
            telefone: '(66) 99999-9999',
            telefone_formatado: '+55 66 9 9999-9999',
            status: 'pendente',
            data_ocorrencia: hoje,
            tentativas_envio: 0
        },
        {
            id: 2,
            aluno_codigo: '2025002',
            aluno_nome: 'Maria Oliveira Costa',
            turma: '2B',
            tipo: 'medida',
            descricao: 'Advertência verbal - Conversa em sala',
            telefone: '(66) 88888-8888',
            telefone_formatado: '+55 66 8 8888-8888',
            status: 'pendente',
            data_ocorrencia: hoje,
            tentativas_envio: 0
        }
    ];
}

function getMockEstatisticas() {
    return {
        data_ocorrencia: new Date().toISOString().split('T')[0],
        total_comunicacoes: 2,
        total_faltas: 1,
        total_medidas: 1,
        pendentes: 2,
        enviados: 0,
        com_erro: 0,
        taxa_sucesso_pct: 0
    };
}

// ===============================================================================
// INICIALIZAÇÃO E EXPORTAÇÃO
// ===============================================================================

// Inicializar quando o DOM estiver pronto
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initComunicacoesDB);
} else {
    initComunicacoesDB();
}

// Exportar funções globalmente
window.ComunicacoesDB = {
    // Consultas
    getComunicacoesPendentesHoje,
    getEstatisticasDiarias,
    getHistoricoComunicacoes,
    
    // Inserções/Atualizações
    registrarComunicacao,
    marcarComoEnviada,
    marcarComErro,
    
    // Triggers automáticos
    autoRegistrarFalta,
    autoRegistrarMedida,
    
    // Utilitários
    initComunicacoesDB
};

console.log('📱 Módulo ComunicacoesDB carregado');