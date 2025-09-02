// assets/js/relatorios-supabase.js
// Sistema de Relatórios integrado com Supabase

console.log('📊 RELATÓRIOS: Inicializando sistema de relatórios...');

// Variáveis globais
let dadosRelatorios = {
    alunos: [],
    frequencias: [],
    medidas: [],
    ficaiProvidencias: [],
    processedData: []
};

let chartsInstances = {};
let filtrosAtivos = {};

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
            
            // Atualizar interface
            this.atualizarEstatisticasRapidas();
            this.carregarFiltros();
            this.atualizarGraficos();
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

    atualizarEstatisticasRapidas() {
        console.log('📊 STATS: Atualizando estatísticas rápidas...');
        
        const dados = dadosRelatorios.processedData;
        
        // Calcular estatísticas
        const totalAlunos = dados.length;
        const totalFaltas = dados.reduce((sum, aluno) => sum + aluno.totalFaltas + aluno.totalFaltasControladas, 0);
        const totalMedidas = dados.reduce((sum, aluno) => sum + aluno.totalMedidas, 0);
        const alertasFicai = dados.filter(aluno => 
            aluno.nivelRisco === 'Alto' || aluno.nivelRisco === 'Crítico'
        ).length;
        
        // Atualizar elementos
        const elements = {
            totalAlunosRelatorio: totalAlunos,
            totalFaltasRelatorio: totalFaltas,
            totalMedidasRelatorio: totalMedidas,
            alertasAtivosRelatorio: alertasFicai
        };
        
        Object.entries(elements).forEach(([id, valor]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = valor;
                element.style.opacity = '0';
                setTimeout(() => {
                    element.style.transition = 'opacity 0.5s ease';
                    element.style.opacity = '1';
                }, 100);
            }
        });
        
        console.log('📊 STATS: Atualizadas -', elements);
    }

    carregarFiltros() {
        console.log('📊 FILTROS: Carregando opções de filtros...');
        
        const dados = dadosRelatorios.processedData;
        
        // Extrair turmas únicas
        const turmas = [...new Set(dados.map(aluno => aluno.turma))].sort();
        
        // Preencher select de turmas
        const selectTurma = document.getElementById('filtroTurmaRelatorio');
        if (selectTurma) {
            selectTurma.innerHTML = '<option value="">Todas as turmas</option>';
            turmas.forEach(turma => {
                selectTurma.innerHTML += `<option value="${turma}">${turma}</option>`;
            });
        }
        
        console.log('📊 FILTROS: Carregados', turmas.length, 'turmas');
    }
}

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

console.log('✅ relatorios-supabase.js carregado');