// Script de importação de dados para o Supabase
// Sistema Disciplinar Jupiara - Migração completa

// Carregar dados locais
async function carregarDadosLocais() {
  try {
    const response = await fetch('./data/db.json');
    const dados = await response.json();
    
    console.log('📁 Dados locais carregados:');
    console.log('- Alunos:', Object.keys(dados.alunos || {}).length);
    console.log('- Medidas:', Object.keys(dados.medidas || {}).length);
    console.log('- Frequência:', Object.keys(dados.frequencia || {}).length);
    
    return dados;
  } catch (error) {
    console.error('❌ Erro ao carregar dados locais:', error);
    return null;
  }
}

// Verificar conexão com Supabase
async function verificarSupabase() {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.error('❌ Credenciais do Supabase não configuradas');
    return false;
  }
  
  console.log('✅ Supabase configurado');
  return true;
}

// Importar alunos (removendo duplicatas por código)
async function importarAlunos(alunos, supabase) {
  console.log('📤 Importando alunos...');
  const alunosArray = Object.values(alunos);
  
  // Remover duplicatas por código do aluno
  const alunosUnicos = {};
  alunosArray.forEach(aluno => {
    if (aluno.codigo && !alunosUnicos[aluno.codigo]) {
      alunosUnicos[aluno.codigo] = aluno;
    }
  });
  
  const alunosLimpos = Object.values(alunosUnicos);
  console.log(`🔍 Alunos únicos encontrados: ${alunosLimpos.length} (de ${alunosArray.length} registros)`);
  
  let importados = 0;
  let erros = 0;
  
  for (const aluno of alunosLimpos) {
    try {
      // Preparar dados do aluno
      const alunoData = {
        codigo: aluno.codigo, // Chave primária
        nome_completo: aluno.nome_completo || aluno.nome,
        nome: aluno.nome,
        turma: aluno.turma || '',
        responsavel: aluno.responsavel || '',
        cpf_responsavel: aluno.cpf_responsavel || '',
        telefone: aluno.telefone || '',
        email: aluno.email || '',
        criado_em: aluno.criadoEm || new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      };
      
      // Inserir no Supabase (upsert usando código como chave)
      const { error } = await supabase
        .from('alunos')
        .upsert(alunoData, { 
          onConflict: 'codigo'
        });
        
      if (error) {
        console.error(`❌ Erro ao importar aluno ${aluno.nome} (${aluno.codigo}):`, error);
        erros++;
      } else {
        importados++;
      }
      
      // Pausa pequena para não sobrecarregar
      if (importados % 10 === 0) {
        console.log(`📊 Progresso alunos: ${importados}/${alunosLimpos.length}`);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
    } catch (error) {
      console.error(`❌ Erro inesperado ao importar aluno ${aluno.nome} (${aluno.codigo}):`, error);
      erros++;
    }
  }
  
  console.log(`✅ Alunos importados: ${importados}`);
  console.log(`❌ Erros: ${erros}`);
  return { importados, erros };
}

// Importar medidas disciplinares (vinculadas por código do aluno)
async function importarMedidas(medidas, supabase) {
  console.log('📤 Importando medidas disciplinares...');
  const medidasArray = Object.values(medidas);
  let importadas = 0;
  let erros = 0;
  
  for (const medida of medidasArray) {
    try {
      // Preparar dados da medida
      const medidaData = {
        id: medida.id,
        aluno_codigo: medida.alunoCodigo || medida.codigo, // Usar código como FK
        aluno_nome: medida.alunoNome || medida.nome,
        tipo: medida.tipo,
        descricao: medida.descricao,
        data_ocorrencia: medida.dataOcorrencia || medida.data,
        responsavel: medida.responsavel || 'Sistema',
        status: medida.status || 'ativa',
        observacoes: medida.observacoes || '',
        criado_em: medida.criadoEm || new Date().toISOString(),
        atualizado_em: new Date().toISOString()
      };
      
      // Verificar se o código do aluno existe
      if (!medidaData.aluno_codigo) {
        console.error(`❌ Medida ${medida.id} sem código do aluno`);
        erros++;
        continue;
      }
      
      // Inserir no Supabase
      const { error } = await supabase
        .from('medidas')
        .upsert(medidaData, {
          onConflict: 'id'
        });
        
      if (error) {
        console.error(`❌ Erro ao importar medida ${medida.id}:`, error);
        erros++;
      } else {
        importadas++;
      }
      
      // Pausa pequena para não sobrecarregar
      if (importadas % 10 === 0) {
        console.log(`📊 Progresso medidas: ${importadas}/${medidasArray.length}`);
        await new Promise(resolve => setTimeout(resolve, 50));
      }
      
    } catch (error) {
      console.error(`❌ Erro inesperado ao importar medida ${medida.id}:`, error);
      erros++;
    }
  }
  
  console.log(`✅ Medidas importadas: ${importadas}`);
  console.log(`❌ Erros: ${erros}`);
  return { importadas, erros };
}

// Função principal de importação
async function executarImportacao() {
  console.log('🚀 Iniciando importação para Supabase...');
  
  // Verificar Supabase
  if (!(await verificarSupabase())) {
    return;
  }
  
  // Inicializar Supabase
  const supabase = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );
  
  // Carregar dados locais
  const dados = await carregarDadosLocais();
  if (!dados) {
    console.error('❌ Não foi possível carregar os dados locais');
    return;
  }
  
  try {
    // Importar alunos
    if (dados.alunos) {
      await importarAlunos(dados.alunos, supabase);
    }
    
    // Importar medidas disciplinares
    if (dados.medidas) {
      await importarMedidas(dados.medidas, supabase);
    }
    
    console.log('🎉 Importação concluída com sucesso!');
    
    // Atualizar estatísticas
    await atualizarEstatisticas(supabase);
    
  } catch (error) {
    console.error('❌ Erro durante a importação:', error);
  }
}

// Atualizar estatísticas após importação
async function atualizarEstatisticas(supabase) {
  try {
    // Contar alunos
    const { count: totalAlunos } = await supabase
      .from('alunos')
      .select('*', { count: 'exact', head: true });
    
    // Contar medidas
    const { count: totalMedidas } = await supabase
      .from('medidas')
      .select('*', { count: 'exact', head: true });
    
    console.log('📊 Estatísticas finais:');
    console.log(`- Total de alunos: ${totalAlunos}`);
    console.log(`- Total de medidas: ${totalMedidas}`);
    
  } catch (error) {
    console.error('❌ Erro ao verificar estatísticas:', error);
  }
}

// Exportar funções
window.importarParaSupabase = executarImportacao;
window.verificarDadosSupabase = async function() {
  if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY) {
    console.log('❌ Supabase não configurado');
    return;
  }
  
  const supabase = window.supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );
  
  await atualizarEstatisticas(supabase);
};

console.log('📋 Script de importação carregado!');
console.log('🔧 Para executar: importarParaSupabase()');
console.log('📊 Para verificar: verificarDadosSupabase()');