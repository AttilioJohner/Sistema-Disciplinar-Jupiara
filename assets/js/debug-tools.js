/**
 * Ferramentas de Debug para Desenvolvedores
 * Sistema Disciplinar Jupiara - Views Integration
 * 
 * IMPORTANTE: Este arquivo deve ser usado apenas em desenvolvimento
 * Nunca incluir em produção
 */

// Aguardar módulos estarem carregados
async function waitForModules() {
    return new Promise((resolve) => {
        const checkModules = () => {
            if (window.supabaseClient && 
                (window.debugNotas || window.listNotasDisciplinares) && 
                (window.debugFreq || window.getResumoAcumuladoAluno)) {
                resolve();
            } else {
                setTimeout(checkModules, 100);
            }
        };
        checkModules();
    });
}

/**
 * Ferramentas de Debug Avançado
 */
window.DebugTools = {
    
    /**
     * Informações gerais do sistema
     */
    async info() {
        await waitForModules();
        
        console.log('🔍 INFORMAÇÕES DO SISTEMA');
        console.log('================================');
        
        try {
            // Conexão Supabase
            const supabaseStatus = window.supabaseClient ? '✅ Conectado' : '❌ Desconectado';
            console.log('🔗 Supabase:', supabaseStatus);
            
            // Módulos carregados
            const modulosCarregados = {
                'Notas Disciplinares': !!window.debugNotas,
                'Frequência': !!window.debugFreq,
                'NotasUtils': !!window.NotasUtils,
                'FrequenciaUtils': !!window.FrequenciaUtils
            };
            
            console.log('📦 Módulos Carregados:');
            Object.entries(modulosCarregados).forEach(([modulo, status]) => {
                console.log(`  ${status ? '✅' : '❌'} ${modulo}`);
            });
            
            // Views disponíveis
            const viewsDisponiveis = [
                'v_nota_disciplinar_atual',
                'v_nota_disciplinar_contadores', 
                'v_frequencia_acumulado_aluno',
                'v_frequencia_diaria_turma',
                'mv_frequencia_mensal_aluno'
            ];
            
            console.log('🗄️ Views Disponíveis:');
            viewsDisponiveis.forEach(view => {
                console.log(`  📋 ${view}`);
            });
            
            // Estatísticas rápidas
            if (window.supabaseClient) {
                try {
                    const { count: totalAlunos } = await window.supabaseClient
                        .from('v_nota_disciplinar_atual')
                        .select('*', { count: 'exact', head: true });
                    
                    const { count: totalMedidas } = await window.supabaseClient
                        .from('medidas')
                        .select('*', { count: 'exact', head: true });
                    
                    const { count: totalFrequencias } = await window.supabaseClient
                        .from('frequencia')
                        .select('*', { count: 'exact', head: true });
                    
                    console.log('📊 Estatísticas Rápidas:');
                    console.log(`  👥 Total de Alunos: ${totalAlunos}`);
                    console.log(`  ⚖️ Total de Medidas: ${totalMedidas}`);
                    console.log(`  📅 Total de Registros de Frequência: ${totalFrequencias}`);
                    
                } catch (error) {
                    console.warn('⚠️ Erro ao obter estatísticas:', error.message);
                }
            }
            
        } catch (error) {
            console.error('❌ Erro ao obter informações:', error);
        }
    },
    
    /**
     * Debug avançado das views de notas disciplinares
     */
    async notasAvancado() {
        await waitForModules();
        
        console.log('📊 DEBUG AVANÇADO - NOTAS DISCIPLINARES');
        console.log('========================================');
        
        try {
            // Testar view principal
            const { data: notasAtual, error } = await window.supabaseClient
                .from('v_nota_disciplinar_atual')
                .select('*')
                .limit(5);
            
            if (error) {
                console.error('❌ Erro na view v_nota_disciplinar_atual:', error);
                return;
            }
            
            console.log('✅ View v_nota_disciplinar_atual - Primeiros 5 registros:');
            console.table(notasAtual);
            
            // Testar view de contadores
            const { data: contadores } = await window.supabaseClient
                .from('v_nota_disciplinar_contadores')
                .select('*')
                .limit(3);
            
            console.log('✅ View v_nota_disciplinar_contadores - Amostra:');
            console.table(contadores);
            
            // Análise da distribuição
            const distribuicaoNotas = {};
            notasAtual.forEach(aluno => {
                const nota = Math.floor(aluno.nota_atual);
                distribuicaoNotas[nota] = (distribuicaoNotas[nota] || 0) + 1;
            });
            
            console.log('📈 Distribuição de Notas (amostra):');
            console.log(distribuicaoNotas);
            
            // Testar função de utilitários
            if (window.NotasUtils) {
                const notaTeste = 7.5;
                console.log(`🧪 Teste NotasUtils (nota ${notaTeste}):`);
                console.log(`  📝 Formatada: ${window.NotasUtils.formatarNota(notaTeste)}`);
                console.log(`  🎨 Cor: ${window.NotasUtils.getCorNota(notaTeste)}`);
                console.log(`  📋 Descrição: ${window.NotasUtils.getDescricaoNota(notaTeste)}`);
            }
            
        } catch (error) {
            console.error('❌ Erro no debug avançado de notas:', error);
        }
    },
    
    /**
     * Debug avançado das views de frequência
     */
    async frequenciaAvancado() {
        await waitForModules();
        
        console.log('📅 DEBUG AVANÇADO - FREQUÊNCIA ESCOLAR');
        console.log('======================================');
        
        try {
            // Testar view de resumo acumulado
            const { data: resumoAcumulado, error: resumoError } = await window.supabaseClient
                .from('v_frequencia_acumulado_aluno')
                .select('*')
                .limit(5);
            
            if (resumoError) {
                console.error('❌ Erro na view v_frequencia_acumulado_aluno:', resumoError);
                return;
            }
            
            console.log('✅ View v_frequencia_acumulado_aluno - Primeiros 5 registros:');
            console.table(resumoAcumulado);
            
            // Testar materialized view mensal
            const mesAtual = new Date().toISOString().slice(0, 7) + '-01';
            const { data: resumoMensal } = await window.supabaseClient
                .from('mv_frequencia_mensal_aluno')
                .select('*')
                .eq('mes', mesAtual)
                .limit(5);
            
            console.log(`✅ Materialized View mensal (${mesAtual}) - Amostra:)`);
            console.table(resumoMensal);
            
            // Testar view diária por turma
            const { data: frequenciaDiaria } = await window.supabaseClient
                .from('v_frequencia_diaria_turma')
                .select('*')
                .limit(3);
            
            console.log('✅ View v_frequencia_diaria_turma - Amostra:');
            console.table(frequenciaDiaria);
            
            // Análise de distribuição de frequência
            const distribuicaoFrequencia = {
                excelente: resumoAcumulado.filter(a => a.pct_presenca_operacional >= 95).length,
                boa: resumoAcumulado.filter(a => a.pct_presenca_operacional >= 85 && a.pct_presenca_operacional < 95).length,
                regular: resumoAcumulado.filter(a => a.pct_presenca_operacional >= 75 && a.pct_presenca_operacional < 85).length,
                baixa: resumoAcumulado.filter(a => a.pct_presenca_operacional < 75).length
            };
            
            console.log('📈 Distribuição de Frequência (amostra):');
            console.log(distribuicaoFrequencia);
            
            // Testar utilitários de frequência
            if (window.FrequenciaUtils) {
                const presencaTeste = 87.3;
                console.log(`🧪 Teste FrequenciaUtils (${presencaTeste}%):`);
                console.log(`  📝 Formatada: ${window.FrequenciaUtils.formatarPercentual(presencaTeste)}`);
                console.log(`  🎨 Cor: ${window.FrequenciaUtils.getCorPresenca(presencaTeste)}`);
                console.log(`  📋 Descrição: ${window.FrequenciaUtils.getDescricaoPresenca(presencaTeste)}`);
            }
            
        } catch (error) {
            console.error('❌ Erro no debug avançado de frequência:', error);
        }
    },
    
    /**
     * Benchmark de performance das views
     */
    async benchmark() {
        await waitForModules();
        
        console.log('⚡ BENCHMARK DE PERFORMANCE');
        console.log('===========================');
        
        const testes = [
            {
                nome: 'Lista Notas Disciplinares (50 registros)',
                teste: () => window.supabaseClient
                    .from('v_nota_disciplinar_atual')
                    .select('*')
                    .limit(50)
            },
            {
                nome: 'Resumo Acumulado Frequência (50 registros)', 
                teste: () => window.supabaseClient
                    .from('v_frequencia_acumulado_aluno')
                    .select('*')
                    .limit(50)
            },
            {
                nome: 'Contadores Disciplinares (10 registros)',
                teste: () => window.supabaseClient
                    .from('v_nota_disciplinar_contadores')
                    .select('*')
                    .limit(10)
            },
            {
                nome: 'Frequência Mensal (MV - 20 registros)',
                teste: () => window.supabaseClient
                    .from('mv_frequencia_mensal_aluno')
                    .select('*')
                    .limit(20)
            }
        ];
        
        for (const teste of testes) {
            try {
                const inicio = performance.now();
                const resultado = await teste.teste();
                const fim = performance.now();
                const tempo = (fim - inicio).toFixed(2);
                
                const status = resultado.error ? '❌' : '✅';
                const registros = resultado.data?.length || 0;
                
                console.log(`${status} ${teste.nome}`);
                console.log(`  ⏱️ Tempo: ${tempo}ms`);
                console.log(`  📊 Registros: ${registros}`);
                
                if (resultado.error) {
                    console.log(`  🐛 Erro: ${resultado.error.message}`);
                }
                
                console.log('');
                
            } catch (error) {
                console.log(`❌ ${teste.nome}`);
                console.log(`  🐛 Erro: ${error.message}`);
                console.log('');
            }
        }
    },
    
    /**
     * Teste de integridade dos dados
     */
    async integridade() {
        await waitForModules();
        
        console.log('🔍 TESTE DE INTEGRIDADE DOS DADOS');
        console.log('==================================');
        
        try {
            // Verificar consistência entre tabelas base e views
            const { count: alunosBase } = await window.supabaseClient
                .from('alunos')
                .select('*', { count: 'exact', head: true });
            
            const { count: alunosView } = await window.supabaseClient
                .from('v_nota_disciplinar_atual')
                .select('*', { count: 'exact', head: true });
            
            console.log('👥 Consistência de Alunos:');
            console.log(`  📋 Tabela base: ${alunosBase}`);
            console.log(`  📊 View disciplinar: ${alunosView}`);
            console.log(`  ✅ Status: ${alunosBase === alunosView ? 'Consistente' : 'Inconsistente'}`);
            console.log('');
            
            // Verificar dados órfãos
            const { data: medidasSemAluno } = await window.supabaseClient
                .from('medidas')
                .select('codigo_matricula')
                .not('codigo_matricula', 'in', `(${await this.getListaCodigosAlunos()})`);
            
            if (medidasSemAluno?.length > 0) {
                console.log('⚠️ Medidas sem aluno correspondente:');
                console.log(medidasSemAluno.map(m => m.codigo_matricula));
            } else {
                console.log('✅ Todas as medidas têm alunos correspondentes');
            }
            
            // Verificar notas fora do intervalo esperado
            const { data: notasInvalidas } = await window.supabaseClient
                .from('v_nota_disciplinar_atual')
                .select('codigo_aluno, nome_completo, nota_atual')
                .or('nota_atual.lt.0,nota_atual.gt.10');
            
            if (notasInvalidas?.length > 0) {
                console.log('⚠️ Notas fora do intervalo [0-10]:');
                console.table(notasInvalidas);
            } else {
                console.log('✅ Todas as notas estão no intervalo válido');
            }
            
        } catch (error) {
            console.error('❌ Erro no teste de integridade:', error);
        }
    },
    
    /**
     * Utilitário para obter lista de códigos de alunos
     */
    async getListaCodigosAlunos() {
        const { data } = await window.supabaseClient
            .from('alunos')
            .select('codigo');
        
        return data?.map(a => a.codigo).join(',') || '';
    },
    
    /**
     * Limpar cache e recarregar views
     */
    async refreshAll() {
        console.log('🔄 REFRESH COMPLETO DO SISTEMA');
        console.log('===============================');
        
        try {
            // Limpar caches do navegador
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
                console.log('🗑️ Cache do navegador limpo');
            }
            
            // Recarregar dados básicos
            if (window.debugNotas) {
                await window.debugNotas();
            }
            
            if (window.debugFreq) {
                await window.debugFreq();
            }
            
            console.log('✅ Sistema recarregado com sucesso');
            
        } catch (error) {
            console.error('❌ Erro no refresh:', error);
        }
    }
};

/**
 * Função de debug rápido para console
 */
window.debug = async function() {
    console.log('🛠️ FERRAMENTAS DE DEBUG DISPONÍVEIS');
    console.log('====================================');
    console.log('DebugTools.info()           - Informações do sistema');
    console.log('DebugTools.notasAvancado()  - Debug avançado notas');
    console.log('DebugTools.frequenciaAvancado() - Debug avançado frequência');
    console.log('DebugTools.benchmark()      - Teste de performance');
    console.log('DebugTools.integridade()    - Teste de integridade');
    console.log('DebugTools.refreshAll()     - Refresh completo');
    console.log('');
    console.log('debugNotas()                - Debug rápido notas');
    console.log('debugFreq()                 - Debug rápido frequência');
    console.log('');
    console.log('💡 Execute DebugTools.info() para começar');
};

// Executar debug básico automaticamente em desenvolvimento
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    setTimeout(() => {
        console.log('🔧 Sistema de Debug carregado - digite debug() para ver comandos');
    }, 2000);
}

console.log('✅ Debug Tools carregados - Use debug() para listar comandos');