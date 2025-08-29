import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const env = (window.__ENV || {});
if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
  console.warn("Supabase env ausente em config.js / env-config.js");
}

// Garante apenas 1 cliente Supabase no navegador
if (!window.__supabase) {
  window.__supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}
export const supabase = window.__supabase;
