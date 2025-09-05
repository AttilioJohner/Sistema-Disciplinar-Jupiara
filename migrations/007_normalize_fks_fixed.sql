-- =====================================================================
-- MIGRATION: Normalizar FKs - VERSÃO SEM ERROS DE SINTAXE
-- Data: 2025-01-04
-- CORRIGIDO: RAISE NOTICE dentro de blocos DO $$
-- =====================================================================

-- =====================================================================
-- 1) ADICIONAR COLUNAS codigo_aluno
-- =====================================================================

ALTER TABLE public.medidas
  ADD COLUMN IF NOT EXISTS codigo_aluno BIGINT;

ALTER TABLE public.frequencia
  ADD COLUMN IF NOT EXISTS codigo_aluno BIGINT;

-- =====================================================================
-- 2) BACKFILL - Preencher codigo_aluno
-- =====================================================================

UPDATE public.medidas
SET codigo_aluno = NULLIF(REGEXP_REPLACE(codigo_matricula, '\D','','g'),'')::BIGINT
WHERE codigo_aluno IS NULL
  AND codigo_matricula ~ '^\d+$';

UPDATE public.frequencia
SET codigo_aluno = NULLIF(REGEXP_REPLACE(codigo_matricula, '\D','','g'),'')::BIGINT
WHERE codigo_aluno IS NULL
  AND codigo_matricula ~ '^\d+$';

-- =====================================================================
-- 3) LIMPEZA DE ÓRFÃOS
-- =====================================================================

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
  
  DELETE FROM public.medidas 
  WHERE codigo_aluno IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM public.alunos a WHERE a.codigo = medidas.codigo_aluno);
  
  DELETE FROM public.frequencia 
  WHERE codigo_aluno IS NOT NULL 
    AND NOT EXISTS (SELECT 1 FROM public.alunos a WHERE a.codigo = frequencia.codigo_aluno);
    
  RAISE NOTICE 'Órfãos removidos';
END$$;

-- =====================================================================
-- 4) CRIAR FOREIGN KEYS COM CASCADE
-- =====================================================================

DO $$
BEGIN
  BEGIN
    ALTER TABLE public.medidas
      ADD CONSTRAINT medidas_codigo_aluno_fkey
      FOREIGN KEY (codigo_aluno) REFERENCES public.alunos(codigo)
      ON UPDATE CASCADE ON DELETE CASCADE;
    RAISE NOTICE 'FK medidas_codigo_aluno_fkey criada';
  EXCEPTION 
    WHEN duplicate_object THEN RAISE NOTICE 'FK medidas já existe';
    WHEN OTHERS THEN RAISE EXCEPTION 'Erro FK medidas: %', SQLERRM;
  END;
END$$;

DO $$
BEGIN
  BEGIN
    ALTER TABLE public.frequencia
      ADD CONSTRAINT frequencia_codigo_aluno_fkey
      FOREIGN KEY (codigo_aluno) REFERENCES public.alunos(codigo)
      ON UPDATE CASCADE ON DELETE CASCADE;
    RAISE NOTICE 'FK frequencia_codigo_aluno_fkey criada';
  EXCEPTION 
    WHEN duplicate_object THEN RAISE NOTICE 'FK frequencia já existe';
    WHEN OTHERS THEN RAISE EXCEPTION 'Erro FK frequencia: %', SQLERRM;
  END;
END$$;

-- =====================================================================
-- 5) CRIAR ÍNDICES
-- =====================================================================

CREATE INDEX IF NOT EXISTS idx_medidas_codigo_aluno ON public.medidas(codigo_aluno);
CREATE INDEX IF NOT EXISTS idx_frequencia_codigo_aluno ON public.frequencia(codigo_aluno);
CREATE INDEX IF NOT EXISTS idx_medidas_tipo_medida ON public.medidas(tipo_medida);
CREATE INDEX IF NOT EXISTS idx_frequencia_status ON public.frequencia(status);

-- =====================================================================
-- 6) TRIGGERS PARA SINCRONIZAÇÃO
-- =====================================================================

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
-- 7) VIEW DE FREQUÊNCIA COM LEFT JOIN
-- =====================================================================

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
-- 8) VIEWS DE MEDIDAS - MANTENDO TIPOS ORIGINAIS
-- =====================================================================

-- View de contadores por tipo EXATO (sem mapeamento)
CREATE OR REPLACE VIEW public.v_medidas_por_tipo AS
WITH medidas_norm AS (
  SELECT 
    COALESCE(m.codigo_aluno, 
             NULLIF(REGEXP_REPLACE(m.codigo_matricula, '\D','','g'),'')::BIGINT) AS codigo_aluno_calc,
    m.codigo_matricula,
    m.tipo_medida,
    m.data,
    m.especificacao,
    m.observacao
  FROM public.medidas m
)
SELECT
  a.codigo AS codigo_aluno,
  a."Nome completo" AS nome_completo,
  a.turma,
  COUNT(CASE WHEN mn.tipo_medida = 'Fato Observado Negativo' THEN 1 END) AS fatos_observados_negativos,
  COUNT(CASE WHEN mn.tipo_medida ILIKE '%advertencia%' THEN 1 END) AS advertencias,
  COUNT(CASE WHEN mn.tipo_medida ILIKE '%suspens%' THEN 1 END) AS suspensoes,
  COUNT(CASE WHEN mn.tipo_medida ILIKE '%encaminhamento%' THEN 1 END) AS encaminhamentos,
  COUNT(mn.codigo_aluno_calc) AS total_medidas
FROM public.alunos a
LEFT JOIN medidas_norm mn ON mn.codigo_aluno_calc = a.codigo
GROUP BY a.codigo, a."Nome completo", a.turma;

-- View detalhada de medidas por aluno
CREATE OR REPLACE VIEW public.v_medidas_detalhadas AS
SELECT 
  a.codigo AS codigo_aluno,
  a."Nome completo" AS nome_completo,
  a.turma,
  m.id AS medida_id,
  m.data,
  m.tipo_medida,
  m.especificacao,
  m.observacao,
  m.criado_em
FROM public.alunos a
LEFT JOIN public.medidas m ON m.codigo_aluno = a.codigo
ORDER BY a."Nome completo", m.data DESC;

-- View resumo com contadores simples
CREATE OR REPLACE VIEW public.v_resumo_disciplinar AS
SELECT 
  a.codigo AS codigo_aluno,
  a."Nome completo" AS nome_completo,
  a.turma,
  COUNT(m.id) AS total_ocorrencias,
  COUNT(DISTINCT m.tipo_medida) AS tipos_diferentes,
  array_agg(DISTINCT m.tipo_medida ORDER BY m.tipo_medida) FILTER (WHERE m.tipo_medida IS NOT NULL) AS tipos_registrados,
  MAX(m.data) AS ultima_ocorrencia
FROM public.alunos a
LEFT JOIN public.medidas m ON m.codigo_aluno = a.codigo
GROUP BY a.codigo, a."Nome completo", a.turma
ORDER BY a."Nome completo";

-- =====================================================================
-- 9) VERIFICAÇÃO FINAL
-- =====================================================================

DO $$
DECLARE
  fk_count INTEGER;
  view_count INTEGER;
  total_alunos INTEGER;
  total_medidas INTEGER;
  total_frequencia INTEGER;
  medidas_with_fk INTEGER;
  frequencia_with_fk INTEGER;
BEGIN
  SELECT COUNT(*) INTO fk_count
  FROM information_schema.table_constraints
  WHERE constraint_type = 'FOREIGN KEY'
    AND table_name IN ('medidas', 'frequencia')
    AND constraint_name LIKE '%codigo_aluno%';
  
  SELECT COUNT(*) INTO view_count
  FROM information_schema.views
  WHERE table_schema = 'public'
    AND (table_name LIKE '%medidas%' OR table_name LIKE '%frequencia_acumulado%' OR table_name LIKE '%resumo_disciplinar%');
  
  SELECT COUNT(*) INTO total_alunos FROM public.alunos;
  SELECT COUNT(*) INTO total_medidas FROM public.medidas;
  SELECT COUNT(*) INTO total_frequencia FROM public.frequencia;
  
  SELECT COUNT(*) INTO medidas_with_fk FROM public.medidas WHERE codigo_aluno IS NOT NULL;
  SELECT COUNT(*) INTO frequencia_with_fk FROM public.frequencia WHERE codigo_aluno IS NOT NULL;
  
  RAISE NOTICE '';
  RAISE NOTICE '🎉 MIGRATION CONCLUÍDA - TIPOS ORIGINAIS MANTIDOS!';
  RAISE NOTICE '';
  RAISE NOTICE 'ESTRUTURA:';
  RAISE NOTICE '├── Foreign Keys: %', fk_count;
  RAISE NOTICE '└── Views: %', view_count;
  RAISE NOTICE '';
  RAISE NOTICE 'DADOS:';
  RAISE NOTICE '├── Alunos: %', total_alunos;
  RAISE NOTICE '├── Medidas: % (% com FK)', total_medidas, medidas_with_fk;
  RAISE NOTICE '└── Frequência: % (% com FK)', total_frequencia, frequencia_with_fk;
  RAISE NOTICE '';
  RAISE NOTICE 'VIEWS DISPONÍVEIS:';
  RAISE NOTICE '├── v_frequencia_acumulado_aluno_full';
  RAISE NOTICE '├── v_medidas_por_tipo (mantém "Fato Observado Negativo")';
  RAISE NOTICE '├── v_medidas_detalhadas';
  RAISE NOTICE '└── v_resumo_disciplinar';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANTE: Tipos de medida mantidos EXATOS!';
  RAISE NOTICE '- "Fato Observado Negativo" permanece inalterado';
  RAISE NOTICE '- Foreign Keys com CASCADE ativas';
  RAISE NOTICE '- Triggers de sincronização criados';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 PRONTO PARA USAR!';
  
END$$;

-- =====================================================================
-- FIM DA MIGRATION
-- =====================================================================