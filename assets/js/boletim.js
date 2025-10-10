// SISTEMA DE BOLETIM ESCOLAR
// EECM Jupiara - Lançamento e consulta de notas

console.log('📚 Carregando sistema de boletim...');

// ========================================
// DEFINIÇÃO DE MATÉRIAS POR NÍVEL
// ========================================

const MATERIAS_FUNDAMENTAL = [
  'Geografia',
  'História',
  'Educação Física',
  'Inglês',
  'Língua Portuguesa',
  'Artes',
  'Matemática',
  'Ciências da Natureza'
];

const MATERIAS_MEDIO = [
  'Filosofia',
  'Geografia',
  'História',
  'Sociologia',
  'Educação Física',
  'Inglês',
  'Língua Portuguesa',
  'Artes',
  'Biologia',
  'Física',
  'Química',
  'Matemática',
  'Literatura e Produção de Texto',
  'Aprofundamento - Matemática',
  'Aprofundamento - Língua Portuguesa',
  'Aprofundamento - Artes',
  'Aprofundamento - História',
  'Aprofundamento - Geografia'
];

const TURMAS_FUNDAMENTAL = ['6º Ano A', '6º Ano B', '7º Ano A', '7º Ano B', '8º Ano A', '8º Ano B', '9º Ano A', '9º Ano B'];
const TURMAS_MEDIO = ['1º Ano A', '1º Ano B', '2º Ano A', '2º Ano B'];

const NOTA_MINIMA_APROVACAO = 6.0;

// Mapeamento de turmas (formato display -> formato banco)
const TURMAS_MAP = {
  '6º Ano A': '6A',
  '6º Ano B': '6B',
  '7º Ano A': '7A',
  '7º Ano B': '7B',
  '8º Ano A': '8A',
  '8º Ano B': '8B',
  '9º Ano A': '9A',
  '9º Ano B': '9B',
  '9º Ano E': '9E',
  '1º Ano A': '1A',
  '1º Ano B': '1B',
  '1º Ano C': '1C',
  '2º Ano A': '2A',
  '2º Ano B': '2B'
};

// ========================================
// VARIÁVEIS GLOBAIS
// ========================================

let alunosCache = {};

// ========================================
// FUNÇÕES AUXILIARES
// ========================================

function getSupabase() {
  return window.supabaseClient || window.supabase;
}

function getCurrentUser() {
  return window.supabaseSystem?.auth?.getCurrentUser() || null;
}

// ========================================
// INICIALIZAÇÃO
// ========================================

async function initBoletim() {
  console.log('🚀 Inicializando sistema de boletim...');

  // Aguardar Supabase estar pronto
  let tentativas = 0;
  while (!getSupabase() && tentativas < 50) {
    await new Promise(resolve => setTimeout(resolve, 100));
    tentativas++;
  }

  if (!getSupabase()) {
    console.error('❌ Supabase não disponível');
    return;
  }

  console.log('✅ Sistema de boletim inicializado');
  setupEventListeners();
}

// ========================================
// EVENT LISTENERS
// ========================================

function setupEventListeners() {
  // Sistema de Tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchTab(tabName);
    });
  });

  // Lançamento: Carregar alunos ao selecionar turma
  document.getElementById('lancamento-turma').addEventListener('change', async (e) => {
    await carregarAlunosPorTurma(e.target.value, 'lancamento');
  });

  // Lançamento: Carregar matérias ao selecionar aluno e bimestre
  document.getElementById('lancamento-aluno').addEventListener('change', verificarSelecaoCompleta);
  document.getElementById('lancamento-bimestre').addEventListener('change', verificarSelecaoCompleta);

  // Consulta: Carregar alunos ao selecionar turma
  document.getElementById('consulta-turma').addEventListener('change', async (e) => {
    await carregarAlunosPorTurma(e.target.value, 'consulta');
  });

  // Botões
  document.getElementById('btn-salvar-notas').addEventListener('click', salvarNotas);
  document.getElementById('btn-limpar').addEventListener('click', limparFormulario);
  document.getElementById('btn-consultar').addEventListener('click', consultarBoletim);
}

// ========================================
// SISTEMA DE TABS
// ========================================

function switchTab(tabName) {
  // Atualizar tabs
  document.querySelectorAll('.tab').forEach(tab => {
    tab.classList.remove('active');
  });
  document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

  // Atualizar conteúdo
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.remove('active');
  });
  document.getElementById(`tab-${tabName}`).classList.add('active');
}

// ========================================
// CARREGAMENTO DE ALUNOS
// ========================================

async function carregarAlunosPorTurma(turma, tipo) {
  if (!turma) {
    const select = document.getElementById(`${tipo}-aluno`);
    select.innerHTML = '<option value="">Selecione uma turma primeiro</option>';
    select.disabled = true;

    if (tipo === 'lancamento') {
      document.getElementById('materias-container').style.display = 'none';
    }
    return;
  }

  try {
    console.log(`📥 Carregando alunos da turma: "${turma}"`);

    // Verificar cache
    if (alunosCache[turma]) {
      console.log('💾 Usando cache');
      preencherSelectAlunos(alunosCache[turma], tipo);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Supabase não disponível');
    }

    // Converter turma do formato display para formato banco
    const turmaBanco = TURMAS_MAP[turma] || turma;
    console.log(`🔄 Convertendo turma: "${turma}" -> "${turmaBanco}"`);

    // Buscar alunos da turma específica
    const { data: alunosDaTurma, error } = await supabase
      .from('alunos')
      .select('codigo, "código (matrícula)", "Nome completo", turma')
      .eq('turma', turmaBanco)
      .order('"Nome completo"');

    if (error) throw error;

    console.log(`✅ ${alunosDaTurma?.length || 0} alunos encontrados na turma "${turma}" (${turmaBanco})`);

    // Salvar no cache
    alunosCache[turma] = alunosDaTurma || [];

    preencherSelectAlunos(alunosDaTurma || [], tipo);

  } catch (error) {
    console.error('❌ Erro ao carregar alunos:', error);
    alert('Erro ao carregar alunos: ' + error.message);
  }
}

function preencherSelectAlunos(alunos, tipo) {
  const select = document.getElementById(`${tipo}-aluno`);

  if (!alunos || alunos.length === 0) {
    select.innerHTML = '<option value="">Nenhum aluno encontrado</option>';
    select.disabled = true;
    return;
  }

  select.innerHTML = '<option value="">Selecione um aluno</option>';
  alunos.forEach(aluno => {
    const option = document.createElement('option');
    option.value = JSON.stringify({
      codigo: aluno['código (matrícula)'] || aluno.codigo,
      nome: aluno['Nome completo']
    });
    option.textContent = aluno['Nome completo'];
    select.appendChild(option);
  });

  select.disabled = false;
}

// ========================================
// LANÇAMENTO DE NOTAS
// ========================================

function verificarSelecaoCompleta() {
  const turma = document.getElementById('lancamento-turma').value;
  const aluno = document.getElementById('lancamento-aluno').value;
  const bimestre = document.getElementById('lancamento-bimestre').value;

  if (turma && aluno && bimestre) {
    carregarMateriasParaLancamento(turma, aluno, bimestre);
  } else {
    document.getElementById('materias-container').style.display = 'none';
  }
}

async function carregarMateriasParaLancamento(turma, alunoJson, bimestre) {
  try {
    const alunoData = JSON.parse(alunoJson);
    const ano = document.getElementById('lancamento-ano').value;

    // Determinar matérias por tipo de turma
    const materias = TURMAS_MEDIO.includes(turma) ? MATERIAS_MEDIO : MATERIAS_FUNDAMENTAL;

    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Supabase não disponível');
    }

    // Buscar notas já lançadas
    const { data: notasExistentes, error } = await supabase
      .from('boletim')
      .select('*')
      .eq('aluno_codigo', alunoData.codigo)
      .eq('ano_letivo', parseInt(ano))
      .eq('bimestre', parseInt(bimestre));

    if (error) throw error;

    // Criar mapa de notas existentes
    const notasMap = {};
    (notasExistentes || []).forEach(nota => {
      notasMap[nota.materia] = nota.nota;
    });

    // Renderizar lista de matérias
    const container = document.getElementById('materias-list');
    container.innerHTML = '';

    materias.forEach(materia => {
      const row = document.createElement('div');
      row.className = 'materia-row';

      const label = document.createElement('div');
      label.className = 'materia-label';
      label.textContent = materia;

      const input = document.createElement('input');
      input.type = 'number';
      input.className = 'nota-input';
      input.placeholder = '0.00';
      input.min = '0';
      input.max = '10';
      input.step = '0.01';
      input.dataset.materia = materia;
      input.value = notasMap[materia] || '';

      // Validação em tempo real
      input.addEventListener('input', (e) => {
        const valor = parseFloat(e.target.value);
        if (valor < 0) e.target.value = '0';
        if (valor > 10) e.target.value = '10';
      });

      row.appendChild(label);
      row.appendChild(input);
      container.appendChild(row);
    });

    document.getElementById('materias-container').style.display = 'block';

  } catch (error) {
    console.error('❌ Erro ao carregar matérias:', error);
    alert('Erro ao carregar matérias. Verifique o console.');
  }
}

async function salvarNotas() {
  try {
    const turma = document.getElementById('lancamento-turma').value;
    const alunoJson = document.getElementById('lancamento-aluno').value;
    const bimestre = document.getElementById('lancamento-bimestre').value;
    const ano = document.getElementById('lancamento-ano').value;

    if (!turma || !alunoJson || !bimestre) {
      alert('Preencha todos os campos antes de salvar!');
      return;
    }

    const alunoData = JSON.parse(alunoJson);

    const currentUser = getCurrentUser();
    const supabase = getSupabase();

    if (!supabase) {
      throw new Error('Supabase não disponível');
    }

    // Verificar se há sessão ativa
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      alert('Sua sessão expirou. Por favor, faça login novamente.');
      console.error('❌ Sessão expirada ou inválida');
      window.location.href = '/pages/login.html';
      return;
    }

    console.log('✅ Sessão válida:', session.user.email);

    // Coletar notas dos inputs
    const inputs = document.querySelectorAll('.nota-input');
    const notas = [];
    let temNotaInvalida = false;

    inputs.forEach(input => {
      const valor = input.value.trim();
      if (valor === '') return; // Ignorar campos vazios

      const nota = parseFloat(valor);

      // Validação
      if (isNaN(nota) || nota < 0 || nota > 10) {
        temNotaInvalida = true;
        input.style.borderColor = '#ef4444';
        return;
      } else {
        input.style.borderColor = '#ddd';
      }

      notas.push({
        aluno_codigo: alunoData.codigo,
        aluno_nome: alunoData.nome,
        turma: turma,
        ano_letivo: parseInt(ano),
        bimestre: parseInt(bimestre),
        materia: input.dataset.materia,
        nota: nota,
        created_by: currentUser?.email || 'sistema',
        updated_by: currentUser?.email || 'sistema'
      });
    });

    if (temNotaInvalida) {
      alert('Há notas inválidas! Corrija os valores destacados em vermelho.');
      return;
    }

    if (notas.length === 0) {
      alert('Nenhuma nota foi preenchida!');
      return;
    }

    // Confirmar salvamento
    if (!confirm(`Deseja salvar ${notas.length} nota(s)?`)) {
      return;
    }

    console.log('💾 Salvando notas:', notas);

    // Salvar no Supabase (upsert para permitir edição)
    const { data, error } = await supabase
      .from('boletim')
      .upsert(notas, {
        onConflict: 'aluno_codigo,ano_letivo,bimestre,materia',
        ignoreDuplicates: false
      });

    if (error) throw error;

    alert(`✅ ${notas.length} nota(s) salva(s) com sucesso!`);
    console.log('✅ Notas salvas:', data);

  } catch (error) {
    console.error('❌ Erro ao salvar notas:', error);
    alert('Erro ao salvar notas: ' + error.message);
  }
}

function limparFormulario() {
  document.getElementById('lancamento-turma').value = '';
  document.getElementById('lancamento-aluno').innerHTML = '<option value="">Selecione uma turma primeiro</option>';
  document.getElementById('lancamento-aluno').disabled = true;
  document.getElementById('lancamento-bimestre').value = '';
  document.getElementById('materias-container').style.display = 'none';
}

// ========================================
// CONSULTA DE NOTAS
// ========================================

async function consultarBoletim() {
  try {
    const turma = document.getElementById('consulta-turma').value;
    const alunoJson = document.getElementById('consulta-aluno').value;
    const bimestre = document.getElementById('consulta-bimestre').value;
    const ano = document.getElementById('consulta-ano').value;

    if (!turma || !alunoJson || !bimestre) {
      alert('Preencha todos os campos antes de consultar!');
      return;
    }

    const alunoData = JSON.parse(alunoJson);
    const container = document.getElementById('resultado-consulta');

    console.log(`🔍 Consultando boletim: Aluno=${alunoData.nome}, Bimestre=${bimestre}`);

    if (bimestre === 'anual') {
      await consultarMediaAnual(alunoData, turma, ano, container);
    } else {
      await consultarBimestre(alunoData, turma, bimestre, ano, container);
    }

  } catch (error) {
    console.error('❌ Erro ao consultar boletim:', error);
    alert('Erro ao consultar boletim: ' + error.message);
  }
}

async function consultarBimestre(alunoData, turma, bimestre, ano, container) {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase não disponível');
  }

  const { data: notas, error } = await supabase
    .from('boletim')
    .select('*')
    .eq('aluno_codigo', alunoData.codigo)
    .eq('ano_letivo', parseInt(ano))
    .eq('bimestre', parseInt(bimestre))
    .order('materia');

  if (error) throw error;

  if (!notas || notas.length === 0) {
    container.innerHTML = `
      <div class="boletim-card">
        <div style="text-align: center; padding: 40px; color: #9ca3af;">
          <h3>📭 Nenhuma nota encontrada</h3>
          <p>Não há notas lançadas para este aluno no ${bimestre}º bimestre.</p>
        </div>
      </div>
    `;
    container.style.display = 'block';
    return;
  }

  // Calcular média do bimestre
  const soma = notas.reduce((acc, n) => acc + parseFloat(n.nota), 0);
  const media = (soma / notas.length).toFixed(2);
  const statusGeral = parseFloat(media) >= NOTA_MINIMA_APROVACAO;

  // Renderizar notas
  let html = `
    <div class="boletim-card">
      <div class="boletim-header">
        <div>
          <h2 style="margin: 0; color: #e0e0e0;">${alunoData.nome}</h2>
          <p style="margin: 5px 0 0 0; color: #9ca3af;">Turma: ${turma} | ${bimestre}º Bimestre</p>
        </div>
      </div>

      <div class="consulta-results">
  `;

  notas.forEach(nota => {
    const notaValor = parseFloat(nota.nota);
    const status = notaValor >= NOTA_MINIMA_APROVACAO;
    const statusClass = status ? 'status-aprovado' : 'status-reprovado';
    const statusText = status ? '✅ Aprovado' : '❌ Reprovado';

    html += `
      <div class="nota-card">
        <div class="nota-card-header">
          <div class="nota-card-title">${nota.materia}</div>
          <div class="${statusClass}">${statusText}</div>
        </div>
        <div class="nota-card-value">${notaValor.toFixed(2)}</div>
      </div>
    `;
  });

  html += `
      </div>

      <div class="media-geral">
        <h3>Média do Bimestre</h3>
        <div class="valor">${media}</div>
        <div class="${statusGeral ? 'status-aprovado' : 'status-reprovado'}" style="font-size: 18px;">
          ${statusGeral ? '✅ Aprovado no bimestre' : '❌ Reprovado no bimestre'}
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
  container.style.display = 'block';

  console.log(`✅ Consulta realizada: ${notas.length} notas, média ${media}`);
}

async function consultarMediaAnual(alunoData, turma, ano, container) {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase não disponível');
  }

  const { data: notas, error } = await supabase
    .from('boletim')
    .select('*')
    .eq('aluno_codigo', alunoData.codigo)
    .eq('ano_letivo', parseInt(ano))
    .order('materia, bimestre');

  if (error) throw error;

  if (!notas || notas.length === 0) {
    container.innerHTML = `
      <div class="boletim-card">
        <div style="text-align: center; padding: 40px; color: #9ca3af;">
          <h3>📭 Nenhuma nota encontrada</h3>
          <p>Não há notas lançadas para este aluno no ano de ${ano}.</p>
        </div>
      </div>
    `;
    container.style.display = 'block';
    return;
  }

  // Agrupar notas por matéria
  const notasPorMateria = {};
  notas.forEach(nota => {
    if (!notasPorMateria[nota.materia]) {
      notasPorMateria[nota.materia] = [];
    }
    notasPorMateria[nota.materia].push(parseFloat(nota.nota));
  });

  // Calcular médias por matéria
  const mediasPorMateria = {};
  let somaMedias = 0;
  let countMaterias = 0;

  Object.keys(notasPorMateria).forEach(materia => {
    const notasMateria = notasPorMateria[materia];
    const media = notasMateria.reduce((a, b) => a + b, 0) / notasMateria.length;
    mediasPorMateria[materia] = {
      media: media,
      aprovado: media >= NOTA_MINIMA_APROVACAO,
      bimestres: notasMateria.length
    };
    somaMedias += media;
    countMaterias++;
  });

  const mediaGeral = (somaMedias / countMaterias).toFixed(2);
  const statusGeral = parseFloat(mediaGeral) >= NOTA_MINIMA_APROVACAO;

  // Renderizar
  let html = `
    <div class="boletim-card">
      <div class="boletim-header">
        <div>
          <h2 style="margin: 0; color: #e0e0e0;">${alunoData.nome}</h2>
          <p style="margin: 5px 0 0 0; color: #9ca3af;">Turma: ${turma} | Média Anual ${ano}</p>
        </div>
      </div>

      <div class="consulta-results">
  `;

  Object.keys(mediasPorMateria).sort().forEach(materia => {
    const dados = mediasPorMateria[materia];
    const statusClass = dados.aprovado ? 'status-aprovado' : 'status-reprovado';
    const statusText = dados.aprovado ? '✅ Aprovado' : '❌ Reprovado';

    html += `
      <div class="nota-card">
        <div class="nota-card-header">
          <div class="nota-card-title">${materia}</div>
          <div class="${statusClass}">${statusText}</div>
        </div>
        <div class="nota-card-value">${dados.media.toFixed(2)}</div>
        <div style="text-align: center; color: #9ca3af; font-size: 12px; margin-top: 5px;">
          Baseado em ${dados.bimestres} bimestre(s)
        </div>
      </div>
    `;
  });

  html += `
      </div>

      <div class="media-geral">
        <h3>Média Geral Anual</h3>
        <div class="valor">${mediaGeral}</div>
        <div class="${statusGeral ? 'status-aprovado' : 'status-reprovado'}" style="font-size: 18px;">
          ${statusGeral ? '✅ APROVADO NO ANO' : '❌ REPROVADO NO ANO'}
        </div>
        <div style="margin-top: 15px; font-size: 14px; opacity: 0.9;">
          Baseado em ${countMaterias} matéria(s)
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
  container.style.display = 'block';

  console.log(`✅ Média anual calculada: ${mediaGeral} (${countMaterias} matérias)`);
}

// ========================================
// INICIALIZAÇÃO AUTOMÁTICA
// ========================================

document.addEventListener('DOMContentLoaded', initBoletim);

console.log('✅ Sistema de boletim carregado');
