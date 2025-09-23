-- EXPORT COMPLETO DA ESTRUTURA DO SUPABASE
-- Execute este comando no SQL Editor do Supabase e copie TODA a saída

-- =============================================
-- 1. TODOS OS SCHEMAS
-- =============================================
SELECT '=== SCHEMAS ===' as section, NULL as name, NULL as type, NULL as definition
UNION ALL
SELECT 'SCHEMA' as section, schema_name as name, 'schema' as type, NULL as definition
FROM information_schema.schemata
WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1')
ORDER BY section DESC, name;

-- =============================================
-- 2. TODAS AS TABELAS COM DETALHES
-- =============================================
SELECT '=== TABELAS ===' as section, NULL as name, NULL as type, NULL as definition
UNION ALL
SELECT 'TABLE' as section,
       schemaname || '.' || tablename as name,
       'table' as type,
       'Rows: ' || COALESCE(n_tup_ins::text, '0') as definition
FROM pg_stat_user_tables
ORDER BY section DESC, name;

-- =============================================
-- 3. TODAS AS VIEWS
-- =============================================
SELECT '=== VIEWS ===' as section, NULL as name, NULL as type, NULL as definition
UNION ALL
SELECT 'VIEW' as section,
       table_schema || '.' || table_name as name,
       'view' as type,
       LEFT(REPLACE(view_definition, CHR(10), ' '), 100) as definition
FROM information_schema.views
WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
ORDER BY section DESC, name;

-- =============================================
-- 4. TODAS AS FUNÇÕES CUSTOMIZADAS
-- =============================================
SELECT '=== FUNCTIONS ===' as section, NULL as name, NULL as type, NULL as definition
UNION ALL
SELECT 'FUNCTION' as section,
       routine_schema || '.' || routine_name as name,
       routine_type as type,
       LEFT(COALESCE(routine_definition, 'No definition'), 100) as definition
FROM information_schema.routines
WHERE routine_schema NOT IN ('information_schema', 'pg_catalog')
AND routine_name NOT LIKE 'pg_%'
ORDER BY section DESC, name;

-- =============================================
-- 5. TRIGGERS
-- =============================================
SELECT '=== TRIGGERS ===' as section, NULL as name, NULL as type, NULL as definition
UNION ALL
SELECT 'TRIGGER' as section,
       trigger_schema || '.' || trigger_name as name,
       'trigger' as type,
       event_object_table as definition
FROM information_schema.triggers
WHERE trigger_schema NOT IN ('information_schema', 'pg_catalog')
ORDER BY section DESC, name;

-- =============================================
-- 6. COLUNAS DAS TABELAS PRINCIPAIS
-- =============================================
SELECT '=== COLUMNS ===' as section, NULL as name, NULL as type, NULL as definition
UNION ALL
SELECT 'COLUMN' as section,
       table_schema || '.' || table_name || '.' || column_name as name,
       data_type as type,
       CASE WHEN is_nullable = 'YES' then 'NULL' else 'NOT NULL' END as definition
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY section DESC, table_name, ordinal_position;

-- =============================================
-- 7. INDICES
-- =============================================
SELECT '=== INDEXES ===' as section, NULL as name, NULL as type, NULL as definition
UNION ALL
SELECT 'INDEX' as section,
       schemaname || '.' || indexname as name,
       'index' as type,
       tablename as definition
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY section DESC, name;

-- =============================================
-- 8. SEQUÊNCIAS
-- =============================================
SELECT '=== SEQUENCES ===' as section, NULL as name, NULL as type, NULL as definition
UNION ALL
SELECT 'SEQUENCE' as section,
       sequence_schema || '.' || sequence_name as name,
       'sequence' as type,
       'Start: ' || start_value::text || ' Current: ' || COALESCE(last_value::text, 'Unknown') as definition
FROM information_schema.sequences s
LEFT JOIN pg_sequences ps ON s.sequence_name = ps.sequencename
WHERE sequence_schema = 'public'
ORDER BY section DESC, name;