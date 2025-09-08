-- Corrigir todas as políticas RLS do sistema
-- Permitir operações CRUD para usuários autenticados em todas as tabelas

-- TABELA: alunos
DROP POLICY IF EXISTS "Permitir leitura para todos os usuários autenticados" ON alunos;
DROP POLICY IF EXISTS "Permitir inserção para usuários autenticados" ON alunos;
DROP POLICY IF EXISTS "Permitir atualização para usuários autenticados" ON alunos;
DROP POLICY IF EXISTS "Permitir exclusão para usuários autenticados" ON alunos;

CREATE POLICY "alunos_select_authenticated" ON alunos FOR SELECT TO authenticated USING (true);
CREATE POLICY "alunos_insert_authenticated" ON alunos FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "alunos_update_authenticated" ON alunos FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "alunos_delete_authenticated" ON alunos FOR DELETE TO authenticated USING (true);

-- TABELA: medidas
DROP POLICY IF EXISTS "Permitir leitura de medidas para usuários autenticados" ON medidas;
DROP POLICY IF EXISTS "Permitir inserção de medidas para usuários autenticados" ON medidas;
DROP POLICY IF EXISTS "Permitir atualização de medidas para usuários autenticados" ON medidas;
DROP POLICY IF EXISTS "Permitir exclusão de medidas para usuários autenticados" ON medidas;

CREATE POLICY "medidas_select_authenticated" ON medidas FOR SELECT TO authenticated USING (true);
CREATE POLICY "medidas_insert_authenticated" ON medidas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "medidas_update_authenticated" ON medidas FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "medidas_delete_authenticated" ON medidas FOR DELETE TO authenticated USING (true);

-- TABELA: frequencia
DROP POLICY IF EXISTS "Permitir leitura de frequência para usuários autenticados" ON frequencia;
DROP POLICY IF EXISTS "Permitir inserção de frequência para usuários autenticados" ON frequencia;
DROP POLICY IF EXISTS "Permitir atualização de frequência para usuários autenticados" ON frequencia;
DROP POLICY IF EXISTS "Permitir exclusão de frequência para usuários autenticados" ON frequencia;

CREATE POLICY "frequencia_select_authenticated" ON frequencia FOR SELECT TO authenticated USING (true);
CREATE POLICY "frequencia_insert_authenticated" ON frequencia FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "frequencia_update_authenticated" ON frequencia FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "frequencia_delete_authenticated" ON frequencia FOR DELETE TO authenticated USING (true);

-- TABELA: notas (se existir)
DROP POLICY IF EXISTS "Permitir leitura de notas para usuários autenticados" ON notas;
DROP POLICY IF EXISTS "Permitir inserção de notas para usuários autenticados" ON notas;
DROP POLICY IF EXISTS "Permitir atualização de notas para usuários autenticados" ON notas;
DROP POLICY IF EXISTS "Permitir exclusão de notas para usuários autenticados" ON notas;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notas') THEN
        EXECUTE 'CREATE POLICY "notas_select_authenticated" ON notas FOR SELECT TO authenticated USING (true)';
        EXECUTE 'CREATE POLICY "notas_insert_authenticated" ON notas FOR INSERT TO authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "notas_update_authenticated" ON notas FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "notas_delete_authenticated" ON notas FOR DELETE TO authenticated USING (true)';
    END IF;
END $$;

-- TABELA: pais_responsaveis (para portal dos pais)
DROP POLICY IF EXISTS "pais_responsaveis_select" ON pais_responsaveis;
DROP POLICY IF EXISTS "pais_responsaveis_insert" ON pais_responsaveis;
DROP POLICY IF EXISTS "pais_responsaveis_update" ON pais_responsaveis;
DROP POLICY IF EXISTS "pais_responsaveis_delete" ON pais_responsaveis;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pais_responsaveis') THEN
        EXECUTE 'CREATE POLICY "pais_responsaveis_select_authenticated" ON pais_responsaveis FOR SELECT TO authenticated USING (true)';
        EXECUTE 'CREATE POLICY "pais_responsaveis_insert_authenticated" ON pais_responsaveis FOR INSERT TO authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "pais_responsaveis_update_authenticated" ON pais_responsaveis FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "pais_responsaveis_delete_authenticated" ON pais_responsaveis FOR DELETE TO authenticated USING (true)';
    END IF;
END $$;

-- TABELA: aluno_responsavel (associação aluno-responsável)
DROP POLICY IF EXISTS "aluno_responsavel_select" ON aluno_responsavel;
DROP POLICY IF EXISTS "aluno_responsavel_insert" ON aluno_responsavel;
DROP POLICY IF EXISTS "aluno_responsavel_update" ON aluno_responsavel;
DROP POLICY IF EXISTS "aluno_responsavel_delete" ON aluno_responsavel;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'aluno_responsavel') THEN
        EXECUTE 'CREATE POLICY "aluno_responsavel_select_authenticated" ON aluno_responsavel FOR SELECT TO authenticated USING (true)';
        EXECUTE 'CREATE POLICY "aluno_responsavel_insert_authenticated" ON aluno_responsavel FOR INSERT TO authenticated WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "aluno_responsavel_update_authenticated" ON aluno_responsavel FOR UPDATE TO authenticated USING (true) WITH CHECK (true)';
        EXECUTE 'CREATE POLICY "aluno_responsavel_delete_authenticated" ON aluno_responsavel FOR DELETE TO authenticated USING (true)';
    END IF;
END $$;

-- Garantir que RLS está habilitado em todas as tabelas
ALTER TABLE alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE medidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE frequencia ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notas') THEN
        EXECUTE 'ALTER TABLE notas ENABLE ROW LEVEL SECURITY';
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'pais_responsaveis') THEN
        EXECUTE 'ALTER TABLE pais_responsaveis ENABLE ROW LEVEL SECURITY';
    END IF;
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'aluno_responsavel') THEN
        EXECUTE 'ALTER TABLE aluno_responsavel ENABLE ROW LEVEL SECURITY';
    END IF;
END $$;

-- Comentários explicativos
COMMENT ON TABLE alunos IS 'Tabela de alunos - RLS permite CRUD para usuários autenticados';
COMMENT ON TABLE medidas IS 'Tabela de medidas disciplinares - RLS permite CRUD para usuários autenticados';
COMMENT ON TABLE frequencia IS 'Tabela de frequência - RLS permite CRUD para usuários autenticados';