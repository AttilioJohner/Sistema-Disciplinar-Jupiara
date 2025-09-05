-- =====================================================================
-- VERIFICAR ESTRUTURA DAS TABELAS E CORRIGIR VIEWS
-- Data: 2025-01-04
-- =====================================================================

-- 1) VERIFICAR ESTRUTURA DA TABELA MEDIDAS
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'medidas'
ORDER BY ordinal_position;

-- 2) VERIFICAR ESTRUTURA DA TABELA FREQUENCIA
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'frequencia'
ORDER BY ordinal_position;

-- 3) VERIFICAR ESTRUTURA DA TABELA ALUNOS
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'alunos'
ORDER BY ordinal_position;

-- 4) VER DADOS DE EXEMPLO DAS TABELAS (primeiras 3 linhas)
SELECT 'ALUNOS' as tabela, * FROM public.alunos LIMIT 3;
SELECT 'MEDIDAS' as tabela, * FROM public.medidas LIMIT 3;
SELECT 'FREQUENCIA' as tabela, * FROM public.frequencia LIMIT 3;