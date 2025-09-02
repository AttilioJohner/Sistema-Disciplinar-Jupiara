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
    // Botão importar (opcional - só se existir)
    const btnImportar = document.getElementById('btn-importar');
    if (btnImportar) {
      btnImportar.addEventListener('click', () => {
        this.importarDadosCSV();
      });
    }

    // Filtros
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
      console.log('📂 Carregando dados do Supabase...');
      
      // Buscar todas as frequências
      const { data: frequencias, error } = await this.supabase
        .from('frequencia')
        .select('*')
        .order('data', { ascending: false });
      
      if (error) {
        console.error('❌ Erro ao buscar frequências:', error);
        throw error;
      }
      
      this.dadosFrequencia.clear();
      
      // Agrupar por turma/mês/ano
      const gruposDados = new Map();
      
      if (frequencias && frequencias.length > 0) {
        console.log(`📊 Total de registros encontrados: ${frequencias.length}`);
        console.log('📋 Primeiros 3 registros:', frequencias.slice(0, 3));
        
        frequencias.forEach(registro => {
          // Extrair mês e ano da data
          const dataObj = new Date(registro.data);
          const mes = String(dataObj.getMonth() + 1).padStart(2, '0');
          const ano = String(dataObj.getFullYear());
          const dia = String(dataObj.getDate()).padStart(2, '0');
          
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
          }
          
          // Adicionar status do dia
          grupo.alunos.get(codigoAluno).dias[dia] = registro.status;
          
          // Debug para ver como os dados estão sendo processados
          if (Math.random() < 0.01) { // 1% dos registros para não poluir o log
            console.log(`🔍 Debug processamento: ${registro.turma} - Aluno ${codigoAluno} - Dia ${dia} = ${registro.status}`);
          }
        });
        
        // Converter Maps de alunos para arrays
        for (const [chave, grupo] of gruposDados) {
          grupo.alunos = Array.from(grupo.alunos.values());
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
    
    container.innerHTML = '';
    
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
      card.className = 'stat-card stat-info';
      card.innerHTML = `
        <div class="stat-icon">🎓</div>
        <div class="stat-content">
          <div class="stat-number">${relatorio.totalAlunos}</div>
          <div class="stat-label">Turma ${turma}</div>
          <div class="stat-detail">${relatorio.totalPeriodos} períodos • ${relatorio.ultimoMes}</div>
        </div>
      `;
      
      card.addEventListener('click', () => {
        this.selecionarTurma(turma);
      });
      
      container.appendChild(card);
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
    const container = document.getElementById('frequenciaContainer');
    const tabelaContainer = document.getElementById('tabela-container');
    
    if (!container) return;
    
    const chave = `${this.turmaAtual}_${this.mesAtual}_${this.anoAtual}`;
    const dados = this.dadosFrequencia.get(chave);
    
    console.log(`🔍 DEBUG mostrarResumoAlunos - Chave buscada: ${chave}`);
    console.log(`📊 DEBUG - Dados encontrados:`, dados);
    console.log(`👥 DEBUG - Quantidade de alunos:`, dados ? dados.alunos.length : 0);
    
    if (dados && dados.alunos.length > 0) {
      console.log(`🎓 DEBUG - Primeiro aluno:`, dados.alunos[0]);
      console.log(`📅 DEBUG - Dias do primeiro aluno:`, dados.alunos[0].dias);
      console.log(`🔢 DEBUG - Quantidade de dias do primeiro aluno:`, Object.keys(dados.alunos[0].dias || {}).length);
    }
    
    if (!dados || !dados.alunos.length) {
      container.innerHTML = '<div class="info-text">Nenhum dado encontrado para esta turma.</div>';
      return;
    }
    
    // Ocultar tabela de dias
    if (tabelaContainer) tabelaContainer.style.display = 'none';
    
    // Calcular totais por aluno
    const alunosComTotais = dados.alunos.map(aluno => {
      const totais = { P: 0, F: 0, A: 0, FC: 0 };
      
      if (aluno.dias && typeof aluno.dias === 'object') {
        Object.values(aluno.dias).forEach(status => {
          if (totais.hasOwnProperty(status)) {
            totais[status]++;
          }
        });
      }
      
      const totalDias = totais.P + totais.F + totais.A + totais.FC;
      const percentualPresenca = totalDias > 0 ? ((totais.P / totalDias) * 100).toFixed(1) : '0.0';
      
      return {
        ...aluno,
        totais,
        totalDias,
        percentualPresenca: parseFloat(percentualPresenca)
      };
    });
    
    // Ordenar por percentual de presença (decrescente)
    alunosComTotais.sort((a, b) => b.percentualPresenca - a.percentualPresenca);
    
    // Renderizar tabela de resumo
    container.innerHTML = `
      <div class="table-wrapper">
        <table class="data-table">
          <thead>
            <tr>
              <th>Código</th>
              <th>Nome</th>
              <th>📅 Total Dias</th>
              <th style="color: #28a745;">✅ Presenças</th>
              <th style="color: #dc3545;">❌ Faltas</th>
              <th style="color: #ffc107;">📋 Atestados</th>
              <th style="color: #fd7e14;">⚠️ Faltas Controladas</th>
              <th>📊 % Presença</th>
            </tr>
          </thead>
          <tbody>
            ${alunosComTotais.map(aluno => `
              <tr>
                <td><strong>${aluno.codigo}</strong></td>
                <td>${aluno.nome}</td>
                <td>${aluno.totalDias}</td>
                <td class="freq-P">${aluno.totais.P}</td>
                <td class="freq-F">${aluno.totais.F}</td>
                <td class="freq-A">${aluno.totais.A}</td>
                <td class="freq-FC">${aluno.totais.FC}</td>
                <td><strong style="color: ${aluno.percentualPresenca >= 75 ? '#28a745' : '#dc3545'}">${aluno.percentualPresenca}%</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  mostrarTabelaDias() {
    const container = document.getElementById('frequenciaContainer');
    const tabelaContainer = document.getElementById('tabela-container');
    
    if (!container || !tabelaContainer) return;
    
    if (!this.turmaAtual || !this.mesAtual || !this.anoAtual) {
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
  if (window.frequenciaManager) {
    window.frequenciaManager.mostrarTabelaDias();
  }
}

function voltarResumoAlunos() {
  if (window.frequenciaManager) {
    window.frequenciaManager.mostrarResumoAlunos();
  }
}

// Aguardar DOM estar pronto
document.addEventListener('DOMContentLoaded', inicializarModuloFrequencia);

console.log('✅ frequencia-supabase.js carregado');