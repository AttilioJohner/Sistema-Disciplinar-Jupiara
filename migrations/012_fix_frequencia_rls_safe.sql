-- Migration: Safely fix RLS policies for frequencia table
-- Description: Remove ALL existing policies before creating new ones
-- Date: 2025-09-05

-- First, get list of all existing policies and drop them
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Loop through all policies for the frequencia table
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'frequencia' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON frequencia', pol.policyname);
    END LOOP;
END $$;

-- Now create the new policies with unique names
CREATE POLICY "frequencia_select_all" 
ON frequencia FOR SELECT 
USING (true);

CREATE POLICY "frequencia_insert_all" 
ON frequencia FOR INSERT 
WITH CHECK (true);

CREATE POLICY "frequencia_update_all" 
ON frequencia FOR UPDATE 
USING (true)
WITH CHECK (true);

CREATE POLICY "frequencia_delete_all" 
ON frequencia FOR DELETE 
USING (true);

-- Ensure RLS is enabled
ALTER TABLE frequencia ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON frequencia TO authenticated;
GRANT SELECT ON frequencia TO anon;

-- Add comment to document the change
COMMENT ON TABLE frequencia IS 'Tabela de controle de frequência escolar com políticas RLS permissivas (atualizado 2025-09-05)';