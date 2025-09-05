-- Migration: Fix RLS policies for frequencia table
-- Description: Allow authenticated users to insert/update frequencia records
-- Date: 2025-09-05

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Enable read access for all users" ON frequencia;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON frequencia;
DROP POLICY IF EXISTS "Enable update for authenticated users only" ON frequencia;
DROP POLICY IF EXISTS "Enable delete for authenticated users only" ON frequencia;

-- Create new comprehensive policies for frequencia table
-- Allow anyone to read frequencia (for reports and dashboards)
CREATE POLICY "Allow read access for all users" 
ON frequencia FOR SELECT 
USING (true);

-- Allow authenticated users to insert frequencia records
CREATE POLICY "Allow insert for authenticated users" 
ON frequencia FOR INSERT 
WITH CHECK (true);

-- Allow authenticated users to update frequencia records
CREATE POLICY "Allow update for authenticated users" 
ON frequencia FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Allow authenticated users to delete frequencia records (if needed for corrections)
CREATE POLICY "Allow delete for authenticated users" 
ON frequencia FOR DELETE 
USING (true);

-- Ensure RLS is enabled on the table
ALTER TABLE frequencia ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to authenticated and anon roles
GRANT ALL ON frequencia TO authenticated;
GRANT SELECT ON frequencia TO anon;

-- Add comment to document the change
COMMENT ON TABLE frequencia IS 'Tabela de controle de frequência escolar com políticas RLS permissivas para authenticated users';