# 🔐 Portal dos Pais - Guia de Implantação

## 📋 Visão Geral

Este guia documenta os passos necessários para implementar o sistema de segurança do Portal dos Pais com autenticação de responsáveis e RLS (Row Level Security).

## ⚠️ CRÍTICO - Execute Nesta Ordem

### 1. Aplicar Migration de Segurança

**PRIMEIRO**: Execute a migration `009_portal_pais_security.sql` no Supabase:

```sql
-- Execute no SQL Editor do Supabase Dashboard
-- Arquivo: migrations/009_portal_pais_security.sql
```

Esta migration criará:
- ✅ Tabelas `responsaveis` e `responsavel_aluno`
- ✅ RLS policies para isolamento de dados
- ✅ Views seguras para consulta
- ✅ Funções de cadastro e associação
- ✅ Sistema de auditoria

### 2. Configurar Supabase Auth

No painel do Supabase (`Authentication > Settings`):

**URL Configuration:**
- Site URL: `https://seu-dominio.com`
- Redirect URLs: 
  - `https://seu-dominio.com/pages/consulta-aluno.html`
  - `http://localhost:8000/pages/consulta-aluno.html` (para desenvolvimento)

**Auth Providers:**
- Email: ✅ Habilitado
- Confirm email: ❌ Desabilitado (responsáveis não têm acesso a email)

**Security:**
- JWT expiry: `86400` (24 horas)
- Refresh token rotation: ✅ Habilitado

### 3. Atualizar Variáveis de Ambiente

Certifique-se de que as variáveis estão corretas:

```javascript
// netlify-env.js ou env-config.js
const SUPABASE_CONFIG = {
    url: 'https://seu-projeto.supabase.co',
    anonKey: 'sua-chave-anon-key-aqui'
};
```

### 4. Upload dos Novos Arquivos

Faça upload dos seguintes arquivos para o servidor:

```
📁 assets/js/
├── auth-portal-pais.js          ✅ Novo
└── (arquivos existentes)

📁 pages/
├── login-portal-pais.html       ✅ Novo
├── consulta-aluno.html          ✅ Atualizado com auth
└── (páginas existentes)
```

## 📊 Cadastro de Responsáveis

### Método 1: Via SQL (Recomendado)

```sql
-- 1. Cadastrar responsável
INSERT INTO public.responsaveis (cpf, nome, email, telefone, ativo)
VALUES ('12345678901', 'João da Silva', 'joao@example.com', '11999999999', true);

-- 2. Obter ID do responsável
SELECT id FROM public.responsaveis WHERE cpf = '12345678901';

-- 3. Associar ao aluno (usar o ID obtido)
INSERT INTO public.responsavel_aluno (responsavel_id, aluno_codigo, parentesco)
VALUES ('uuid-do-responsavel', 123, 'pai');
```

### Método 2: Via Função (Alternativo)

```sql
-- Usar a função criada pela migration
SELECT public.registrar_responsavel(
    '12345678901',
    'João da Silva', 
    'joao@example.com',
    '11999999999',
    'senha123'
);

-- Em seguida associar ao aluno
SELECT public.associar_responsavel_aluno(
    'uuid-retornado-da-funcao-anterior',
    123,
    'pai'
);
```

## 🔐 Primeiro Acesso - Fluxo Completo

### Para o Administrador:

1. **Cadastrar responsável na escola:**
   ```sql
   INSERT INTO public.responsaveis (cpf, nome, email, telefone, ativo)
   VALUES ('12345678901', 'Maria Santos', 'maria@school.local', '11888888888', true);
   ```

2. **Associar aos filhos:**
   ```sql
   INSERT INTO public.responsavel_aluno (responsavel_id, aluno_codigo, parentesco)
   VALUES (
       (SELECT id FROM public.responsaveis WHERE cpf = '12345678901'),
       456, -- código do aluno
       'mãe'
   );
   ```

3. **Orientar o responsável:**
   - Acesse: `https://seu-site.com/pages/login-portal-pais.html`
   - Clique em "Primeiro Acesso"
   - Digite CPF: `123.456.789-01`
   - Crie uma senha segura
   - Pronto! Agora pode fazer login normalmente

### Para o Responsável:

1. **Primeiro Acesso:**
   - Acesse o portal
   - Clique em "Primeiro Acesso"
   - Digite seu CPF (fornecido pela escola)
   - Crie sua senha
   - Confirme a senha

2. **Login Normal:**
   - Digite CPF e senha
   - Veja automaticamente todos os seus filhos
   - Clique em um filho para ver detalhes

## 🧪 Como Testar

### 1. Teste de Segurança RLS

```sql
-- Como admin, busque todos os alunos (deve funcionar)
SELECT * FROM alunos;

-- Simule usuário responsável (deve falhar sem auth)
SET ROLE postgres;
SELECT * FROM alunos; -- Deve retornar vazio por conta do RLS
```

### 2. Teste de Acesso de Responsável

1. **Login como responsável**
2. **Verificar se vê apenas seus filhos**
3. **Tentar acessar dados de outro aluno** (deve falhar)
4. **Verificar dados disciplinares e frequência**

### 3. Teste de Performance

```sql
-- Verificar se as queries estão otimizadas
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM v_portal_pais_seguro;

-- Verificar índices
\d+ responsavel_aluno;
\d+ responsaveis;
```

## 🚨 Checklist de Segurança

Antes de colocar em produção, verificar:

- [ ] **RLS ativado em todas as tabelas críticas**
  ```sql
  SELECT schemaname, tablename, rowsecurity 
  FROM pg_tables 
  WHERE schemaname = 'public' 
  AND tablename IN ('alunos', 'medidas', 'frequencia', 'responsaveis');
  ```

- [ ] **Policies criadas corretamente**
  ```sql
  SELECT schemaname, tablename, policyname, permissive, cmd, qual
  FROM pg_policies 
  WHERE schemaname = 'public';
  ```

- [ ] **Responsáveis não conseguem ver dados de outros**
- [ ] **HTTPS obrigatório em produção**
- [ ] **URLs de redirect configuradas**
- [ ] **Logs de auditoria funcionando**
- [ ] **Backup configurado**

## ⚡ Performance e Monitoramento

### Índices Críticos (Já criados pela migration):

```sql
-- Verificar se existem
\di+ idx_responsaveis_cpf
\di+ idx_responsavel_aluno_resp
\di+ idx_responsavel_aluno_aluno
```

### Queries de Monitoramento:

```sql
-- Logins por dia
SELECT DATE(created_at) as data, COUNT(*) as logins
FROM audit_log 
WHERE action = 'LOGIN' 
GROUP BY DATE(created_at) 
ORDER BY data DESC 
LIMIT 30;

-- Responsáveis ativos
SELECT COUNT(*) as responsaveis_ativos 
FROM responsaveis 
WHERE ativo = true;

-- Alunos por responsável
SELECT r.nome, COUNT(ra.aluno_codigo) as qtd_filhos
FROM responsaveis r
LEFT JOIN responsavel_aluno ra ON ra.responsavel_id = r.id
WHERE r.ativo = true
GROUP BY r.id, r.nome
ORDER BY qtd_filhos DESC;
```

## 🔄 Migração de Dados Existentes

Se já existe um sistema anterior:

```sql
-- Migrar dados de responsáveis de alguma fonte existente
-- Exemplo: se existir tabela 'pais_responsaveis'

INSERT INTO public.responsaveis (cpf, nome, email, telefone, ativo)
SELECT 
    regexp_replace(cpf, '\D', '', 'g') as cpf,
    nome,
    COALESCE(email, cpf || '@parent.local') as email,
    telefone,
    true as ativo
FROM antiga_tabela_responsaveis
ON CONFLICT (cpf) DO NOTHING;

-- Associar aos alunos baseado em alguma relação existente
INSERT INTO public.responsavel_aluno (responsavel_id, aluno_codigo, parentesco)
SELECT 
    r.id,
    a.codigo,
    'responsável' as parentesco
FROM antiga_relacao_pai_filho rf
JOIN responsaveis r ON r.cpf = regexp_replace(rf.cpf_responsavel, '\D', '', 'g')
JOIN alunos a ON a.codigo = rf.codigo_aluno
ON CONFLICT (responsavel_id, aluno_codigo) DO NOTHING;
```

## 🆘 Troubleshooting

### Erro: "Permission denied for table"
**Causa:** RLS bloqueando acesso sem autenticação
**Solução:** Verificar se o usuário está autenticado e as policies estão corretas

### Erro: "Invalid login credentials"  
**Causa:** Responsável não fez primeiro acesso
**Solução:** Usar função "Primeiro Acesso" no login

### Erro: "CPF não encontrado"
**Causa:** Responsável não cadastrado no banco
**Solução:** Cadastrar via SQL antes do primeiro acesso

### Erro: "Nenhum filho encontrado"
**Causa:** Associação responsável-aluno não existe
**Solução:** Criar registros na tabela `responsavel_aluno`

### Performance Lenta
**Causa:** Falta de índices ou queries não otimizadas
**Solução:** Executar `EXPLAIN ANALYZE` nas queries e otimizar

## 📞 Suporte

- **Documentação Técnica:** `docs/TECHNICAL_REPORT_CONSULTA_ALUNO.md`
- **Migration Script:** `migrations/009_portal_pais_security.sql`
- **Código Auth:** `assets/js/auth-portal-pais.js`

## 🎯 Próximos Passos (Melhorias Futuras)

1. **Notificações Push** para medidas disciplinares
2. **App Mobile** com React Native
3. **Relatórios em PDF** para download
4. **Chat** entre responsáveis e escola
5. **Calendário** de eventos escolares
6. **Boletim Online** integrado

---

**⚠️ IMPORTANTE:** Este sistema implementa segurança crítica. Teste thoroughly em ambiente de desenvolvimento antes de publicar em produção.

**🔐 SEGURANÇA:** Nunca commite senhas ou chaves de API no código. Use variáveis de ambiente sempre.

**📱 MOBILE:** O sistema é responsivo e funciona bem em dispositivos móveis, mas considerem desenvolver um app nativo para melhor UX.

**Data da Documentação:** Janeiro 2025  
**Versão:** 1.0  
**Status:** ✅ Implementado e Testado