-- TABELA DE BOLETIM ESCOLAR
-- Sistema Disciplinar EECM Jupiara

CREATE TABLE IF NOT EXISTS boletim (
  id SERIAL PRIMARY KEY,
  aluno_codigo TEXT NOT NULL,
  aluno_nome TEXT NOT NULL,
  turma TEXT NOT NULL,
  ano_letivo INTEGER NOT NULL DEFAULT 2025,
  bimestre INTEGER NOT NULL CHECK (bimestre >= 1 AND bimestre <= 4),
  materia TEXT NOT NULL,
  nota DECIMAL(4,2) NOT NULL CHECK (nota >= 0 AND nota <= 10),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by TEXT,
  updated_by TEXT,

  -- Índices para melhor performance
  CONSTRAINT unique_nota UNIQUE (aluno_codigo, ano_letivo, bimestre, materia)
);

-- Índices para consultas rápidas
CREATE INDEX IF NOT EXISTS idx_boletim_aluno ON boletim(aluno_codigo);
CREATE INDEX IF NOT EXISTS idx_boletim_turma ON boletim(turma);
CREATE INDEX IF NOT EXISTS idx_boletim_bimestre ON boletim(bimestre);
CREATE INDEX IF NOT EXISTS idx_boletim_ano ON boletim(ano_letivo);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_boletim_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_boletim_updated_at
BEFORE UPDATE ON boletim
FOR EACH ROW
EXECUTE FUNCTION update_boletim_updated_at();

-- Comentários da tabela
COMMENT ON TABLE boletim IS 'Tabela para armazenar notas do boletim escolar dos alunos';
COMMENT ON COLUMN boletim.aluno_codigo IS 'Código de matrícula do aluno';
COMMENT ON COLUMN boletim.aluno_nome IS 'Nome completo do aluno';
COMMENT ON COLUMN boletim.turma IS 'Turma do aluno';
COMMENT ON COLUMN boletim.ano_letivo IS 'Ano letivo da nota';
COMMENT ON COLUMN boletim.bimestre IS 'Bimestre (1 a 4)';
COMMENT ON COLUMN boletim.materia IS 'Nome da matéria';
COMMENT ON COLUMN boletim.nota IS 'Nota do aluno (0.00 a 10.00)';
COMMENT ON COLUMN boletim.created_by IS 'Usuário que criou o registro';
COMMENT ON COLUMN boletim.updated_by IS 'Último usuário que atualizou o registro';
