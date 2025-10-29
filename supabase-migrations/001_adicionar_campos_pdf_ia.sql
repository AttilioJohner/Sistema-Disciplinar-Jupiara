-- ==========================================
-- MIGRATION: Adicionar campos para PDF e IA
-- Data: 2025-10-29
-- Descrição: Adiciona colunas na tabela medidas para suporte a IA e geração de PDF
-- ==========================================

-- 1. ADICIONAR COLUNAS NA TABELA MEDIDAS (se não existirem)
-- ============================================================

-- Campo: Descrição completa do fato (escrita pelo inspetor)
ALTER TABLE medidas
ADD COLUMN IF NOT EXISTS fato_original TEXT;

-- Campo: Texto corrigido e formalizado pela IA
ALTER TABLE medidas
ADD COLUMN IF NOT EXISTS fato_corrigido TEXT;

-- Campo: Artigos do regulamento aplicáveis (array de strings)
ALTER TABLE medidas
ADD COLUMN IF NOT EXISTS artigos_aplicaveis TEXT[];

-- Campo: Texto da seção "FUNDAMENTO" gerado pela IA
ALTER TABLE medidas
ADD COLUMN IF NOT EXISTS fundamento_legal TEXT;

-- Campo: Tipo de documento (FMD, FO, etc)
ALTER TABLE medidas
ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(10) DEFAULT 'FMD'
CHECK (tipo_documento IN ('FMD', 'FO'));

-- Campo: Turno do aluno (Matutino/Vespertino)
ALTER TABLE medidas
ADD COLUMN IF NOT EXISTS turno VARCHAR(20)
CHECK (turno IN ('Matutino', 'Vespertino', 'Integral'));

-- Campo: Nome do inspetor responsável
ALTER TABLE medidas
ADD COLUMN IF NOT EXISTS inspetor_responsavel VARCHAR(255);

-- Campo: Status da geração do documento
ALTER TABLE medidas
ADD COLUMN IF NOT EXISTS status_documento VARCHAR(30) DEFAULT 'rascunho'
CHECK (status_documento IN ('rascunho', 'revisao', 'finalizado', 'assinado'));

-- Campo: Histórico de interações com a IA (JSON)
ALTER TABLE medidas
ADD COLUMN IF NOT EXISTS ia_historico JSONB DEFAULT '[]'::jsonb;

-- Campo: Data/hora de geração do PDF
ALTER TABLE medidas
ADD COLUMN IF NOT EXISTS pdf_gerado_em TIMESTAMP;

-- Campo: URL do PDF no Supabase Storage
ALTER TABLE medidas
ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- ==================================

-- Índice para buscar por tipo de documento
CREATE INDEX IF NOT EXISTS idx_medidas_tipo_documento
ON medidas(tipo_documento);

-- Índice para buscar por status
CREATE INDEX IF NOT EXISTS idx_medidas_status_documento
ON medidas(status_documento);

-- Índice para buscar por inspetor
CREATE INDEX IF NOT EXISTS idx_medidas_inspetor
ON medidas(inspetor_responsavel);

-- Índice para buscar documentos com PDF gerado
CREATE INDEX IF NOT EXISTS idx_medidas_pdf_url
ON medidas(pdf_url) WHERE pdf_url IS NOT NULL;

-- 3. CRIAR TABELA DE DOCUMENTOS PDF (histórico de versões)
-- =========================================================

CREATE TABLE IF NOT EXISTS documentos_pdf (
    id BIGSERIAL PRIMARY KEY,
    medida_id BIGINT REFERENCES medidas(id) ON DELETE CASCADE,

    -- Informações do documento
    tipo_documento VARCHAR(10) NOT NULL CHECK (tipo_documento IN ('FMD', 'FO')),
    numero_documento VARCHAR(50), -- Número sequencial: FMD-2025-001

    -- Dados do aluno (snapshot para auditoria)
    codigo_matricula BIGINT NOT NULL,
    nome_aluno VARCHAR(255) NOT NULL,
    turma VARCHAR(50),
    turno VARCHAR(20),

    -- Conteúdo do documento
    fato_descrito TEXT NOT NULL,
    artigos_aplicados TEXT[],
    fundamento TEXT,

    -- Arquivo PDF
    pdf_url TEXT NOT NULL,
    pdf_tamanho_bytes INTEGER,
    pdf_hash VARCHAR(64), -- SHA-256 do arquivo para integridade

    -- Assinaturas
    assinado_aluno BOOLEAN DEFAULT FALSE,
    assinado_responsavel BOOLEAN DEFAULT FALSE,
    assinado_diretor BOOLEAN DEFAULT FALSE,
    data_assinatura_aluno TIMESTAMP,
    data_assinatura_responsavel TIMESTAMP,
    data_assinatura_diretor TIMESTAMP,

    -- Metadados
    versao INTEGER DEFAULT 1,
    is_versao_atual BOOLEAN DEFAULT TRUE,
    criado_por VARCHAR(255), -- Email/ID do inspetor
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    -- Auditoria
    observacoes TEXT
);

-- 4. CRIAR ÍNDICES NA TABELA DOCUMENTOS_PDF
-- ==========================================

-- Índice para buscar documentos de uma medida
CREATE INDEX IF NOT EXISTS idx_documentos_medida_id
ON documentos_pdf(medida_id);

-- Índice para buscar por aluno
CREATE INDEX IF NOT EXISTS idx_documentos_codigo_matricula
ON documentos_pdf(codigo_matricula);

-- Índice para buscar versão atual
CREATE INDEX IF NOT EXISTS idx_documentos_versao_atual
ON documentos_pdf(is_versao_atual) WHERE is_versao_atual = TRUE;

-- Índice para buscar por número do documento
CREATE INDEX IF NOT EXISTS idx_documentos_numero
ON documentos_pdf(numero_documento);

-- Índice para buscar por tipo
CREATE INDEX IF NOT EXISTS idx_documentos_tipo
ON documentos_pdf(tipo_documento);

-- 5. TRIGGER PARA ATUALIZAR CAMPO UPDATED_AT
-- ===========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger na tabela documentos_pdf
DROP TRIGGER IF EXISTS set_updated_at ON documentos_pdf;
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON documentos_pdf
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. FUNCTION PARA GERAR NÚMERO SEQUENCIAL DE DOCUMENTO
-- ======================================================

CREATE OR REPLACE FUNCTION gerar_numero_documento(
    p_tipo VARCHAR(10),
    p_ano INTEGER DEFAULT EXTRACT(YEAR FROM NOW())
)
RETURNS VARCHAR(50) AS $$
DECLARE
    v_contador INTEGER;
    v_numero_formatado VARCHAR(50);
BEGIN
    -- Buscar o maior número do ano atual para o tipo
    SELECT COALESCE(MAX(
        CAST(
            SUBSTRING(numero_documento FROM '\\d+$') AS INTEGER
        )
    ), 0) + 1
    INTO v_contador
    FROM documentos_pdf
    WHERE tipo_documento = p_tipo
      AND numero_documento LIKE p_tipo || '-' || p_ano || '-%';

    -- Formatar: FMD-2025-001, FO-2025-042, etc
    v_numero_formatado := p_tipo || '-' || p_ano || '-' || LPAD(v_contador::TEXT, 3, '0');

    RETURN v_numero_formatado;
END;
$$ LANGUAGE plpgsql;

-- 7. COMENTÁRIOS NAS COLUNAS (DOCUMENTAÇÃO)
-- ==========================================

COMMENT ON COLUMN medidas.fato_original IS 'Descrição original escrita pelo inspetor';
COMMENT ON COLUMN medidas.fato_corrigido IS 'Texto corrigido e formalizado pela IA';
COMMENT ON COLUMN medidas.artigos_aplicaveis IS 'Array de artigos do regulamento (ex: ["Art. 6º", "Anexo I-56"])';
COMMENT ON COLUMN medidas.fundamento_legal IS 'Texto completo da seção FUNDAMENTO gerado pela IA';
COMMENT ON COLUMN medidas.tipo_documento IS 'Tipo de documento: FMD (Ficha de Medida Disciplinar) ou FO (Fato Observado)';
COMMENT ON COLUMN medidas.turno IS 'Turno do aluno: Matutino, Vespertino ou Integral';
COMMENT ON COLUMN medidas.inspetor_responsavel IS 'Nome do inspetor que registrou a medida';
COMMENT ON COLUMN medidas.status_documento IS 'Status: rascunho, revisao, finalizado, assinado';
COMMENT ON COLUMN medidas.ia_historico IS 'Histórico de sugestões da IA para auditoria (JSON)';
COMMENT ON COLUMN medidas.pdf_gerado_em IS 'Data/hora em que o PDF foi gerado';
COMMENT ON COLUMN medidas.pdf_url IS 'URL do PDF no Supabase Storage';

COMMENT ON TABLE documentos_pdf IS 'Histórico de documentos PDF gerados (FMD, FO) com versionamento';
COMMENT ON COLUMN documentos_pdf.numero_documento IS 'Número sequencial único: FMD-2025-001';
COMMENT ON COLUMN documentos_pdf.pdf_hash IS 'Hash SHA-256 do arquivo para verificação de integridade';
COMMENT ON COLUMN documentos_pdf.versao IS 'Número da versão do documento (caso seja regerado)';
COMMENT ON COLUMN documentos_pdf.is_versao_atual IS 'TRUE apenas para a versão mais recente';

-- 8. EXEMPLO DE USO
-- ==================

-- Gerar número de documento:
-- SELECT gerar_numero_documento('FMD'); -- Retorna: FMD-2025-001

-- Buscar medidas pendentes de geração de PDF:
-- SELECT * FROM medidas WHERE pdf_url IS NULL AND status_documento = 'finalizado';

-- Buscar todos os documentos de um aluno:
-- SELECT * FROM documentos_pdf WHERE codigo_matricula = 2557498 ORDER BY created_at DESC;

-- ==========================================
-- FIM DA MIGRATION
-- ==========================================
