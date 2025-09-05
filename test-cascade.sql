-- =====================================================================
-- TESTE RÁPIDO DE CASCADE - Execute no Supabase
-- =====================================================================

-- 1) Criar aluno de teste
INSERT INTO public.alunos (codigo, "Nome completo", turma, status)
VALUES (9999999, 'TESTE CASCATA ALUNO', '9Z', 'ativo')
ON CONFLICT (codigo) DO UPDATE SET 
  "Nome completo" = 'TESTE CASCATA ALUNO',
  turma = '9Z';

-- 2) Criar medida relacionada
INSERT INTO public.medidas (codigo_matricula, codigo_aluno, nome_completo, turma, data, especificacao, observacao, tipo_medida)
VALUES ('9999999', 9999999, 'TESTE CASCATA ALUNO', '9Z', CURRENT_DATE, 'Teste de cascata', 'Para testar exclusão', 'Fato Observado Negativo');

-- 3) Criar frequencia relacionada  
INSERT INTO public.frequencia (codigo_matricula, codigo_aluno, nome_completo, turma, data, status)
VALUES ('9999999', 9999999, 'TESTE CASCATA ALUNO', '9Z', CURRENT_DATE, 'P');

-- 4) Verificar se tudo foi criado
SELECT 'ALUNO TESTE' as tipo, codigo, "Nome completo", turma FROM alunos WHERE codigo = 9999999;
SELECT 'MEDIDA TESTE' as tipo, id, codigo_aluno, tipo_medida FROM medidas WHERE codigo_aluno = 9999999;
SELECT 'FREQUENCIA TESTE' as tipo, id, codigo_aluno, status FROM frequencia WHERE codigo_aluno = 9999999;

-- 5) AGORA EXECUTE ESTA LINHA PARA TESTAR CASCADE:
-- DELETE FROM alunos WHERE codigo = 9999999;

-- 6) Verificar se TUDO foi excluído (deve retornar 0 linhas):
-- SELECT 'MEDIDA APÓS DELETE' as tipo, COUNT(*) as qtd FROM medidas WHERE codigo_aluno = 9999999;
-- SELECT 'FREQUENCIA APÓS DELETE' as tipo, COUNT(*) as qtd FROM frequencia WHERE codigo_aluno = 9999999;