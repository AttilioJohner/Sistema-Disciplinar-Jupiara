-- =====================================================================
-- MIGRATION: Normalizar FKs entre alunos, medidas e frequencia
-- Data: 2025-01-04
-- Versão: FIXED - Remove órfãos antes de criar FKs
-- =====================================================================

-- =====================================================================
-- 1) MEDIDAS: Adicionar coluna canônica + backfill
-- =====================================================================

-- Adicionar coluna codigo_aluno se não existir
ALTER TABLE public.medidas
  ADD COLUMN IF NOT EXISTS codigo_aluno BIGINT;

-- Backfill: converter codigo_matricula numérico para codigo_aluno
UPDATE public.medidas
SET codigo_aluno = NULLIF(REGEXP_REPLACE(codigo_matricula, '\D','','g'),'')::BIGINT
WHERE codigo_aluno IS NULL
  AND codigo_matricula ~ '^\d+$';

-- =====================================================================
-- 2) FREQUENCIA: Adicionar coluna canônica + backfill
-- =====================================================================

-- Adicionar coluna codigo_aluno se não existir
ALTER TABLE public.frequencia
  ADD COLUMN IF NOT EXISTS codigo_aluno BIGINT;

-- Backfill: converter codigo_matricula numérico para codigo_aluno
UPDATE public.frequencia
SET codigo_aluno = NULLIF(REGEXP_REPLACE(codigo_matricula, '\D','','g'),'')::BIGINT
WHERE codigo_aluno IS NULL
  AND codigo_matricula ~ '^\d+$';

-- =====================================================================
-- 3) LIMPEZA DE DADOS ÓRFÃOS (IMPORTANTE - antes de criar FKs)
-- =====================================================================

-- Contar registros órfãos para log
DO $$
DECLARE
  orphan_medidas INTEGER;
  orphan_frequencia INTEGER;
BEGIN
  SELECT COUNT(*) INTO orphan_medidas
  FROM public.medidas m
  WHERE m.codigo_aluno IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM public.alunos a WHERE a.codigo = m.codigo_aluno);
  
  SELECT COUNT(*) INTO orphan_frequencia
  FROM public.frequencia f
  WHERE f.codigo_aluno IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM public.alunos a WHERE a.codigo = f.codigo_aluno);
  
  RAISE NOTICE 'Registros órfãos encontrados - Medidas: %, Frequência: %', orphan_medidas, orphan_frequencia;
END$$;

-- Opção 1: Limpar registros órfãos (RECOMENDADO)
-- Remove registros de medidas sem aluno correspondente
DELETE FROM public.medidas 
WHERE codigo_aluno IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM public.alunos a WHERE a.codigo = medidas.codigo_aluno);

-- Remove registros de frequência sem aluno correspondente
DELETE FROM public.frequencia 
WHERE codigo_aluno IS NOT NULL 
  AND NOT EXISTS (SELECT 1 FROM public.alunos a WHERE a.codigo = frequencia.codigo_aluno);

-- Opção 2: Anular código de alunos órfãos (alternativa mais conservadora)
-- UPDATE public.medidas 
-- SET codigo_aluno = NULL
-- WHERE codigo_aluno IS NOT NULL 
--   AND NOT EXISTS (SELECT 1 FROM public.alunos a WHERE a.codigo = medidas.codigo_aluno);

-- UPDATE public.frequencia 
-- SET codigo_aluno = NULL
-- WHERE codigo_aluno IS NOT NULL 
--   AND NOT EXISTS (SELECT 1 FROM public.alunos a WHERE a.codigo = frequencia.codigo_aluno);

-- =====================================================================
-- 4) CRIAR FOREIGN KEYS COM CASCADE (agora sem órfãos)
-- =====================================================================

-- FK para medidas
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.medidas
      ADD CONSTRAINT medidas_codigo_aluno_fkey
      FOREIGN KEY (codigo_aluno) REFERENCES public.alunos(codigo)
      ON UPDATE CASCADE ON DELETE CASCADE;
    RAISE NOTICE 'FK medidas_codigo_aluno_fkey criada com sucesso';
  EXCEPTION 
    WHEN duplicate_object THEN 
      RAISE NOTICE 'FK medidas_codigo_aluno_fkey já existe';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Erro ao criar FK em medidas: %', SQLERRM;
  END;
END$$;

-- FK para frequencia
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.frequencia
      ADD CONSTRAINT frequencia_codigo_aluno_fkey
      FOREIGN KEY (codigo_aluno) REFERENCES public.alunos(codigo)
      ON UPDATE CASCADE ON DELETE CASCADE;
    RAISE NOTICE 'FK frequencia_codigo_aluno_fkey criada com sucesso';
  EXCEPTION 
    WHEN duplicate_object THEN 
      RAISE NOTICE 'FK frequencia_codigo_aluno_fkey já existe';
    WHEN OTHERS THEN
      RAISE EXCEPTION 'Erro ao criar FK em frequencia: %', SQLERRM;
  END;
END$$;

-- =====================================================================
-- 5) CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_medidas_codigo_aluno ON public.medidas(codigo_aluno);
CREATE INDEX IF NOT EXISTS idx_frequencia_codigo_aluno ON public.frequencia(codigo_aluno);

-- =====================================================================
-- 6) CRIAR TRIGGERS PARA SINCRONIZAÇÃO
-- =====================================================================

-- Trigger para medidas: normalizar codigo_matricula numérico para codigo_aluno
CREATE OR REPLACE FUNCTION trg_medidas_normaliza_codigo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Se codigo_aluno não foi fornecido mas codigo_matricula é numérico, preencher
  IF NEW.codigo_aluno IS NULL AND NEW.codigo_matricula ~ '^\d+$' THEN
    -- Verificar se o aluno existe antes de criar a relação
    IF EXISTS (SELECT 1 FROM public.alunos WHERE codigo = NEW.codigo_matricula::BIGINT) THEN
      NEW.codigo_aluno := NEW.codigo_matricula::BIGINT;
    END IF;
  END IF;
  -- Se codigo_aluno foi fornecido mas codigo_matricula não, sincronizar
  IF NEW.codigo_aluno IS NOT NULL AND NEW.codigo_matricula IS NULL THEN
    NEW.codigo_matricula := NEW.codigo_aluno::TEXT;
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS medidas_normaliza_codigo ON public.medidas;
CREATE TRIGGER medidas_normaliza_codigo
BEFORE INSERT OR UPDATE ON public.medidas
FOR EACH ROW EXECUTE FUNCTION trg_medidas_normaliza_codigo();

-- Trigger para frequencia: normalizar codigo_matricula numérico para codigo_aluno
CREATE OR REPLACE FUNCTION trg_frequencia_normaliza_codigo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  -- Se codigo_aluno não foi fornecido mas codigo_matricula é numérico, preencher
  IF NEW.codigo_aluno IS NULL AND NEW.codigo_matricula ~ '^\d+$' THEN
    -- Verificar se o aluno existe antes de criar a relação
    IF EXISTS (SELECT 1 FROM public.alunos WHERE codigo = NEW.codigo_matricula::BIGINT) THEN
      NEW.codigo_aluno := NEW.codigo_matricula::BIGINT;
    END IF;
  END IF;
  -- Se codigo_aluno foi fornecido mas codigo_matricula não, sincronizar
  IF NEW.codigo_aluno IS NOT NULL AND NEW.codigo_matricula IS NULL THEN
    NEW.codigo_matricula := NEW.codigo_aluno::TEXT;
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS frequencia_normaliza_codigo ON public.frequencia;
CREATE TRIGGER frequencia_normaliza_codigo
BEFORE INSERT OR UPDATE ON public.frequencia
FOR EACH ROW EXECUTE FUNCTION trg_frequencia_normaliza_codigo();

-- =====================================================================
-- 7) CRIAR/ATUALIZAR VIEWS
-- =====================================================================

-- View de acumulado de frequência incluindo alunos sem lançamentos
CREATE OR REPLACE VIEW public.v_frequencia_acumulado_aluno_full AS
WITH agg AS (
  SELECT
    f.codigo_aluno,
    COUNT(*) AS total_registros,
    SUM(CASE WHEN f.status = 'P' THEN 1 ELSE 0 END) AS presencas_puras,
    SUM(CASE WHEN f.status = 'A' THEN 1 ELSE 0 END) AS atestados,
    SUM(CASE WHEN f.status = 'F' THEN 1 ELSE 0 END) AS faltas,
    SUM(CASE WHEN f.status IN ('P','A') THEN 1 ELSE 0 END) AS presencas_operacionais
  FROM public.frequencia f
  WHERE f.codigo_aluno IS NOT NULL
  GROUP BY f.codigo_aluno
)
SELECT
  a.codigo AS codigo_aluno,
  a."Nome completo" AS nome_completo,
  a.turma,
  COALESCE(ag.total_registros, 0) AS total_registros,
  COALESCE(ag.presencas_puras, 0) AS presencas_puras,
  COALESCE(ag.atestados, 0) AS atestados,
  COALESCE(ag.faltas, 0) AS faltas,
  COALESCE(ag.presencas_operacionais, 0) AS presencas_operacionais,
  CASE 
    WHEN COALESCE(ag.total_registros, 0) = 0 THEN 0
    ELSE ROUND(100.0 * ag.presencas_operacionais::NUMERIC / ag.total_registros, 2)
  END AS pct_presenca_operacional
FROM public.alunos a
LEFT JOIN agg ag ON ag.codigo_aluno = a.codigo
ORDER BY a."Nome completo";

-- Atualizar view de nota disciplinar para usar codigo_aluno
CREATE OR REPLACE VIEW public.v_nota_disciplinar_contadores AS
WITH medidas_norm AS (
  SELECT 
    COALESCE(m.codigo_aluno, 
             NULLIF(REGEXP_REPLACE(m.codigo_matricula, '\D','','g'),'')::BIGINT) AS codigo_aluno_calc,
    m.codigo_matricula,
    m.tipo,
    m.data_ocorrencia,
    m.descricao,
    m.agravante,
    m.atenuante
  FROM public.medidas m
),
contadores_base AS (
  SELECT
    a.codigo AS codigo_aluno,
    a."Nome completo" AS nome_completo,
    a.turma,
    COUNT(CASE WHEN mn.tipo = 'advertencia' THEN 1 END) AS advertencias,
    COUNT(CASE WHEN mn.tipo = 'suspensao' THEN 1 END) AS suspensoes,
    COUNT(CASE WHEN mn.tipo = 'encaminhamento' THEN 1 END) AS encaminhamentos,
    SUM(CASE WHEN mn.agravante = true THEN 1 ELSE 0 END) AS total_agravantes,
    SUM(CASE WHEN mn.atenuante = true THEN 1 ELSE 0 END) AS total_atenuantes
  FROM public.alunos a
  LEFT JOIN medidas_norm mn ON mn.codigo_aluno_calc = a.codigo
  GROUP BY a.codigo, a."Nome completo", a.turma
)
SELECT 
  *,
  -- Cálculo da nota disciplinar
  GREATEST(0, 
    10 - 
    (advertencias * 1) - 
    (suspensoes * 2) - 
    (encaminhamentos * 3) -
    (total_agravantes * 0.5) +
    (total_atenuantes * 0.5)
  ) AS nota_disciplinar
FROM contadores_base;

-- View de nota disciplinar atual
CREATE OR REPLACE VIEW public.v_nota_disciplinar_atual AS
SELECT 
  codigo_aluno,
  nome_completo,
  turma,
  advertencias,
  suspensoes,
  encaminhamentos,
  total_agravantes,
  total_atenuantes,
  nota_disciplinar,
  CASE 
    WHEN nota_disciplinar >= 9 THEN 'Excelente'
    WHEN nota_disciplinar >= 7 THEN 'Bom'
    WHEN nota_disciplinar >= 5 THEN 'Regular'
    WHEN nota_disciplinar >= 3 THEN 'Insatisfatório'
    ELSE 'Crítico'
  END AS classificacao,
  CURRENT_DATE AS data_calculo
FROM public.v_nota_disciplinar_contadores
ORDER BY nome_completo;

-- =====================================================================
-- 8) VERIFICAÇÃO FINAL
-- =====================================================================

DO $$
DECLARE
  fk_count INTEGER;
  index_count INTEGER;
  view_count INTEGER;
BEGIN
  -- Verificar FKs criadas
  SELECT COUNT(*) INTO fk_count
  FROM information_schema.table_constraints
  WHERE constraint_type = 'FOREIGN KEY'
    AND table_name IN ('medidas', 'frequencia')
    AND constraint_name LIKE '%codigo_aluno%';
  
  -- Verificar índices criados
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename IN ('medidas', 'frequencia')
    AND indexname LIKE '%codigo_aluno%';
  
  -- Verificar views criadas
  SELECT COUNT(*) INTO view_count
  FROM information_schema.views
  WHERE table_schema = 'public'
    AND table_name IN ('v_frequencia_acumulado_aluno_full', 'v_nota_disciplinar_contadores', 'v_nota_disciplinar_atual');
  
  RAISE NOTICE '✅ Migration concluída: % FKs, % índices, % views', fk_count, index_count, view_count;
END$$;

-- =====================================================================
-- FIM DA MIGRATION
-- =====================================================================