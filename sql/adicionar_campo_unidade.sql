-- ========================================
-- ADICIONAR CAMPO UNIDADE À TABELA ALUNOS
-- Sistema de separação Sede/Anexa
-- ========================================

-- 1. Adicionar coluna unidade (se não existir)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name='alunos' AND column_name='unidade'
    ) THEN
        ALTER TABLE alunos ADD COLUMN unidade TEXT DEFAULT 'Sede';
    END IF;
END $$;

-- 2. Atualizar alunos existentes para Sede
UPDATE alunos SET unidade = 'Sede' WHERE unidade IS NULL;

-- 3. Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_alunos_unidade ON alunos(unidade);

-- 4. Identificar turmas da Anexa e atualizar
-- Turmas da Anexa: 6C, 6D, 7C, 7D, 8C, 8D, 9C, 9D, 1B - Adib, 2A
UPDATE alunos
SET unidade = 'Anexa'
WHERE turma IN ('6C', '6D', '7C', '7D', '8C', '8D', '9C', '9D', '1B - Adib', '2A');

-- 5. Verificar resultado
SELECT
    unidade,
    COUNT(*) as total_alunos,
    COUNT(DISTINCT turma) as total_turmas
FROM alunos
GROUP BY unidade
ORDER BY unidade;

-- ========================================
-- INSTRUÇÕES DE USO:
-- ========================================
-- 1. Execute este script no SQL Editor do Supabase
-- 2. Verifique os resultados da query SELECT final
-- 3. Todos os alunos existentes serão marcados como "Sede"
-- 4. Novos alunos das turmas listadas serão automaticamente "Anexa"
-- ========================================

COMMENT ON COLUMN alunos.unidade IS 'Unidade escolar: Sede ou Anexa';
