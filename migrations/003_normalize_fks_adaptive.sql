-- =====================================================================
-- MIGRATION: Normalizar FKs - VERSÃO ADAPTATIVA
-- Data: 2025-01-04
-- Funciona com qualquer estrutura de colunas existente
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
-- 3) LIMPEZA DE DADOS ÓRFÃOS
-- =====================================================================

-- Contar e limpar registros órfãos
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
  
  RAISE NOTICE 'Órfãos encontrados - Medidas: %, Frequência: %', orphan_medidas, orphan_frequencia;
  
  -- Limpar órfãos
  DELETE FROM public.medidas 
  WHERE codigo_aluno IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM public.alunos a WHERE a.codigo = medidas.codigo_aluno);
  
  DELETE FROM public.frequencia 
  WHERE codigo_aluno IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM public.alunos a WHERE a.codigo = frequencia.codigo_aluno);
    
  RAISE NOTICE 'Órfãos removidos com sucesso';
END$$;

-- =====================================================================
-- 4) CRIAR FOREIGN KEYS COM CASCADE
-- =====================================================================

-- FK para medidas
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.medidas
      ADD CONSTRAINT medidas_codigo_aluno_fkey
      FOREIGN KEY (codigo_aluno) REFERENCES public.alunos(codigo)
      ON UPDATE CASCADE ON DELETE CASCADE;
    RAISE NOTICE '✅ FK medidas criada';
  EXCEPTION 
    WHEN duplicate_object THEN RAISE NOTICE '⚠️ FK medidas já existe';
    WHEN OTHERS THEN RAISE EXCEPTION 'Erro FK medidas: %', SQLERRM;
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
    RAISE NOTICE '✅ FK frequencia criada';
  EXCEPTION 
    WHEN duplicate_object THEN RAISE NOTICE '⚠️ FK frequencia já existe';
    WHEN OTHERS THEN RAISE EXCEPTION 'Erro FK frequencia: %', SQLERRM;
  END;
END$$;

-- =====================================================================
-- 5) CRIAR ÍNDICES
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_medidas_codigo_aluno ON public.medidas(codigo_aluno);
CREATE INDEX IF NOT EXISTS idx_frequencia_codigo_aluno ON public.frequencia(codigo_aluno);

-- =====================================================================
-- 6) TRIGGERS PARA SINCRONIZAÇÃO
-- =====================================================================

-- Trigger para medidas
CREATE OR REPLACE FUNCTION trg_medidas_normaliza_codigo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.codigo_aluno IS NULL AND NEW.codigo_matricula ~ '^\d+$' THEN
    IF EXISTS (SELECT 1 FROM public.alunos WHERE codigo = NEW.codigo_matricula::BIGINT) THEN
      NEW.codigo_aluno := NEW.codigo_matricula::BIGINT;
    END IF;
  END IF;
  IF NEW.codigo_aluno IS NOT NULL AND NEW.codigo_matricula IS NULL THEN
    NEW.codigo_matricula := NEW.codigo_aluno::TEXT;
  END IF;
  RETURN NEW;
END$$;

DROP TRIGGER IF EXISTS medidas_normaliza_codigo ON public.medidas;
CREATE TRIGGER medidas_normaliza_codigo
BEFORE INSERT OR UPDATE ON public.medidas
FOR EACH ROW EXECUTE FUNCTION trg_medidas_normaliza_codigo();

-- Trigger para frequencia
CREATE OR REPLACE FUNCTION trg_frequencia_normaliza_codigo()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.codigo_aluno IS NULL AND NEW.codigo_matricula ~ '^\d+$' THEN
    IF EXISTS (SELECT 1 FROM public.alunos WHERE codigo = NEW.codigo_matricula::BIGINT) THEN
      NEW.codigo_aluno := NEW.codigo_matricula::BIGINT;
    END IF;
  END IF;
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
-- 7) VIEWS BÁSICAS (sem depender de colunas específicas)
-- =====================================================================

-- View de frequência com LEFT JOIN
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

-- =====================================================================
-- 8) VIEW DE MEDIDAS ADAPTATIVA
-- =====================================================================

-- Primeiro, descobrir quais colunas existem em medidas
DO $$
DECLARE
  has_tipo BOOLEAN := FALSE;
  has_medida BOOLEAN := FALSE;
  has_agravante BOOLEAN := FALSE;
  has_atenuante BOOLEAN := FALSE;
  sql_query TEXT;
BEGIN
  -- Verificar se colunas existem
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'medidas' AND column_name = 'tipo'
  ) INTO has_tipo;
  
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'medidas' AND column_name = 'medida'
  ) INTO has_medida;
  
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'medidas' AND column_name = 'agravante'
  ) INTO has_agravante;
  
  SELECT EXISTS(
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'medidas' AND column_name = 'atenuante'
  ) INTO has_atenuante;
  
  -- Criar view baseada nas colunas disponíveis
  sql_query := 'CREATE OR REPLACE VIEW public.v_nota_disciplinar_contadores AS
  WITH medidas_norm AS (
    SELECT 
      COALESCE(m.codigo_aluno, 
               NULLIF(REGEXP_REPLACE(m.codigo_matricula, ''\D'','''',''g''),'''')::BIGINT) AS codigo_aluno_calc,
      m.codigo_matricula';
  
  -- Adicionar colunas condicionalmente
  IF has_tipo THEN
    sql_query := sql_query || ', m.tipo';
  ELSIF has_medida THEN
    sql_query := sql_query || ', m.medida as tipo';
  ELSE
    sql_query := sql_query || ', ''advertencia'' as tipo';
  END IF;
  
  IF has_agravante THEN
    sql_query := sql_query || ', m.agravante';
  ELSE
    sql_query := sql_query || ', false as agravante';
  END IF;
  
  IF has_atenuante THEN
    sql_query := sql_query || ', m.atenuante';
  ELSE
    sql_query := sql_query || ', false as atenuante';
  END IF;
  
  sql_query := sql_query || '
    FROM public.medidas m
  ),
  contadores_base AS (
    SELECT
      a.codigo AS codigo_aluno,
      a."Nome completo" AS nome_completo,
      a.turma,
      COUNT(CASE WHEN mn.tipo = ''advertencia'' THEN 1 END) AS advertencias,
      COUNT(CASE WHEN mn.tipo = ''suspensao'' THEN 1 END) AS suspensoes,
      COUNT(CASE WHEN mn.tipo = ''encaminhamento'' THEN 1 END) AS encaminhamentos,
      SUM(CASE WHEN mn.agravante = true THEN 1 ELSE 0 END) AS total_agravantes,
      SUM(CASE WHEN mn.atenuante = true THEN 1 ELSE 0 END) AS total_atenuantes
    FROM public.alunos a
    LEFT JOIN medidas_norm mn ON mn.codigo_aluno_calc = a.codigo
    GROUP BY a.codigo, a."Nome completo", a.turma
  )
  SELECT 
    *,
    GREATEST(0, 
      10 - 
      (advertencias * 1) - 
      (suspensoes * 2) - 
      (encaminhamentos * 3) -
      (total_agravantes * 0.5) +
      (total_atenuantes * 0.5)
    ) AS nota_disciplinar
  FROM contadores_base';
  
  EXECUTE sql_query;
  RAISE NOTICE '✅ View v_nota_disciplinar_contadores criada';
  
  -- Criar view de nota atual
  EXECUTE 'CREATE OR REPLACE VIEW public.v_nota_disciplinar_atual AS
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
      WHEN nota_disciplinar >= 9 THEN ''Excelente''
      WHEN nota_disciplinar >= 7 THEN ''Bom''
      WHEN nota_disciplinar >= 5 THEN ''Regular''
      WHEN nota_disciplinar >= 3 THEN ''Insatisfatório''
      ELSE ''Crítico''
    END AS classificacao,
    CURRENT_DATE AS data_calculo
  FROM public.v_nota_disciplinar_contadores
  ORDER BY nome_completo';
  
  RAISE NOTICE '✅ View v_nota_disciplinar_atual criada';
  
END$$;

-- =====================================================================
-- 9) VERIFICAÇÃO FINAL
-- =====================================================================

DO $$
DECLARE
  fk_count INTEGER;
  index_count INTEGER;
  view_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO fk_count
  FROM information_schema.table_constraints
  WHERE constraint_type = 'FOREIGN KEY'
    AND table_name IN ('medidas', 'frequencia')
    AND constraint_name LIKE '%codigo_aluno%';
  
  SELECT COUNT(*) INTO index_count
  FROM pg_indexes
  WHERE tablename IN ('medidas', 'frequencia')
    AND indexname LIKE '%codigo_aluno%';
  
  SELECT COUNT(*) INTO view_count
  FROM information_schema.views
  WHERE table_schema = 'public'
    AND table_name LIKE '%nota_disciplinar%' OR table_name LIKE '%frequencia_acumulado%';
  
  RAISE NOTICE '🎉 MIGRATION COMPLETA: % FKs, % índices, % views', fk_count, index_count, view_count;
END$$;

-- =====================================================================
-- FIM DA MIGRATION ADAPTATIVA
-- =====================================================================