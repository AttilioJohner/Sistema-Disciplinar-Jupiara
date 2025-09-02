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
        .select('*');
      
      if (error) {
        console.error('❌ Erro ao buscar frequências:', error);
        throw error;
      }
      
      this.dadosFrequencia.clear();
      
      // Agrupar por turma/mês/ano
      const gruposDados = new Map();
      
      if (frequencias && frequencias.length > 0) {
        frequencias.forEach(registro => {
          const chave = `${registro.turma}_${registro.mes}_${registro.ano}`;
          
          if (!gruposDados.has(chave)) {
            gruposDados.set(chave, {
              turma: registro.turma,
              mes: registro.mes,
              ano: registro.ano,
              alunos: []
            });
          }
          
          // Processar dias (assumindo que está em formato JSON)
          let dias = {};
          if (registro.dias && typeof registro.dias === 'object') {
            dias = registro.dias;
          } else if (registro.dias && typeof registro.dias === 'string') {
            try {
              dias = JSON.parse(registro.dias);
            } catch (e) {
              console.warn('Erro ao parsear dias:', registro.dias);
              dias = {};
            }
          }
          
          gruposDados.get(chave).alunos.push({
            id: registro.codigo || registro.id,
            codigo: registro.codigo,
            nome: registro.nome,
            dias: dias
          });
        });
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
    const container = document.getElementById('relatorios-turmas');
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
      card.className = 'turma-card';
      card.innerHTML = `
        <h3>Turma ${turma}</h3>
        <div class="turma-stats">
          <span>👥 ${relatorio.totalAlunos} alunos</span>
          <span>📅 ${relatorio.totalPeriodos} períodos</span>
        </div>
        <div class="turma-stats">
          <span>📆 Último: ${relatorio.ultimoMes}</span>
        </div>
      `;
      
      card.addEventListener('click', () => {
        const filtroTurma = document.getElementById('filtro-turma');
        if (filtroTurma) {
          filtroTurma.value = turma;
          this.turmaAtual = turma;
          this.atualizarFiltroMes();
          filtroTurma.scrollIntoView({ behavior: 'smooth' });
        }
      });
      
      container.appendChild(card);
    }
  }

  renderizarTabela() {
    const container = document.getElementById('tabela-container');
    const thead = document.getElementById('tabela-head');
    const tbody = document.getElementById('tabela-body');
    
    if (!container || !thead || !tbody) return;
    
    if (!this.turmaAtual || !this.mesAtual || !this.anoAtual) {
      container.style.display = 'none';
      return;
    }
    
    const chave = `${this.turmaAtual}_${this.mesAtual}_${this.anoAtual}`;
    const dados = this.dadosFrequencia.get(chave);
    
    if (!dados || !dados.alunos.length) {
      container.style.display = 'none';
      showToast('Nenhum dado encontrado para este período', 'warning');
      return;
    }
    
    // Detectar dias com dados
    const diasSet = new Set();
    dados.alunos.forEach(aluno => {
      if (aluno.dias && typeof aluno.dias === 'object') {
        Object.keys(aluno.dias).forEach(dia => diasSet.add(dia));
      }
    });
    
    const dias = Array.from(diasSet).sort((a, b) => parseInt(a) - parseInt(b));
    
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
        <td>${aluno.codigo || aluno.id}</td>
        <td>${aluno.nome || 'Nome não informado'}</td>
        ${dias.map(dia => {
          const freq = aluno.dias && aluno.dias[dia] ? aluno.dias[dia] : '';
          return `<td class="freq-${freq}">${freq}</td>`;
        }).join('')}
      </tr>
    `).join('');
    
    container.style.display = 'block';
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
        if (valor && ['P', 'F', 'A'].includes(valor)) {
          dias[dia] = valor;
        }
      });
      
      dadosParaInserir.push({
        codigo,
        nome,
        mes,
        turma,
        ano,
        dias: JSON.stringify(dias)
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
        .upsert(lote, { onConflict: 'codigo,mes,turma,ano' });
      
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
    
    // Verificar se tem permissão (auth temporariamente desabilitado)
    console.log('🛑 RequireAuth DESABILITADO temporariamente - corrigindo loops');
    
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

// Aguardar DOM estar pronto
document.addEventListener('DOMContentLoaded', inicializarModuloFrequencia);

console.log('✅ frequencia-supabase.js carregado');