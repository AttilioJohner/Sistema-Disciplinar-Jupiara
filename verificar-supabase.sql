-- VERIFICAÇÃO SEGURA DO QUE EXISTE NO SUPABASE
-- Execute primeiro para ver o que temos antes de deletar

-- 1. LISTAR TODOS OS SCHEMAS
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast')
ORDER BY schema_name;

-- 2. LISTAR TODAS AS TABELAS NO SCHEMA PUBLIC
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 3. LISTAR TODAS AS VIEWS NO SCHEMA PUBLIC
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- 4. LISTAR FUNÇÕES CUSTOMIZADAS
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name NOT LIKE 'pg_%'
ORDER BY routine_name;

-- 5. VERIFICAR SE EXISTE SCHEMA EVOLUTION
SELECT EXISTS (
    SELECT 1
    FROM information_schema.schemata
    WHERE schema_name = 'evolution'
) as schema_evolution_exists;

-- 6. MOSTRAR TABELAS QUE PODEM SER DA EVOLUTION API
-- (Começam com maiúscula ou contêm palavras relacionadas)
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
AND (
    table_name ~ '^[A-Z]' OR
    table_name ILIKE '%instance%' OR
    table_name ILIKE '%message%' OR
    table_name ILIKE '%contact%' OR
    table_name ILIKE '%chat%' OR
    table_name ILIKE '%webhook%' OR
    table_name ILIKE '%session%' OR
    table_name ILIKE '%integration%' OR
    table_name ILIKE '%typebot%' OR
    table_name ILIKE '%chatwoot%'
)
ORDER BY table_name;