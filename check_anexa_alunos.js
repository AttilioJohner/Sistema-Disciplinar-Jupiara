// Script para verificar alunos da Anexa
const { createClient } = require('@supabase/supabase-js');

// Usar variáveis de ambiente ou valores diretos (NÃO commitar com valores reais)
const SUPABASE_URL = process.env.SUPABASE_URL || 'SUA_URL_AQUI';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'SUA_KEY_AQUI';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function verificarAlunosAnexa() {
  console.log('🔍 Consultando alunos da Anexa...\n');
  
  const { data, error } = await supabase
    .from('alunos')
    .select('codigo, "Nome completo", turma, unidade')
    .eq('unidade', 'Anexa')
    .order('turma', { ascending: true });
  
  if (error) {
    console.error('❌ Erro:', error);
    return;
  }
  
  if (data.length === 0) {
    console.log('✅ Nenhum aluno encontrado na Anexa');
    return;
  }
  
  console.log(`📊 Total de alunos na Anexa: ${data.length}\n`);
  
  // Agrupar por turma
  const porTurma = {};
  data.forEach(aluno => {
    if (!porTurma[aluno.turma]) {
      porTurma[aluno.turma] = [];
    }
    porTurma[aluno.turma].push(aluno);
  });
  
  // Mostrar por turma
  Object.keys(porTurma).sort().forEach(turma => {
    console.log(`\n📚 Turma ${turma} (${porTurma[turma].length} alunos):`);
    porTurma[turma].forEach(aluno => {
      console.log(`  - ${aluno.codigo}: ${aluno['Nome completo']}`);
    });
  });
}

verificarAlunosAnexa();
