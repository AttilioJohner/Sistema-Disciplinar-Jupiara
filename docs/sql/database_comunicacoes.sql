-- ===============================================================================
-- ESTRUTURA DE BANCO - SISTEMA DE COMUNICAÇÕES WHATSAPP
-- Escola Estadual Cívico-Militar Jupiara
-- ===============================================================================

-- 1. TABELA PRINCIPAL DE COMUNICAÇÕES
-- ===============================================================================
CREATE TABLE comunicacoes_whatsapp (
    id SERIAL PRIMARY KEY,
    
    -- Dados do aluno
    aluno_codigo VARCHAR(7) NOT NULL,
    aluno_nome VARCHAR(255) NOT NULL,
    turma VARCHAR(10) NOT NULL,
    
    -- Tipo e detalhes da comunicação
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('falta', 'medida')),
    descricao TEXT,
    
    -- Dados de contato
    telefone VARCHAR(20),
    telefone_formatado VARCHAR(25), -- Para (+55 66 99999-9999)
    
    -- Conteúdo da mensagem
    mensagem TEXT,
    template_usado VARCHAR(50),
    
    -- Status e controle
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'enviando', 'enviado', 'erro', 'cancelado')),
    metodo_envio VARCHAR(20) DEFAULT 'link' CHECK (metodo_envio IN ('link', 'evolution', 'twilio')),
    
    -- Datas importantes
    data_ocorrencia DATE NOT NULL,
    data_envio TIMESTAMP,
    data_criacao TIMESTAMP DEFAULT NOW(),
    data_atualizacao TIMESTAMP DEFAULT NOW(),
    
    -- Metadados para debugging
    tentativas_envio INTEGER DEFAULT 0,
    ultimo_erro TEXT,
    response_api JSONB,
    
    -- Campos de auditoria
    criado_por VARCHAR(100),
    ip_origem INET
);

-- 2. ÍNDICES PARA PERFORMANCE
-- ===============================================================================
CREATE INDEX idx_comunicacoes_data_ocorrencia ON comunicacoes_whatsapp(data_ocorrencia);
CREATE INDEX idx_comunicacoes_status ON comunicacoes_whatsapp(status);
CREATE INDEX idx_comunicacoes_aluno ON comunicacoes_whatsapp(aluno_codigo);
CREATE INDEX idx_comunicacoes_tipo ON comunicacoes_whatsapp(tipo);
CREATE INDEX idx_comunicacoes_turma ON comunicacoes_whatsapp(turma);
CREATE INDEX idx_comunicacoes_data_envio ON comunicacoes_whatsapp(data_envio);

-- Índice composto para consultas mais comuns
CREATE INDEX idx_comunicacoes_status_data ON comunicacoes_whatsapp(status, data_ocorrencia);

-- 3. FUNÇÃO PARA ATUALIZAR data_atualizacao
-- ===============================================================================
CREATE OR REPLACE FUNCTION update_comunicacoes_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.data_atualizacao = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. TRIGGER PARA AUTO-UPDATE DE TIMESTAMP
-- ===============================================================================
CREATE TRIGGER trigger_update_comunicacoes_timestamp
    BEFORE UPDATE ON comunicacoes_whatsapp
    FOR EACH ROW
    EXECUTE FUNCTION update_comunicacoes_timestamp();

-- 5. FUNÇÃO PARA FORMATAR TELEFONE BRASILEIRO
-- ===============================================================================
CREATE OR REPLACE FUNCTION formatar_telefone_brasileiro(telefone TEXT)
RETURNS TEXT AS $$
DECLARE
    digitos TEXT;
BEGIN
    -- Remove tudo que não é número
    digitos := regexp_replace(telefone, '[^0-9]', '', 'g');
    
    -- Se tem 11 dígitos (formato completo com DDD e 9)
    IF length(digitos) = 11 THEN
        RETURN '+55 ' || substring(digitos, 1, 2) || ' ' || 
               substring(digitos, 3, 1) || ' ' || 
               substring(digitos, 4, 4) || '-' || 
               substring(digitos, 8, 4);
    
    -- Se tem 10 dígitos (sem o 9)
    ELSIF length(digitos) = 10 THEN
        RETURN '+55 ' || substring(digitos, 1, 2) || ' 9' || 
               substring(digitos, 3, 4) || '-' || 
               substring(digitos, 7, 4);
    
    -- Retorna original se não conseguir formatar
    ELSE
        RETURN telefone;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. TRIGGER PARA FORMATAR TELEFONE AUTOMATICAMENTE
-- ===============================================================================
CREATE OR REPLACE FUNCTION auto_formatar_telefone()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.telefone IS NOT NULL THEN
        NEW.telefone_formatado := formatar_telefone_brasileiro(NEW.telefone);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_formatar_telefone
    BEFORE INSERT OR UPDATE ON comunicacoes_whatsapp
    FOR EACH ROW
    EXECUTE FUNCTION auto_formatar_telefone();

-- 7. VIEW PARA ESTATÍSTICAS DIÁRIAS
-- ===============================================================================
CREATE VIEW v_comunicacoes_estatisticas_diarias AS
SELECT 
    data_ocorrencia,
    COUNT(*) as total_comunicacoes,
    COUNT(*) FILTER (WHERE tipo = 'falta') as total_faltas,
    COUNT(*) FILTER (WHERE tipo = 'medida') as total_medidas,
    COUNT(*) FILTER (WHERE status = 'pendente') as pendentes,
    COUNT(*) FILTER (WHERE status = 'enviado') as enviados,
    COUNT(*) FILTER (WHERE status = 'erro') as com_erro,
    ROUND(
        COUNT(*) FILTER (WHERE status = 'enviado')::numeric / 
        NULLIF(COUNT(*), 0) * 100, 2
    ) as taxa_sucesso_pct
FROM comunicacoes_whatsapp
GROUP BY data_ocorrencia
ORDER BY data_ocorrencia DESC;

-- 8. VIEW PARA RELATÓRIO POR TURMA
-- ===============================================================================
CREATE VIEW v_comunicacoes_por_turma AS
SELECT 
    turma,
    COUNT(*) as total_comunicacoes,
    COUNT(*) FILTER (WHERE tipo = 'falta') as total_faltas,
    COUNT(*) FILTER (WHERE tipo = 'medida') as total_medidas,
    COUNT(*) FILTER (WHERE status = 'enviado') as enviados,
    COUNT(DISTINCT aluno_codigo) as alunos_comunicados,
    MAX(data_ocorrencia) as ultima_comunicacao
FROM comunicacoes_whatsapp
WHERE data_ocorrencia >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY turma
ORDER BY total_comunicacoes DESC;

-- 9. VIEW PARA COMUNICAÇÕES PENDENTES DE HOJE
-- ===============================================================================
CREATE VIEW v_comunicacoes_pendentes_hoje AS
SELECT 
    id,
    aluno_codigo,
    aluno_nome,
    turma,
    tipo,
    descricao,
    telefone,
    telefone_formatado,
    status,
    data_ocorrencia,
    tentativas_envio
FROM comunicacoes_whatsapp
WHERE data_ocorrencia = CURRENT_DATE
  AND status IN ('pendente', 'erro')
ORDER BY 
    CASE WHEN tipo = 'medida' THEN 1 ELSE 2 END, -- Medidas têm prioridade
    data_criacao ASC;

-- 10. FUNÇÃO PARA REGISTRAR COMUNICAÇÃO AUTOMÁTICA
-- ===============================================================================
CREATE OR REPLACE FUNCTION registrar_comunicacao(
    p_aluno_codigo VARCHAR(7),
    p_aluno_nome VARCHAR(255),
    p_turma VARCHAR(10),
    p_tipo VARCHAR(20),
    p_descricao TEXT DEFAULT NULL,
    p_telefone VARCHAR(20) DEFAULT NULL,
    p_data_ocorrencia DATE DEFAULT CURRENT_DATE
)
RETURNS INTEGER AS $$
DECLARE
    comunicacao_id INTEGER;
BEGIN
    INSERT INTO comunicacoes_whatsapp (
        aluno_codigo,
        aluno_nome,
        turma,
        tipo,
        descricao,
        telefone,
        data_ocorrencia,
        status
    ) VALUES (
        p_aluno_codigo,
        p_aluno_nome,
        p_turma,
        p_tipo,
        p_descricao,
        p_telefone,
        p_data_ocorrencia,
        'pendente'
    )
    RETURNING id INTO comunicacao_id;
    
    RETURN comunicacao_id;
END;
$$ LANGUAGE plpgsql;

-- 11. FUNÇÃO PARA MARCAR COMO ENVIADO
-- ===============================================================================
CREATE OR REPLACE FUNCTION marcar_comunicacao_enviada(
    p_id INTEGER,
    p_metodo_envio VARCHAR(20) DEFAULT 'evolution',
    p_response_api JSONB DEFAULT NULL
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE comunicacoes_whatsapp 
    SET 
        status = 'enviado',
        data_envio = NOW(),
        metodo_envio = p_metodo_envio,
        response_api = p_response_api,
        tentativas_envio = tentativas_envio + 1
    WHERE id = p_id;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- 12. RLS (ROW LEVEL SECURITY) CONFIGURAÇÃO
-- ===============================================================================
ALTER TABLE comunicacoes_whatsapp ENABLE ROW LEVEL SECURITY;

-- Política para usuários autenticados (professores/coordenação)
CREATE POLICY "Usuários autenticados podem gerenciar comunicações"
ON comunicacoes_whatsapp
FOR ALL 
TO authenticated
USING (true)
WITH CHECK (true);

-- Política para acesso público às views (somente leitura)
CREATE POLICY "Views públicas somente leitura"
ON comunicacoes_whatsapp
FOR SELECT
TO anon
USING (false); -- Nenhum acesso anônimo por enquanto

-- 13. DADOS DE EXEMPLO PARA DESENVOLVIMENTO
-- ===============================================================================
INSERT INTO comunicacoes_whatsapp (
    aluno_codigo,
    aluno_nome,
    turma,
    tipo,
    descricao,
    telefone,
    data_ocorrencia,
    status
) VALUES 
    ('2025001', 'João Silva Santos', '1A', 'falta', 'Falta não justificada', '(66) 99999-9999', CURRENT_DATE, 'pendente'),
    ('2025002', 'Maria Oliveira Costa', '2B', 'medida', 'Advertência verbal - Conversa em sala', '(66) 88888-8888', CURRENT_DATE, 'pendente'),
    ('2025003', 'Pedro Almeida Souza', '3C', 'falta', 'Falta justificada', '(66) 77777-7777', CURRENT_DATE - 1, 'enviado'),
    ('2025004', 'Ana Carolina Lima', '1A', 'medida', 'Suspensão de 1 dia', '(66) 66666-6666', CURRENT_DATE - 1, 'enviado');

-- 14. COMENTÁRIOS NA TABELA
-- ===============================================================================
COMMENT ON TABLE comunicacoes_whatsapp IS 'Registro de todas as comunicações WhatsApp enviadas aos pais/responsáveis';
COMMENT ON COLUMN comunicacoes_whatsapp.aluno_codigo IS 'Código único do aluno (matrícula)';
COMMENT ON COLUMN comunicacoes_whatsapp.tipo IS 'Tipo: falta ou medida disciplinar';
COMMENT ON COLUMN comunicacoes_whatsapp.status IS 'Status: pendente, enviando, enviado, erro, cancelado';
COMMENT ON COLUMN comunicacoes_whatsapp.metodo_envio IS 'Método: link, evolution, twilio';
COMMENT ON COLUMN comunicacoes_whatsapp.telefone_formatado IS 'Telefone no formato: +55 66 9 9999-9999';

-- ===============================================================================
-- FINAL DO SCRIPT
-- Execute este script no SQL Editor do Supabase para criar toda a estrutura
-- ===============================================================================