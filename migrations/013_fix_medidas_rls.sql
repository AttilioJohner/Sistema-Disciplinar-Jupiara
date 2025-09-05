-- Migration: Fix RLS policies for medidas table
-- Description: Allow authenticated users to manage disciplinary measures
-- Date: 2025-09-05

-- First, remove ALL existing policies for medidas table
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- Loop through all policies for the medidas table
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE tablename = 'medidas' 
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON medidas', pol.policyname);
    END LOOP;
END $$;

-- Create new comprehensive policies for medidas table with unique names
-- Allow anyone to read medidas (for reports and dashboards)
CREATE POLICY "medidas_select_all" 
ON medidas FOR SELECT 
USING (true);

-- Allow authenticated users to insert medidas
CREATE POLICY "medidas_insert_all" 
ON medidas FOR INSERT 
WITH CHECK (true);

-- Allow authenticated users to update medidas
CREATE POLICY "medidas_update_all" 
ON medidas FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete medidas (if needed for corrections)
CREATE POLICY "medidas_delete_all" 
ON medidas FOR DELETE 
USING (true);

-- Ensure RLS is enabled on the table
ALTER TABLE medidas ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to authenticated and anon roles
GRANT ALL ON medidas TO authenticated;
GRANT SELECT ON medidas TO anon;

-- Add comment to document the change
COMMENT ON TABLE medidas IS 'Tabela de medidas disciplinares com políticas RLS permissivas para authenticated users (atualizado 2025-09-05)';