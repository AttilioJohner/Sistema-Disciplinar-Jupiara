// Script para importar os CSVs corretos para o Supabase
// Dados: BD - Gestão de Alunos - Dados.csv + BD - Medidas - Página1.csv

// Função para parsear CSV simples
function parseCSV(csvText) {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || '';
    });
    return obj;
  });
}

// Importar alunos corretos
async function importarAlunosCorretos() {
  try {
    console.log('📚 Carregando CSV de alunos...');
    
    // Carregar CSV de alunos
    const response = await fetch('../BD - Gestão de Alunos - Dados.csv');
    const csvText = await response.text();
    const alunosData = parseCSV(csvText);
    
    console.log(`📊 Encontrados ${alunosData.length} alunos no CSV`);
    
    if (!window.supabase || !window.SUPABASE_URL) {
      console.error('❌ Supabase não configurado');
      return;
    }
    
    const supabase = window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY
    );
    
    console.log('🗑️ Limpando tabela de alunos...');
    await supabase.from('alunos').delete().neq('codigo', '');
    
    let importados = 0;
    let erros = 0;
    
    for (const aluno of alunosData) {
      try {
        // Mapear campos do CSV para o banco
        const alunoLimpo = {
          codigo: aluno['código (matrícula)'] || '',
          nome_completo: aluno['Nome completo'] || '',
          nome: aluno['Nome completo'] || '', // Para compatibilidade
          turma: aluno['turma'] || '',
          responsavel: aluno['responsável'] || '',
          cpf_responsavel: aluno['Cpf do responsável'] || '',
          telefone: aluno['Telefone do responsável'] || '',
          telefone2: aluno['Telefone do responsável 2'] || '',
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        };
        
        // Inserir no Supabase
        const { error } = await supabase
          .from('alunos')
          .upsert(alunoLimpo, { onConflict: 'codigo' });
          
        if (error) {
          console.error(`❌ Erro ao importar aluno ${alunoLimpo.codigo}:`, error);
          erros++;
        } else {
          importados++;
          if (importados % 50 === 0) {
            console.log(`📊 Progresso: ${importados}/${alunosData.length} alunos`);
          }
        }
        
      } catch (error) {
        console.error(`❌ Erro inesperado:`, error);
        erros++;
      }
    }
    
    console.log(`✅ Alunos importados: ${importados}`);
    console.log(`❌ Erros: ${erros}`);
    
    return { importados, erros };
    
  } catch (error) {
    console.error('❌ Erro ao carregar CSV de alunos:', error);
  }
}

// Importar medidas corretas
async function importarMedidasCorretas() {
  try {
    console.log('📋 Carregando CSV de medidas...');
    
    // Carregar CSV de medidas
    const response = await fetch('../BD - Medidas - Página1.csv');
    const csvText = await response.text();
    const medidasData = parseCSV(csvText);
    
    console.log(`📊 Encontradas ${medidasData.length} medidas no CSV`);
    
    if (!window.supabase || !window.SUPABASE_URL) {
      console.error('❌ Supabase não configurado');
      return;
    }
    
    const supabase = window.supabase.createClient(
      window.SUPABASE_URL,
      window.SUPABASE_ANON_KEY
    );
    
    console.log('🗑️ Limpando tabela de medidas...');
    await supabase.from('medidas_disciplinares').delete().neq('id', '');
    
    let importadas = 0;
    let erros = 0;
    
    for (const medida of medidasData) {
      try {
        // Gerar ID único
        const id = `medida_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Mapear campos do CSV para o banco
        const medidaLimpa = {
          id: id,
          aluno_codigo: medida['Código (Matrícula)'] || '',
          aluno_nome: medida['Nome completo'] || '',
          turma: medida['turma'] || '',
          data_ocorrencia: medida['data'] || '',
          descricao: medida['especificação'] || '',
          observacoes: medida['observação'] || '',
          tipo: medida['tipo de medida'] || '',
          numero_medida: medida['nr medida'] || '',
          status: 'ativa',
          responsavel: 'Sistema',
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        };
        
        // Inserir no Supabase
        const { error } = await supabase
          .from('medidas_disciplinares')
          .upsert(medidaLimpa, { onConflict: 'id' });
          
        if (error) {
          console.error(`❌ Erro ao importar medida ${id}:`, error);
          erros++;
        } else {
          importadas++;
          if (importadas % 50 === 0) {
            console.log(`📊 Progresso: ${importadas}/${medidasData.length} medidas`);
          }
        }
        
      } catch (error) {
        console.error(`❌ Erro inesperado:`, error);
        erros++;
      }
    }
    
    console.log(`✅ Medidas importadas: ${importadas}`);
    console.log(`❌ Erros: ${erros}`);
    
    return { importadas, erros };
    
  } catch (error) {
    console.error('❌ Erro ao carregar CSV de medidas:', error);
  }
}

// Função principal
async function executarImportacaoCompleta() {
  console.log('🚀 Iniciando importação completa dos CSVs...');
  
  try {
    // Importar alunos
    console.log('\n=== IMPORTANDO ALUNOS ===');
    const resultAlunos = await importarAlunosCorretos();
    
    // Aguardar um pouco
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Importar medidas
    console.log('\n=== IMPORTANDO MEDIDAS ===');
    const resultMedidas = await importarMedidasCorretas();
    
    // Resultado final
    console.log('\n🎉 IMPORTAÇÃO CONCLUÍDA!');
    console.log(`📊 Alunos: ${resultAlunos?.importados || 0} importados`);
    console.log(`📋 Medidas: ${resultMedidas?.importadas || 0} importadas`);
    
    // Atualizar estatísticas
    setTimeout(() => {
      if (typeof verificarDadosSupabase === 'function') {
        verificarDadosSupabase();
      }
    }, 3000);
    
  } catch (error) {
    console.error('❌ Erro na importação:', error);
  }
}

// Exportar funções
window.importarCSVCorreto = executarImportacaoCompleta;
window.importarAlunosCSV = importarAlunosCorretos;
window.importarMedidasCSV = importarMedidasCorretas;

console.log('📋 Script de importação CSV carregado!');
console.log('🔧 Para executar: importarCSVCorreto()');