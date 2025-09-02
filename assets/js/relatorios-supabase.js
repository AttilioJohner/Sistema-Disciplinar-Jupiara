// assets/js/relatorios-supabase.js
// Dashboard Avançado de Análise Escolar com Supabase

console.log('📊 DASHBOARD AVANÇADO: Inicializando sistema analítico...');

// Variáveis globais expandidas
let dadosRelatorios = {
    alunos: [],
    frequencias: [],
    medidas: [],
    ficaiProvidencias: [],
    processedData: [],
    analytics: {
        turmas: {},
        trends: {},
        rankings: {},
        predictions: {}
    }
};

let chartsInstances = {};
let filtrosAtivos = {};
let periodoAnalise = 'anual'; // Default: Período Anual
let visualizacaoAtual = 'comparativo';

// Classe principal do sistema de relatórios
class RelatoriosSupabaseManager {
    constructor() {
        this.supabase = window.supabaseClient;
        console.log('📊 RELATÓRIOS: Manager iniciado');
    }

    // Carregar todos os dados necessários
    async carregarDadosCompletos() {
        console.log('📊 DADOS: Carregando dados completos para relatórios...');
        
        try {
            // Mostrar loading
            this.mostrarLoading();
            
            // Carregar dados em paralelo para melhor performance
            const [alunosData, frequenciasData, medidasData, ficaiData] = await Promise.all([
                this.carregarAlunos(),
                this.carregarFrequencias(),
                this.carregarMedidas(),
                this.carregarFicaiProvidencias()
            ]);
            
            dadosRelatorios.alunos = alunosData || [];
            dadosRelatorios.frequencias = frequenciasData || [];
            dadosRelatorios.medidas = medidasData || [];
            dadosRelatorios.ficaiProvidencias = ficaiData || [];
            
            // Processar dados integrados
            dadosRelatorios.processedData = this.processarDadosIntegrados();
            
            console.log('📊 DADOS: Carregamento completo:', {
                alunos: dadosRelatorios.alunos.length,
                frequencias: dadosRelatorios.frequencias.length,
                medidas: dadosRelatorios.medidas.length,
                ficai: dadosRelatorios.ficaiProvidencias.length,
                processados: dadosRelatorios.processedData.length
            });
            
            // Atualizar interface avançada
            this.atualizarEstatisticasAvancadas();
            this.carregarFiltrosAvancados();
            this.atualizarGraficosAvancados();
            this.atualizarRankings();
            this.atualizarRelatorioDetalhado();
            
            showSuccessToast('Relatórios carregados com sucesso!');
            
        } catch (error) {
            console.error('❌ DADOS: Erro ao carregar dados:', error);
            showErrorToast('Erro ao carregar dados dos relatórios');
        }
    }

    async carregarAlunos() {
        try {
            const { data, error } = await this.supabase
                .from('alunos')
                .select('*')
                .order('Nome completo');
            
            if (error) throw error;
            console.log('📊 ALUNOS: Carregados', data?.length || 0, 'alunos');
            return data || [];
        } catch (error) {
            console.error('❌ ALUNOS: Erro ao carregar:', error);
            return [];
        }
    }

    async carregarFrequencias() {
        try {
            const { data, error } = await this.supabase
                .from('frequencia')
                .select('*')
                .order('data', { ascending: false });
            
            if (error) throw error;
            console.log('📊 FREQUÊNCIA: Carregados', data?.length || 0, 'registros');
            return data || [];
        } catch (error) {
            console.error('❌ FREQUÊNCIA: Erro ao carregar:', error);
            return [];
        }
    }

    async carregarMedidas() {
        try {
            // Primeiro tentar sem ordenação para ser mais seguro
            let { data, error } = await this.supabase
                .from('medidas')
                .select('*');
            
            if (error) throw error;
            
            // Se funcionou, tentar ordenar localmente
            if (data && data.length > 0) {
                try {
                    // Tentar ordenar por diferentes possíveis nomes de coluna
                    if (data[0].data_ocorrencia) {
                        data.sort((a, b) => new Date(b.data_ocorrencia) - new Date(a.data_ocorrencia));
                    } else if (data[0].data_aplicacao) {
                        data.sort((a, b) => new Date(b.data_aplicacao) - new Date(a.data_aplicacao));
                    } else if (data[0].created_at) {
                        data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                    }
                } catch (sortError) {
                    console.warn('⚠️ MEDIDAS: Não foi possível ordenar, usando ordem original');
                }
            }
            
            console.log('📊 MEDIDAS: Carregados', data?.length || 0, 'registros');
            return data || [];
        } catch (error) {
            console.error('❌ MEDIDAS: Erro ao carregar:', error);
            return [];
        }
    }

    async carregarFicaiProvidencias() {
        try {
            // Tentar diferentes nomes de colunas para ordenação
            let data, error;
            
            // Primeira tentativa: sem ordenação (mais seguro)
            ({ data, error } = await this.supabase
                .from('ficai_providencias')
                .select('*'));
            
            if (error) {
                // Tabela pode não existir - continuar sem dados FICAI
                console.log('📊 FICAI: Tabela não existe ou não acessível, continuando sem dados FICAI');
                return [];
            }
            
            console.log('📊 FICAI: Carregados', data?.length || 0, 'registros');
            return data || [];
        } catch (error) {
            console.error('❌ FICAI: Erro ao carregar (tabela pode não existir):', error);
            return [];
        }
    }

    processarDadosIntegrados() {
        console.log('🔄 PROCESSAMENTO: Integrando dados de alunos, frequência, medidas e FICAI...');
        
        const dadosIntegrados = [];
        
        dadosRelatorios.alunos.forEach(aluno => {
            // Buscar frequências do aluno
            const frequenciasAluno = dadosRelatorios.frequencias.filter(f => 
                f.codigo_matricula === aluno.codigo_matricula
            );
            
            // Buscar medidas do aluno
            const medidasAluno = dadosRelatorios.medidas.filter(m => 
                m.codigo_matricula === aluno.codigo_matricula || 
                m.aluno_nome === aluno['Nome completo']
            );
            
            // Buscar providências FICAI do aluno
            const ficaiAluno = dadosRelatorios.ficaiProvidencias.filter(f => 
                f.codigo_matricula === aluno.codigo_matricula
            );
            
            // Calcular estatísticas de frequência
            const statsFrequencia = this.calcularStatsFrequencia(frequenciasAluno);
            
            // Calcular estatísticas de medidas
            const statsMedidas = this.calcularStatsMedidas(medidasAluno);
            
            // Status FICAI mais recente
            const ficaiRecente = ficaiAluno.length > 0 ? ficaiAluno[0] : null;
            
            // Determinar nível de risco
            const nivelRisco = this.determinarNivelRisco(statsFrequencia, statsMedidas, ficaiRecente);
            
            dadosIntegrados.push({
                // Dados básicos do aluno
                codigo: aluno.codigo_matricula,
                nome: aluno['Nome completo'],
                turma: aluno.turma,
                nascimento: aluno.data_nascimento,
                
                // Estatísticas de frequência
                totalDiasLetivos: statsFrequencia.totalDias,
                totalPresencas: statsFrequencia.presencas,
                totalFaltas: statsFrequencia.faltas,
                totalFaltasControladas: statsFrequencia.faltasControladas,
                totalAtestados: statsFrequencia.atestados,
                percentualPresenca: statsFrequencia.percentualPresenca,
                maxFaltasConsecutivas: statsFrequencia.maxConsecutivas,
                
                // Estatísticas de medidas
                totalMedidas: statsMedidas.total,
                medidasPorTipo: statsMedidas.porTipo,
                ultimaMedida: statsMedidas.ultimaData,
                
                // Status FICAI
                statusFicai: ficaiRecente?.status_ficai || null,
                providenciasFicai: ficaiRecente?.providencias || null,
                dataFicai: ficaiRecente?.data_criacao || null,
                
                // Análise de risco
                nivelRisco: nivelRisco.nivel,
                motivosRisco: nivelRisco.motivos,
                pontuacaoRisco: nivelRisco.pontuacao,
                
                // Dados brutos para análises detalhadas
                frequencias: frequenciasAluno,
                medidas: medidasAluno,
                ficaiRegistros: ficaiAluno
            });
        });
        
        console.log('🔄 PROCESSAMENTO: Concluído para', dadosIntegrados.length, 'alunos');
        return dadosIntegrados.sort((a, b) => a.nome.localeCompare(b.nome));
    }

    calcularStatsFrequencia(frequencias) {
        if (!frequencias || frequencias.length === 0) {
            return {
                totalDias: 0,
                presencas: 0,
                faltas: 0,
                faltasControladas: 0,
                atestados: 0,
                percentualPresenca: 0,
                maxConsecutivas: 0
            };
        }
        
        // Ordenar por data
        const frequenciasOrdenadas = frequencias.sort((a, b) => new Date(a.data) - new Date(b.data));
        
        let presencas = 0;
        let faltas = 0;
        let faltasControladas = 0;
        let atestados = 0;
        let consecutivas = 0;
        let maxConsecutivas = 0;
        
        frequenciasOrdenadas.forEach(registro => {
            switch (registro.status) {
                case 'P':
                    presencas++;
                    consecutivas = 0;
                    break;
                case 'F':
                    faltas++;
                    consecutivas++;
                    maxConsecutivas = Math.max(maxConsecutivas, consecutivas);
                    break;
                case 'FC':
                    faltasControladas++;
                    consecutivas++;
                    maxConsecutivas = Math.max(maxConsecutivas, consecutivas);
                    break;
                case 'A':
                    atestados++;
                    consecutivas = 0;
                    break;
            }
        });
        
        const totalDias = frequencias.length;
        const percentualPresenca = totalDias > 0 ? (presencas / totalDias) * 100 : 0;
        
        return {
            totalDias,
            presencas,
            faltas,
            faltasControladas,
            atestados,
            percentualPresenca,
            maxConsecutivas
        };
    }

    calcularStatsMedidas(medidas) {
        if (!medidas || medidas.length === 0) {
            return {
                total: 0,
                porTipo: {},
                ultimaData: null
            };
        }
        
        const porTipo = {};
        let ultimaData = null;
        
        medidas.forEach(medida => {
            // Contar por tipo
            const tipo = medida.tipo_medida || 'Não especificado';
            porTipo[tipo] = (porTipo[tipo] || 0) + 1;
            
            // Encontrar data mais recente (tentar diferentes nomes de campo)
            let dataMedida;
            if (medida.data_ocorrencia) {
                dataMedida = new Date(medida.data_ocorrencia);
            } else if (medida.data_aplicacao) {
                dataMedida = new Date(medida.data_aplicacao);
            } else if (medida.created_at) {
                dataMedida = new Date(medida.created_at);
            } else {
                dataMedida = new Date(); // Fallback para data atual se não encontrar
            }
            
            if (!ultimaData || dataMedida > ultimaData) {
                ultimaData = dataMedida;
            }
        });
        
        return {
            total: medidas.length,
            porTipo,
            ultimaData
        };
    }

    determinarNivelRisco(statsFrequencia, statsMedidas, ficaiRecente) {
        let pontuacao = 0;
        const motivos = [];
        
        // Análise de frequência
        if (statsFrequencia.maxConsecutivas >= 5) {
            pontuacao += 3;
            motivos.push(`${statsFrequencia.maxConsecutivas} faltas consecutivas`);
        } else if (statsFrequencia.maxConsecutivas >= 3) {
            pontuacao += 2;
            motivos.push(`${statsFrequencia.maxConsecutivas} faltas consecutivas`);
        }
        
        if (statsFrequencia.percentualPresenca < 60) {
            pontuacao += 3;
            motivos.push(`${statsFrequencia.percentualPresenca.toFixed(1)}% de presença`);
        } else if (statsFrequencia.percentualPresenca < 75) {
            pontuacao += 2;
            motivos.push(`${statsFrequencia.percentualPresenca.toFixed(1)}% de presença`);
        }
        
        const totalFaltas = statsFrequencia.faltas + statsFrequencia.faltasControladas;
        if (totalFaltas >= 10) {
            pontuacao += 3;
            motivos.push(`${totalFaltas} faltas totais`);
        } else if (totalFaltas >= 5) {
            pontuacao += 1;
            motivos.push(`${totalFaltas} faltas totais`);
        }
        
        // Análise de medidas disciplinares
        if (statsMedidas.total >= 5) {
            pontuacao += 3;
            motivos.push(`${statsMedidas.total} medidas disciplinares`);
        } else if (statsMedidas.total >= 3) {
            pontuacao += 2;
            motivos.push(`${statsMedidas.total} medidas disciplinares`);
        } else if (statsMedidas.total >= 1) {
            pontuacao += 1;
            motivos.push(`${statsMedidas.total} medida(s) disciplinar(es)`);
        }
        
        // Análise FICAI
        if (ficaiRecente) {
            if (ficaiRecente.status_ficai === 'conselho') {
                pontuacao += 4;
                motivos.push('Caso no Conselho Tutelar');
            } else if (ficaiRecente.status_ficai === 'aguardando') {
                pontuacao += 2;
                motivos.push('FICAI aguardando prazo');
            } else if (!ficaiRecente.status_ficai) {
                pontuacao += 1;
                motivos.push('FICAI sem status definido');
            }
        }
        
        // Determinar nível baseado na pontuação
        let nivel;
        if (pontuacao >= 8) {
            nivel = 'Crítico';
        } else if (pontuacao >= 5) {
            nivel = 'Alto';
        } else if (pontuacao >= 2) {
            nivel = 'Médio';
        } else {
            nivel = 'Baixo';
        }
        
        return { nivel, motivos, pontuacao };
    }

    mostrarLoading() {
        const container = document.getElementById('relatorioDetalhadoContainer');
        if (container) {
            container.innerHTML = `
                <div class="loading-state">
                    <div class="loading-spinner"></div>
                    <p>Carregando dados integrados...</p>
                </div>
            `;
        }
    }

    atualizarEstatisticasAvancadas() {
        console.log('📊 ANALYTICS: Atualizando estatísticas avançadas...');
        
        const dados = dadosRelatorios.processedData;
        
        // Calcular métricas avançadas
        const analytics = this.calcularAnalyticsAvancadas(dados);
        
        // Atualizar dashboard principal
        this.atualizarDashboardPrincipal(analytics);
        
        // Atualizar análise preditiva
        this.atualizarAnalisePredicativa(analytics);
        
        // Atualizar trends
        this.atualizarTrends(analytics);
        
        console.log('📊 ANALYTICS: Concluídas -', analytics);
    }

    calcularPeriodoData() {
        const hoje = new Date();
        let dataInicio, dataFim = hoje;

        switch (periodoAnalise) {
            case 'mes_atual':
                dataInicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
                dataFim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
                break;
                
            case 'mes_anterior':
                dataInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
                dataFim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
                break;
                
            case 'todos_meses':
                dataInicio = new Date(hoje.getFullYear(), 0, 1); // Janeiro do ano atual
                dataFim = hoje;
                break;
                
            case 'bimestre_atual':
                const bimestreAtual = Math.ceil((hoje.getMonth() + 1) / 2);
                dataInicio = new Date(hoje.getFullYear(), (bimestreAtual - 1) * 2, 1);
                dataFim = new Date(hoje.getFullYear(), bimestreAtual * 2, 0);
                break;
                
            case 'bimestre_anterior':
                const bimestreAnterior = Math.max(1, Math.ceil((hoje.getMonth() + 1) / 2) - 1);
                dataInicio = new Date(hoje.getFullYear(), (bimestreAnterior - 1) * 2, 1);
                dataFim = new Date(hoje.getFullYear(), bimestreAnterior * 2, 0);
                break;
                
            case 'semestre_atual':
                const semestreAtual = hoje.getMonth() < 6 ? 1 : 2;
                dataInicio = new Date(hoje.getFullYear(), semestreAtual === 1 ? 0 : 6, 1);
                dataFim = new Date(hoje.getFullYear(), semestreAtual === 1 ? 6 : 12, 0);
                break;
                
            case 'semestre_anterior':
                const semestreAnterior = hoje.getMonth() < 6 ? 2 : 1;
                const anoSemestre = semestreAnterior === 2 ? hoje.getFullYear() - 1 : hoje.getFullYear();
                dataInicio = new Date(anoSemestre, semestreAnterior === 1 ? 0 : 6, 1);
                dataFim = new Date(anoSemestre, semestreAnterior === 1 ? 6 : 12, 0);
                break;
                
            case 'anual':
                dataInicio = new Date(hoje.getFullYear(), 0, 1);
                dataFim = new Date(hoje.getFullYear(), 11, 31);
                break;
                
            case 'todos':
            default:
                dataInicio = new Date(2020, 0, 1); // Data muito antiga para pegar todos
                dataFim = hoje;
                break;
        }

        return { dataInicio, dataFim };
    }

    calcularAnalyticsAvancadas(dados) {
        // Analytics por turma
        const turmas = {};
        const { dataInicio, dataFim } = this.calcularPeriodoData();

        dados.forEach(aluno => {
            if (!turmas[aluno.turma]) {
                turmas[aluno.turma] = {
                    totalAlunos: 0,
                    frequenciaMedia: 0,
                    totalFaltas: 0,
                    totalMedidas: 0,
                    alunosRisco: 0,
                    melhorAluno: null,
                    piorAluno: null
                };
            }

            const turma = turmas[aluno.turma];
            turma.totalAlunos++;
            turma.frequenciaMedia += aluno.percentualPresenca;
            turma.totalFaltas += aluno.totalFaltas + aluno.totalFaltasControladas;
            turma.totalMedidas += aluno.totalMedidas;
            
            if (aluno.nivelRisco === 'Alto' || aluno.nivelRisco === 'Crítico') {
                turma.alunosRisco++;
            }

            // Tracking melhor e pior aluno
            if (!turma.melhorAluno || aluno.percentualPresenca > turma.melhorAluno.percentualPresenca) {
                turma.melhorAluno = aluno;
            }
            if (!turma.piorAluno || aluno.percentualPresenca < turma.piorAluno.percentualPresenca) {
                turma.piorAluno = aluno;
            }
        });

        // Calcular médias das turmas
        Object.keys(turmas).forEach(nomeTurma => {
            const turma = turmas[nomeTurma];
            if (turma.totalAlunos > 0) {
                turma.frequenciaMedia = turma.frequenciaMedia / turma.totalAlunos;
            }
        });

        // Métricas globais
        const totalAlunos = dados.length;
        const frequenciaGeralMedia = dados.reduce((sum, a) => sum + a.percentualPresenca, 0) / totalAlunos;
        const alunosEmRisco = dados.filter(a => a.nivelRisco === 'Alto' || a.nivelRisco === 'Crítico').length;
        const metasAtingidas = dados.filter(a => a.percentualPresenca >= 75).length;
        const percentualMetas = (metasAtingidas / totalAlunos) * 100;

        // Rankings
        const rankings = {
            maisProblematicos: dados
                .sort((a, b) => b.pontuacaoRisco - a.pontuacaoRisco)
                .slice(0, 10),
            maisFaltosos: dados
                .filter(a => a.totalFaltas + a.totalFaltasControladas > 0)
                .sort((a, b) => (b.totalFaltas + b.totalFaltasControladas) - (a.totalFaltas + a.totalFaltasControladas))
                .slice(0, 10),
            melhorFrequencia: dados
                .filter(a => a.percentualPresenca > 0)
                .sort((a, b) => b.percentualPresenca - a.percentualPresenca)
                .slice(0, 10),
            emRecuperacao: dados
                .filter(a => a.nivelRisco === 'Médio' && a.totalMedidas > 0)
                .sort((a, b) => b.percentualPresenca - a.percentualPresenca)
                .slice(0, 10)
        };

        // Análise preditiva
        const predictions = {
            alertasUrgentes: dados.filter(a => 
                a.nivelRisco === 'Crítico' && a.maxFaltasConsecutivas >= 5
            ).length,
            riscosIminentes: dados.filter(a => 
                a.nivelRisco === 'Alto' && a.percentualPresenca < 60
            ).length,
            tendenciaGeral: this.calcularTendenciaGeral(dados),
            efetividadeMedidas: this.calcularEfetividadeMedidas(dados)
        };

        return {
            turmas,
            global: {
                totalAlunos,
                frequenciaGeralMedia,
                alunosEmRisco,
                percentualMetas,
                distribuicaoTurmas: Object.keys(turmas).length
            },
            rankings,
            predictions
        };
    }

    calcularTendenciaGeral(dados) {
        // Análise simplificada de tendência baseada na distribuição de níveis de risco
        const distribuicao = {
            'Baixo': 0, 'Médio': 0, 'Alto': 0, 'Crítico': 0
        };
        
        dados.forEach(aluno => {
            distribuicao[aluno.nivelRisco]++;
        });

        const porcentagemCritico = (distribuicao['Crítico'] / dados.length) * 100;
        const porcentagemAlto = (distribuicao['Alto'] / dados.length) * 100;
        
        if (porcentagemCritico > 15) return 'Crítica';
        if (porcentagemCritico + porcentagemAlto > 25) return 'Preocupante';
        if (porcentagemCritico + porcentagemAlto < 10) return 'Excelente';
        return 'Estável';
    }

    calcularEfetividadeMedidas(dados) {
        const alunosComMedidas = dados.filter(a => a.totalMedidas > 0);
        if (alunosComMedidas.length === 0) return 0;

        const melhorasAposMedidas = alunosComMedidas.filter(aluno => {
            // Simplificação: considerar que se tem medidas e frequência > 60%, houve melhoria
            return aluno.percentualPresenca > 60;
        });

        return Math.round((melhorasAposMedidas.length / alunosComMedidas.length) * 100);
    }

    atualizarDashboardPrincipal(analytics) {
        // Atualizar cards principais
        this.atualizarElemento('totalAlunosAtivos', analytics.global.totalAlunos);
        this.atualizarElemento('mediaFrequenciaGeral', `${analytics.global.frequenciaGeralMedia.toFixed(1)}%`);
        this.atualizarElemento('alunosRisco', analytics.global.alunosEmRisco);
        this.atualizarElemento('metasAtingidas', `${analytics.global.percentualMetas.toFixed(1)}%`);
        
        // Atualizar sublabels
        this.atualizarElemento('distribuicaoTurmas', `${analytics.global.distribuicaoTurmas} turmas ativas`);
        this.atualizarElemento('statusFrequencia', 
            analytics.global.frequenciaGeralMedia >= 75 ? 'Meta: Atingida ✅' : 'Meta: 75%');
        this.atualizarElemento('nivelRiscoMedio', 
            analytics.global.alunosEmRisco > 20 ? 'Situação Crítica' : 'Controlado');
        
        // Store analytics globally
        dadosRelatorios.analytics = analytics;
    }

    atualizarAnalisePredicativa(analytics) {
        this.atualizarElemento('alertasUrgentes', analytics.predictions.alertasUrgentes);
        this.atualizarElemento('riscosIminentes', analytics.predictions.riscosIminentes);
        this.atualizarElemento('tendenciaGeral', analytics.predictions.tendenciaGeral);
        this.atualizarElemento('efetividadeMedidas', `${analytics.predictions.efetividadeMedidas}%`);
    }

    atualizarTrends(analytics) {
        // Calcular trends mockados (em um sistema real, compararía com período anterior)
        const trends = {
            alunos: '+2.5%',
            frequencia: analytics.global.frequenciaGeralMedia < 75 ? '-1.2%' : '+3.1%',
            risco: analytics.global.alunosEmRisco > 20 ? '+5.3%' : '-2.8%',
            medidas: '-8.1%' // Assumindo redução (bom sinal)
        };

        this.atualizarElemento('trendAlunos', trends.alunos, 'trend-text');
        this.atualizarElemento('trendFrequencia', trends.frequencia, 'trend-text');
        this.atualizarElemento('trendRisco', trends.risco, 'trend-text');
        this.atualizarElemento('trendMedidas', trends.medidas, 'trend-text');
    }

    atualizarElemento(id, valor, classe = null) {
        const elemento = document.getElementById(id);
        if (elemento) {
            if (classe) {
                const target = elemento.querySelector(`.${classe}`);
                if (target) target.textContent = valor;
            } else {
                elemento.textContent = valor;
            }
        }
    }

    carregarFiltrosAvancados() {
        console.log('📊 FILTROS AVANÇADOS: Carregando opções...');
        
        const dados = dadosRelatorios.processedData;
        
        // Extrair turmas únicas
        const turmas = [...new Set(dados.map(aluno => aluno.turma))].sort();
        
        // Preencher todos os selects de turma
        const selectIds = [
            'limitePorTurma', 
            'filtroTurmaDetalhado'
        ];
        
        selectIds.forEach(id => {
            const select = document.getElementById(id);
            if (select) {
                select.innerHTML = '<option value="">Todas as turmas</option>';
                turmas.forEach(turma => {
                    select.innerHTML += `<option value="${turma}">${turma}</option>`;
                });
            }
        });
        
        // Preencher selects de comparação
        const selectComparacao1 = document.getElementById('turma1Comparacao');
        const selectComparacao2 = document.getElementById('turma2Comparacao');
        
        console.log('📋 PREENCHENDO DROPDOWNS COM TURMAS:', turmas);
        
        if (selectComparacao1) {
            selectComparacao1.innerHTML = '<option value="">Selecionar Turma 1</option>';
            turmas.forEach(turma => {
                selectComparacao1.innerHTML += `<option value="${turma}">${turma}</option>`;
            });
            console.log('✅ DROPDOWN 1 PREENCHIDO COM', turmas.length, 'TURMAS');
        }
        
        if (selectComparacao2) {
            selectComparacao2.innerHTML = '<option value="">Selecionar Turma 2</option>';
            selectComparacao2.innerHTML += '<option value="MEDIA_GERAL">📊 Média Geral</option>';
            turmas.forEach(turma => {
                selectComparacao2.innerHTML += `<option value="${turma}">${turma}</option>`;
            });
            console.log('✅ DROPDOWN 2 PREENCHIDO COM MÉDIA GERAL +', turmas.length, 'TURMAS');
        }
        
        console.log('📊 FILTROS AVANÇADOS: Carregados', turmas.length, 'turmas');
    }

    atualizarGraficosAvancados() {
        console.log('📊 GRÁFICOS AVANÇADOS: Atualizando...');
        
        if (!dadosRelatorios.analytics) return;
        
        // Sistema de comparação inteligente
        this.gerarRankingTurmasEstatico();
        this.inicializarComparacao();
        
        // Gráficos de frequência avançados
        this.gerarGraficoFrequenciaTemporal();
        this.gerarGraficoBaixaFrequencia();
        this.gerarGraficoHeatmapFrequencia();
        
        // Gráficos de medidas disciplinares
        this.gerarGraficoMedidasPorTurma();
        this.gerarGraficoEvolucaoMedidas();
        this.gerarGraficoEfetividadeMedidas();
        
        console.log('📊 GRÁFICOS AVANÇADOS: Concluídos');
    }

    atualizarRankings() {
        console.log('📊 RANKINGS: Atualizando...');
        
        if (!dadosRelatorios.analytics?.rankings) return;
        
        const rankings = dadosRelatorios.analytics.rankings;
        
        // Atualizar cada ranking
        this.renderRanking('rankingCriticos', rankings.maisProblematicos, 'critical');
        this.renderRanking('rankingBaixaFrequencia', rankings.maisFaltosos, 'warning');
        this.renderRanking('rankingMedidas', rankings.melhorFrequencia, 'info');
        this.renderRanking('rankingMelhorias', rankings.emRecuperacao, 'success');
        
        console.log('📊 RANKINGS: Concluídos');
    }

    renderRanking(containerId, dados, tipo) {
        const container = document.getElementById(containerId);
        if (!container || !dados) return;

        let html = '';
        dados.forEach((aluno, index) => {
            const metrica = this.getMetricaRanking(aluno, tipo);
            html += `
                <div class="ranking-item">
                    <div class="ranking-position">${index + 1}</div>
                    <div class="ranking-student-info">
                        <div class="ranking-student-name">${aluno.nome}</div>
                        <div class="ranking-student-details">
                            ${aluno.turma} • ${aluno.codigo}
                        </div>
                    </div>
                    <div class="ranking-metric ${tipo}">
                        ${metrica}
                    </div>
                </div>
            `;
        });

        container.innerHTML = html || '<p class="text-muted">Nenhum dado disponível</p>';
    }

    getMetricaRanking(aluno, tipo) {
        switch (tipo) {
            case 'critical':
                return `${aluno.pontuacaoRisco}pts`;
            case 'warning':
                return `${aluno.totalFaltas + aluno.totalFaltasControladas} faltas`;
            case 'info':
                return `${aluno.percentualPresenca.toFixed(1)}%`;
            case 'success':
                return `${aluno.percentualPresenca.toFixed(1)}%`;
            default:
                return '-';
        }
    }
    // === MÉTODOS DE GRÁFICOS AVANÇADOS ===

    gerarRankingTurmasEstatico() {
        const container = document.getElementById('rankingTurmasLista');
        if (!container) return;

        const turmas = dadosRelatorios.analytics.turmas;
        if (!turmas) return;

        // Calcular ranking baseado em frequência média
        const turmasArray = Object.entries(turmas)
            .map(([nome, dados]) => ({
                nome,
                frequencia: dados.frequenciaMedia,
                alunos: dados.totalAlunos,
                faltas: dados.totalFaltas,
                medidas: dados.totalMedidas,
                risco: dados.alunosRisco
            }))
            .sort((a, b) => b.frequencia - a.frequencia)
            .slice(0, 5);

        let html = '';
        turmasArray.forEach((turma, index) => {
            html += `
                <div class="ranking-static-item rank-${index + 1}">
                    <div class="ranking-static-info">
                        <div class="ranking-static-position">${index + 1}º</div>
                        <div class="ranking-static-turma">${turma.nome}</div>
                    </div>
                    <div class="ranking-static-metric">
                        ${turma.frequencia.toFixed(1)}%
                    </div>
                </div>
            `;
        });

        container.innerHTML = html || '<p class="text-muted">Carregando ranking...</p>';
    }

    inicializarComparacao() {
        // Limpar gráfico de comparação se existir
        this.destruirGrafico('comparacaoEspecifica');
        
        const canvas = document.getElementById('chartComparacaoEspecifica');
        if (!canvas) return;
        
        // Estado inicial - mostrar placeholder
        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#6c757d';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Selecione turmas para comparar', canvas.width/2, canvas.height/2);
    }

    gerarComparacaoEspecifica() {
        const turma1 = document.getElementById('turma1Comparacao')?.value;
        const turma2 = document.getElementById('turma2Comparacao')?.value;
        const metrica = document.getElementById('metricaComparacao')?.value || 'frequencia';

        console.log('🔍 COMPARAÇÃO: Turma1:', turma1, 'Turma2:', turma2, 'Métrica:', metrica);

        if (!turma1 || !turma2) {
            this.inicializarComparacao();
            return;
        }

        const canvas = document.getElementById('chartComparacaoEspecifica');
        if (!canvas || typeof Chart === 'undefined') return;

        this.destruirGrafico('comparacaoEspecifica');

        const turmas = dadosRelatorios.analytics?.turmas;
        if (!turmas) {
            console.error('❌ Dados de turmas não encontrados');
            return;
        }

        console.log('📊 TURMAS DISPONÍVEIS:', Object.keys(turmas));
        
        let dadosTurma1, dadosTurma2, labelTurma2;

        // Dados da turma 1
        if (turmas[turma1]) {
            dadosTurma1 = turmas[turma1];
            console.log('✅ TURMA1 ENCONTRADA:', turma1, dadosTurma1);
        } else {
            console.error('❌ TURMA1 NÃO ENCONTRADA:', turma1);
            return;
        }

        // Dados da turma 2 ou média geral
        if (turma2 === 'MEDIA_GERAL') {
            labelTurma2 = 'Média Geral';
            const todasTurmas = Object.values(turmas);
            const totalAlunos = todasTurmas.reduce((sum, t) => sum + t.totalAlunos, 0);
            dadosTurma2 = {
                frequenciaMedia: todasTurmas.reduce((sum, t) => sum + t.frequenciaMedia * t.totalAlunos, 0) / totalAlunos,
                totalFaltas: todasTurmas.reduce((sum, t) => sum + t.totalFaltas, 0) / todasTurmas.length,
                totalMedidas: todasTurmas.reduce((sum, t) => sum + t.totalMedidas, 0) / todasTurmas.length,
                alunosRisco: todasTurmas.reduce((sum, t) => sum + t.alunosRisco, 0) / todasTurmas.length
            };
        } else if (turmas[turma2]) {
            labelTurma2 = turma2;
            dadosTurma2 = turmas[turma2];
            console.log('✅ TURMA2 ENCONTRADA:', turma2, dadosTurma2);
        } else {
            console.error('❌ TURMA2 NÃO ENCONTRADA:', turma2);
            return;
        }

        // Obter valores da métrica selecionada
        let valor1, valor2, label, titulo;
        
        console.log('🔍 DADOS TURMA1:', JSON.stringify(dadosTurma1, null, 2));
        console.log('🔍 DADOS TURMA2:', JSON.stringify(dadosTurma2, null, 2));
        
        switch (metrica) {
            case 'frequencia':
                valor1 = dadosTurma1.frequenciaMedia;
                valor2 = dadosTurma2.frequenciaMedia;
                label = 'Frequência (%)';
                titulo = `${turma1} vs ${labelTurma2} - Frequência`;
                console.log('📊 VALORES FREQUÊNCIA: valor1=', valor1, 'valor2=', valor2);
                break;
            case 'faltas':
                valor1 = dadosTurma1.totalFaltas;
                valor2 = dadosTurma2.totalFaltas;
                label = 'Total de Faltas';
                titulo = `${turma1} vs ${labelTurma2} - Faltas`;
                console.log('📊 VALORES FALTAS: valor1=', valor1, 'valor2=', valor2);
                break;
            case 'medidas':
                valor1 = dadosTurma1.totalMedidas;
                valor2 = dadosTurma2.totalMedidas;
                label = 'Medidas Disciplinares';
                titulo = `${turma1} vs ${labelTurma2} - Medidas`;
                console.log('📊 VALORES MEDIDAS: valor1=', valor1, 'valor2=', valor2);
                break;
            case 'risco':
                valor1 = dadosTurma1.alunosRisco;
                valor2 = dadosTurma2.alunosRisco;
                label = 'Alunos em Risco';
                titulo = `${turma1} vs ${labelTurma2} - Risco`;
                console.log('📊 VALORES RISCO: valor1=', valor1, 'valor2=', valor2);
                break;
        }

        // Garantir que os valores sejam números válidos
        valor1 = parseFloat(valor1) || 0;
        valor2 = parseFloat(valor2) || 0;
        
        console.log('✅ VALORES FINAIS: valor1=', valor1, 'valor2=', valor2);

        // Atualizar título da comparação
        const tituloElemento = document.getElementById('comparacaoTitulo');
        if (tituloElemento) {
            tituloElemento.textContent = titulo;
        }

        // Criar gráfico de barras comparativo
        const ctx = canvas.getContext('2d');
        
        console.log('🎨 CRIANDO GRÁFICO COM:');
        console.log('  - Labels:', [turma1, labelTurma2]);
        console.log('  - Data:', [valor1, valor2]);
        console.log('  - Label:', label);
        
        chartsInstances.comparacaoEspecifica = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [turma1, labelTurma2],
                datasets: [{
                    label: label,
                    data: [valor1, valor2],
                    backgroundColor: [
                        'rgba(54, 162, 235, 0.7)',
                        'rgba(255, 99, 132, 0.7)'
                    ],
                    borderColor: [
                        'rgba(54, 162, 235, 1)',
                        'rgba(255, 99, 132, 1)'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: titulo,
                        font: { size: 14, weight: 'bold' }
                    }
                },
                scales: {
                    y: { 
                        beginAtZero: true,
                        grid: { color: 'rgba(0,0,0,0.1)' }
                    },
                    x: {
                        grid: { display: false }
                    }
                }
            }
        });
        
        console.log('🎯 GRÁFICO DE COMPARAÇÃO CRIADO COM SUCESSO!');
    }

    gerarGraficoComparativoTurmas() {
        const canvas = document.getElementById('chartComparativoTurmas');
        if (!canvas || typeof Chart === 'undefined') return;

        this.destruirGrafico('comparativoTurmas');

        const turmas = dadosRelatorios.analytics.turmas;
        const labels = Object.keys(turmas).sort();
        const metrica = document.getElementById('metricaComparacao')?.value || 'frequencia';

        let data, label, backgroundColor;
        
        switch (metrica) {
            case 'frequencia':
                data = labels.map(t => turmas[t].frequenciaMedia);
                label = 'Frequência Média (%)';
                backgroundColor = 'rgba(54, 162, 235, 0.7)';
                break;
            case 'faltas':
                data = labels.map(t => turmas[t].totalFaltas);
                label = 'Total de Faltas';
                backgroundColor = 'rgba(255, 99, 132, 0.7)';
                break;
            case 'medidas':
                data = labels.map(t => turmas[t].totalMedidas);
                label = 'Medidas Disciplinares';
                backgroundColor = 'rgba(255, 206, 86, 0.7)';
                break;
            case 'risco':
                data = labels.map(t => turmas[t].alunosRisco);
                label = 'Alunos em Risco';
                backgroundColor = 'rgba(255, 99, 132, 0.7)';
                break;
            default:
                data = labels.map(t => turmas[t].frequenciaMedia);
                label = 'Frequência Média (%)';
                backgroundColor = 'rgba(54, 162, 235, 0.7)';
        }

        const ctx = canvas.getContext('2d');
        chartsInstances.comparativoTurmas = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: label,
                    data: data,
                    backgroundColor: backgroundColor,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    gerarGraficoRankingTurmas() {
        const canvas = document.getElementById('chartRankingTurmas');
        if (!canvas || typeof Chart === 'undefined') return;

        this.destruirGrafico('rankingTurmas');

        const turmas = dadosRelatorios.analytics.turmas;
        const turmasArray = Object.entries(turmas)
            .map(([nome, dados]) => ({ nome, ...dados }))
            .sort((a, b) => b.frequenciaMedia - a.frequenciaMedia)
            .slice(0, 5);

        const labels = turmasArray.map(t => t.nome);
        const data = turmasArray.map(t => t.frequenciaMedia);

        const ctx = canvas.getContext('2d');
        chartsInstances.rankingTurmas = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: [
                        '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'right' }
                }
            }
        });
    }

    gerarGraficoFrequenciaTemporal() {
        const canvas = document.getElementById('chartFrequenciaTemporal');
        if (!canvas || typeof Chart === 'undefined') return;

        this.destruirGrafico('frequenciaTemporal');

        // Agrupar dados por mês e turma
        const dadosPorMes = {};
        const turmas = Object.keys(dadosRelatorios.analytics.turmas);

        dadosRelatorios.processedData.forEach(aluno => {
            aluno.frequencias.forEach(freq => {
                const data = new Date(freq.data);
                const mesAno = `${data.getFullYear()}-${(data.getMonth() + 1).toString().padStart(2, '0')}`;
                
                if (!dadosPorMes[mesAno]) {
                    dadosPorMes[mesAno] = {};
                    turmas.forEach(t => dadosPorMes[mesAno][t] = { presencas: 0, total: 0 });
                }
                
                if (dadosPorMes[mesAno][aluno.turma]) {
                    dadosPorMes[mesAno][aluno.turma].total++;
                    if (freq.status === 'P') {
                        dadosPorMes[mesAno][aluno.turma].presencas++;
                    }
                }
            });
        });

        const meses = Object.keys(dadosPorMes).sort().slice(-6); // Últimos 6 meses
        const datasets = turmas.slice(0, 4).map((turma, index) => {
            const cores = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'];
            return {
                label: turma,
                data: meses.map(mes => {
                    const dados = dadosPorMes[mes][turma];
                    return dados && dados.total > 0 ? (dados.presencas / dados.total) * 100 : 0;
                }),
                borderColor: cores[index],
                backgroundColor: cores[index] + '20',
                fill: false
            };
        });

        const ctx = canvas.getContext('2d');
        chartsInstances.frequenciaTemporal = new Chart(ctx, {
            type: 'line',
            data: { labels: meses, datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true, max: 100 }
                }
            }
        });
    }

    gerarGraficoBaixaFrequencia() {
        const canvas = document.getElementById('chartBaixaFrequencia');
        if (!canvas || typeof Chart === 'undefined') return;

        this.destruirGrafico('baixaFrequencia');

        const alunosBaixaFreq = dadosRelatorios.processedData
            .filter(a => a.percentualPresenca < 75)
            .sort((a, b) => a.percentualPresenca - b.percentualPresenca)
            .slice(0, 10);

        if (alunosBaixaFreq.length === 0) return;

        const labels = alunosBaixaFreq.map(a => a.nome.split(' ').slice(0, 2).join(' '));
        const data = alunosBaixaFreq.map(a => a.percentualPresenca);

        const ctx = canvas.getContext('2d');
        chartsInstances.baixaFrequencia = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Frequência (%)',
                    data: data,
                    backgroundColor: data.map(val => 
                        val < 50 ? '#dc3545' : val < 60 ? '#fd7e14' : '#ffc107'
                    )
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                scales: {
                    x: { beginAtZero: true, max: 100 }
                }
            }
        });
    }

    gerarGraficoHeatmapFrequencia() {
        // Implementação simplificada - em um sistema real usaria uma biblioteca de heatmap
        const canvas = document.getElementById('chartHeatmapFrequencia');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#495057';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Heatmap de Frequência em Desenvolvimento', canvas.width/2, canvas.height/2);
    }

    gerarGraficoMedidasPorTurma() {
        const canvas = document.getElementById('chartMedidasPorTurma');
        if (!canvas || typeof Chart === 'undefined') return;

        this.destruirGrafico('medidasPorTurma');

        const turmas = dadosRelatorios.analytics.turmas;
        const labels = Object.keys(turmas).sort();
        const data = labels.map(t => turmas[t].totalMedidas);

        const ctx = canvas.getContext('2d');
        chartsInstances.medidasPorTurma = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Medidas Aplicadas',
                    data: data,
                    backgroundColor: 'rgba(255, 206, 86, 0.7)',
                    borderColor: 'rgba(255, 206, 86, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    gerarGraficoEvolucaoMedidas() {
        const canvas = document.getElementById('chartEvolucaoMedidas');
        if (!canvas || typeof Chart === 'undefined') return;

        this.destruirGrafico('evolucaoMedidas');

        // Dados mockados para demonstração
        const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'];
        const data = [45, 38, 42, 35, 28, 22]; // Tendência decrescente (melhoria)

        const ctx = canvas.getContext('2d');
        chartsInstances.evolucaoMedidas = new Chart(ctx, {
            type: 'line',
            data: {
                labels: meses,
                datasets: [{
                    label: 'Medidas por Mês',
                    data: data,
                    borderColor: '#dc3545',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    fill: true
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { beginAtZero: true }
                }
            }
        });
    }

    gerarGraficoEfetividadeMedidas() {
        const canvas = document.getElementById('chartEfetividadeMedidas');
        if (!canvas) return;
        
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#495057';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Análise de Efetividade em Desenvolvimento', canvas.width/2, canvas.height/2);
    }

    destruirGrafico(nome) {
        if (chartsInstances[nome]) {
            chartsInstances[nome].destroy();
            delete chartsInstances[nome];
        }
    }
}

// === FUNÇÕES GLOBAIS PARA INTERFACE ===

// Funções globais para a interface
async function inicializarModuloRelatorios() {
    console.log('📊 INIT: Inicializando módulo de relatórios...');
    
    try {
        // Aguardar Supabase estar pronto
        let tentativas = 0;
        while (!window.supabaseClient && tentativas < 50) {
            console.log('⏳ Aguardando Supabase...', tentativas);
            await new Promise(resolve => setTimeout(resolve, 100));
            tentativas++;
        }
        
        if (!window.supabaseClient) {
            showErrorToast('⚠️ Supabase não conectado - verifique a conexão');
            return;
        }
        
        showInfoToast('Carregando módulo de relatórios...');
        
        // Inicializar manager
        window.relatoriosManager = new RelatoriosSupabaseManager();
        
        // Carregar dados completos
        await window.relatoriosManager.carregarDadosCompletos();
        
        console.log('✅ INIT: Módulo de relatórios iniciado com sucesso');
        
    } catch (error) {
        console.error('❌ INIT: Erro ao inicializar:', error);
        showErrorToast('Erro ao carregar módulo de relatórios');
    }
}

// Funções de filtros
function aplicarFiltrosRelatorio() {
    console.log('🔍 FILTROS: Aplicando filtros...');
    
    if (!window.relatoriosManager || !dadosRelatorios.processedData.length) {
        console.warn('Dados não carregados ainda');
        return;
    }

    const filtroTurma = document.getElementById('filtroTurmaRelatorio').value;
    const filtroPeriodo = document.getElementById('filtroPeriodoRelatorio').value;
    const tipoRelatorio = document.getElementById('tipoRelatorio').value;
    const pesquisaAluno = document.getElementById('pesquisaAlunoRelatorio').value.toLowerCase();

    let dadosFiltrados = [...dadosRelatorios.processedData];

    // Filtrar por turma
    if (filtroTurma) {
        dadosFiltrados = dadosFiltrados.filter(aluno => aluno.turma === filtroTurma);
    }

    // Filtrar por período
    if (filtroPeriodo !== 'todos') {
        const diasAtras = parseInt(filtroPeriodo);
        const dataLimite = new Date();
        dataLimite.setDate(dataLimite.getDate() - diasAtras);
        
        dadosFiltrados = dadosFiltrados.filter(aluno => {
            // Verificar se tem atividade recente (frequência ou medida)
            const temFrequenciaRecente = aluno.frequencias.some(f => 
                new Date(f.data) >= dataLimite
            );
            const temMedidaRecente = aluno.medidas.some(m => {
                let dataMedida;
                if (m.data_ocorrencia) {
                    dataMedida = new Date(m.data_ocorrencia);
                } else if (m.data_aplicacao) {
                    dataMedida = new Date(m.data_aplicacao);
                } else if (m.created_at) {
                    dataMedida = new Date(m.created_at);
                } else {
                    return false; // Sem data válida, considerar não recente
                }
                return dataMedida >= dataLimite;
            });
            
            return temFrequenciaRecente || temMedidaRecente;
        });
    }

    // Filtrar por tipo de relatório
    switch (tipoRelatorio) {
        case 'frequencia':
            dadosFiltrados = dadosFiltrados.filter(aluno => 
                aluno.totalFaltas + aluno.totalFaltasControladas > 0
            );
            break;
        case 'medidas':
            dadosFiltrados = dadosFiltrados.filter(aluno => aluno.totalMedidas > 0);
            break;
        case 'ficai':
            dadosFiltrados = dadosFiltrados.filter(aluno => 
                aluno.statusFicai || aluno.nivelRisco === 'Alto' || aluno.nivelRisco === 'Crítico'
            );
            break;
        case 'criticos':
            dadosFiltrados = dadosFiltrados.filter(aluno => 
                aluno.nivelRisco === 'Crítico'
            );
            break;
    }

    // Filtrar por pesquisa de aluno
    if (pesquisaAluno) {
        dadosFiltrados = dadosFiltrados.filter(aluno => 
            aluno.nome.toLowerCase().includes(pesquisaAluno) ||
            aluno.codigo.includes(pesquisaAluno)
        );
    }

    // Atualizar interface com dados filtrados
    filtrosAtivos = { filtroTurma, filtroPeriodo, tipoRelatorio, pesquisaAluno };
    window.relatoriosManager.atualizarInterfaceComFiltros(dadosFiltrados);
    
    console.log('✅ FILTROS: Aplicados -', dadosFiltrados.length, 'de', dadosRelatorios.processedData.length);
}

function limparFiltrosRelatorio() {
    document.getElementById('filtroTurmaRelatorio').value = '';
    document.getElementById('filtroPeriodoRelatorio').value = '30';
    document.getElementById('tipoRelatorio').value = 'geral';
    document.getElementById('pesquisaAlunoRelatorio').value = '';
    
    filtrosAtivos = {};
    aplicarFiltrosRelatorio();
}

// Adicionar método à classe para atualizar interface com filtros
RelatoriosSupabaseManager.prototype.atualizarInterfaceComFiltros = function(dadosFiltrados) {
    this.atualizarGraficos(dadosFiltrados);
    this.atualizarRelatorioDetalhado(dadosFiltrados);
    this.atualizarEstatisticasFiltradas(dadosFiltrados);
};

RelatoriosSupabaseManager.prototype.atualizarEstatisticasFiltradas = function(dados) {
    const totalAlunos = dados.length;
    const totalFaltas = dados.reduce((sum, aluno) => sum + aluno.totalFaltas + aluno.totalFaltasControladas, 0);
    const totalMedidas = dados.reduce((sum, aluno) => sum + aluno.totalMedidas, 0);
    const alertasFicai = dados.filter(aluno => 
        aluno.nivelRisco === 'Alto' || aluno.nivelRisco === 'Crítico'
    ).length;
    
    // Atualizar com animação
    const updates = [
        { id: 'totalAlunosRelatorio', value: totalAlunos },
        { id: 'totalFaltasRelatorio', value: totalFaltas },
        { id: 'totalMedidasRelatorio', value: totalMedidas },
        { id: 'alertasAtivosRelatorio', value: alertasFicai }
    ];
    
    updates.forEach(({ id, value }, index) => {
        const element = document.getElementById(id);
        if (element) {
            setTimeout(() => {
                element.style.transform = 'scale(1.1)';
                element.textContent = value;
                setTimeout(() => {
                    element.style.transform = 'scale(1)';
                }, 200);
            }, index * 100);
        }
    });
};

// Funções de gráficos
RelatoriosSupabaseManager.prototype.atualizarGraficos = function(dados = null) {
    if (!dados) dados = dadosRelatorios.processedData;
    
    this.gerarGraficoFaltasPorTurma(dados);
    this.gerarGraficoTopAlunos(dados);
    this.gerarGraficoFrequenciaMensal(dados);
    this.gerarGraficoStatusFICAI(dados);
};

RelatoriosSupabaseManager.prototype.gerarGraficoFaltasPorTurma = function(dados) {
    const canvas = document.getElementById('chartFaltasPorTurma');
    if (!canvas || typeof Chart === 'undefined') return;

    if (chartsInstances.faltasPorTurma) {
        chartsInstances.faltasPorTurma.destroy();
    }

    // Agrupar faltas por turma
    const turmas = {};
    dados.forEach(aluno => {
        if (!turmas[aluno.turma]) {
            turmas[aluno.turma] = 0;
        }
        turmas[aluno.turma] += aluno.totalFaltas + aluno.totalFaltasControladas;
    });

    const labels = Object.keys(turmas).sort();
    const dataFaltas = labels.map(turma => turmas[turma]);

    const ctx = canvas.getContext('2d');
    chartsInstances.faltasPorTurma = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total de Faltas',
                data: dataFaltas,
                backgroundColor: 'rgba(220, 53, 69, 0.7)',
                borderColor: 'rgba(220, 53, 69, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
};

RelatoriosSupabaseManager.prototype.gerarGraficoTopAlunos = function(dados) {
    const canvas = document.getElementById('chartTopAlunosFaltas');
    if (!canvas || typeof Chart === 'undefined') return;

    if (chartsInstances.topAlunos) {
        chartsInstances.topAlunos.destroy();
    }

    // Top 10 alunos com mais faltas
    const alunosComFaltas = dados
        .filter(a => a.totalFaltas + a.totalFaltasControladas > 0)
        .sort((a, b) => (b.totalFaltas + b.totalFaltasControladas) - (a.totalFaltas + a.totalFaltasControladas))
        .slice(0, 10);

    if (alunosComFaltas.length === 0) return;

    const labels = alunosComFaltas.map(a => a.nome.split(' ').slice(0, 2).join(' '));
    const dataFaltas = alunosComFaltas.map(a => a.totalFaltas + a.totalFaltasControladas);

    const ctx = canvas.getContext('2d');
    chartsInstances.topAlunos = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total de Faltas',
                data: dataFaltas,
                backgroundColor: 'rgba(255, 193, 7, 0.7)',
                borderColor: 'rgba(255, 193, 7, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y'
        }
    });
};

RelatoriosSupabaseManager.prototype.gerarGraficoFrequenciaMensal = function(dados) {
    const canvas = document.getElementById('chartFrequenciaMensal');
    if (!canvas || typeof Chart === 'undefined') return;

    if (chartsInstances.frequenciaMensal) {
        chartsInstances.frequenciaMensal.destroy();
    }

    // Agrupar por mês
    const meses = {};
    dados.forEach(aluno => {
        aluno.frequencias.forEach(freq => {
            const data = new Date(freq.data);
            const mesAno = `${data.getFullYear()}-${(data.getMonth() + 1).toString().padStart(2, '0')}`;
            
            if (!meses[mesAno]) {
                meses[mesAno] = { presencas: 0, faltas: 0 };
            }
            
            if (freq.status === 'P') {
                meses[mesAno].presencas++;
            } else if (freq.status === 'F' || freq.status === 'FC') {
                meses[mesAno].faltas++;
            }
        });
    });

    const labels = Object.keys(meses).sort();
    const dataPresencas = labels.map(mes => meses[mes].presencas);
    const dataFaltas = labels.map(mes => meses[mes].faltas);

    const ctx = canvas.getContext('2d');
    chartsInstances.frequenciaMensal = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Presenças',
                    data: dataPresencas,
                    borderColor: 'rgba(40, 167, 69, 1)',
                    backgroundColor: 'rgba(40, 167, 69, 0.1)',
                    fill: true
                },
                {
                    label: 'Faltas',
                    data: dataFaltas,
                    borderColor: 'rgba(220, 53, 69, 1)',
                    backgroundColor: 'rgba(220, 53, 69, 0.1)',
                    fill: true
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
};

RelatoriosSupabaseManager.prototype.gerarGraficoStatusFICAI = function(dados) {
    const canvas = document.getElementById('chartStatusFICAI');
    if (!canvas || typeof Chart === 'undefined') return;

    if (chartsInstances.statusFICAI) {
        chartsInstances.statusFICAI.destroy();
    }

    const status = { 'Baixo': 0, 'Médio': 0, 'Alto': 0, 'Crítico': 0 };
    dados.forEach(aluno => {
        status[aluno.nivelRisco]++;
    });

    const labels = Object.keys(status);
    const dataValues = Object.values(status);
    const cores = ['#28a745', '#ffc107', '#fd7e14', '#dc3545'];

    const ctx = canvas.getContext('2d');
    chartsInstances.statusFICAI = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataValues,
                backgroundColor: cores,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
};

// Funções de relatório detalhado
RelatoriosSupabaseManager.prototype.atualizarRelatorioDetalhado = function(dados = null) {
    if (!dados) dados = dadosRelatorios.processedData;
    
    const container = document.getElementById('relatorioDetalhadoContainer');
    if (!container) return;
    
    if (dados.length === 0) {
        container.innerHTML = `
            <div class="no-alertas">
                <strong>Nenhum resultado encontrado</strong><br>
                <small>Ajuste os filtros para visualizar dados</small>
            </div>
        `;
        return;
    }
    
    // Verificar se há muitos dados (mais de 50)
    const temMuitosDados = dados.length > 50;
    
    let html = `
        <div style="margin-bottom: 2rem;">
            <h3 style="margin: 0 0 1rem 0;">📊 Resumo dos Resultados</h3>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: #007bff;">${dados.length}</div>
                    <div style="color: #666;">Alunos Filtrados</div>
                </div>
                <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: #dc3545;">${dados.reduce((sum, a) => sum + a.totalFaltas + a.totalFaltasControladas, 0)}</div>
                    <div style="color: #666;">Total de Faltas</div>
                </div>
                <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: #ffc107;">${dados.reduce((sum, a) => sum + a.totalMedidas, 0)}</div>
                    <div style="color: #666;">Medidas Aplicadas</div>
                </div>
                <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; text-align: center;">
                    <div style="font-size: 2rem; font-weight: bold; color: #dc3545;">${dados.filter(a => a.nivelRisco === 'Alto' || a.nivelRisco === 'Crítico').length}</div>
                    <div style="color: #666;">Casos de Risco</div>
                </div>
            </div>
        </div>
        
        ${temMuitosDados ? `
            <div style="margin-bottom: 1rem; text-align: center;">
                <button id="toggleDetalhesBtn" class="btn btn-info" onclick="toggleRelatorioDetalhado()">
                    📋 Mostrar Tabela Detalhada (${dados.length} registros)
                </button>
            </div>
        ` : ''}
        
        <div id="tabelaDetalhadaContainer" class="table-container" style="${temMuitosDados ? 'display: none;' : ''}">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Aluno</th>
                        <th>Turma</th>
                        <th>Frequência</th>
                        <th>Faltas</th>
                        <th>Medidas</th>
                        <th>Nível de Risco</th>
                        <th>FICAI</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    dados.forEach(aluno => {
        const corRisco = {
            'Baixo': '#28a745',
            'Médio': '#ffc107', 
            'Alto': '#fd7e14',
            'Crítico': '#dc3545'
        }[aluno.nivelRisco];
        
        html += `
            <tr>
                <td><strong>${aluno.nome}</strong><br><small>#${aluno.codigo}</small></td>
                <td>${aluno.turma}</td>
                <td>${aluno.percentualPresenca.toFixed(1)}%</td>
                <td>${aluno.totalFaltas + aluno.totalFaltasControladas}</td>
                <td>${aluno.totalMedidas}</td>
                <td><span style="background: ${corRisco}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem;">${aluno.nivelRisco}</span></td>
                <td>${aluno.statusFicai || 'N/A'}</td>
            </tr>
        `;
    });
    
    html += `
                </tbody>
            </table>
        </div>
    `;
    
    container.innerHTML = html;
};

// Função para alternar exibição da tabela detalhada
function toggleRelatorioDetalhado() {
    const container = document.getElementById('tabelaDetalhadaContainer');
    const btn = document.getElementById('toggleDetalhesBtn');
    
    if (!container || !btn) return;
    
    const isVisible = container.style.display !== 'none';
    
    if (isVisible) {
        container.style.display = 'none';
        btn.innerHTML = btn.innerHTML.replace('🙈 Esconder', '📋 Mostrar');
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-info');
    } else {
        container.style.display = 'block';
        btn.innerHTML = btn.innerHTML.replace('📋 Mostrar', '🙈 Esconder');
        btn.classList.remove('btn-info');
        btn.classList.add('btn-secondary');
    }
}

// Funções de exportação
function exportarRelatorioCompleto() {
    console.log('📊 EXPORT: Exportando relatório completo...');
    
    const dados = dadosRelatorios.processedData;
    if (!dados || dados.length === 0) {
        showErrorToast('Nenhum dado para exportar');
        return;
    }
    
    // Criar CSV
    let csv = 'Código,Nome,Turma,Presença %,Total Faltas,Faltas F,Faltas FC,Atestados,Total Medidas,Nível Risco,Status FICAI\n';
    
    dados.forEach(aluno => {
        const linha = [
            aluno.codigo,
            `"${aluno.nome}"`,
            aluno.turma,
            aluno.percentualPresenca.toFixed(1),
            aluno.totalFaltas + aluno.totalFaltasControladas,
            aluno.totalFaltas,
            aluno.totalFaltasControladas,
            aluno.totalAtestados,
            aluno.totalMedidas,
            aluno.nivelRisco,
            aluno.statusFicai || ''
        ].join(',');
        csv += linha + '\n';
    });
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_completo_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    showSuccessToast('Relatório CSV exportado com sucesso!');
}

function gerarRelatorioPDF() {
    showInfoToast('Funcionalidade PDF em desenvolvimento...');
}

function atualizarRelatorioDetalhado() {
    if (window.relatoriosManager) {
        window.relatoriosManager.atualizarRelatorioDetalhado();
    }
}

function expandirTodosDetalhes() {
    showInfoToast('Visualização expandida em desenvolvimento...');
}

// Aguardar DOM estar pronto
document.addEventListener('DOMContentLoaded', inicializarModuloRelatorios);

// === FUNÇÕES DE INTERFACE AVANÇADAS ===

function atualizarDashboardCompleto() {
    periodoAnalise = document.getElementById('periodoAnalise')?.value || 'anual';
    
    console.log('📊 PERÍODO: Alterado para', periodoAnalise);
    
    if (window.relatoriosManager) {
        window.relatoriosManager.atualizarEstatisticasAvancadas();
        window.relatoriosManager.atualizarGraficosAvancados();
        window.relatoriosManager.atualizarRankings();
    }
}

function atualizarComparacao() {
    if (window.relatoriosManager) {
        window.relatoriosManager.gerarComparacaoEspecifica();
    }
}

function alternarVisualizacaoFrequencia() {
    visualizacaoAtual = visualizacaoAtual === 'comparativo' ? 'temporal' : 'comparativo';
    if (window.relatoriosManager) {
        window.relatoriosManager.gerarGraficoFrequenciaTemporal();
    }
}

function atualizarGraficosMedidas() {
    if (window.relatoriosManager) {
        window.relatoriosManager.gerarGraficoMedidasPorTurma();
        window.relatoriosManager.gerarGraficoEvolucaoMedidas();
    }
}

function atualizarRankings() {
    if (window.relatoriosManager) {
        window.relatoriosManager.atualizarRankings();
    }
}

function gerarAlertas() {
    const alertas = dadosRelatorios.processedData.filter(aluno => 
        aluno.nivelRisco === 'Crítico' && aluno.maxFaltasConsecutivas >= 5
    );
    
    if (alertas.length > 0) {
        showWarningToast(`🚨 ${alertas.length} alertas urgentes identificados!`);
    } else {
        showSuccessToast('✅ Nenhum alerta urgente no momento');
    }
}

function exportarPlanosAcao() {
    showInfoToast('📋 Gerando planos de ação personalizados...');
    
    setTimeout(() => {
        const dadosCriticos = dadosRelatorios.processedData
            .filter(a => a.nivelRisco === 'Alto' || a.nivelRisco === 'Crítico')
            .slice(0, 20);
            
        let csv = 'Nome,Turma,Frequência,Faltas,Medidas,Nível Risco,Plano de Ação\n';
        
        dadosCriticos.forEach(aluno => {
            const plano = gerarPlanoAcao(aluno);
            csv += `"${aluno.nome}","${aluno.turma}","${aluno.percentualPresenca.toFixed(1)}%",`;
            csv += `"${aluno.totalFaltas + aluno.totalFaltasControladas}","${aluno.totalMedidas}",`;
            csv += `"${aluno.nivelRisco}","${plano}"\n`;
        });
        
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `planos_acao_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);
        
        showSuccessToast('📊 Planos de ação exportados com sucesso!');
    }, 1000);
}

function gerarPlanoAcao(aluno) {
    let acoes = [];
    
    if (aluno.percentualPresenca < 50) {
        acoes.push('Contato urgente com família');
    } else if (aluno.percentualPresenca < 75) {
        acoes.push('Acompanhamento pedagógico');
    }
    
    if (aluno.maxFaltasConsecutivas >= 5) {
        acoes.push('Protocolo FICAI imediato');
    }
    
    if (aluno.totalMedidas >= 3) {
        acoes.push('Revisão das medidas aplicadas');
    }
    
    if (acoes.length === 0) {
        acoes.push('Monitoramento preventivo');
    }
    
    return acoes.join('; ');
}

function exportarDashboardCompleto() {
    showInfoToast('📄 Gerando relatório PDF completo...');
    setTimeout(() => {
        showWarningToast('🚧 Exportação PDF em desenvolvimento - use CSV por enquanto');
    }, 1500);
}

function exportarRelatorioPersonalizado() {
    exportarRelatorioCompleto(); // Reutiliza função existente
}

// Aguardar DOM estar pronto
document.addEventListener('DOMContentLoaded', inicializarModuloRelatorios);

console.log('✅ Dashboard Avançado de Relatórios carregado');