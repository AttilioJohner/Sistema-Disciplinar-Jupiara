-- Contar alunos por unidade

-- Contagem geral por unidade
SELECT
    unidade,
    COUNT(*) as total_alunos
FROM alunos
GROUP BY unidade
ORDER BY unidade;

-- Apenas Anexa
SELECT COUNT(*) as total_alunos_anexa
FROM alunos
WHERE unidade = 'Anexa';

-- Detalhamento: Alunos da Anexa por turma
SELECT
    turma,
    COUNT(*) as total_alunos
FROM alunos
WHERE unidade = 'Anexa'
GROUP BY turma
ORDER BY turma;

-- Lista completa de alunos da Anexa
SELECT
    codigo,
    "código (matrícula)",
    "Nome completo",
    turma,
    unidade
FROM alunos
WHERE unidade = 'Anexa'
ORDER BY turma, "Nome completo";
