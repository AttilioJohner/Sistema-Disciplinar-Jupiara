-- ==========================================
-- MIGRATION: Configurar Supabase Storage para PDFs
-- Data: 2025-10-29
-- Descrição: Cria bucket e policies para armazenar PDFs de medidas disciplinares
-- ==========================================

-- 1. CRIAR BUCKET PARA ARMAZENAR PDFS
-- =====================================

-- Inserir bucket se não existir (usando INSERT com ON CONFLICT)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'medidas-pdfs',
    'medidas-pdfs',
    false, -- Bucket privado (requer autenticação)
    10485760, -- 10MB de limite por arquivo
    ARRAY['application/pdf']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- 2. POLÍTICAS DE ACESSO (RLS - Row Level Security)
-- ==================================================

-- Permitir que usuários autenticados façam UPLOAD de PDFs
-- (inspetores podem criar novos documentos)
CREATE POLICY IF NOT EXISTS "Usuários autenticados podem fazer upload"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'medidas-pdfs');

-- Permitir que usuários autenticados LEIAM os PDFs
-- (visualizar documentos existentes)
CREATE POLICY IF NOT EXISTS "Usuários autenticados podem ler PDFs"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'medidas-pdfs');

-- Permitir que usuários autenticados ATUALIZEM PDFs
-- (útil para regeração de documentos)
CREATE POLICY IF NOT EXISTS "Usuários autenticados podem atualizar PDFs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'medidas-pdfs');

-- Permitir que usuários autenticados DELETEM PDFs
-- (apenas em casos especiais, ex: documento incorreto)
CREATE POLICY IF NOT EXISTS "Usuários autenticados podem deletar PDFs"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'medidas-pdfs');

-- 3. ADICIONAR CAMPO PARA CONTROLAR DISPOSIÇÕES FINAIS
-- =====================================================

-- Adicionar coluna disposicoes_finais se não existir
ALTER TABLE medidas
ADD COLUMN IF NOT EXISTS disposicoes_finais TEXT;

COMMENT ON COLUMN medidas.disposicoes_finais IS 'Disposições finais e orientações geradas pela IA';

-- 4. FUNÇÃO AUXILIAR PARA GERAR CAMINHO DO PDF NO STORAGE
-- =========================================================

CREATE OR REPLACE FUNCTION gerar_caminho_pdf(
    p_tipo VARCHAR(10),
    p_codigo_aluno BIGINT,
    p_ano INTEGER DEFAULT EXTRACT(YEAR FROM NOW())
)
RETURNS TEXT AS $$
DECLARE
    v_timestamp TEXT;
BEGIN
    -- Gerar timestamp único
    v_timestamp := TO_CHAR(NOW(), 'YYYYMMDD_HH24MISS');

    -- Retornar caminho: medidas-pdfs/2025/FMD/FMD_2557498_20251029_143022.pdf
    RETURN p_ano || '/' || p_tipo || '/' || p_tipo || '_' || p_codigo_aluno || '_' || v_timestamp || '.pdf';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION gerar_caminho_pdf IS 'Gera caminho estruturado para armazenar PDFs no Storage';

-- 5. EXEMPLO DE USO
-- ==================

-- Gerar caminho para armazenar PDF:
-- SELECT gerar_caminho_pdf('FMD', 2557498);
-- Retorna: 2025/FMD/FMD_2557498_20251029_143022.pdf

-- Listar todos os PDFs no bucket:
-- SELECT * FROM storage.objects WHERE bucket_id = 'medidas-pdfs';

-- Obter URL pública (autenticada) de um PDF:
-- SELECT storage.get_public_url('medidas-pdfs', 'caminho/do/arquivo.pdf');

-- ==========================================
-- FIM DA MIGRATION
-- ==========================================
