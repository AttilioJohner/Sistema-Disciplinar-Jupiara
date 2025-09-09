-- Desabilitar RLS na tabela alunos para permitir operações CRUD
-- O sistema usa autenticação local, não autenticação real do Supabase

-- Desabilitar Row Level Security na tabela alunos
ALTER TABLE alunos DISABLE ROW LEVEL SECURITY;

-- Remover todas as políticas existentes que estão bloqueando operações
DROP POLICY IF EXISTS "Permitir leitura para todos os usuários autenticados" ON alunos;
DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados" ON alunos;
DROP POLICY IF EXISTS "Permitir atualização para usuários autenticados" ON alunos;
DROP POLICY IF EXISTS "Permitir exclusão para usuários autenticados" ON alunos;

-- Comentário explicativo
COMMENT ON TABLE alunos IS 'Tabela de alunos com RLS desabilitado - permite CRUD via anon key';

-- Verificar que RLS está desabilitado
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename = 'alunos';