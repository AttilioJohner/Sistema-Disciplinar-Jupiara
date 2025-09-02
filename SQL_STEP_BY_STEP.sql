-- Execute uma linha por vez para identificar onde está o erro

-- PASSO 1: Tabela básica
CREATE TABLE ficai_providencias (
    id SERIAL PRIMARY KEY,
    codigo_matricula VARCHAR(50) NOT NULL,
    nome_completo VARCHAR(255) NOT NULL
);

-- PASSO 2: Se passo 1 funcionar, adicione mais campos
ALTER TABLE ficai_providencias ADD COLUMN turma VARCHAR(100) NOT NULL;
ALTER TABLE ficai_providencias ADD COLUMN mes_referencia VARCHAR(7) NOT NULL;
ALTER TABLE ficai_providencias ADD COLUMN status_ficai VARCHAR(50);
ALTER TABLE ficai_providencias ADD COLUMN providencias TEXT;

-- PASSO 3: Se passo 2 funcionar, adicione campos de data
ALTER TABLE ficai_providencias ADD COLUMN data_abertura_ficai DATE DEFAULT CURRENT_DATE;
ALTER TABLE ficai_providencias ADD COLUMN prazo_resposta DATE;
ALTER TABLE ficai_providencias ADD COLUMN data_resolucao DATE;

-- PASSO 4: Adicionar timestamps
ALTER TABLE ficai_providencias ADD COLUMN criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW();
ALTER TABLE ficai_providencias ADD COLUMN atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- PASSO 5: Adicionar constraint único
ALTER TABLE ficai_providencias ADD CONSTRAINT uk_ficai_codigo_mes UNIQUE(codigo_matricula, mes_referencia);