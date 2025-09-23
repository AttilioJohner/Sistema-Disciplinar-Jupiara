-- EXPORT SIMPLES - APENAS O ESSENCIAL
-- Execute no Supabase SQL Editor

-- 1. SCHEMAS
SELECT 'SCHEMAS:' as info;
SELECT schema_name FROM information_schema.schemata
WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
ORDER BY schema_name;

-- 2. TABELAS NO PUBLIC
SELECT '' as separator, 'TABELAS PUBLIC:' as info;
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 3. VIEWS NO PUBLIC
SELECT '' as separator, 'VIEWS PUBLIC:' as info;
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- 4. FUNÇÕES CUSTOMIZADAS
SELECT '' as separator, 'FUNÇÕES:' as info;
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name NOT LIKE 'pg_%'
ORDER BY routine_name;

-- 5. TABELAS QUE PODEM SER DA EVOLUTION
SELECT '' as separator, 'POSSÍVEIS TABELAS EVOLUTION:' as info;
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND (
    table_name ~ '^[A-Z]' OR
    table_name ILIKE '%instance%' OR
    table_name ILIKE '%message%' OR
    table_name ILIKE '%evolution%'
)
ORDER BY table_name;