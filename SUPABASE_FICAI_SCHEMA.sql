-- Esquema para tabela de Providências FICAI no Supabase
-- Execute este script no SQL Editor do Supabase

-- Tabela para armazenar as providências tomadas para cada aluno
CREATE TABLE IF NOT EXISTS ficai_providencias (
    id SERIAL PRIMARY KEY,
    codigo_matricula VARCHAR(50) NOT NULL,
    nome_completo VARCHAR(255) NOT NULL,
    turma VARCHAR(100) NOT NULL,
    mes_referencia VARCHAR(7) NOT NULL,
    
    status_ficai VARCHAR(50) DEFAULT NULL,
    providencias TEXT,
    
    data_abertura_ficai DATE DEFAULT CURRENT_DATE,
    prazo_resposta DATE,
    data_resolucao DATE DEFAULT NULL,
    
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(codigo_matricula, mes_referencia)
);

-- Índices para otimizar consultas
CREATE INDEX IF NOT EXISTS idx_ficai_codigo_mes ON ficai_providencias(codigo_matricula, mes_referencia);
CREATE INDEX IF NOT EXISTS idx_ficai_status ON ficai_providencias(status_ficai);
CREATE INDEX IF NOT EXISTS idx_ficai_turma ON ficai_providencias(turma);
CREATE INDEX IF NOT EXISTS idx_ficai_prazo ON ficai_providencias(prazo_resposta);

-- Trigger para atualizar automaticamente os campos
CREATE OR REPLACE FUNCTION update_ficai_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    
    -- Calcular prazo automaticamente quando status for 'aguardando'
    IF NEW.status_ficai = 'aguardando' AND (OLD.status_ficai IS NULL OR OLD.status_ficai != 'aguardando') THEN
        NEW.prazo_resposta = NEW.data_abertura_ficai + INTERVAL '30 days';
    END IF;
    
    -- Marcar data de resolução quando status for 'resolvido'
    IF NEW.status_ficai = 'resolvido' AND (OLD.status_ficai IS NULL OR OLD.status_ficai != 'resolvido') THEN
        NEW.data_resolucao = CURRENT_DATE;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Aplicar trigger na tabela
DROP TRIGGER IF EXISTS trigger_update_ficai_timestamp ON ficai_providencias;
CREATE TRIGGER trigger_update_ficai_timestamp
    BEFORE UPDATE ON ficai_providencias
    FOR EACH ROW
    EXECUTE FUNCTION update_ficai_updated_at();

-- Comentários para documentação
COMMENT ON TABLE ficai_providencias IS 'Tabela para registrar providências e acompanhamento de casos FICAI';
COMMENT ON COLUMN ficai_providencias.codigo_matricula IS 'Código de matrícula do aluno';
COMMENT ON COLUMN ficai_providencias.mes_referencia IS 'Mês de referência da análise no formato YYYY-MM';
COMMENT ON COLUMN ficai_providencias.status_ficai IS 'Status atual do processo FICAI: aguardando, resolvido, cancelado, conselho';
COMMENT ON COLUMN ficai_providencias.providencias IS 'Descrição das providências tomadas pela escola';
COMMENT ON COLUMN ficai_providencias.prazo_resposta IS 'Prazo legal para resposta da família calculado automaticamente';