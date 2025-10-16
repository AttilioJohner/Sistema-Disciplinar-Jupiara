-- Identificar alunos da Anexa que NÃO são da importação CSV (código não começa com 2025)
-- Esses são os alunos originais que foram movidos pela migração

SELECT 
    codigo,
    "código (matrícula)",
    "Nome completo",
    turma,
    unidade
FROM alunos
WHERE unidade = 'Anexa'
AND codigo < 2025000;  -- Códigos menores que 2025000 são os originais

-- Para executar a volta para Sede, descomente a linha abaixo:
-- UPDATE alunos SET unidade = 'Sede' WHERE unidade = 'Anexa' AND codigo < 2025000;
