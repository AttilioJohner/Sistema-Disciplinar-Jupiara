-- LIMPEZA SEGURA DO SUPABASE - APENAS EVOLUTION API
-- Execute PRIMEIRO o arquivo verificar-supabase.sql para ver o que existe!

-- ⚠️  IMPORTANTE: EXECUTE verificar-supabase.sql PRIMEIRO!
-- ⚠️  Este script só remove tabelas ESPECÍFICAS da Evolution API
-- ⚠️  NÃO TOCA nas suas tabelas do sistema escolar

-- 1. REMOVER APENAS SCHEMA EVOLUTION (se existir)
DROP SCHEMA IF EXISTS evolution CASCADE;

-- 2. REMOVER APENAS TABELAS ESPECÍFICAS DA EVOLUTION API
-- (Apenas se existirem - não afeta outras tabelas)
DROP TABLE IF EXISTS public."Instance" CASCADE;
DROP TABLE IF EXISTS public."Message" CASCADE;
DROP TABLE IF EXISTS public."Contact" CASCADE;
DROP TABLE IF EXISTS public."Chat" CASCADE;
DROP TABLE IF EXISTS public."Webhook" CASCADE;
DROP TABLE IF EXISTS public."Session" CASCADE;
DROP TABLE IF EXISTS public."Setting" CASCADE;
DROP TABLE IF EXISTS public."Integration" CASCADE;
DROP TABLE IF EXISTS public."TypebotSession" CASCADE;
DROP TABLE IF EXISTS public."TypebotSetting" CASCADE;
DROP TABLE IF EXISTS public."Chatwoot" CASCADE;
DROP TABLE IF EXISTS public."Label" CASCADE;
DROP TABLE IF EXISTS public."Media" CASCADE;

-- Variações com nomes diferentes (se existirem)
DROP TABLE IF EXISTS public.instances CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.contacts CASCADE;
DROP TABLE IF EXISTS public.chats CASCADE;
DROP TABLE IF EXISTS public.webhooks CASCADE;
DROP TABLE IF EXISTS public.sessions CASCADE;

-- 3. REMOVER APENAS FUNÇÕES DA EVOLUTION API
-- (Não remove funções do sistema escolar)
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS evolution_trigger_function() CASCADE;

-- 4. VERIFICAR O QUE SOBROU (deve ser só sistema escolar)
SELECT 'TABELAS RESTANTES:' as tipo, table_name as nome
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
UNION ALL
SELECT 'VIEWS RESTANTES:' as tipo, table_name as nome
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY tipo, nome;

-- COMENTÁRIO: TABELAS QUE DEVEM PERMANECER INTACTAS:
-- ✅ alunos
-- ✅ comunicacoes
-- ✅ frequencia
-- ✅ funcionarios
-- ✅ medidas_disciplinares
-- ✅ turmas
-- ✅ Qualquer view ou função do sistema escolar