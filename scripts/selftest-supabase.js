import { fetchAlunos, fetchMedidas, fetchFrequencia } from './dataAdapter.supabase.js';

export async function selfTestSupabase(){
  const a = await fetchAlunos({ page:1, pageSize:1 });
  const m = await fetchMedidas({ page:1, pageSize:1 });
  const f = await fetchFrequencia({ page:1, pageSize:1 });
  console.log('[SELFTEST] alunos:', a?.error ?? 'ok', a?.count);
  console.log('[SELFTEST] medidas:', m?.error ?? 'ok', m?.count);
  console.log('[SELFTEST] frequencia:', f?.error ?? 'ok', f?.count);
}
