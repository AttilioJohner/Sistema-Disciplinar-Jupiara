-- Execute este SQL para corrigir a constraint única

-- Verificar se a constraint existe
SELECT 
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
WHERE tc.constraint_type = 'UNIQUE' 
  AND tc.table_name='ficai_providencias';

-- Se não mostrar nenhum resultado, execute esta linha para criar a constraint:
ALTER TABLE ficai_providencias 
ADD CONSTRAINT uk_ficai_codigo_mes UNIQUE(codigo_matricula, mes_referencia);