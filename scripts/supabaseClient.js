// scripts/supabaseClient.js
// Usar jsDelivr por causa da CSP do site
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const env = (window.__ENV || {});
if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) {
  console.warn("[Supabase] Env ausente em config.js / env-config.js");
}

// Singleton: garante apenas 1 client no browser
if (!window.__supabase) {
  window.__supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
}
export const supabase = window.__supabase;
