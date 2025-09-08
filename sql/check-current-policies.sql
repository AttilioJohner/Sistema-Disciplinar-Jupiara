-- Script para verificar políticas RLS atuais antes de fazer alterações

-- Ver todas as políticas existentes para tabelas principais
SELECT 
    schemaname,
    tablename, 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename IN ('alunos', 'medidas', 'frequencia', 'notas', 'pais_responsaveis', 'aluno_responsavel')
ORDER BY tablename, policyname;

-- Ver se RLS está habilitado nas tabelas
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename IN ('alunos', 'medidas', 'frequencia', 'notas', 'pais_responsaveis', 'aluno_responsavel')
ORDER BY tablename;