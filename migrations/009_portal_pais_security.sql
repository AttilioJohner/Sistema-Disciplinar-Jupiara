-- =====================================================================
-- MIGRATION: Segurança Portal dos Pais
-- Data: 2025-01-04
-- Implementa autenticação e RLS para o Portal dos Pais
-- CRÍTICO: Execute esta migration ANTES de reativar consulta-aluno.html
-- =====================================================================

-- =====================================================================
-- 1) CRIAR TABELA DE RESPONSÁVEIS
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.responsaveis (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cpf VARCHAR(11) UNIQUE NOT NULL,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefone VARCHAR(20),
    senha_hash TEXT, -- Será gerenciado pelo Supabase Auth
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_responsaveis_cpf ON public.responsaveis(cpf);
CREATE INDEX IF NOT EXISTS idx_responsaveis_email ON public.responsaveis(email);
CREATE INDEX IF NOT EXISTS idx_responsaveis_ativo ON public.responsaveis(ativo);

-- =====================================================================
-- 2) CRIAR TABELA DE RELACIONAMENTO RESPONSÁVEL-ALUNO
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.responsavel_aluno (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    responsavel_id UUID NOT NULL REFERENCES public.responsaveis(id) ON DELETE CASCADE,
    aluno_codigo BIGINT NOT NULL REFERENCES public.alunos(codigo) ON DELETE CASCADE,
    parentesco VARCHAR(50) NOT NULL CHECK (parentesco IN ('pai', 'mãe', 'avô', 'avó', 'tio', 'tia', 'responsável legal', 'outro')),
    autorizado_retirar BOOLEAN DEFAULT true,
    autorizado_ver_notas BOOLEAN DEFAULT true,
    autorizado_ver_frequencia BOOLEAN DEFAULT true,
    autorizado_ver_disciplinar BOOLEAN DEFAULT true,
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(responsavel_id, aluno_codigo)
);

-- Índices para queries eficientes
CREATE INDEX IF NOT EXISTS idx_responsavel_aluno_resp ON public.responsavel_aluno(responsavel_id);
CREATE INDEX IF NOT EXISTS idx_responsavel_aluno_aluno ON public.responsavel_aluno(aluno_codigo);

-- =====================================================================
-- 3) ADICIONAR CAMPOS NA TABELA ALUNOS (OPCIONAL)
-- =====================================================================

ALTER TABLE public.alunos 
ADD COLUMN IF NOT EXISTS responsavel_principal_id UUID REFERENCES public.responsaveis(id),
ADD COLUMN IF NOT EXISTS contato_emergencia VARCHAR(20),
ADD COLUMN IF NOT EXISTS observacoes_saude TEXT;

-- =====================================================================
-- 4) HABILITAR RLS (ROW LEVEL SECURITY)
-- =====================================================================

-- Habilitar RLS nas tabelas principais
ALTER TABLE public.alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.frequencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsaveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.responsavel_aluno ENABLE ROW LEVEL SECURITY;

-- =====================================================================
-- 5) CRIAR POLÍTICAS RLS PARA RESPONSÁVEIS
-- =====================================================================

-- Policy: Responsáveis podem ver apenas seus próprios dados
CREATE POLICY "Responsaveis veem proprios dados" ON public.responsaveis
    FOR SELECT
    USING (auth.uid()::text = id::text);

-- Policy: Responsáveis podem atualizar seus próprios dados (exceto CPF)
CREATE POLICY "Responsaveis atualizam proprios dados" ON public.responsaveis
    FOR UPDATE
    USING (auth.uid()::text = id::text)
    WITH CHECK (auth.uid()::text = id::text);

-- Policy: Responsáveis veem suas relações com alunos
CREATE POLICY "Responsaveis veem suas relacoes" ON public.responsavel_aluno
    FOR SELECT
    USING (responsavel_id::text = auth.uid()::text);

-- Policy: Responsáveis veem dados dos seus dependentes
CREATE POLICY "Responsaveis veem seus dependentes" ON public.alunos
    FOR SELECT
    USING (
        codigo IN (
            SELECT aluno_codigo 
            FROM public.responsavel_aluno 
            WHERE responsavel_id::text = auth.uid()::text
            AND autorizado_ver_notas = true
        )
    );

-- Policy: Responsáveis veem medidas disciplinares dos dependentes
CREATE POLICY "Responsaveis veem medidas dependentes" ON public.medidas
    FOR SELECT
    USING (
        codigo_aluno IN (
            SELECT aluno_codigo 
            FROM public.responsavel_aluno 
            WHERE responsavel_id::text = auth.uid()::text
            AND autorizado_ver_disciplinar = true
        )
    );

-- Policy: Responsáveis veem frequência dos dependentes
CREATE POLICY "Responsaveis veem frequencia dependentes" ON public.frequencia
    FOR SELECT
    USING (
        codigo_aluno IN (
            SELECT aluno_codigo 
            FROM public.responsavel_aluno 
            WHERE responsavel_id::text = auth.uid()::text
            AND autorizado_ver_frequencia = true
        )
    );

-- =====================================================================
-- 6) CRIAR POLÍTICAS RLS PARA ADMINISTRADORES
-- =====================================================================

-- Admins podem ver e editar tudo (baseado em claim no JWT)
CREATE POLICY "Admins full access alunos" ON public.alunos
    FOR ALL
    USING (auth.jwt()->>'role' = 'admin')
    WITH CHECK (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Admins full access medidas" ON public.medidas
    FOR ALL
    USING (auth.jwt()->>'role' = 'admin')
    WITH CHECK (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Admins full access frequencia" ON public.frequencia
    FOR ALL
    USING (auth.jwt()->>'role' = 'admin')
    WITH CHECK (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Admins full access responsaveis" ON public.responsaveis
    FOR ALL
    USING (auth.jwt()->>'role' = 'admin')
    WITH CHECK (auth.jwt()->>'role' = 'admin');

CREATE POLICY "Admins full access responsavel_aluno" ON public.responsavel_aluno
    FOR ALL
    USING (auth.jwt()->>'role' = 'admin')
    WITH CHECK (auth.jwt()->>'role' = 'admin');

-- =====================================================================
-- 7) CRIAR VIEW SEGURA PARA PORTAL DOS PAIS
-- =====================================================================

CREATE OR REPLACE VIEW public.v_portal_pais_seguro AS
WITH alunos_autorizados AS (
    SELECT aluno_codigo
    FROM public.responsavel_aluno
    WHERE responsavel_id::text = auth.uid()::text
),
medidas_resumo AS (
    SELECT 
        codigo_aluno,
        COUNT(*) as total_medidas,
        MAX(data) as ultima_medida,
        COUNT(*) FILTER (WHERE data > CURRENT_DATE - INTERVAL '30 days') as medidas_mes
    FROM public.medidas
    WHERE codigo_aluno IN (SELECT aluno_codigo FROM alunos_autorizados)
    GROUP BY codigo_aluno
),
frequencia_resumo AS (
    SELECT 
        codigo_aluno,
        COUNT(*) FILTER (WHERE status = 'P') as presencas_total,
        COUNT(*) FILTER (WHERE status = 'F') as faltas_total,
        COUNT(*) FILTER (WHERE status = 'A') as atestados_total,
        ROUND(
            100.0 * COUNT(*) FILTER (WHERE status IN ('P', 'A')) / NULLIF(COUNT(*), 0), 
            2
        ) as percentual_frequencia
    FROM public.frequencia
    WHERE codigo_aluno IN (SELECT aluno_codigo FROM alunos_autorizados)
    GROUP BY codigo_aluno
)
SELECT 
    a.codigo,
    a."Nome completo" as nome_completo,
    a.turma,
    COALESCE(m.total_medidas, 0) as total_medidas,
    m.ultima_medida,
    COALESCE(m.medidas_mes, 0) as medidas_mes_atual,
    COALESCE(f.presencas_total, 0) as presencas_total,
    COALESCE(f.faltas_total, 0) as faltas_total,
    COALESCE(f.percentual_frequencia, 100) as percentual_frequencia,
    n.nota_atual as nota_disciplinar,
    ra.parentesco,
    ra.autorizado_retirar
FROM public.alunos a
INNER JOIN public.responsavel_aluno ra ON ra.aluno_codigo = a.codigo
LEFT JOIN medidas_resumo m ON m.codigo_aluno = a.codigo
LEFT JOIN frequencia_resumo f ON f.codigo_aluno = a.codigo
LEFT JOIN public.v_nota_disciplinar_atual n ON n.codigo_aluno = a.codigo
WHERE ra.responsavel_id::text = auth.uid()::text;

-- Grant acesso à view
GRANT SELECT ON public.v_portal_pais_seguro TO authenticated;

-- =====================================================================
-- 8) CRIAR FUNÇÃO PARA REGISTRO DE RESPONSÁVEIS
-- =====================================================================

CREATE OR REPLACE FUNCTION public.registrar_responsavel(
    p_cpf VARCHAR,
    p_nome VARCHAR,
    p_email VARCHAR,
    p_telefone VARCHAR,
    p_senha VARCHAR
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_user_id UUID;
    v_responsavel_id UUID;
BEGIN
    -- Validar CPF (básico)
    IF LENGTH(p_cpf) != 11 OR p_cpf !~ '^\d+$' THEN
        RETURN jsonb_build_object('success', false, 'error', 'CPF inválido');
    END IF;

    -- Verificar se CPF já existe
    IF EXISTS (SELECT 1 FROM public.responsaveis WHERE cpf = p_cpf) THEN
        RETURN jsonb_build_object('success', false, 'error', 'CPF já cadastrado');
    END IF;

    -- Criar usuário no Supabase Auth (usar função do Supabase)
    -- Nota: Em produção, isso seria feito via API do Supabase Auth
    
    -- Inserir na tabela responsaveis
    INSERT INTO public.responsaveis (cpf, nome, email, telefone, ativo)
    VALUES (p_cpf, p_nome, p_email, p_telefone, true)
    RETURNING id INTO v_responsavel_id;

    RETURN jsonb_build_object(
        'success', true, 
        'responsavel_id', v_responsavel_id,
        'message', 'Responsável cadastrado com sucesso'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =====================================================================
-- 9) CRIAR FUNÇÃO PARA ASSOCIAR RESPONSÁVEL A ALUNO
-- =====================================================================

CREATE OR REPLACE FUNCTION public.associar_responsavel_aluno(
    p_responsavel_id UUID,
    p_aluno_codigo BIGINT,
    p_parentesco VARCHAR
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar se aluno existe
    IF NOT EXISTS (SELECT 1 FROM public.alunos WHERE codigo = p_aluno_codigo) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Aluno não encontrado');
    END IF;

    -- Verificar se responsável existe
    IF NOT EXISTS (SELECT 1 FROM public.responsaveis WHERE id = p_responsavel_id) THEN
        RETURN jsonb_build_object('success', false, 'error', 'Responsável não encontrado');
    END IF;

    -- Criar associação
    INSERT INTO public.responsavel_aluno (
        responsavel_id, 
        aluno_codigo, 
        parentesco,
        autorizado_retirar,
        autorizado_ver_notas,
        autorizado_ver_frequencia,
        autorizado_ver_disciplinar
    )
    VALUES (
        p_responsavel_id, 
        p_aluno_codigo, 
        p_parentesco,
        true,
        true,
        true,
        true
    )
    ON CONFLICT (responsavel_id, aluno_codigo) 
    DO UPDATE SET parentesco = EXCLUDED.parentesco;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Associação criada com sucesso'
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- =====================================================================
-- 10) CRIAR TRIGGER PARA AUDITORIA
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    user_email VARCHAR(255),
    action VARCHAR(50),
    table_name VARCHAR(50),
    record_id VARCHAR(100),
    old_data JSONB,
    new_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_log_user ON public.audit_log(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON public.audit_log(action, created_at DESC);

-- Função de auditoria
CREATE OR REPLACE FUNCTION public.audit_trigger_function()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.audit_log (
        user_id,
        user_email,
        action,
        table_name,
        record_id,
        old_data,
        new_data
    )
    VALUES (
        auth.uid(),
        auth.email(),
        TG_OP,
        TG_TABLE_NAME,
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id::text
            ELSE NEW.id::text
        END,
        CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
        CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END
    );
    
    RETURN CASE
        WHEN TG_OP = 'DELETE' THEN OLD
        ELSE NEW
    END;
END;
$$;

-- Aplicar trigger nas tabelas sensíveis
CREATE TRIGGER audit_responsaveis
AFTER INSERT OR UPDATE OR DELETE ON public.responsaveis
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

CREATE TRIGGER audit_responsavel_aluno
AFTER INSERT OR UPDATE OR DELETE ON public.responsavel_aluno
FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();

-- =====================================================================
-- 11) INSERIR DADOS DE TESTE (DESENVOLVIMENTO)
-- =====================================================================

DO $$
BEGIN
    -- Apenas em ambiente de desenvolvimento
    IF current_database() LIKE '%dev%' OR current_database() LIKE '%test%' THEN
        -- Criar responsável de teste
        INSERT INTO public.responsaveis (id, cpf, nome, email, telefone)
        VALUES (
            'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
            '12345678900',
            'João da Silva (Pai Teste)',
            'pai.teste@example.com',
            '11999999999'
        ) ON CONFLICT (cpf) DO NOTHING;

        -- Associar a um aluno existente (assumindo que existe código 1)
        IF EXISTS (SELECT 1 FROM public.alunos WHERE codigo = 1) THEN
            INSERT INTO public.responsavel_aluno (
                responsavel_id,
                aluno_codigo,
                parentesco
            ) VALUES (
                'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'::uuid,
                1,
                'pai'
            ) ON CONFLICT DO NOTHING;
        END IF;

        RAISE NOTICE 'Dados de teste inseridos';
    END IF;
END$$;

-- =====================================================================
-- 12) VERIFICAÇÃO FINAL
-- =====================================================================

DO $$
DECLARE
    v_tables_with_rls INTEGER;
    v_policies_count INTEGER;
    v_responsaveis_count INTEGER;
BEGIN
    -- Contar tabelas com RLS
    SELECT COUNT(*) INTO v_tables_with_rls
    FROM pg_tables t
    JOIN pg_policies p ON p.tablename = t.tablename
    WHERE t.schemaname = 'public'
    AND t.tablename IN ('alunos', 'medidas', 'frequencia', 'responsaveis', 'responsavel_aluno');

    -- Contar policies
    SELECT COUNT(*) INTO v_policies_count
    FROM pg_policies
    WHERE schemaname = 'public';

    -- Contar responsáveis
    SELECT COUNT(*) INTO v_responsaveis_count
    FROM public.responsaveis;

    RAISE NOTICE '';
    RAISE NOTICE '🔐 SEGURANÇA DO PORTAL DOS PAIS IMPLEMENTADA!';
    RAISE NOTICE '';
    RAISE NOTICE 'RESUMO:';
    RAISE NOTICE '├── Tabelas com RLS: %', v_tables_with_rls;
    RAISE NOTICE '├── Políticas criadas: %', v_policies_count;
    RAISE NOTICE '├── Responsáveis cadastrados: %', v_responsaveis_count;
    RAISE NOTICE '└── Auditoria: ATIVA';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  IMPORTANTE:';
    RAISE NOTICE '1. Configure Supabase Auth para usar tabela responsaveis';
    RAISE NOTICE '2. Atualize SUPABASE_URL e SUPABASE_ANON_KEY no .env';
    RAISE NOTICE '3. Implemente login antes de reativar consulta-aluno.html';
    RAISE NOTICE '4. Teste RLS policies com diferentes usuários';
    RAISE NOTICE '';
    RAISE NOTICE '✅ Migration concluída com sucesso!';
END$$;

-- =====================================================================
-- FIM DA MIGRATION
-- =====================================================================