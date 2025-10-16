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

  // Carregar turmas dinamicamente
  await carregarTurmasDinamicamente();

  setupEventListeners();
  setupUnidadeChangeListener();
}

// ========================================
// CARREGAMENTO DINÂMICO DE TURMAS
// ========================================

async function carregarTurmasDinamicamente() {
  try {
    const unidadeAtual = window.unidadeSelector ? window.unidadeSelector.getUnidade() : 'Sede';
    console.log(`📚 Carregando turmas da unidade: ${unidadeAtual}`);

    const supabase = getSupabase();
    if (!supabase) {
      console.warn('⚠️ Supabase não disponível, usando turmas padrão');
      return;
    }

    // Buscar turmas distintas da unidade
    const { data: turmasData, error } = await supabase
      .from('alunos')
      .select('turma, unidade')
      .eq('unidade', unidadeAtual)
      .not('turma', 'is', null)
      .order('turma');

    if (error) throw error;

    // Obter turmas únicas
    const turmasUnicas = [...new Set(turmasData.map(a => a.turma))];
    console.log(`✅ ${turmasUnicas.length} turmas encontradas para ${unidadeAtual}:`, turmasUnicas);

    // Preencher ambos os selects (lançamento e consulta)
    preencherSelectTurmas('lancamento-turma', turmasUnicas);
    preencherSelectTurmas('consulta-turma', turmasUnicas);

  } catch (error) {
    console.error('❌ Erro ao carregar turmas:', error);
  }
}

function preencherSelectTurmas(selectId, turmas) {
  const select = document.getElementById(selectId);
  if (!select) return;

  // Limpar opções existentes
  select.innerHTML = '<option value="">Selecione uma turma</option>';

  // Classificar turmas em fundamental e médio
  const turmasFundamental = turmas.filter(t =>
    t.includes('6') || t.includes('7') || t.includes('8') || t.includes('9')
  );
  const turmasMedio = turmas.filter(t =>
    t.includes('1º') || t.includes('2º') || t.includes('1B') || t.includes('2B') ||
    t.includes('1 B') || t.includes('2 B')
  );

  // Adicionar grupo Fundamental
  if (turmasFundamental.length > 0) {
    const optgroupFund = document.createElement('optgroup');
    optgroupFund.label = 'Ensino Fundamental';
    turmasFundamental.sort().forEach(turma => {
      const option = document.createElement('option');
      option.value = turma;
      option.textContent = turma;
      optgroupFund.appendChild(option);
    });
    select.appendChild(optgroupFund);
  }

  // Adicionar grupo Médio
  if (turmasMedio.length > 0) {
    const optgroupMedio = document.createElement('optgroup');
    optgroupMedio.label = 'Ensino Médio';
    turmasMedio.sort().forEach(turma => {
      const option = document.createElement('option');
      option.value = turma;
      option.textContent = turma;
      optgroupMedio.appendChild(option);
    });
    select.appendChild(optgroupMedio);
  }
}

function setupUnidadeChangeListener() {
  if (!window.unidadeSelector) {
    console.warn('⚠️ Sistema de seleção de unidade não disponível');
    return;
  }

  window.unidadeSelector.onChange(async () => {
    const novaUnidade = window.unidadeSelector.getUnidade();
    console.log(`🔄 Unidade alterada para: ${novaUnidade} - Recarregando boletim...`);

    // Limpar cache de alunos
    alunosCache = {};

    // Recarregar turmas
    await carregarTurmasDinamicamente();

    // Limpar seleções
    document.getElementById('lancamento-turma').value = '';
    document.getElementById('lancamento-aluno').innerHTML = '<option value="">Selecione uma turma primeiro</option>';
    document.getElementById('lancamento-aluno').disabled = true;
    document.getElementById('materias-container').style.display = 'none';

    document.getElementById('consulta-turma').value = '';
    document.getElementById('consulta-aluno').innerHTML = '<option value="">Selecione uma turma primeiro</option>';
    document.getElementById('consulta-aluno').disabled = true;
    document.getElementById('resultado-consulta').style.display = 'none';

    console.log(`✅ Dados atualizados para ${novaUnidade}`);
  });
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

  // Lançamento: Carregar matérias ao selecionar aluno
  document.getElementById('lancamento-aluno').addEventListener('change', verificarSelecaoCompleta);

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
    // Obter unidade atual
    const unidadeAtual = window.unidadeSelector ? window.unidadeSelector.getUnidade() : 'Sede';
    console.log(`📥 Carregando alunos da turma: "${turma}" (Unidade: ${unidadeAtual})`);

    // Criar chave de cache com unidade
    const cacheKey = `${turma}_${unidadeAtual}`;

    // Verificar cache
    if (alunosCache[cacheKey]) {
      console.log('💾 Usando cache');
      preencherSelectAlunos(alunosCache[cacheKey], tipo);
      return;
    }

    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Supabase não disponível');
    }

    // Converter turma do formato display para formato banco
    const turmaBanco = TURMAS_MAP[turma] || turma;
    console.log(`🔄 Convertendo turma: "${turma}" -> "${turmaBanco}"`);

    // Buscar alunos da turma específica FILTRADOS pela unidade
    const { data: alunosDaTurma, error } = await supabase
      .from('alunos')
      .select('codigo, "código (matrícula)", "Nome completo", turma, unidade')
      .eq('turma', turmaBanco)
      .eq('unidade', unidadeAtual)
      .order('"Nome completo"');

    if (error) throw error;

    console.log(`✅ ${alunosDaTurma?.length || 0} alunos encontrados na turma "${turma}" (${turmaBanco}) da unidade ${unidadeAtual}`);

    // Salvar no cache com chave que inclui unidade
    alunosCache[cacheKey] = alunosDaTurma || [];

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

  if (turma && aluno) {
    carregarMateriasParaLancamento(turma, aluno);
  } else {
    document.getElementById('materias-container').style.display = 'none';
  }
}

async function carregarMateriasParaLancamento(turma, alunoJson) {
  try {
    const alunoData = JSON.parse(alunoJson);
    const ano = document.getElementById('lancamento-ano').value;

    // Determinar matérias por tipo de turma
    const materias = TURMAS_MEDIO.includes(turma) ? MATERIAS_MEDIO : MATERIAS_FUNDAMENTAL;

    const supabase = getSupabase();
    if (!supabase) {
      throw new Error('Supabase não disponível');
    }

    // Buscar TODAS as notas já lançadas (todos os bimestres)
    const { data: notasExistentes, error } = await supabase
      .from('boletim')
      .select('*')
      .eq('aluno_codigo', alunoData.codigo)
      .eq('ano_letivo', parseInt(ano));

    if (error) throw error;

    // Criar mapa de notas existentes: {materia: {1: nota, 2: nota, ...}}
    const notasMap = {};
    (notasExistentes || []).forEach(nota => {
      if (!notasMap[nota.materia]) {
        notasMap[nota.materia] = {};
      }
      notasMap[nota.materia][nota.bimestre] = nota.nota;
    });

    // Renderizar lista de matérias
    const container = document.getElementById('materias-list');
    container.innerHTML = '';

    // Criar header da tabela
    const header = document.createElement('div');
    header.className = 'materias-header';
    header.innerHTML = `
      <div>Matéria</div>
      <div>1º Bim</div>
      <div>2º Bim</div>
      <div>3º Bim</div>
      <div>4º Bim</div>
    `;
    container.appendChild(header);

    // Criar linhas para cada matéria
    materias.forEach(materia => {
      const row = document.createElement('div');
      row.className = 'materia-row';

      // Label da matéria
      const label = document.createElement('div');
      label.className = 'materia-label';
      label.textContent = materia;
      row.appendChild(label);

      // Inputs para cada bimestre (1, 2, 3, 4)
      for (let bim = 1; bim <= 4; bim++) {
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'nota-input';
        input.placeholder = '0.00';
        input.min = '0';
        input.max = '10';
        input.step = '0.01';
        input.dataset.materia = materia;
        input.dataset.bimestre = bim;
        input.value = notasMap[materia]?.[bim] || '';

        // Validação em tempo real
        input.addEventListener('input', (e) => {
          const valor = parseFloat(e.target.value);
          if (valor < 0) e.target.value = '0';
          if (valor > 10) e.target.value = '10';
        });

        row.appendChild(input);
      }

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
    const ano = document.getElementById('lancamento-ano').value;

    if (!turma || !alunoJson) {
      alert('Selecione uma turma e um aluno antes de salvar!');
      return;
    }

    const alunoData = JSON.parse(alunoJson);

    const currentUser = getCurrentUser();
    const supabase = getSupabase();

    if (!supabase) {
      throw new Error('Supabase não disponível');
    }

    // Verificar se há sessão ativa (Supabase ou Local)
    let userEmail = 'sistema';

    // Se tem currentUser (pode ser local ou Supabase)
    if (currentUser) {
      userEmail = currentUser.email;
      console.log('✅ Usuário autenticado:', userEmail);

      // Se não é login local, verificar sessão Supabase
      if (currentUser.provider !== 'local') {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          alert('Sua sessão Supabase expirou. Por favor, faça login novamente.');
          console.error('❌ Sessão Supabase expirada');
          window.location.href = '/pages/login.html';
          return;
        }
      }
    } else {
      // Não tem usuário logado
      alert('Você precisa estar autenticado para salvar notas.');
      window.location.href = '/pages/login.html';
      return;
    }

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
        bimestre: parseInt(input.dataset.bimestre),
        materia: input.dataset.materia,
        nota: nota,
        created_by: userEmail,
        updated_by: userEmail
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
  document.getElementById('materias-container').style.display = 'none';
}

// ========================================
// CONSULTA DE NOTAS
// ========================================

async function consultarBoletim() {
  try {
    const turma = document.getElementById('consulta-turma').value;
    const alunoJson = document.getElementById('consulta-aluno').value;
    const ano = document.getElementById('consulta-ano').value;

    if (!turma || !alunoJson) {
      alert('Selecione uma turma e um aluno antes de consultar!');
      return;
    }

    const alunoData = JSON.parse(alunoJson);
    const container = document.getElementById('resultado-consulta');

    console.log(`🔍 Consultando boletim completo: Aluno=${alunoData.nome}`);

    await consultarBoletimCompleto(alunoData, turma, ano, container);

  } catch (error) {
    console.error('❌ Erro ao consultar boletim:', error);
    alert('Erro ao consultar boletim: ' + error.message);
  }
}

async function consultarBoletimCompleto(alunoData, turma, ano, container) {
  const supabase = getSupabase();
  if (!supabase) {
    throw new Error('Supabase não disponível');
  }

  // Buscar TODAS as notas do aluno
  const { data: notas, error } = await supabase
    .from('boletim')
    .select('*')
    .eq('aluno_codigo', alunoData.codigo)
    .eq('ano_letivo', parseInt(ano))
    .order('materia');

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

  // Agrupar notas por matéria e bimestre: {materia: {1: nota, 2: nota, ...}}
  const notasPorMateria = {};
  notas.forEach(nota => {
    if (!notasPorMateria[nota.materia]) {
      notasPorMateria[nota.materia] = {};
    }
    notasPorMateria[nota.materia][nota.bimestre] = parseFloat(nota.nota);
  });

  // Calcular médias por bimestre (média de todas as matérias em cada bimestre)
  const mediasPorBimestre = {};
  for (let bim = 1; bim <= 4; bim++) {
    let soma = 0;
    let count = 0;
    Object.keys(notasPorMateria).forEach(materia => {
      if (notasPorMateria[materia][bim] !== undefined) {
        soma += notasPorMateria[materia][bim];
        count++;
      }
    });
    if (count > 0) {
      mediasPorBimestre[bim] = (soma / count).toFixed(2);
    }
  }

  // Calcular média anual por matéria
  const mediasAnuaisPorMateria = {};
  let somaMediasAnuais = 0;
  let countMateriasComNota = 0;

  Object.keys(notasPorMateria).forEach(materia => {
    const notasBimestres = Object.values(notasPorMateria[materia]);
    if (notasBimestres.length > 0) {
      const media = notasBimestres.reduce((a, b) => a + b, 0) / notasBimestres.length;
      mediasAnuaisPorMateria[materia] = {
        media: media,
        aprovado: media >= NOTA_MINIMA_APROVACAO
      };
      somaMediasAnuais += media;
      countMateriasComNota++;
    }
  });

  const mediaGeralAnual = countMateriasComNota > 0 ? (somaMediasAnuais / countMateriasComNota).toFixed(2) : '0.00';
  const aprovadoGeral = parseFloat(mediaGeralAnual) >= NOTA_MINIMA_APROVACAO;

  // Renderizar HTML
  let html = `
    <div class="boletim-card">
      <div class="boletim-header">
        <div>
          <h2 style="margin: 0; color: #1f2937; font-weight: 700;">${alunoData.nome}</h2>
          <p style="margin: 5px 0 0 0; color: #6d28d9; font-weight: 600;">Turma: ${turma} | Ano Letivo: ${ano}</p>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="color: #8b5cf6; margin-bottom: 10px;">📊 Médias por Bimestre</h3>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px;">
  `;

  for (let bim = 1; bim <= 4; bim++) {
    const media = mediasPorBimestre[bim] || '-';
    const aprovado = media !== '-' && parseFloat(media) >= NOTA_MINIMA_APROVACAO;
    html += `
      <div style="background: rgba(139, 92, 246, 0.1); padding: 15px; border-radius: 8px; text-align: center; border: 1px solid rgba(139, 92, 246, 0.3);">
        <div style="font-size: 12px; color: #9ca3af; margin-bottom: 5px;">${bim}º Bimestre</div>
        <div style="font-size: 24px; font-weight: bold; color: ${aprovado ? '#10b981' : '#ef4444'};">${media}</div>
        ${media !== '-' ? `<div style="font-size: 11px; color: ${aprovado ? '#10b981' : '#ef4444'}; margin-top: 5px;">${aprovado ? '✅ Aprovado' : '❌ Reprovado'}</div>` : ''}
      </div>
    `;
  }

  html += `
        </div>
      </div>

      <div>
        <h3 style="color: #8b5cf6; margin-bottom: 10px;">📚 Notas por Matéria</h3>
        <div class="consulta-results">
  `;

  // Renderizar cada matéria com suas notas
  Object.keys(notasPorMateria).sort().forEach(materia => {
    const notas = notasPorMateria[materia];
    const mediaMateria = mediasAnuaisPorMateria[materia];

    html += `
      <div class="nota-card">
        <div class="nota-card-header">
          <div class="nota-card-title">${materia}</div>
          <div class="${mediaMateria.aprovado ? 'status-aprovado' : 'status-reprovado'}">
            ${mediaMateria.aprovado ? '✅ Aprovado' : '❌ Reprovado'}
          </div>
        </div>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-top: 10px;">
    `;

    for (let bim = 1; bim <= 4; bim++) {
      const nota = notas[bim];
      if (nota !== undefined) {
        const aprovadoBim = nota >= NOTA_MINIMA_APROVACAO;
        html += `
          <div style="text-align: center; padding: 8px; background: rgba(255, 255, 255, 0.03); border-radius: 6px;">
            <div style="font-size: 11px; color: #9ca3af;">${bim}º Bim</div>
            <div style="font-size: 18px; font-weight: bold; color: ${aprovadoBim ? '#10b981' : '#ef4444'};">${nota.toFixed(2)}</div>
          </div>
        `;
      } else {
        html += `
          <div style="text-align: center; padding: 8px; background: rgba(255, 255, 255, 0.03); border-radius: 6px;">
            <div style="font-size: 11px; color: #9ca3af;">${bim}º Bim</div>
            <div style="font-size: 18px; color: #4b5563;">-</div>
          </div>
        `;
      }
    }

    html += `
        </div>
        <div style="margin-top: 10px; text-align: center; padding-top: 10px; border-top: 1px solid rgba(139, 92, 246, 0.2);">
          <span style="color: #9ca3af; font-size: 13px;">Média Anual: </span>
          <span style="font-size: 20px; font-weight: bold; color: ${mediaMateria.aprovado ? '#10b981' : '#ef4444'};">
            ${mediaMateria.media.toFixed(2)}
          </span>
        </div>
      </div>
    `;
  });

  html += `
        </div>
      </div>

      <div class="media-geral">
        <h3>Média Geral Anual</h3>
        <div class="valor">${mediaGeralAnual}</div>
        <div class="${aprovadoGeral ? 'status-aprovado' : 'status-reprovado'}" style="font-size: 18px;">
          ${aprovadoGeral ? '✅ APROVADO NO ANO' : '❌ REPROVADO NO ANO'}
        </div>
        <div style="margin-top: 15px; font-size: 14px; opacity: 0.9;">
          Baseado em ${countMateriasComNota} matéria(s)
        </div>
      </div>
    </div>
  `;

  container.innerHTML = html;
  container.style.display = 'block';

  console.log(`✅ Boletim completo gerado: Média geral ${mediaGeralAnual}`);
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
          <h2 style="margin: 0; color: #1f2937; font-weight: 700;">${alunoData.nome}</h2>
          <p style="margin: 5px 0 0 0; color: #6d28d9; font-weight: 600;">Turma: ${turma} | ${bimestre}º Bimestre</p>
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
          <h2 style="margin: 0; color: #1f2937; font-weight: 700;">${alunoData.nome}</h2>
          <p style="margin: 5px 0 0 0; color: #6d28d9; font-weight: 600;">Turma: ${turma} | Média Anual ${ano}</p>
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
