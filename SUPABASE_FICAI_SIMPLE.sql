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