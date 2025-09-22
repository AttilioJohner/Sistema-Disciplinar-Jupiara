-- Adicionar campos de telefone e responsável na tabela alunos
-- Se estes campos não existirem

ALTER TABLE alunos
ADD COLUMN IF NOT EXISTS responsavel VARCHAR(255),
ADD COLUMN IF NOT EXISTS telefone1 VARCHAR(20),
ADD COLUMN IF NOT EXISTS telefone2 VARCHAR(20);

-- Verificar e migrar dados existentes se houver
UPDATE alunos
SET telefone1 = telefone_responsavel
WHERE telefone1 IS NULL AND telefone_responsavel IS NOT NULL;

UPDATE alunos
SET telefone1 = telefone
WHERE telefone1 IS NULL AND telefone IS NOT NULL;

-- Comentários para documentação
COMMENT ON COLUMN alunos.responsavel IS 'Nome do responsável pelo aluno';
COMMENT ON COLUMN alunos.telefone1 IS 'Telefone principal de contato';
COMMENT ON COLUMN alunos.telefone2 IS 'Telefone secundário de contato';