CREATE TABLE IF NOT EXISTS ficai_providencias (
    id SERIAL PRIMARY KEY,
    codigo_matricula VARCHAR(50) NOT NULL,
    nome_completo VARCHAR(255) NOT NULL,
    turma VARCHAR(100) NOT NULL,
    mes_referencia VARCHAR(7) NOT NULL,
    status_ficai VARCHAR(50),
    providencias TEXT,
    data_abertura_ficai DATE DEFAULT CURRENT_DATE,
    prazo_resposta DATE,
    data_resolucao DATE,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(codigo_matricula, mes_referencia)
);

CREATE INDEX idx_ficai_codigo_mes ON ficai_providencias(codigo_matricula, mes_referencia);
CREATE INDEX idx_ficai_status ON ficai_providencias(status_ficai);
CREATE INDEX idx_ficai_turma ON ficai_providencias(turma);

CREATE OR REPLACE FUNCTION update_ficai_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = NOW();
    
    IF NEW.status_ficai = 'aguardando' AND (OLD.status_ficai IS NULL OR OLD.status_ficai != 'aguardando') THEN
        NEW.prazo_resposta = NEW.data_abertura_ficai + INTERVAL '30 days';
    END IF;
    
    IF NEW.status_ficai = 'resolvido' AND (OLD.status_ficai IS NULL OR OLD.status_ficai != 'resolvido') THEN
        NEW.data_resolucao = CURRENT_DATE;
    END IF;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS trigger_update_ficai_timestamp ON ficai_providencias;
CREATE TRIGGER trigger_update_ficai_timestamp
    BEFORE UPDATE ON ficai_providencias
    FOR EACH ROW
    EXECUTE FUNCTION update_ficai_updated_at();