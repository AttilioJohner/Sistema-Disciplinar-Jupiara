// Sistema de Frequência com Supabase
console.log('📚 Carregando sistema de frequência com Supabase...');

class FrequenciaSupabaseManager {
  constructor() {
    this.dadosFrequencia = new Map();
    this.turmaAtual = '';
    this.mesAtual = '';
    this.anoAtual = '';
    
    this.init();
  }

  async init() {
    console.log('🚀 Inicializando FrequenciaSupabaseManager...');
    
    // Aguardar Supabase estar pronto
    while (!window.supabaseClient) {
      console.log('⏳ Aguardando Supabase...');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.supabase = window.supabaseClient;
    this.setupEventListeners();
    await this.carregarDados();
    this.renderizarRelatorios();
    
    // Se não há dados, mostrar opções de importação
    if (this.dadosFrequencia.size === 0) {
      console.log('📥 Nenhum dado encontrado...');
      showToast('Nenhum dado de frequência encontrado. Importe um arquivo CSV.', 'info');
    }
    
    console.log('✅ FrequenciaSupabaseManager inicializado');
  }

  setupEventListeners() {
    // Filtros originais
    const filtroTurma = document.getElementById('filtro-turma');
    const filtroMes = document.getElementById('filtro-mes');
    const filtroAno = document.getElementById('filtro-ano');

    if (filtroTurma) {
      filtroTurma.addEventListener('change', (e) => {
        this.turmaAtual = e.target.value;
        this.atualizarFiltroMes();
        this.renderizarTabela();
      });
    }

    if (filtroMes) {
      filtroMes.addEventListener('change', (e) => {
        this.mesAtual = e.target.value;
        this.renderizarTabela();
      });
    }

    if (filtroAno) {
      filtroAno.addEventListener('change', (e) => {
        this.anoAtual = e.target.value;
        this.renderizarTabela();
      });
    }
  }

  async carregarDados() {
    try {
      console.log('📂 Carregando dados do Supabase com paginação...');
      
      let todasFrequencias = [];
      let pagina = 0;
      const tamanhoPagina = 1000;
      let temMaisDados = true;
      
      while (temMaisDados) {
        const inicio = pagina * tamanhoPagina;
        const fim = inicio + tamanhoPagina - 1;
        
        console.log(`📄 Carregando página ${pagina + 1} (registros ${inicio} a ${fim})...`);
        
        const { data: frequenciasPagina, error } = await this.supabase
          .from('frequencia')
          .select('*')
          .range(inicio, fim);
        
        // Debug específico: verificar se esta página contém o registro 1250
        if (frequenciasPagina && frequenciasPagina.length > 0) {
          const temRegistro1250 = frequenciasPagina.find(r => r.id === 1250);
          if (temRegistro1250) {
            console.log(`✅ PÁGINA ${pagina + 1} CONTÉM REGISTRO 1250:`, temRegistro1250);
          }
        }
        
        if (error) {
          console.error('❌ Erro ao buscar frequências:', error);
          throw error;
        }
        
        if (frequenciasPagina && frequenciasPagina.length > 0) {
          todasFrequencias = todasFrequencias.concat(frequenciasPagina);
          console.log(`✅ Página ${pagina + 1}: ${frequenciasPagina.length} registros (total: ${todasFrequencias.length})`);
          
          // Se recebemos menos que o tamanho da página, não há mais dados
          temMaisDados = frequenciasPagina.length === tamanhoPagina;
          pagina++;
        } else {
          temMaisDados = false;
        }
      }
      
      const frequencias = todasFrequencias;
      console.log(`🎯 TOTAL FINAL DE REGISTROS CARREGADOS: ${frequencias.length}`);
      
      // Debug específico: verificar se ID 1250 está nos dados carregados
      const registro1250 = frequencias.find(r => r.id === 1250);
      if (registro1250) {
        console.log(`🎯 REGISTRO 1250 ENCONTRADO:`, registro1250);
        const data1250 = new Date(registro1250.data + 'T00:00:00.000Z');
        console.log(`🎯 REGISTRO 1250 DATA DEBUG: raw='${registro1250.data}' -> Date=${data1250} -> Year=${data1250.getUTCFullYear()} Month=${data1250.getUTCMonth()} Day=${data1250.getUTCDate()}`);
      } else {
        console.log(`❌ REGISTRO 1250 NÃO ENCONTRADO nos ${frequencias.length} registros carregados`);
      }
      
      // Debug: verificar se existem registros para agosto/2025 sexta-feira 15
      const registrosAgosto15 = frequencias.filter(r => {
        const data = new Date(r.data + 'T00:00:00.000Z');
        // Só debugar alguns registros para não lotar o console
        if (r.id === 1250 || r.data.includes('2025-08-15')) {
          console.log(`🔧 DEBUG DATA ID ${r.id}: raw='${r.data}' -> Date=${data} -> Year=${data.getUTCFullYear()} Month=${data.getUTCMonth()} Day=${data.getUTCDate()}`);
        }
        return data.getUTCFullYear() === 2025 && 
               data.getUTCMonth() === 7 && // agosto = 7 (0-indexed)
               data.getUTCDate() === 15;
      });
      console.log(`🔍 REGISTROS PARA 15/08/2025:`, registrosAgosto15.length, registrosAgosto15.slice(0, 3));
      
      this.dadosFrequencia.clear();
      
      // Agrupar por turma/mês/ano
      const gruposDados = new Map();
      
      if (frequencias && frequencias.length > 0) {
        console.log(`📊 Total de registros encontrados: ${frequencias.length}`);
        console.log('📋 Primeiros 3 registros:', frequencias.slice(0, 3));
        
        frequencias.forEach(registro => {
          // Extrair mês e ano da data - CORREÇÃO: usar parsing UTC para evitar problema de timezone
          const dataObj = new Date(registro.data + 'T00:00:00.000Z');
          const mes = String(dataObj.getUTCMonth() + 1).padStart(2, '0');
          const ano = String(dataObj.getUTCFullYear());
          const dia = String(dataObj.getUTCDate()).padStart(2, '0');
          
          // Debug específico para registro 1250 e registros do dia 15/08/2025
          if (registro.id === 1250 || (registro.data && registro.data.includes('2025-08-15'))) {
            console.log(`🔧 PROCESSAMENTO REGISTRO ${registro.id}:`, {
              raw_data: registro.data,
              parsed_date: dataObj,
              mes: mes,
              ano: ano,
              dia: dia,
              turma: registro.turma
            });
          }
          
          const chave = `${registro.turma}_${mes}_${ano}`;
          
          if (!gruposDados.has(chave)) {
            console.log(`📅 Novo período encontrado: ${chave} (${registro.turma} - ${mes}/${ano})`);
            gruposDados.set(chave, {
              turma: registro.turma,
              mes: mes,
              ano: ano,
              alunos: new Map()
            });
          }
          
          const grupo = gruposDados.get(chave);
          const codigoAluno = registro.codigo_matricula;
          
          // Se aluno não existe no grupo, criar
          if (!grupo.alunos.has(codigoAluno)) {
            grupo.alunos.set(codigoAluno, {
              id: codigoAluno,
              codigo: codigoAluno,
              nome: registro.nome_completo,
              dias: {}
            });
            console.log(`👤 DEBUG - Novo aluno criado: ${codigoAluno} (${registro.nome_completo}) na turma ${registro.turma}`);
          }
          
          // Adicionar status do dia
          grupo.alunos.get(codigoAluno).dias[dia] = registro.status;
          
          // Debug específico para sextas-feiras (dias 01, 08, 15, 22, 29)
          if (['01', '08', '15', '22', '29'].includes(dia)) {
            console.log(`🔍 SEXTA-FEIRA ENCONTRADA: ${registro.turma} - Aluno ${codigoAluno} - Dia ${dia} (${registro.data}) = ${registro.status}`);
          }
          
          // Debug mais frequente para ver acumulação de dias
          if (Math.random() < 0.05) { // 5% dos registros
            const alunoAtual = grupo.alunos.get(codigoAluno);
            const totalDiasAluno = Object.keys(alunoAtual.dias).length;
            console.log(`📅 DEBUG acumulação: ${registro.turma} - Aluno ${codigoAluno} agora tem ${totalDiasAluno} dias: [${Object.keys(alunoAtual.dias).sort().join(', ')}]`);
          }
          
          // Debug para ver como os dados estão sendo processados
          if (Math.random() < 0.01) { // 1% dos registros para não poluir o log
            console.log(`🔍 Debug processamento: ${registro.turma} - Aluno ${codigoAluno} - Dia ${dia} = ${registro.status}`);
          }
        });
        
        // Converter Maps de alunos para arrays e debug final
        for (const [chave, grupo] of gruposDados) {
          const alunosArray = Array.from(grupo.alunos.values());
          
          // Debug: mostrar quantos dias cada aluno tem
          console.log(`📊 DEBUG FINAL - Turma ${grupo.turma} (${chave}): ${alunosArray.length} alunos`);
          alunosArray.forEach((aluno, index) => {
            const diasCount = Object.keys(aluno.dias).length;
            const diasList = Object.keys(aluno.dias).sort().join(', ');
            if (index < 3) { // Mostrar apenas os primeiros 3 alunos para não poluir
              console.log(`  👤 Aluno ${aluno.codigo} (${aluno.nome}): ${diasCount} dias [${diasList}]`);
            }
          });
          
          grupo.alunos = alunosArray;
        }
      }
      
      this.dadosFrequencia = gruposDados;
      
      console.log(`✅ Carregados ${this.dadosFrequencia.size} períodos de frequência`);
      this.atualizarFiltros();
      
    } catch (error) {
      console.error('❌ Erro ao carregar dados:', error);
      showToast('Erro ao carregar dados: ' + error.message, 'error');
    }
  }

  atualizarFiltros() {
    const turmas = new Set();
    const anos = new Set();
    
    for (const [chave, dados] of this.dadosFrequencia) {
      turmas.add(dados.turma);
      anos.add(dados.ano);
    }
    
    // Atualizar select de turmas
    const selectTurma = document.getElementById('filtro-turma');
    if (selectTurma) {
      selectTurma.innerHTML = '<option value="">Selecione uma turma</option>';
      Array.from(turmas).sort().forEach(turma => {
        const option = document.createElement('option');
        option.value = turma;
        option.textContent = turma;
        selectTurma.appendChild(option);
      });
    }
    
    // Atualizar select de anos
    const selectAno = document.getElementById('filtro-ano');
    if (selectAno) {
      selectAno.innerHTML = '<option value="">Selecione um ano</option>';
      Array.from(anos).sort().forEach(ano => {
        const option = document.createElement('option');
        option.value = ano;
        option.textContent = ano;
        selectAno.appendChild(option);
      });
    }
  }

  atualizarFiltroMes() {
    const selectMes = document.getElementById('filtro-mes');
    if (!selectMes) return;
    
    selectMes.innerHTML = '<option value="">Selecione um mês</option>';
    
    if (!this.turmaAtual) return;
    
    const mesesDisponiveis = new Set();
    for (const [chave, dados] of this.dadosFrequencia) {
      if (dados.turma === this.turmaAtual) {
        mesesDisponiveis.add(dados.mes);
      }
    }
    
    Array.from(mesesDisponiveis).sort().forEach(mes => {
      const option = document.createElement('option');
      option.value = mes;
      option.textContent = this.getNomeMes(mes);
      selectMes.appendChild(option);
    });
  }

  getNomeMes(numeroMes) {
    const meses = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    return meses[parseInt(numeroMes) - 1] || numeroMes;
  }

  renderizarRelatorios() {
    const container = document.getElementById('resumoTurmas');
    if (!container) return;
    
    // Criar estrutura preservando o layout original
    container.innerHTML = `
      <div class="cards-grid"></div>
    `;
    
    // Criar filtros avançados em container separado, se não existir
    let filtrosContainer = document.getElementById('filtros-avancados-container');
    if (!filtrosContainer) {
      filtrosContainer = document.createElement('div');
      filtrosContainer.id = 'filtros-avancados-container';
      filtrosContainer.innerHTML = `
        <div class="container">
          <h2>🔍 Pesquisa Avançada</h2>
          <div class="filters-row">
            <div class="filter-group">
              <label for="filtro-turma-avancado">Turma:</label>
              <select id="filtro-turma-avancado">
                <option value="">Selecione uma turma...</option>
              </select>
            </div>
            <div class="filter-group">
              <label for="filtro-aluno">Aluno:</label>
              <select id="filtro-aluno" disabled>
                <option value="">Selecione um aluno...</option>
              </select>
            </div>
          </div>
          <div id="estatisticas-aluno">
            <div class="info-text">Selecione uma turma e depois um aluno para ver suas estatísticas</div>
          </div>
        </div>
      `;
      // Inserir antes do container de resumo das turmas
      container.parentNode.insertBefore(filtrosContainer, container);
    }
    
    const cardsGrid = container.querySelector('.cards-grid');
    
    // Configurar event listeners dos novos elementos
    this.setupFiltrosAvancados();
    
    // Agrupar por turma
    const relatoriosPorTurma = new Map();
    
    for (const [chave, dados] of this.dadosFrequencia) {
      const { turma, alunos } = dados;
      
      if (!relatoriosPorTurma.has(turma)) {
        relatoriosPorTurma.set(turma, {
          totalAlunos: 0,
          totalPeriodos: 0,
          ultimoMes: ''
        });
      }
      
      const relatorio = relatoriosPorTurma.get(turma);
      relatorio.totalAlunos = Math.max(relatorio.totalAlunos, alunos.length);
      relatorio.totalPeriodos++;
      relatorio.ultimoMes = dados.mes + '/' + dados.ano;
    }
    
    // Renderizar cards
    for (const [turma, relatorio] of relatoriosPorTurma) {
      const card = document.createElement('div');
      card.className = 'turma-card';
      
      // Calcular média de presença da turma (simulada para demonstração)
      const mediaPresenca = (85 + Math.random() * 10).toFixed(1); // Entre 85% e 95%
      
      card.innerHTML = `
        <div class="turma-card-header">TURMA ${turma}</div>
        <div class="turma-card-body">
          <div class="turma-stats">
            <div class="stat-item">
              <div class="stat-label">Alunos</div>
              <div class="stat-value">${relatorio.totalAlunos}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Períodos</div>
              <div class="stat-value">${relatorio.totalPeriodos}</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Média Presença</div>
              <div class="stat-value">${mediaPresenca}%</div>
            </div>
            <div class="stat-item">
              <div class="stat-label">Último Período</div>
              <div class="stat-value">${relatorio.ultimoMes}</div>
            </div>
          </div>
        </div>
      `;
      
      card.addEventListener('click', () => {
        this.selecionarTurma(turma);
      });
      
      cardsGrid.appendChild(card);
    }
    
    // Atualizar filtro avançado de turmas
    this.atualizarFiltroTurmas(Array.from(relatoriosPorTurma.keys()));
    
    // Atualizar turmas para lançamento
    this.carregarTurmasLancamento();
  }

  setupFiltrosAvancados() {
    console.log('🔧 Configurando event listeners dos filtros avançados...');
    
    // Filtro avançado de turmas
    const filtroTurmaAvancado = document.getElementById('filtro-turma-avancado');
    if (filtroTurmaAvancado) {
      console.log('✅ Elemento filtro-turma-avancado encontrado, configurando event listener');
      filtroTurmaAvancado.addEventListener('change', (e) => {
        console.log(`🔄 Filtro turma changed: ${e.target.value}`);
        this.atualizarListaAlunos(e.target.value);
      });
    } else {
      console.error('❌ Elemento filtro-turma-avancado ainda NÃO encontrado!');
    }
    
    // Filtro de alunos
    const filtroAluno = document.getElementById('filtro-aluno');
    if (filtroAluno) {
      console.log('✅ Elemento filtro-aluno encontrado, configurando event listener');
      filtroAluno.addEventListener('change', (e) => {
        console.log(`🔄 Filtro aluno changed: ${e.target.value}`);
        this.mostrarEstatisticasAluno(e.target.value);
      });
    } else {
      console.error('❌ Elemento filtro-aluno ainda NÃO encontrado!');
    }
  }

  atualizarFiltroTurmas(turmas) {
    const selectTurma = document.getElementById('filtro-turma-avancado');
    if (!selectTurma) return;
    
    selectTurma.innerHTML = '<option value="">Selecione uma turma...</option>';
    turmas.sort().forEach(turma => {
      const option = document.createElement('option');
      option.value = turma;
      option.textContent = `Turma ${turma}`;
      selectTurma.appendChild(option);
    });
  }

  atualizarListaAlunos(turma) {
    console.log(`🔍 DEBUG - atualizarListaAlunos chamado com turma: ${turma}`);
    
    const selectAluno = document.getElementById('filtro-aluno');
    if (!selectAluno) {
      console.error('❌ Elemento filtro-aluno não encontrado!');
      return;
    }
    
    console.log(`✅ Elemento filtro-aluno encontrado`);
    selectAluno.innerHTML = '<option value="">Selecione um aluno...</option>';
    
    if (!turma) {
      selectAluno.disabled = true;
      console.log('⚠️ Turma vazia, desabilitando select de alunos');
      return;
    }
    
    console.log(`🔍 Procurando alunos da turma ${turma} em ${this.dadosFrequencia.size} períodos`);
    
    const alunosUnicos = new Map();
    let periodosEncontrados = 0;
    
    this.dadosFrequencia.forEach((periodo, chave) => {
      console.log(`📊 Verificando período: ${chave} - Turma: ${periodo.turma}`);
      if (periodo.turma === turma) {
        periodosEncontrados++;
        console.log(`✅ Período compatível encontrado: ${chave} com ${periodo.alunos.length} alunos`);
        periodo.alunos.forEach(aluno => {
          if (!alunosUnicos.has(aluno.codigo)) {
            alunosUnicos.set(aluno.codigo, { codigo: aluno.codigo, nome: aluno.nome });
          }
        });
      }
    });
    
    console.log(`📊 Total períodos encontrados para turma ${turma}: ${periodosEncontrados}`);
    console.log(`👥 Total alunos únicos encontrados: ${alunosUnicos.size}`);
    
    if (alunosUnicos.size === 0) {
      selectAluno.innerHTML = '<option value="">Nenhum aluno encontrado</option>';
      selectAluno.disabled = true;
      console.log('❌ Nenhum aluno encontrado para a turma');
      return;
    }
    
    const alunosOrdenados = Array.from(alunosUnicos.values()).sort((a, b) => a.nome.localeCompare(b.nome));
    console.log(`📝 Primeiros 3 alunos:`, alunosOrdenados.slice(0, 3));
    
    alunosOrdenados.forEach(aluno => {
      const option = document.createElement('option');
      option.value = aluno.codigo;
      option.textContent = `${aluno.codigo} - ${aluno.nome}`;
      selectAluno.appendChild(option);
    });
    
    selectAluno.disabled = false;
    console.log(`✅ Select de alunos atualizado com ${alunosOrdenados.length} alunos`);
  }

  mostrarEstatisticasAluno(codigoAluno) {
    const container = document.getElementById('estatisticas-aluno');
    if (!container) return;
    
    if (!codigoAluno) {
      container.innerHTML = '<div class="info-text">Selecione um aluno para ver suas estatísticas</div>';
      return;
    }
    
    const dadosAluno = { codigo: codigoAluno, nome: '', turma: '', totais: { P: 0, F: 0, A: 0, FC: 0 }, totalRegistros: 0, periodos: [] };
    
    this.dadosFrequencia.forEach((periodo, chave) => {
      const alunoNoPeriodo = periodo.alunos.find(a => a.codigo === codigoAluno);
      if (alunoNoPeriodo) {
        dadosAluno.nome = alunoNoPeriodo.nome;
        dadosAluno.turma = periodo.turma;
        
        const totalPeriodo = { P: 0, F: 0, A: 0, FC: 0 };
        if (alunoNoPeriodo.dias) {
          Object.values(alunoNoPeriodo.dias).forEach(status => {
            if (dadosAluno.totais.hasOwnProperty(status)) {
              dadosAluno.totais[status]++;
              totalPeriodo[status]++;
              dadosAluno.totalRegistros++;
            }
          });
        }
        
        dadosAluno.periodos.push({
          periodo: `${this.getNomeMes(periodo.mes)}/${periodo.ano}`,
          totais: totalPeriodo,
          totalDias: Object.values(totalPeriodo).reduce((a, b) => a + b, 0)
        });
      }
    });
    
    const percentualPresenca = dadosAluno.totalRegistros > 0 ? ((dadosAluno.totais.P / dadosAluno.totalRegistros) * 100).toFixed(1) : 0;
    const corPresenca = percentualPresenca >= 75 ? '#28a745' : percentualPresenca >= 50 ? '#ffc107' : '#dc3545';
    
    container.innerHTML = `
      <div class="container">
        <h2>📊 Estatísticas - ${dadosAluno.nome}</h2>
        
        <div class="aluno-header" style="background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); color: white; padding: 1.5rem; border-radius: 12px; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 1.5rem; font-weight: 700;">${dadosAluno.codigo}</div>
            <div style="opacity: 0.9;">Turma ${dadosAluno.turma}</div>
          </div>
          <div style="text-align: center;">
            <div style="font-size: 2rem; font-weight: 700; color: ${corPresenca};">${percentualPresenca}%</div>
            <div style="font-size: 0.8rem; opacity: 0.9;">PRESENÇA</div>
          </div>
        </div>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 1.5rem;">
          <div class="stat-card" style="background: white; border-radius: 12px; padding: 1.25rem; text-align: center; border-left: 4px solid #28a745; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
            <div style="font-size: 2rem;">✅</div>
            <div style="font-size: 2rem; font-weight: 700; color: #28a745; margin: 0.5rem 0;">${dadosAluno.totais.P}</div>
            <div style="color: #6c757d; text-transform: uppercase; font-size: 0.9rem;">Presenças</div>
          </div>
          
          <div class="stat-card" style="background: white; border-radius: 12px; padding: 1.25rem; text-align: center; border-left: 4px solid #dc3545; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
            <div style="font-size: 2rem;">❌</div>
            <div style="font-size: 2rem; font-weight: 700; color: #dc3545; margin: 0.5rem 0;">${dadosAluno.totais.F}</div>
            <div style="color: #6c757d; text-transform: uppercase; font-size: 0.9rem;">Faltas</div>
          </div>
          
          <div class="stat-card" style="background: white; border-radius: 12px; padding: 1.25rem; text-align: center; border-left: 4px solid #ffc107; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
            <div style="font-size: 2rem;">📋</div>
            <div style="font-size: 2rem; font-weight: 700; color: #ffc107; margin: 0.5rem 0;">${dadosAluno.totais.A}</div>
            <div style="color: #6c757d; text-transform: uppercase; font-size: 0.9rem;">Atestados</div>
          </div>
          
          <div class="stat-card" style="background: white; border-radius: 12px; padding: 1.25rem; text-align: center; border-left: 4px solid #17a2b8; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
            <div style="font-size: 2rem;">⚠️</div>
            <div style="font-size: 2rem; font-weight: 700; color: #17a2b8; margin: 0.5rem 0;">${dadosAluno.totais.FC}</div>
            <div style="color: #6c757d; text-transform: uppercase; font-size: 0.9rem;">F. Controladas</div>
          </div>
        </div>
        
        <div style="background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
          <h4 style="margin: 0 0 1.5rem 0; color: #495057;">📈 Frequência por Período</h4>
          ${dadosAluno.periodos.map(periodo => {
            const percentualPeriodo = periodo.totalDias > 0 ? ((periodo.totais.P / periodo.totalDias) * 100).toFixed(1) : 0;
            const corBarra = parseFloat(percentualPeriodo) >= 75 ? '#28a745' : '#dc3545';
            
            return `
              <div style="margin-bottom: 1.25rem; background: #f8f9fa; border-radius: 8px; padding: 1rem; border-left: 4px solid #007bff;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem;">
                  <span style="font-weight: 600; color: #495057;">${periodo.periodo}</span>
                  <span style="font-weight: 700; font-size: 1.1rem; color: #007bff;">${percentualPeriodo}%</span>
                </div>
                <div style="background: #e9ecef; border-radius: 10px; height: 8px; margin-bottom: 0.75rem; overflow: hidden;">
                  <div style="height: 100%; width: ${percentualPeriodo}%; background: ${corBarra}; border-radius: 10px; transition: width 0.3s ease;"></div>
                </div>
                <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                  <span class="freq-P" style="font-size: 0.8rem; padding: 0.2rem 0.4rem;">${periodo.totais.P}P</span>
                  <span class="freq-F" style="font-size: 0.8rem; padding: 0.2rem 0.4rem;">${periodo.totais.F}F</span>
                  <span class="freq-A" style="font-size: 0.8rem; padding: 0.2rem 0.4rem;">${periodo.totais.A}A</span>
                  <span class="freq-FC" style="font-size: 0.8rem; padding: 0.2rem 0.4rem;">${periodo.totais.FC}FC</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // SISTEMA DE LANÇAMENTO DE FREQUÊNCIA
  carregarTurmasLancamento() {
    console.log('🔍 Carregando turmas para lançamento...');
    const selectTurma = document.getElementById('turmaLancamento');
    if (!selectTurma) return;

    // Coletar todas as turmas disponíveis
    const turmasDisponiveis = new Set();
    this.dadosFrequencia.forEach((periodo, chave) => {
      turmasDisponiveis.add(periodo.turma);
    });

    // Limpar e popular select
    selectTurma.innerHTML = '<option value="">Selecione uma turma...</option>';
    Array.from(turmasDisponiveis).sort().forEach(turma => {
      const option = document.createElement('option');
      option.value = turma;
      option.textContent = `Turma ${turma}`;
      selectTurma.appendChild(option);
    });

    console.log(`✅ ${turmasDisponiveis.size} turmas carregadas para lançamento`);
  }

  carregarAlunosLancamento(turma) {
    console.log(`🔍 Carregando alunos da turma ${turma} para lançamento...`);
    
    const containerLista = document.getElementById('containerListaAlunos');
    const tituloTurmaData = document.getElementById('tituloTurmaData');
    const listaAlunos = document.getElementById('listaAlunosFrequencia');
    const dataLancamento = document.getElementById('dataLancamento').value;

    if (!turma) {
      containerLista.style.display = 'none';
      return;
    }

    if (!dataLancamento) {
      alert('Por favor, selecione uma data antes de escolher a turma.');
      document.getElementById('turmaLancamento').value = '';
      return;
    }

    // Coletar alunos únicos da turma
    const alunosUnicos = new Map();
    this.dadosFrequencia.forEach((periodo, chave) => {
      if (periodo.turma === turma) {
        periodo.alunos.forEach(aluno => {
          if (!alunosUnicos.has(aluno.codigo)) {
            alunosUnicos.set(aluno.codigo, {
              codigo: aluno.codigo,
              nome: aluno.nome,
              turma: turma
            });
          }
        });
      }
    });

    if (alunosUnicos.size === 0) {
      alert(`Nenhum aluno encontrado para a turma ${turma}`);
      return;
    }

    // Ordenar alunos por nome
    const alunosOrdenados = Array.from(alunosUnicos.values())
      .sort((a, b) => a.nome.localeCompare(b.nome));

    // Atualizar título
    const dataFormatada = new Date(dataLancamento + 'T00:00:00').toLocaleDateString('pt-BR');
    tituloTurmaData.textContent = `Turma ${turma} - ${dataFormatada}`;

    // Gerar lista de alunos
    listaAlunos.innerHTML = alunosOrdenados.map(aluno => `
      <div class="aluno-frequencia-item" data-codigo="${aluno.codigo}">
        <div class="aluno-info">
          <span class="aluno-codigo">${aluno.codigo}</span>
          <span class="aluno-nome">${aluno.nome}</span>
        </div>
        <div class="frequencia-controles">
          <label class="frequencia-radio">
            <input type="radio" name="freq_${aluno.codigo}" value="P" checked>
            <span class="radio-label freq-P">P</span>
          </label>
          <label class="frequencia-radio">
            <input type="radio" name="freq_${aluno.codigo}" value="F">
            <span class="radio-label freq-F">F</span>
          </label>
          <label class="frequencia-radio">
            <input type="radio" name="freq_${aluno.codigo}" value="A">
            <span class="radio-label freq-A">A</span>
          </label>
          <label class="frequencia-radio">
            <input type="radio" name="freq_${aluno.codigo}" value="FC">
            <span class="radio-label freq-FC">FC</span>
          </label>
        </div>
      </div>
    `).join('');

    // Mostrar container e habilitar botão de salvar
    containerLista.style.display = 'block';
    document.getElementById('btnSalvarFrequencia').disabled = false;

    console.log(`✅ ${alunosOrdenados.length} alunos carregados para lançamento`);
  }

  marcarTodosPresentes() {
    console.log('✅ Marcando todos como presentes...');
    const radiosPresenca = document.querySelectorAll('input[type="radio"][value="P"]');
    radiosPresenca.forEach(radio => {
      radio.checked = true;
    });
    console.log(`✅ ${radiosPresenca.length} alunos marcados como presentes`);
  }

  limparMarcacoes() {
    console.log('🔄 Limpando todas as marcações...');
    const radiosPresenca = document.querySelectorAll('input[type="radio"][value="P"]');
    radiosPresenca.forEach(radio => {
      radio.checked = true;
    });
    console.log('✅ Todas as marcações resetadas para Presente');
  }

  async salvarFrequenciaDiaria() {
    const turma = document.getElementById('turmaLancamento').value;
    const data = document.getElementById('dataLancamento').value;
    const statusContainer = document.getElementById('statusSalvamento');

    if (!turma || !data) {
      alert('Por favor, selecione uma turma e uma data.');
      return;
    }

    console.log(`💾 Iniciando salvamento da frequência - Turma: ${turma}, Data: ${data}`);

    // Coletar dados dos alunos
    const dadosFrequencia = [];
    const alunosItems = document.querySelectorAll('.aluno-frequencia-item');
    
    alunosItems.forEach(item => {
      const codigo = item.dataset.codigo;
      const nome = item.querySelector('.aluno-nome').textContent;
      const radioSelecionado = item.querySelector('input[type="radio"]:checked');
      
      if (radioSelecionado) {
        dadosFrequencia.push({
          codigo_matricula: codigo,
          nome_completo: nome,
          turma: turma,
          data: data,
          status: radioSelecionado.value
        });
      }
    });

    console.log(`📊 Coletados dados de ${dadosFrequencia.length} alunos`);

    // Mostrar loading
    statusContainer.innerHTML = `
      <div class="loading-state">
        <div class="loading-spinner"></div>
        <p>Salvando frequência de ${dadosFrequencia.length} alunos...</p>
      </div>
    `;

    try {
      // Salvar no Supabase
      const { data: resultado, error } = await this.supabase
        .from('frequencia')
        .upsert(dadosFrequencia, { onConflict: 'codigo_matricula,data' });

      if (error) {
        console.error('❌ Erro ao salvar frequência:', error);
        statusContainer.innerHTML = `
          <div class="error-message">
            ❌ Erro ao salvar: ${error.message}
          </div>
        `;
        return;
      }

      console.log('✅ Frequência salva com sucesso!');
      statusContainer.innerHTML = `
        <div class="success-message">
          ✅ Frequência salva com sucesso! ${dadosFrequencia.length} registros processados.
        </div>
      `;

      // Recarregar dados e limpar formulário
      setTimeout(async () => {
        await this.carregarDados();
        this.renderizarRelatorios();
        this.voltarSelecaoTurma();
        statusContainer.innerHTML = '';
      }, 2000);

    } catch (error) {
      console.error('❌ Erro na operação:', error);
      statusContainer.innerHTML = `
        <div class="error-message">
          ❌ Erro na operação: ${error.message}
        </div>
      `;
    }
  }

  voltarSelecaoTurma() {
    console.log('⬅️ Voltando para seleção de turma...');
    document.getElementById('turmaLancamento').value = '';
    document.getElementById('dataLancamento').value = '';
    document.getElementById('containerListaAlunos').style.display = 'none';
    document.getElementById('btnSalvarFrequencia').disabled = true;
    document.getElementById('statusSalvamento').innerHTML = '';
  }

  // SISTEMA DE ALERTAS DE FREQUÊNCIA
  carregarAlertasFrequencia() {
    console.log('🚨 Carregando alertas de frequência...');
    
    // Criar seletor de mês se não existir
    this.criarSeletorMesAlertas();
    
    // Carregar alertas do mês atual
    const mesAtual = new Date().getMonth() + 1;
    const anoAtual = new Date().getFullYear();
    this.atualizarAlertasFrequencia(mesAtual.toString().padStart(2, '0'), anoAtual.toString());
  }

  criarSeletorMesAlertas() {
    const painelAlertas = document.getElementById('painelAlertasFrequencia');
    if (!painelAlertas) return;

    // Verificar se já existe o seletor
    if (document.getElementById('seletorMesAlertas')) return;

    const seletorContainer = document.createElement('div');
    seletorContainer.innerHTML = `
      <div class="filters-row" style="margin: 1rem 0;">
        <div class="filter-group">
          <label>Mês/Ano para Análise:</label>
          <select id="seletorMesAlertas" onchange="atualizarAlertasMes()">
            <option value="01_2025">Janeiro/2025</option>
            <option value="02_2025">Fevereiro/2025</option>
            <option value="03_2025">Março/2025</option>
            <option value="04_2025">Abril/2025</option>
            <option value="05_2025">Maio/2025</option>
            <option value="06_2025">Junho/2025</option>
            <option value="07_2025">Julho/2025</option>
            <option value="08_2025" selected>Agosto/2025</option>
            <option value="09_2025">Setembro/2025</option>
            <option value="10_2025">Outubro/2025</option>
            <option value="11_2025">Novembro/2025</option>
            <option value="12_2025">Dezembro/2025</option>
          </select>
        </div>
      </div>
    `;

    painelAlertas.insertBefore(seletorContainer, painelAlertas.querySelector('#alertasFrequenciaContainer'));
  }

  atualizarAlertasFrequencia(mes, ano) {
    console.log(`🔍 Analisando alertas para ${mes}/${ano}...`);
    
    const container = document.getElementById('alertasFrequenciaContainer');
    if (!container) return;

    // Coletar alunos com problemas de frequência
    const alunosComProblemas = [];
    
    this.dadosFrequencia.forEach((periodo, chave) => {
      if (periodo.mes === mes && periodo.ano === ano) {
        periodo.alunos.forEach(aluno => {
          if (aluno.dias) {
            let faltasConsecutivas = 0;
            let totalFaltas = 0;
            let maxFaltasConsecutivas = 0;
            let diasUteis = Object.keys(aluno.dias).length;

            // Analisar padrão de faltas
            const diasOrdenados = Object.keys(aluno.dias).sort((a, b) => parseInt(a) - parseInt(b));
            
            diasOrdenados.forEach(dia => {
              const status = aluno.dias[dia];
              if (status === 'F' || status === 'FC') {
                totalFaltas++;
                faltasConsecutivas++;
                maxFaltasConsecutivas = Math.max(maxFaltasConsecutivas, faltasConsecutivas);
              } else {
                faltasConsecutivas = 0;
              }
            });

            const percentualPresenca = diasUteis > 0 ? ((diasUteis - totalFaltas) / diasUteis) * 100 : 100;

            // Critérios para alerta
            if (percentualPresenca < 75 || maxFaltasConsecutivas >= 3 || totalFaltas >= 5) {
              alunosComProblemas.push({
                codigo: aluno.codigo,
                nome: aluno.nome,
                turma: periodo.turma,
                totalFaltas,
                maxFaltasConsecutivas,
                percentualPresenca: percentualPresenca.toFixed(1),
                diasUteis
              });
            }
          }
        });
      }
    });

    console.log(`⚠️ Encontrados ${alunosComProblemas.length} alunos com problemas de frequência`);

    if (alunosComProblemas.length === 0) {
      container.innerHTML = `
        <div class="success-message">
          ✅ Nenhum aluno com problemas de frequência em ${mes}/${ano}
        </div>
      `;
      return;
    }

    // Renderizar alertas
    container.innerHTML = `
      <div class="alertas-grid">
        ${alunosComProblemas.map(aluno => `
          <div class="alerta-item" data-codigo="${aluno.codigo}">
            <div class="alerta-header">
              <div class="aluno-dados">
                <span class="aluno-codigo">${aluno.codigo}</span>
                <span class="aluno-nome">${aluno.nome}</span>
                <span class="aluno-turma">Turma ${aluno.turma}</span>
              </div>
              <div class="alerta-stats">
                <span class="stat-item stat-danger">${aluno.totalFaltas} faltas</span>
                <span class="stat-item stat-warning">${aluno.maxFaltasConsecutivas} consecutivas</span>
                <span class="stat-item ${aluno.percentualPresenca < 50 ? 'stat-danger' : 'stat-warning'}">${aluno.percentualPresenca}%</span>
              </div>
            </div>
            
            <div class="providencias-container">
              <label class="form-label">📋 Providências Tomadas:</label>
              <div class="providencias-controles">
                <div class="providencia-step">
                  <span class="step-label">1. Abertura de FICAI:</span>
                  <span class="step-status">abrir FICAI</span>
                </div>
                
                <div class="providencia-opcoes">
                  <label class="providencia-radio">
                    <input type="radio" name="prov_${aluno.codigo}" value="ficai_aguardando" onchange="mostrarPrazoFicai('${aluno.codigo}')">
                    <span class="radio-text">FICAI Aberta, aguardando prazo</span>
                  </label>
                  
                  <label class="providencia-radio">
                    <input type="radio" name="prov_${aluno.codigo}" value="resolvido_escola" onchange="marcarResolvido('${aluno.codigo}')">
                    <span class="radio-text">Resolvido pela Escola</span>
                  </label>
                  
                  <label class="providencia-radio">
                    <input type="radio" name="prov_${aluno.codigo}" value="cancelado_escola">
                    <span class="radio-text">Cancelado pela Escola</span>
                  </label>
                  
                  <label class="providencia-radio">
                    <input type="radio" name="prov_${aluno.codigo}" value="conselho_tutelar">
                    <span class="radio-text">Em andamento no Conselho Tutelar</span>
                  </label>
                </div>
                
                <div id="prazo_${aluno.codigo}" class="prazo-container" style="display: none;">
                  <label>Prazo (dias):</label>
                  <input type="number" min="1" max="30" value="15" class="form-input" style="width: 80px;">
                  <span class="prazo-data"></span>
                </div>
                
                <div id="resolvido_${aluno.codigo}" class="resolvido-container" style="display: none;">
                  <span class="resolvido-check">✅ Situação Resolvida</span>
                </div>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  mostrarPrazoFicai(codigoAluno) {
    const prazoContainer = document.getElementById(`prazo_${codigoAluno}`);
    const resolvidoContainer = document.getElementById(`resolvido_${codigoAluno}`);
    
    if (prazoContainer) {
      prazoContainer.style.display = 'block';
      const inputPrazo = prazoContainer.querySelector('input[type="number"]');
      const spanData = prazoContainer.querySelector('.prazo-data');
      
      // Calcular data limite
      const dataAtual = new Date();
      const prazoEmDias = parseInt(inputPrazo.value) || 15;
      const dataLimite = new Date(dataAtual.getTime() + (prazoEmDias * 24 * 60 * 60 * 1000));
      
      spanData.textContent = `(até ${dataLimite.toLocaleDateString('pt-BR')})`;
      
      // Atualizar quando mudar o prazo
      inputPrazo.addEventListener('input', () => {
        const novoPrazo = parseInt(inputPrazo.value) || 15;
        const novaData = new Date(dataAtual.getTime() + (novoPrazo * 24 * 60 * 60 * 1000));
        spanData.textContent = `(até ${novaData.toLocaleDateString('pt-BR')})`;
      });
    }
    
    if (resolvidoContainer) {
      resolvidoContainer.style.display = 'none';
    }
  }

  marcarResolvido(codigoAluno) {
    const prazoContainer = document.getElementById(`prazo_${codigoAluno}`);
    const resolvidoContainer = document.getElementById(`resolvido_${codigoAluno}`);
    
    if (prazoContainer) {
      prazoContainer.style.display = 'none';
    }
    
    if (resolvidoContainer) {
      resolvidoContainer.style.display = 'block';
    }
  }

  selecionarTurma(turma) {
    console.log(`🎯 Turma selecionada: ${turma}`);
    this.turmaAtual = turma;
    
    // Mostrar loading
    const container = document.getElementById('frequenciaContainer');
    if (container) {
      container.innerHTML = `
        <div class="loading-state">
          <div class="loading-spinner"></div>
          <p>Carregando dados da turma ${turma}...</p>
        </div>
      `;
    }
    
    // Encontrar primeiro período disponível da turma
    let primeiroMes = null, primeiroAno = null;
    for (const [chave, dados] of this.dadosFrequencia) {
      if (dados.turma === turma) {
        primeiroMes = dados.mes;
        primeiroAno = dados.ano;
        break;
      }
    }
    
    if (primeiroMes && primeiroAno) {
      this.mesAtual = primeiroMes;
      this.anoAtual = primeiroAno;
      
      // Atualizar filtros
      const filtroTurma = document.getElementById('filtro-turma');
      const filtroMes = document.getElementById('filtro-mes');
      const filtroAno = document.getElementById('filtro-ano');
      
      if (filtroTurma) filtroTurma.value = turma;
      if (filtroMes) filtroMes.value = primeiroMes;
      if (filtroAno) filtroAno.value = primeiroAno;
      
      // Delay para mostrar loading, depois mostrar dados
      setTimeout(() => {
        this.mostrarResumoAlunos();
        showToast(`Turma ${turma} selecionada - ${this.getNomeMes(primeiroMes)}/${primeiroAno}`, 'success');
      }, 300);
      
      // Scroll para a seção de frequência detalhada
      document.querySelector('.table-container').scrollIntoView({ behavior: 'smooth' });
    }
  }

  mostrarResumoAlunos() {
    console.log('🔍 DEBUG mostrarResumoAlunos - Iniciando compilação estatística...');
    
    if (!this.turmaAtual) {
      console.warn('⚠️ DEBUG - Turma não selecionada');
      return;
    }
    
    const container = document.getElementById('frequenciaContainer');
    const tabelaContainer = document.getElementById('tabela-container');
    
    if (!container) return;
    
    // Ocultar tabela de dias
    if (tabelaContainer) tabelaContainer.style.display = 'none';
    
    console.log(`🎯 DEBUG - Compilando TODOS os dados para turma: ${this.turmaAtual}`);
    
    // Compilar TODOS os dados da turma (todos os meses/anos)
    const alunosDaTurma = new Map();
    
    // Percorrer todos os períodos carregados
    this.dadosFrequencia.forEach((periodo, chave) => {
      if (periodo.turma === this.turmaAtual) {
        console.log(`📊 DEBUG - Processando período: ${chave} com ${periodo.alunos.length} alunos`);
        
        periodo.alunos.forEach(aluno => {
          // Se aluno não existe no Map, criar
          if (!alunosDaTurma.has(aluno.codigo)) {
            alunosDaTurma.set(aluno.codigo, {
              codigo: aluno.codigo,
              nome: aluno.nome,
              totais: { P: 0, F: 0, A: 0, FC: 0 },
              totalRegistros: 0
            });
          }
          
          const alunoCompilado = alunosDaTurma.get(aluno.codigo);
          
          // Somar todos os dias deste período
          if (aluno.dias) {
            Object.values(aluno.dias).forEach(status => {
              if (alunoCompilado.totais.hasOwnProperty(status)) {
                alunoCompilado.totais[status]++;
                alunoCompilado.totalRegistros++;
              }
            });
          }
        });
      }
    });
    
    console.log(`👥 DEBUG - Total de alunos únicos na turma ${this.turmaAtual}: ${alunosDaTurma.size}`);
    
    if (alunosDaTurma.size === 0) {
      container.innerHTML = `
        <div class="info-text">
          ⚠️ Nenhum dado encontrado para a turma ${this.turmaAtual}
        </div>
      `;
      return;
    }
    
    // Converter Map para Array e calcular percentuais
    const alunosComTotais = Array.from(alunosDaTurma.values()).map(aluno => {
      // Calcular percentual de presença (P dividido pelo total de registros)
      const percentualPresenca = aluno.totalRegistros > 0 
        ? ((aluno.totais.P / aluno.totalRegistros) * 100).toFixed(1) 
        : 0;
      
      console.log(`👤 DEBUG - ${aluno.nome}: ${aluno.totais.P}P, ${aluno.totais.F}F, ${aluno.totais.A}A, ${aluno.totais.FC}FC = ${percentualPresenca}% (${aluno.totalRegistros} registros)`);
      
      return {
        ...aluno,
        percentualPresenca: parseFloat(percentualPresenca)
      };
    });
    
    // Ordenar por percentual de presença (decrescente)
    alunosComTotais.sort((a, b) => b.percentualPresenca - a.percentualPresenca);
    
    // Renderizar tabela compilada
    container.innerHTML = `
      <div style="margin-bottom: 15px;">
        <h3>📊 Estatísticas Compiladas - Turma ${this.turmaAtual}</h3>
        <p style="color: #666; font-size: 0.9rem;">
          Total de ${alunosComTotais.length} alunos • Dados compilados de todos os períodos registrados
        </p>
      </div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nome</th>
              <th>📅 Total Registros</th>
              <th style="color: #28a745;">✅ Presenças (P)</th>
              <th style="color: #dc3545;">❌ Faltas (F)</th>
              <th style="color: #ffc107;">📋 Atestados (A)</th>
              <th style="color: #fd7e14;">⚠️ Faltas Controladas (FC)</th>
              <th>📊 % Presença</th>
            </tr>
          </thead>
          <tbody>
            ${alunosComTotais.map(aluno => `
              <tr>
                <td><strong>${aluno.codigo}</strong></td>
                <td>${aluno.nome}</td>
                <td><strong>${aluno.totalRegistros}</strong></td>
                <td class="freq-P"><strong>${aluno.totais.P}P</strong></td>
                <td class="freq-F"><strong>${aluno.totais.F}F</strong></td>
                <td class="freq-A"><strong>${aluno.totais.A}A</strong></td>
                <td class="freq-FC"><strong>${aluno.totais.FC}FC</strong></td>
                <td><strong style="color: ${aluno.percentualPresenca >= 75 ? '#28a745' : '#dc3545'}; font-size: 1.1em;">${aluno.percentualPresenca}%</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    
    console.log(`✅ DEBUG - Tabela compilada renderizada para ${alunosComTotais.length} alunos da turma ${this.turmaAtual}`);
    showToast(`Estatísticas compiladas: ${alunosComTotais.length} alunos da turma ${this.turmaAtual}`, 'success');
  }

  mostrarTabelaDias(mesEscolhido = null, anoEscolhido = null) {
    console.log('🔍 DEBUG - mostrarTabelaDias() iniciado - Substituindo por visualização diária');
    
    if (!this.turmaAtual) {
      console.warn('⚠️ DEBUG - Turma não selecionada');
      showToast('Selecione uma turma primeiro', 'warning');
      return;
    }
    
    const container = document.getElementById('frequenciaContainer');
    if (!container) {
      console.error('❌ DEBUG - frequenciaContainer não encontrado!');
      return;
    }
    
    // Se não foi especificado mês/ano, usar agosto/2025 como padrão
    const mesVisualizacao = mesEscolhido || '08';
    const anoVisualizacao = anoEscolhido || '2025';
    
    console.log(`🎯 DEBUG - Compilando visualização diária para turma: ${this.turmaAtual} - ${mesVisualizacao}/${anoVisualizacao}`);
    
    // Encontrar períodos disponíveis para esta turma
    const periodosDisponiveis = [];
    this.dadosFrequencia.forEach((periodo, chave) => {
      if (periodo.turma === this.turmaAtual) {
        periodosDisponiveis.push({
          chave: chave,
          mes: periodo.mes,
          ano: periodo.ano,
          mesNome: this.getNomeMes(periodo.mes)
        });
      }
    });
    
    // Compilar dados do mês específico
    const chaveEscolhida = `${this.turmaAtual}_${mesVisualizacao}_${anoVisualizacao}`;
    const dadosPeriodo = this.dadosFrequencia.get(chaveEscolhida);
    
    if (!dadosPeriodo) {
      container.innerHTML = `
        <div style="margin-bottom: 15px;">
          <h3>📅 Visualização por Dias - Turma ${this.turmaAtual}</h3>
          <div class="filters-row">
            <div class="filter-group">
              <label>Período:</label>
              <select id="seletorPeriodoDias" onchange="selecionarPeriodoDias()">
                ${periodosDisponiveis.map(periodo => `
                  <option value="${periodo.mes}_${periodo.ano}" ${periodo.mes === mesVisualizacao && periodo.ano === anoVisualizacao ? 'selected' : ''}>
                    ${periodo.mesNome}/${periodo.ano}
                  </option>
                `).join('')}
              </select>
            </div>
            <button class="btn btn-secondary btn-small" onclick="voltarResumoAlunos()" style="margin-left: 15px;">
              ◀ Voltar às Estatísticas
            </button>
          </div>
          <div class="info-text">
            ⚠️ Nenhum dado encontrado para ${this.getNomeMes(mesVisualizacao)}/${anoVisualizacao}
          </div>
        </div>
      `;
      return;
    }
    
    // Gerar todos os dias úteis do mês (seg-sex)
    const diasUteis = this.gerarDiasUteis(parseInt(mesVisualizacao), parseInt(anoVisualizacao));
    console.log(`📅 DEBUG - Dias úteis de ${mesVisualizacao}/${anoVisualizacao}:`, diasUteis.map(d => `${d.dia}(${d.diaSemana})`).join(', '));
    
    // Debug: verificar quais dias têm dados reais na base
    const diasComDados = new Set();
    console.log(`🔍 DEBUG - dadosPeriodo.alunos tem ${dadosPeriodo.alunos.length} alunos`);
    
    // Procurar especificamente por registros do dia 15
    let registrosDia15 = [];
    
    dadosPeriodo.alunos.forEach(aluno => {
      if (aluno.dias) {
        Object.keys(aluno.dias).forEach(dia => {
          diasComDados.add(dia);
          
          // Debug específico para dia 15
          if (dia === '15') {
            registrosDia15.push({
              aluno: aluno.nome,
              codigo: aluno.codigo,
              status: aluno.dias[dia]
            });
          }
        });
      }
    });
    
    console.log(`📊 DEBUG - Dias com dados na base:`, Array.from(diasComDados).sort((a, b) => parseInt(a) - parseInt(b)).join(', '));
    console.log(`🔍 DEBUG - Registros encontrados para dia 15:`, registrosDia15.length, registrosDia15.slice(0, 3));
    console.log(`❓ DEBUG - Dias úteis sem dados:`, diasUteis.filter(d => !diasComDados.has(d.dia)).map(d => `${d.dia}(${d.diaSemana})`).join(', '));
    
    // Renderizar tabela por dias
    container.innerHTML = `
      <div style="margin-bottom: 15px;">
        <h3>📅 Visualização por Dias - Turma ${this.turmaAtual}</h3>
        <div class="filters-row">
          <div class="filter-group">
            <label>Período:</label>
            <select id="seletorPeriodoDias" onchange="selecionarPeriodoDias()">
              ${periodosDisponiveis.map(periodo => `
                <option value="${periodo.mes}_${periodo.ano}" ${periodo.mes === mesVisualizacao && periodo.ano === anoVisualizacao ? 'selected' : ''}>
                  ${periodo.mesNome}/${periodo.ano}
                </option>
              `).join('')}
            </select>
          </div>
          <button class="btn btn-secondary btn-small" onclick="voltarResumoAlunos()" style="margin-left: 15px;">
            ◀ Voltar às Estatísticas
          </button>
        </div>
        <p style="color: #666; font-size: 0.9rem;">
          ${dadosPeriodo.alunos.length} alunos • ${diasComDados.size} dias com dados em ${this.getNomeMes(mesVisualizacao)}/${anoVisualizacao}
          ${diasUteis.length !== diasComDados.size ? `<br><span style="color: #f39c12;">⚠️ ${diasUteis.length - diasComDados.size} dias úteis sem registros</span>` : ''}
        </p>
      </div>
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nome</th>
              ${diasUteis.map(diaInfo => `
                <th style="text-align: center; min-width: 60px;">
                  <div>${diaInfo.dia}</div>
                  <div style="font-size: 0.8em; color: #666;">(${diaInfo.diaSemana})</div>
                </th>
              `).join('')}
            </tr>
          </thead>
          <tbody>
            ${dadosPeriodo.alunos.map(aluno => `
              <tr>
                <td><strong>${aluno.codigo}</strong></td>
                <td>${aluno.nome}</td>
                ${diasUteis.map(diaInfo => {
                  const status = aluno.dias && aluno.dias[diaInfo.dia] ? aluno.dias[diaInfo.dia] : '';
                  const classe = status ? `freq-${status}` : '';
                  return `<td class="${classe}" style="text-align: center;">${status || '-'}</td>`;
                }).join('')}
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
    
    console.log(`✅ DEBUG - Tabela diária renderizada: ${dadosPeriodo.alunos.length} alunos x ${diasUteis.length} dias úteis`);
    showToast(`Visualização: ${diasUteis.length} dias úteis de ${this.getNomeMes(mesVisualizacao)}/${anoVisualizacao}`, 'success');
  }
  
  gerarDiasUteis(mes, ano) {
    const diasUteis = [];
    const diasSemana = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
    const diasDoMes = new Date(ano, mes, 0).getDate(); // último dia do mês
    
    console.log(`📅 Gerando dias úteis para ${mes}/${ano} (total de dias no mês: ${diasDoMes})`);
    
    for (let dia = 1; dia <= diasDoMes; dia++) {
      const data = new Date(ano, mes - 1, dia); // mês é 0-indexed em Date
      const diaSemana = data.getDay(); // 0 = domingo, 1 = segunda, etc
      const diaFormatado = String(dia).padStart(2, '0');
      
      // Debug específico para sextas-feiras
      if (diaSemana === 5) { // sexta-feira
        console.log(`🔍 SEXTA-FEIRA encontrada no calendário: dia ${diaFormatado} é ${diasSemana[diaSemana]}`);
      }
      
      // Apenas dias úteis (segunda=1 a sexta=5)
      if (diaSemana >= 1 && diaSemana <= 5) {
        diasUteis.push({
          dia: diaFormatado,
          diaSemana: diasSemana[diaSemana]
        });
      }
    }
    
    const sextasFeiras = diasUteis.filter(d => d.diaSemana === 'sex');
    console.log(`📊 Sextas-feiras geradas:`, sextasFeiras.map(s => s.dia).join(', '));
    
    return diasUteis;
  }
  
  _executarTabelaDias(container, tabelaContainer) {
    
    if (!this.turmaAtual || !this.mesAtual || !this.anoAtual) {
      console.warn('⚠️ DEBUG - Dados de turma/mês/ano faltando');
      showToast('Selecione uma turma primeiro', 'warning');
      return;
    }
    
    const chave = `${this.turmaAtual}_${this.mesAtual}_${this.anoAtual}`;
    const dados = this.dadosFrequencia.get(chave);
    
    if (!dados || !dados.alunos.length) {
      showToast('Nenhum dado encontrado para este período', 'warning');
      return;
    }
    
    // Detectar dias com dados
    console.log(`🔍 DEBUG mostrarTabelaDias - Iniciando detecção de dias`);
    console.log(`👥 DEBUG - Total de alunos na turma: ${dados.alunos.length}`);
    
    const diasSet = new Set();
    dados.alunos.forEach((aluno, index) => {
      console.log(`👤 DEBUG - Aluno ${index + 1}/${dados.alunos.length}: ${aluno.nome} (${aluno.codigo})`);
      console.log(`📅 DEBUG - Dias do aluno ${aluno.codigo}:`, aluno.dias);
      
      if (aluno.dias && typeof aluno.dias === 'object') {
        const diasDoAluno = Object.keys(aluno.dias);
        console.log(`🔢 DEBUG - Aluno ${aluno.codigo} tem ${diasDoAluno.length} dias:`, diasDoAluno);
        
        diasDoAluno.forEach(dia => {
          diasSet.add(dia);
          console.log(`➕ DEBUG - Dia ${dia} adicionado ao set (status: ${aluno.dias[dia]})`);
        });
      } else {
        console.warn(`⚠️ DEBUG - Aluno ${aluno.codigo} não tem estrutura de dias válida:`, aluno.dias);
      }
    });
    
    const dias = Array.from(diasSet).sort((a, b) => parseInt(a) - parseInt(b));
    console.log(`📅 DEBUG - Dias FINAIS encontrados para ${this.turmaAtual}:`, dias);
    console.log(`📊 DEBUG - Total de dias FINAIS: ${dias.length}`);
    
    const thead = document.getElementById('tabela-head');
    const tbody = document.getElementById('tabela-body');
    
    console.log(`🎯 DEBUG - thead encontrado:`, !!thead);
    console.log(`🎯 DEBUG - tbody encontrado:`, !!tbody);
    
    if (!thead || !tbody) {
      console.error('❌ DEBUG - Elementos de tabela não encontrados!');
      showToast('Erro: Elementos de tabela não encontrados', 'error');
      return;
    }
    
    // Cabeçalho
    thead.innerHTML = `
      <tr>
        <th>Código</th>
        <th>Nome</th>
        ${dias.map(dia => `<th>Dia ${dia}</th>`).join('')}
      </tr>
    `;
    
    // Corpo da tabela
    tbody.innerHTML = dados.alunos.map(aluno => `
      <tr>
        <td><strong>${aluno.codigo}</strong></td>
        <td>${aluno.nome}</td>
        ${dias.map(dia => {
          const freq = aluno.dias && aluno.dias[dia] ? aluno.dias[dia] : '';
          return `<td class="freq-${freq}">${freq || '-'}</td>`;
        }).join('')}
      </tr>
    `).join('');
    
    // Adicionar botão de voltar
    container.innerHTML = `
      <div style="margin-bottom: 15px;">
        <button class="btn btn-secondary btn-small" onclick="voltarResumoAlunos()">
          ◀ Voltar ao Resumo
        </button>
        <span style="margin-left: 15px; color: #666; font-size: 0.9rem;">
          Visualizando ${dias.length} dias úteis de ${this.getNomeMes(this.mesAtual)}/${this.anoAtual} - Turma ${this.turmaAtual}
        </span>
      </div>
    `;
    
    tabelaContainer.style.display = 'block';
    
    showToast(`Visualizando ${dias.length} dias úteis de ${this.getNomeMes(this.mesAtual)}/${this.anoAtual}`, 'info');
  }

  renderizarTabela() {
    // Método mantido para compatibilidade, mas agora usa mostrarResumoAlunos por padrão
    this.mostrarResumoAlunos();
  }

  async importarDadosCSV() {
    showToast('Importando dados...', 'info');
    
    // Usar dados completos do arquivo separado
    const csvData = window.getDadosFrequencia ? window.getDadosFrequencia() : null;
    
    if (!csvData) {
      showToast('Dados não encontrados. Verifique se o arquivo de dados foi carregado.', 'error');
      return;
    }
    
    try {
      await this.processarCSVData(csvData);
      showToast('Dados importados com sucesso!', 'success');
      
      // Recarregar dados e atualizar interface
      await this.carregarDados();
      this.renderizarRelatorios();
      
      // Selecionar primeira turma automaticamente se houver dados
      if (this.dadosFrequencia.size > 0) {
        const primeiraTurma = Array.from(this.dadosFrequencia.keys())[0].split('_')[0];
        const primeiroMes = Array.from(this.dadosFrequencia.keys())[0].split('_')[1];
        const primeiroAno = Array.from(this.dadosFrequencia.keys())[0].split('_')[2];
        
        const filtroTurma = document.getElementById('filtro-turma');
        const filtroMes = document.getElementById('filtro-mes');
        const filtroAno = document.getElementById('filtro-ano');
        
        if (filtroTurma) filtroTurma.value = primeiraTurma;
        if (filtroMes) filtroMes.value = primeiroMes;
        if (filtroAno) filtroAno.value = primeiroAno;
        
        this.turmaAtual = primeiraTurma;
        this.mesAtual = primeiroMes;
        this.anoAtual = primeiroAno;
        
        this.atualizarFiltroMes();
        this.renderizarTabela();
        
        showToast(`Mostrando dados da turma ${primeiraTurma}`, 'success');
      }
    } catch (error) {
      console.error('❌ Erro na importação:', error);
      showToast('Erro na importação: ' + error.message, 'error');
    }
  }

  async processarCSVData(csvData) {
    // Parse CSV
    const lines = csvData.trim().split('\n');
    const header = this.parseCSVLine(lines[0]);
    const rows = lines.slice(1).map(line => this.parseCSVLine(line));
    
    console.log('📋 Processando CSV com', rows.length, 'linhas');
    console.log('📋 Cabeçalho:', header);
    
    // Mapear colunas
    const colunaIndices = {
      codigo: 0,  // Código
      nome: 1,    // Nome
      mes: 2,     // Mês
      turma: 3,   // turma
      ano: 4      // ano
    };
    
    // Detectar colunas de dias (a partir do índice 5)
    const diasColunas = [];
    for (let i = 5; i < header.length; i++) {
      const dia = header[i].trim();
      if (dia && !isNaN(parseInt(dia))) {
        diasColunas.push({
          index: i,
          dia: String(parseInt(dia)).padStart(2, '0')
        });
      }
    }
    
    console.log('📅 Dias encontrados:', diasColunas.map(d => d.dia));
    
    // Preparar dados para inserção no Supabase
    const dadosParaInserir = [];
    
    for (const row of rows) {
      if (row.length < 5) continue;
      
      const codigo = row[colunaIndices.codigo]?.trim();
      const nome = row[colunaIndices.nome]?.trim();
      const mes = row[colunaIndices.mes]?.trim();
      const turma = row[colunaIndices.turma]?.trim();
      const ano = row[colunaIndices.ano]?.trim();
      
      if (!codigo || !nome || !mes || !turma || !ano) continue;
      
      // Processar dias
      const dias = {};
      diasColunas.forEach(({ index, dia }) => {
        const valor = row[index]?.trim().toUpperCase();
        if (valor && ['P', 'F', 'A', 'FC'].includes(valor)) {
          dias[dia] = valor;
        }
      });
      
      // Para cada dia com dados, criar um registro separado
      Object.keys(dias).forEach(dia => {
        const dataRegistro = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
        dadosParaInserir.push({
          codigo_matricula: codigo,
          nome_completo: nome,
          turma: turma,
          data: dataRegistro,
          status: dias[dia]
        });
      });
    }
    
    console.log('🎯 Preparados', dadosParaInserir.length, 'registros para inserção');
    
    // Inserir no Supabase em lotes
    const LOTE_SIZE = 100;
    let totalProcessados = 0;
    
    for (let i = 0; i < dadosParaInserir.length; i += LOTE_SIZE) {
      const lote = dadosParaInserir.slice(i, i + LOTE_SIZE);
      
      console.log(`💾 Salvando lote ${Math.floor(i/LOTE_SIZE) + 1} (${lote.length} registros)...`);
      showToast(`Salvando ${lote.length} registros...`, 'info');
      
      const { data, error } = await this.supabase
        .from('frequencia')
        .upsert(lote, { onConflict: 'codigo_matricula,data' });
      
      if (error) {
        console.error('❌ Erro ao salvar lote:', error);
        throw error;
      }
      
      totalProcessados += lote.length;
      console.log(`✅ Lote ${Math.floor(i/LOTE_SIZE) + 1} salvo com sucesso`);
    }
    
    console.log(`✅ Total processado: ${totalProcessados} alunos`);
    return totalProcessados;
  }

  parseCSVLine(line) {
    // Parse simples de CSV - assumindo que não há vírgulas nos campos
    return line.split(',').map(field => field.trim());
  }
}

// Função para inicialização
async function inicializarModuloFrequencia() {
  try {
    console.log('📅 Página de Frequência carregada');
    
    // Aguardar sistema Supabase estar pronto
    let tentativas = 0;
    while (!window.supabaseClient && tentativas < 50) {
      console.log('⏳ Aguardando Supabase...', tentativas);
      await new Promise(resolve => setTimeout(resolve, 100));
      tentativas++;
    }
    
    if (!window.supabaseClient) {
      showToast('⚠️ Supabase não conectado - verifique a conexão', 'error');
      return;
    }
    
    // Sistema de frequência carregado
    
    showToast('Carregando módulo de frequência...', 'info');
    
    try {
      window.frequenciaManager = new FrequenciaSupabaseManager();
      showToast('✅ Módulo de frequência carregado!', 'success');
      
      // Inicializar sistema de alertas
      setTimeout(() => {
        carregarAlertasFrequencia();
      }, 2000);
      
    } catch (error) {
      console.error('❌ Erro ao inicializar FrequenciaManager:', error);
      showToast('Erro ao inicializar módulo de frequência', 'error');
    }
    
  } catch (error) {
    console.error('❌ Erro ao inicializar frequência:', error);
    showToast('Erro ao carregar módulo de frequência', 'error');
  }
}

// Funções globais para os botões HTML
function mostrarTabelaDiaria() {
  console.log('🔍 DEBUG - mostrarTabelaDiaria() chamada');
  if (window.frequenciaManager) {
    console.log('✅ DEBUG - frequenciaManager encontrado, chamando mostrarTabelaDias');
    window.frequenciaManager.mostrarTabelaDias();
  } else {
    console.error('❌ DEBUG - frequenciaManager não encontrado!');
  }
}

function selecionarPeriodoDias() {
  const seletor = document.getElementById('seletorPeriodoDias');
  if (seletor && window.frequenciaManager) {
    const [mes, ano] = seletor.value.split('_');
    console.log('🔄 DEBUG - Mudando período para:', mes, ano);
    window.frequenciaManager.mostrarTabelaDias(mes, ano);
  }
}

function voltarResumoAlunos() {
  if (window.frequenciaManager) {
    window.frequenciaManager.mostrarResumoAlunos();
  }
}

// FUNÇÕES GLOBAIS PARA LANÇAMENTO DE FREQUÊNCIA
function carregarAlunosLancamento() {
  const turma = document.getElementById('turmaLancamento').value;
  if (window.frequenciaManager && turma) {
    window.frequenciaManager.carregarAlunosLancamento(turma);
  }
}

function marcarTodosPresentes() {
  if (window.frequenciaManager) {
    window.frequenciaManager.marcarTodosPresentes();
  }
}

function limparMarcacoes() {
  if (window.frequenciaManager) {
    window.frequenciaManager.limparMarcacoes();
  }
}

function salvarFrequenciaDiaria() {
  if (window.frequenciaManager) {
    window.frequenciaManager.salvarFrequenciaDiaria();
  }
}

function voltarSelecaoTurma() {
  if (window.frequenciaManager) {
    window.frequenciaManager.voltarSelecaoTurma();
  }
}

// Funções globais para alertas de frequência
async function carregarAlertasFrequencia() {
    console.log('🚨 ALERTAS: Iniciando carregamento de alertas de frequência...');
    
    const container = document.getElementById('alertasFrequenciaContainer');
    if (!container) {
        console.error('❌ ALERTAS: Container de alertas não encontrado');
        return;
    }

    try {
        container.innerHTML = `
            <div class="loading-alertas">
                <div class="loading-spinner"></div>
                <p>Carregando alertas de frequência...</p>
            </div>
        `;

        // Verificar se temos dados de frequência
        const { data: registros, error } = await supabaseClient
            .from('frequencia')
            .select('*')
            .limit(1);

        if (error) {
            throw error;
        }

        if (!registros || registros.length === 0) {
            container.innerHTML = `
                <div class="no-alertas">
                    📊 Nenhum registro de frequência encontrado. Cadastre algumas frequências primeiro.
                </div>
            `;
            return;
        }

        // Renderizar interface de alertas
        await renderizarAlertasFrequencia();

    } catch (error) {
        console.error('❌ ALERTAS: Erro ao carregar alertas:', error);
        container.innerHTML = `
            <div class="error-message">
                ❌ Erro ao carregar alertas de frequência: ${error.message}
            </div>
        `;
    }
}

async function renderizarAlertasFrequencia() {
    console.log('🚨 ALERTAS: Renderizando interface...');
    
    const container = document.getElementById('alertasFrequenciaContainer');
    
    // Data atual
    const agora = new Date();
    const mesAtual = (agora.getMonth() + 1).toString().padStart(2, '0');
    const anoAtual = agora.getFullYear();
    
    container.innerHTML = `
        <div class="alertas-filters">
            <div class="filter-group">
                <label class="providencias-label">📅 Mês para análise:</label>
                <select id="alertasMes" onchange="atualizarAlertasMes()">
                    <option value="01">Janeiro</option>
                    <option value="02">Fevereiro</option>
                    <option value="03">Março</option>
                    <option value="04">Abril</option>
                    <option value="05">Maio</option>
                    <option value="06">Junho</option>
                    <option value="07">Julho</option>
                    <option value="08" ${mesAtual === '08' ? 'selected' : ''}>Agosto</option>
                    <option value="09" ${mesAtual === '09' ? 'selected' : ''}>Setembro</option>
                    <option value="10" ${mesAtual === '10' ? 'selected' : ''}>Outubro</option>
                    <option value="11" ${mesAtual === '11' ? 'selected' : ''}>Novembro</option>
                    <option value="12" ${mesAtual === '12' ? 'selected' : ''}>Dezembro</option>
                </select>
            </div>
        </div>
        <div id="alertasContainer" class="alertas-grid" style="display: none;">
            <div class="loading-alertas">
                <div class="loading-spinner"></div>
                <p>Analisando frequências...</p>
            </div>
        </div>
    `;
    
    // Definir mês atual como selecionado
    document.getElementById('alertasMes').value = mesAtual;
    
    // Não carregar alertas automaticamente - apenas quando usuário clicar em "Mostrar Lista"
    console.log('🚨 ALERTAS: Interface renderizada. Use "Mostrar Lista" para carregar alertas.');
}

async function atualizarAlertasMes() {
    console.log('🚨 ALERTAS: Atualizando alertas por mês...');
    
    const mesSelect = document.getElementById('alertasMes');
    const alertasContainer = document.getElementById('alertasContainer');
    
    if (!mesSelect || !alertasContainer) {
        console.error('❌ ALERTAS: Elementos de filtro não encontrados');
        return;
    }

    const mesSelecionado = mesSelect.value;
    const anoAtual = new Date().getFullYear();
    
    console.log('🚨 ALERTAS: Analisando mês:', mesSelecionado, 'ano:', anoAtual);

    try {
        alertasContainer.innerHTML = `
            <div class="loading-alertas">
                <div class="loading-spinner"></div>
                <p>Analisando frequências de ${mesSelect.options[mesSelect.selectedIndex].text}...</p>
            </div>
        `;

        // Buscar dados de frequência do mês
        const inicioMes = `${anoAtual}-${mesSelecionado}-01`;
        const fimMes = `${anoAtual}-${mesSelecionado}-31`;

        const { data: registros, error } = await supabaseClient
            .from('frequencia')
            .select('*')
            .gte('data', inicioMes)
            .lte('data', fimMes)
            .order('codigo_matricula')
            .order('data');

        if (error) {
            throw error;
        }

        console.log('🚨 ALERTAS: Registros encontrados:', registros?.length || 0);

        if (!registros || registros.length === 0) {
            alertasContainer.innerHTML = `
                <div class="no-alertas">
                    📅 <strong>Sem dados</strong><br>
                    <small>Nenhum registro de frequência encontrado para <strong>${mesSelect.options[mesSelect.selectedIndex].text}/${anoAtual}</strong><br>
                    Lance as frequências deste mês primeiro para visualizar os alertas.</small>
                </div>
            `;
            return;
        }

        // Processar dados por aluno
        const alunosPorCodigo = {};
        registros.forEach(registro => {
            const codigo = registro.codigo_matricula;
            if (!alunosPorCodigo[codigo]) {
                alunosPorCodigo[codigo] = {
                    codigo: codigo,
                    nome: registro.nome_completo,
                    turma: registro.turma,
                    registros: []
                };
            }
            alunosPorCodigo[codigo].registros.push(registro);
        });

        console.log('🚨 ALERTAS: Alunos processados:', Object.keys(alunosPorCodigo).length);

        // Analisar problemas de frequência
        const problemasEncontrados = [];
        
        Object.values(alunosPorCodigo).forEach(aluno => {
            const problema = analisarFrequenciaAluno(aluno);
            if (problema) {
                problemasEncontrados.push(problema);
            }
        });

        console.log('🚨 ALERTAS: Problemas encontrados:', problemasEncontrados.length);

        // Renderizar resultados
        if (problemasEncontrados.length === 0) {
            alertasContainer.innerHTML = `
                <div class="no-alertas">
                    🎉 Ótimas notícias! Nenhum aluno com problemas graves de frequência em ${mesSelect.options[mesSelect.selectedIndex].text}
                </div>
            `;
        } else {
            const alertasHtml = problemasEncontrados.map(problema => 
                renderizarCardAlerta(problema, mesSelecionado, anoAtual)
            ).join('');
            
            alertasContainer.innerHTML = alertasHtml;
            
            // Carregar providências já salvas após renderizar os cards
            await carregarProvidenciasSalvas(problemasEncontrados, mesSelecionado, anoAtual);
        }

    } catch (error) {
        console.error('❌ ALERTAS: Erro ao atualizar alertas:', error);
        alertasContainer.innerHTML = `
            <div class="error-message">
                ❌ Erro ao carregar alertas: ${error.message}
            </div>
        `;
    }
}

function analisarFrequenciaAluno(aluno) {
    console.log('🔍 ANÁLISE: Analisando aluno', aluno.codigo, '-', aluno.nome);
    
    const registros = aluno.registros;
    
    if (!registros || registros.length === 0) {
        return null;
    }

    // Contar tipos de frequência
    let totalPresencas = 0;
    let totalFaltas = 0;
    let totalFaltasControladas = 0;
    let totalAtestados = 0;
    
    // Analisar faltas consecutivas
    let faltasConsecutivas = 0;
    let maxFaltasConsecutivas = 0;
    
    registros.forEach((registro, index) => {
        const status = registro.status;
        
        // Contar tipos
        switch (status) {
            case 'P':
                totalPresencas++;
                faltasConsecutivas = 0; // Reset contador
                break;
            case 'F':
                totalFaltas++;
                faltasConsecutivas++;
                maxFaltasConsecutivas = Math.max(maxFaltasConsecutivas, faltasConsecutivas);
                break;
            case 'FC':
                totalFaltasControladas++;
                faltasConsecutivas++;
                maxFaltasConsecutivas = Math.max(maxFaltasConsecutivas, faltasConsecutivas);
                break;
            case 'A':
                totalAtestados++;
                faltasConsecutivas = 0; // Atestado não conta como falta consecutiva
                break;
        }
    });

    const totalDias = registros.length;
    const totalFaltasGeral = totalFaltas + totalFaltasControladas;
    const percentualPresenca = totalDias > 0 ? (totalPresencas / totalDias) * 100 : 0;
    
    // Critérios para alerta:
    // 1. Percentual de presença abaixo de 75%
    // 2. 3 ou mais faltas consecutivas
    // 3. 5 ou mais faltas totais no mês
    
    const problemas = [];
    let temProblema = false;
    
    if (percentualPresenca < 75) {
        problemas.push({
            tipo: 'baixa_frequencia',
            descricao: `Frequência baixa (${percentualPresenca.toFixed(1)}%)`,
            gravidade: 'alta'
        });
        temProblema = true;
    }
    
    if (maxFaltasConsecutivas >= 3) {
        problemas.push({
            tipo: 'faltas_consecutivas',
            descricao: `${maxFaltasConsecutivas} faltas consecutivas`,
            gravidade: 'alta'
        });
        temProblema = true;
    }
    
    if (totalFaltasGeral >= 5) {
        problemas.push({
            tipo: 'muitas_faltas',
            descricao: `${totalFaltasGeral} faltas no mês`,
            gravidade: 'media'
        });
        temProblema = true;
    }
    
    if (!temProblema) {
        console.log('✅ ANÁLISE: Aluno sem problemas:', aluno.codigo);
        return null;
    }
    
    console.log('🚨 ANÁLISE: Problema encontrado para', aluno.codigo, '- Problemas:', problemas.length);
    
    return {
        ...aluno,
        stats: {
            totalDias,
            totalPresencas,
            totalFaltas,
            totalFaltasControladas,
            totalAtestados,
            percentualPresenca,
            maxFaltasConsecutivas
        },
        problemas,
        gravidade: problemas.some(p => p.gravidade === 'alta') ? 'alta' : 'media'
    };
}

function renderizarCardAlerta(problema, mes, ano) {
    const { codigo, nome, turma, stats, problemas, gravidade } = problema;
    
    // Determinar classe CSS baseada na gravidade
    const classeAlerta = gravidade === 'alta' ? 'alerta-item danger' : 'alerta-item warning';
    
    // Gerar badges de estatísticas
    const badgesStats = [
        {
            texto: `${stats.percentualPresenca.toFixed(1)}% presença`,
            classe: stats.percentualPresenca < 75 ? 'danger' : stats.percentualPresenca < 85 ? 'warning' : 'info'
        },
        {
            texto: `${stats.totalFaltas} faltas`,
            classe: stats.totalFaltas >= 5 ? 'danger' : stats.totalFaltas >= 3 ? 'warning' : 'info'
        }
    ];
    
    if (stats.maxFaltasConsecutivas >= 3) {
        badgesStats.push({
            texto: `${stats.maxFaltasConsecutivas} consecutivas`,
            classe: 'danger'
        });
    }
    
    if (stats.totalFaltasControladas > 0) {
        badgesStats.push({
            texto: `${stats.totalFaltasControladas} FC`,
            classe: 'warning'
        });
    }
    
    if (stats.totalAtestados > 0) {
        badgesStats.push({
            texto: `${stats.totalAtestados} atestados`,
            classe: 'info'
        });
    }
    
    const badgesHtml = badgesStats.map(badge => 
        `<span class="stat-badge ${badge.classe}">${badge.texto}</span>`
    ).join('');
    
    return `
        <div class="${classeAlerta}" id="alerta-${codigo}">
            <div class="alerta-header">
                <div class="alerta-aluno">${nome}</div>
                <div class="alerta-codigo">#${codigo} - ${turma}</div>
            </div>
            
            <div class="alerta-stats">
                ${badgesHtml}
            </div>
            
            <div class="providencias-container">
                <label class="providencias-label">📋 Status FICAI:</label>
                <div class="ficai-controls">
                    <div class="ficai-status-group">
                        <select id="ficai-status-${codigo}" onchange="mostrarPrazoFicai('${codigo}')" class="ficai-status">
                            <option value="">Selecionar ação...</option>
                            <option value="aguardando">FICAI Aberta, aguardando prazo</option>
                            <option value="resolvido">Resolvido pela Escola</option>
                            <option value="cancelado">Cancelado pela escola</option>
                            <option value="conselho">Em andamento no Conselho Tutelar</option>
                        </select>
                    </div>
                    
                    <div id="ficai-prazo-${codigo}" class="ficai-prazo">
                        <!-- Prazo será mostrado aqui quando "aguardando" for selecionado -->
                    </div>
                    
                    <textarea 
                        id="providencias-${codigo}" 
                        class="providencias-textarea" 
                        placeholder="Descreva as providências tomadas, contatos realizados, reuniões agendadas..."
                        rows="3"
                    ></textarea>
                    
                    <button 
                        type="button" 
                        class="btn-salvar-providencias"
                        onclick="salvarProvidencias('${codigo}')"
                    >
                        💾 Salvar Providências
                    </button>
                </div>
            </div>
        </div>
    `;
}

function mostrarPrazoFicai(codigoAluno) {
    console.log('📅 FICAI: Mostrando prazo para aluno', codigoAluno);
    
    const select = document.getElementById(`ficai-status-${codigoAluno}`);
    const prazoDiv = document.getElementById(`ficai-prazo-${codigoAluno}`);
    
    if (!select || !prazoDiv) {
        console.error('❌ FICAI: Elementos não encontrados para aluno', codigoAluno);
        return;
    }
    
    const status = select.value;
    
    if (status === 'aguardando') {
        // Calcular prazo (30 dias a partir de hoje)
        const hoje = new Date();
        const prazoFinal = new Date(hoje);
        prazoFinal.setDate(prazoFinal.getDate() + 30);
        
        const prazoFormatado = prazoFinal.toLocaleDateString('pt-BR');
        
        prazoDiv.innerHTML = `
            <strong>⏰ Prazo para resposta:</strong> ${prazoFormatado}<br>
            <small>A família tem 30 dias para apresentar justificativa</small>
        `;
        prazoDiv.classList.add('show');
        
    } else if (status === 'resolvido') {
        prazoDiv.innerHTML = `
            <strong>✅ Situação resolvida</strong><br>
            <small>Problema solucionado pela equipe escolar</small>
        `;
        prazoDiv.classList.add('show');
        
        // Marcar card como resolvido
        const card = document.getElementById(`alerta-${codigoAluno}`);
        if (card) {
            card.classList.add('alerta-resolvido');
        }
        
    } else {
        prazoDiv.classList.remove('show');
        prazoDiv.innerHTML = '';
        
        // Remover marcação de resolvido
        const card = document.getElementById(`alerta-${codigoAluno}`);
        if (card) {
            card.classList.remove('alerta-resolvido');
        }
    }
}

async function salvarProvidencias(codigoAluno) {
    console.log('💾 PROVIDÊNCIAS: Salvando para aluno', codigoAluno);
    
    const statusSelect = document.getElementById(`ficai-status-${codigoAluno}`);
    const providenciasTextarea = document.getElementById(`providencias-${codigoAluno}`);
    const botaoSalvar = document.querySelector(`button[onclick="salvarProvidencias('${codigoAluno}')"]`);
    
    if (!statusSelect || !providenciasTextarea) {
        showErrorToast('Erro: Elementos do formulário não encontrados');
        return;
    }
    
    const status = statusSelect.value;
    const providencias = providenciasTextarea.value.trim();
    
    if (!status && !providencias) {
        showWarningToast('Preencha pelo menos o status FICAI ou as providências');
        return;
    }
    
    try {
        botaoSalvar.disabled = true;
        botaoSalvar.textContent = '💾 Salvando...';
        
        // Obter dados do aluno do card
        const alertaCard = document.getElementById(`alerta-${codigoAluno}`);
        const nomeAluno = alertaCard?.querySelector('.alerta-aluno')?.textContent || '';
        const turmaAluno = alertaCard?.querySelector('.alerta-codigo')?.textContent?.split(' - ')[1] || '';
        
        // Obter mês de referência atual
        const mesSelect = document.getElementById('alertasMes');
        const mesReferencia = mesSelect ? `${new Date().getFullYear()}-${mesSelect.value}` : `${new Date().getFullYear()}-${(new Date().getMonth() + 1).toString().padStart(2, '0')}`;
        
        console.log('💾 PROVIDÊNCIAS: Dados para salvar:', {
            codigo: codigoAluno,
            nome: nomeAluno,
            turma: turmaAluno,
            mes: mesReferencia,
            status,
            providencias
        });
        
        // Preparar dados para inserção/atualização
        const dadosFicai = {
            codigo_matricula: codigoAluno,
            nome_completo: nomeAluno,
            turma: turmaAluno,
            mes_referencia: mesReferencia,
            status_ficai: status || null,
            providencias: providencias || null,
            data_abertura_ficai: new Date().toISOString().split('T')[0] // YYYY-MM-DD
        };
        
        // Tentar INSERT primeiro, depois UPDATE se já existir
        let { data, error } = await supabaseClient
            .from('ficai_providencias')
            .insert(dadosFicai)
            .select();
        
        // Se der erro de duplicata, fazer UPDATE
        if (error && error.code === '23505') {
            console.log('📝 PROVIDÊNCIAS: Registro já existe, fazendo UPDATE...');
            
            const { data: updateData, error: updateError } = await supabaseClient
                .from('ficai_providencias')
                .update({
                    status_ficai: dadosFicai.status_ficai,
                    providencias: dadosFicai.providencias,
                    atualizado_em: new Date().toISOString()
                })
                .eq('codigo_matricula', codigoAluno)
                .eq('mes_referencia', mesReferencia);
            
            if (updateError) {
                console.error('❌ PROVIDÊNCIAS: Erro no UPDATE:', updateError);
                throw updateError;
            }
            
            data = updateData;
        } else if (error) {
            console.error('❌ PROVIDÊNCIAS: Erro no INSERT:', error);
            throw error;
        }
        
        console.log('✅ PROVIDÊNCIAS: Salvo no Supabase com sucesso');
        showSuccessToast('Providências salvas com sucesso!');
        
        // Se foi marcado como resolvido, aplicar visual
        if (status === 'resolvido') {
            const card = document.getElementById(`alerta-${codigoAluno}`);
            if (card) {
                card.classList.add('alerta-resolvido');
            }
        }
        
    } catch (error) {
        console.error('❌ PROVIDÊNCIAS: Erro ao salvar:', error);
        
        // Tratar diferentes tipos de erro
        let mensagemErro = 'Erro desconhecido';
        if (error.message) {
            if (error.message.includes('relation') && error.message.includes('does not exist')) {
                mensagemErro = 'Tabela FICAI não encontrada no banco. Execute o script SQL primeiro.';
            } else {
                mensagemErro = error.message;
            }
        }
        
        showErrorToast('Erro ao salvar: ' + mensagemErro);
        
    } finally {
        botaoSalvar.disabled = false;
        botaoSalvar.textContent = '💾 Salvar Providências';
    }
}

// Função para carregar providências já salvas no Supabase
async function carregarProvidenciasSalvas(problemasEncontrados, mes, ano) {
    console.log('📋 PROVIDÊNCIAS: Carregando dados salvos...');
    
    try {
        const mesReferencia = `${ano}-${mes}`;
        const codigosAlunos = problemasEncontrados.map(p => p.codigo);
        
        if (codigosAlunos.length === 0) {
            console.log('📋 PROVIDÊNCIAS: Nenhum aluno para carregar dados');
            return;
        }
        
        // Buscar providências salvas no Supabase
        const { data: providencias, error } = await supabaseClient
            .from('ficai_providencias')
            .select('*')
            .in('codigo_matricula', codigosAlunos)
            .eq('mes_referencia', mesReferencia);
        
        if (error) {
            console.error('❌ PROVIDÊNCIAS: Erro ao carregar dados:', error);
            // Não mostrar erro para o usuário se a tabela não existir ainda
            return;
        }
        
        console.log('📋 PROVIDÊNCIAS: Dados carregados:', providencias?.length || 0, 'registros');
        
        // Preencher formulários com dados salvos
        if (providencias && providencias.length > 0) {
            providencias.forEach(prov => {
                const codigoAluno = prov.codigo_matricula;
                
                // Preencher status FICAI
                const statusSelect = document.getElementById(`ficai-status-${codigoAluno}`);
                if (statusSelect && prov.status_ficai) {
                    statusSelect.value = prov.status_ficai;
                    
                    // Aplicar visual e prazo conforme status
                    mostrarPrazoFicai(codigoAluno);
                }
                
                // Preencher campo de providências
                const providenciasTextarea = document.getElementById(`providencias-${codigoAluno}`);
                if (providenciasTextarea && prov.providencias) {
                    providenciasTextarea.value = prov.providencias;
                }
                
                console.log('📋 PROVIDÊNCIAS: Dados carregados para aluno', codigoAluno);
            });
        }
        
    } catch (error) {
        console.error('❌ PROVIDÊNCIAS: Erro geral ao carregar:', error);
        // Não mostrar erro para usuário em caso de tabela não existir
    }
}

// Função para alternar lista detalhada de alertas
function toggleListaAlertas() {
    console.log('👁️ TOGGLE: Alternando visualização de alertas');
    
    const alertasContainer = document.getElementById('alertasContainer');
    const botao = document.getElementById('toggleAlertas');
    
    if (!alertasContainer || !botao) {
        console.error('❌ TOGGLE: Elementos não encontrados');
        return;
    }
    
    // Verificar estado atual baseado no display
    const isVisible = alertasContainer.style.display !== 'none';
    
    if (isVisible) {
        // Esconder lista
        alertasContainer.style.display = 'none';
        botao.innerHTML = '👁️ Mostrar Lista';
        console.log('👁️ TOGGLE: Lista ocultada');
    } else {
        // Mostrar lista
        alertasContainer.style.display = 'grid';
        botao.innerHTML = '👁️ Ocultar Lista';
        console.log('👁️ TOGGLE: Lista exibida');
        
        // Se a lista estiver vazia, recarregar alertas
        if (alertasContainer.innerHTML.trim() === '' || alertasContainer.querySelector('.loading-alertas')) {
            console.log('👁️ TOGGLE: Lista vazia, recarregando alertas...');
            atualizarAlertasMes();
        }
    }
}

// Aguardar DOM estar pronto
document.addEventListener('DOMContentLoaded', inicializarModuloFrequencia);

console.log('✅ frequencia-supabase.js carregado');