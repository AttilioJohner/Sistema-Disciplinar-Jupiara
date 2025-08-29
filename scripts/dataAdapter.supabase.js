import { supabase } from './supabaseClient.js';

/**
 * Mapeamento Supabase (nomes reais):
 * alunos: "código (matrícula)", "Nome completo", turma, responsável, "Telefone do responsável", "Telefone do responsável 2"
 * frequencia: id, codigo_matricula, nome_completo, turma, data, status, criado_em
 * medidas: id, codigo_matricula, nome_completo, turma, data, especificacao, observacao, tipo_medida, criado_em
 */

// === Alunos ===
export async function fetchAlunos({ turma = null, search = null, page = 1, pageSize = 25 } = {}) {
  let q = supabase.from('alunos').select(`
    "código (matrícula)",
    "Nome completo",
    turma,
    responsável,
    "Telefone do responsável",
    "Telefone do responsável 2"
  `, { count: 'exact' });

  if (turma) q = q.eq('turma', turma);
  if (search) q = q.ilike('Nome completo', `%${search}%`);
  q = q.order('Nome completo', { ascending: true });

  const from = (page - 1) * pageSize, to = from + pageSize - 1;
  const { data: rows, error, count } = await q.range(from, to);
  if (error) { console.error('[fetchAlunos]', error); return { data: [], error, count: 0 }; }
  return { data: rows, error: null, count };
}

// === Medidas ===
export async function fetchMedidas({ codigo_matricula = null, turma = null, dataDe = null, dataAte = null, page = 1, pageSize = 25 } = {}) {
  let q = supabase.from('medidas').select('*', { count: 'exact' });

  if (codigo_matricula) q = q.eq('codigo_matricula', codigo_matricula);
  if (turma) q = q.eq('turma', turma);
  if (dataDe) q = q.gte('data', dataDe);
  if (dataAte) q = q.lte('data', dataAte);
  q = q.order('data', { ascending: false });

  const from = (page - 1) * pageSize, to = from + pageSize - 1;
  const { data: rows, error, count } = await q.range(from, to);
  if (error) { console.error('[fetchMedidas]', error); return { data: [], error, count: 0 }; }
  return { data: rows, error: null, count };
}

// === Frequência ===
export async function fetchFrequencia({ turma = null, data = null, page = 1, pageSize = 25 } = {}) {
  let q = supabase.from('frequencia').select('*', { count: 'exact' });

  if (turma) q = q.eq('turma', turma);
  if (data) q = q.eq('data', data);
  q = q.order('data', { ascending: false });

  const from = (page - 1) * pageSize, to = from + pageSize - 1;
  const { data: rows, error, count } = await q.range(from, to);
  if (error) { console.error('[fetchFrequencia]', error); return { data: [], error, count: 0 }; }
  return { data: rows, error: null, count };
}
