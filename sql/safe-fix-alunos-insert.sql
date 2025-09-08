-- Script SEGURO - apenas adiciona política de INSERT para alunos
-- NÃO remove políticas existentes para não quebrar outras funcionalidades

-- Verificar se já existe política de INSERT para alunos
DO $$
BEGIN
    -- Se não existe política de INSERT, criar uma
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'alunos' 
        AND cmd = 'INSERT'
    ) THEN
        CREATE POLICY "alunos_insert_authenticated_safe" 
        ON alunos 
        FOR INSERT 
        TO authenticated 
        WITH CHECK (true);
        
        RAISE NOTICE 'Política de INSERT criada para tabela alunos';
    ELSE
        RAISE NOTICE 'Política de INSERT já existe para tabela alunos';
    END IF;
    
    -- Verificar se já existe política de UPDATE para alunos
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'alunos' 
        AND cmd = 'UPDATE'
    ) THEN
        CREATE POLICY "alunos_update_authenticated_safe" 
        ON alunos 
        FOR UPDATE 
        TO authenticated 
        USING (true) 
        WITH CHECK (true);
        
        RAISE NOTICE 'Política de UPDATE criada para tabela alunos';
    ELSE
        RAISE NOTICE 'Política de UPDATE já existe para tabela alunos';
    END IF;
END $$;