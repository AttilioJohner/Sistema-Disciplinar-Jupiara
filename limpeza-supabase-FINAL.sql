-- LIMPEZA FINAL DO SUPABASE
-- REMOVE APENAS O LIXO DA EVOLUTION API
-- PRESERVA 100% DO SISTEMA ESCOLAR

-- ⚠️  LEIA ANTES DE EXECUTAR:
-- ✅ Remove schema 'evolution' INTEIRO (todo lixo da API)
-- ✅ Remove apenas tabelas de teste/prisma do public
-- ✅ PRESERVA todas as tabelas do sistema escolar
-- ✅ PRESERVA todos os schemas do Supabase

-- =============================================
-- 1. REMOVER SCHEMA EVOLUTION COMPLETO
-- =============================================
-- Este schema contém APENAS lixo da Evolution API
-- 47 tabelas que não servem para nada no seu sistema
DROP SCHEMA IF EXISTS evolution CASCADE;

-- =============================================
-- 2. REMOVER APENAS LIXO DO SCHEMA PUBLIC
-- =============================================

-- Tabela de migrações do Prisma (desnecessária)
DROP TABLE IF EXISTS public._prisma_migrations CASCADE;

-- Tabela de teste (desnecessária)
DROP TABLE IF EXISTS public.test_ficai CASCADE;

-- Audit log (pode ser da Evolution - remover se não usar)
-- DESCOMENTE APENAS se você NÃO usa logs de auditoria:
-- DROP TABLE IF EXISTS public.audit_log CASCADE;

-- =============================================
-- 3. VERIFICAR O QUE SOBROU (deve ser só o essencial)
-- =============================================
SELECT
    'TABELAS RESTANTES NO PUBLIC:' as info,
    table_name as nome,
    'Linhas aproximadas: ' || COALESCE(
        (SELECT n_tup_ins FROM pg_stat_user_tables
         WHERE schemaname = 'public' AND relname = t.table_name), 0
    ) as detalhes
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- =============================================
-- 4. SCHEMAS RESTANTES (deve incluir seu sistema)
-- =============================================
SELECT
    'SCHEMAS RESTANTES:' as info,
    schema_name as nome,
    CASE
        WHEN schema_name = 'public' THEN '← SEU SISTEMA ESCOLAR'
        WHEN schema_name = 'auth' THEN '← AUTENTICAÇÃO SUPABASE'
        WHEN schema_name = 'storage' THEN '← ARQUIVOS SUPABASE'
        WHEN schema_name = 'realtime' THEN '← REALTIME SUPABASE'
        ELSE '← SISTEMA SUPABASE'
    END as descricao
FROM information_schema.schemata
WHERE schema_name NOT IN (
    'information_schema', 'pg_catalog', 'pg_toast',
    'pg_temp_1', 'pg_toast_temp_1'
)
ORDER BY schema_name;

-- =============================================
-- RESULTADO ESPERADO:
-- =============================================
-- ✅ Schema 'evolution' removido (47 tabelas lixo)
-- ✅ Apenas 2-3 tabelas removidas do public
-- ✅ Sistema escolar 100% preservado:
--     - alunos
--     - frequencia
--     - medidas
--     - responsaveis
--     - responsavel_aluno
--     - usuarios_sistema
--     - ficai_providencias
-- ✅ Todos os schemas Supabase preservados

COMMENT ON SCHEMA public IS 'Schema principal - Sistema Escolar Jupiara - LIMPO';

-- =============================================
-- SPACE SAVINGS:
-- Removendo schema 'evolution' você vai liberar:
-- - 47 tabelas complexas
-- - Centenas de índices
-- - Triggers e funções
-- - Muito espaço em disco
-- =============================================