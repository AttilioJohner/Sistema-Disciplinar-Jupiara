-- Adicionar campo para foto 3x4 do aluno
ALTER TABLE alunos 
ADD COLUMN IF NOT EXISTS foto_url TEXT;