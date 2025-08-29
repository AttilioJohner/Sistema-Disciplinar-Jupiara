import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const env = (window.__ENV||{});
if(!env.SUPABASE_URL||!env.SUPABASE_ANON_KEY){
  console.warn("Supabase env ausente em config.js");
}
export const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
