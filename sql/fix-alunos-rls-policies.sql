-- Corrigir políticas RLS para tabela alunos
-- Permitir operações CRUD para usuários autenticados

-- Remover políticas existentes que podem estar conflitando
DROP POLICY IF EXISTS "Permitir leitura para todos os usuários autenticados" ON alunos;
DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados" ON alunos;
DROP POLICY IF EXISTS "Permitir atualização para usuários autenticados" ON alunos;
DROP POLICY IF EXISTS "Permitir exclusão para usuários autenticados" ON alunos;

-- Recriar políticas simples e funcionais
CREATE POLICY "Permitir leitura para usuários autenticados" 
ON alunos FOR SELECT 
TO authenticated 
USING (true);

CREATE POLICY "Permitir inserção para usuários autenticados" 
ON alunos FOR INSERT 
TO authenticated 
WITH CHECK (true);

CREATE POLICY "Permitir atualização para usuários autenticados" 
ON alunos FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);

CREATE POLICY "Permitir exclusão para usuários autenticados" 
ON alunos FOR DELETE 
TO authenticated 
USING (true);

-- Garantir que RLS está habilitado
ALTER TABLE alunos ENABLE ROW LEVEL SECURITY;

-- Comentário explicativo
COMMENT ON TABLE alunos IS 'Tabela de alunos com RLS habilitado - permite CRUD para usuários autenticados';