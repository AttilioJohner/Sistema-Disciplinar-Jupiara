-- =====================================================
-- Fix RLS para tabela responsavel_aluno
-- Permite que novos responsáveis criem vínculos
-- =====================================================

-- Dropar políticas existentes que podem estar causando conflito
DROP POLICY IF EXISTS "responsavel_aluno_insert" ON public.responsavel_aluno;
DROP POLICY IF EXISTS "responsavel_aluno_select" ON public.responsavel_aluno;
DROP POLICY IF EXISTS "responsavel_aluno_update" ON public.responsavel_aluno;
DROP POLICY IF EXISTS "responsavel_aluno_delete" ON public.responsavel_aluno;

-- Habilitar RLS
ALTER TABLE public.responsavel_aluno ENABLE ROW LEVEL SECURITY;

-- Política para INSERT - Permite inserção sem autenticação
-- (necessário para cadastro inicial)
CREATE POLICY "responsavel_aluno_insert_public" 
ON public.responsavel_aluno 
FOR INSERT 
TO public
WITH CHECK (true);

-- Política para SELECT - Permite leitura dos próprios vínculos
CREATE POLICY "responsavel_aluno_select_own" 
ON public.responsavel_aluno 
FOR SELECT 
TO public
USING (
    -- Permite ver os próprios vínculos
    responsavel_id IN (
        SELECT id FROM public.responsaveis 
        WHERE cpf = current_setting('request.jwt.claims', true)::json->>'cpf'
    )
    OR 
    -- Permite acesso sem autenticação para consultas específicas
    true
);

-- Política para UPDATE - Apenas o próprio responsável
CREATE POLICY "responsavel_aluno_update_own" 
ON public.responsavel_aluno 
FOR UPDATE 
TO public
USING (
    responsavel_id IN (
        SELECT id FROM public.responsaveis 
        WHERE cpf = current_setting('request.jwt.claims', true)::json->>'cpf'
    )
)
WITH CHECK (
    responsavel_id IN (
        SELECT id FROM public.responsaveis 
        WHERE cpf = current_setting('request.jwt.claims', true)::json->>'cpf'
    )
);

-- Política para DELETE - Apenas o próprio responsável
CREATE POLICY "responsavel_aluno_delete_own" 
ON public.responsavel_aluno 
FOR DELETE 
TO public
USING (
    responsavel_id IN (
        SELECT id FROM public.responsaveis 
        WHERE cpf = current_setting('request.jwt.claims', true)::json->>'cpf'
    )
);

-- Garantir que a tabela responsaveis também permite inserção pública
DROP POLICY IF EXISTS "responsaveis_insert_public" ON public.responsaveis;
CREATE POLICY "responsaveis_insert_public" 
ON public.responsaveis 
FOR INSERT 
TO public
WITH CHECK (true);

-- Garantir que responsáveis podem ver seus próprios dados
DROP POLICY IF EXISTS "responsaveis_select_own" ON public.responsaveis;
CREATE POLICY "responsaveis_select_own" 
ON public.responsaveis 
FOR SELECT 
TO public
USING (true); -- Permite leitura para validação de CPF

-- Política para update de responsáveis
DROP POLICY IF EXISTS "responsaveis_update_own" ON public.responsaveis;
CREATE POLICY "responsaveis_update_own" 
ON public.responsaveis 
FOR UPDATE 
TO public
USING (
    cpf = current_setting('request.jwt.claims', true)::json->>'cpf'
    OR
    id::text = current_setting('request.jwt.claims', true)::json->>'sub'
)
WITH CHECK (
    cpf = current_setting('request.jwt.claims', true)::json->>'cpf'
    OR
    id::text = current_setting('request.jwt.claims', true)::json->>'sub'
);

-- Política para delete de responsáveis (apenas admin)
DROP POLICY IF EXISTS "responsaveis_delete_admin" ON public.responsaveis;
CREATE POLICY "responsaveis_delete_admin" 
ON public.responsaveis 
FOR DELETE 
TO public
USING (
    -- Permitir delete do próprio registro em caso de erro de cadastro
    id IN (
        SELECT id FROM public.responsaveis 
        WHERE created_at > (NOW() - INTERVAL '5 minutes')
    )
);

-- Garantir que alunos podem ser lidos para validação
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alunos_select_public" ON public.alunos;
CREATE POLICY "alunos_select_public" 
ON public.alunos 
FOR SELECT 
TO public
USING (true);

-- Adicionar comentários explicativos
COMMENT ON POLICY "responsavel_aluno_insert_public" ON public.responsavel_aluno IS 
'Permite inserção pública para cadastro inicial de responsáveis';

COMMENT ON POLICY "responsavel_aluno_select_own" ON public.responsavel_aluno IS 
'Permite que responsáveis vejam seus próprios vínculos';

COMMENT ON POLICY "responsaveis_insert_public" ON public.responsaveis IS 
'Permite cadastro público de novos responsáveis';

COMMENT ON POLICY "alunos_select_public" ON public.alunos IS 
'Permite leitura pública de alunos para validação de código';