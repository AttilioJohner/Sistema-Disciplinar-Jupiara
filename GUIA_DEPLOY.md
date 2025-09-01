# 🚀 Guia Completo de Deploy - Sistema Disciplinar Jupiara

Este guia te leva passo a passo desde a configuração até o deploy na Netlify com Supabase.

## 📋 Checklist Rápido

- [ ] Criar conta no Supabase
- [ ] Configurar projeto Supabase
- [ ] Conectar repositório na Netlify
- [ ] Configurar variáveis de ambiente
- [ ] Fazer primeiro deploy
- [ ] Configurar autenticação
- [ ] Testar sistema completo

## 🔧 Passo 1: Configurando o Supabase

### 1.1 Criar Conta e Projeto
1. Acesse [supabase.com](https://supabase.com)
2. Clique em "Start your project"
3. Faça login com GitHub ou crie uma conta
4. Clique em "New Project"
5. Escolha uma organização
6. Configure o projeto:
   - **Name**: `sistema-disciplinar-jupiara`
   - **Database Password**: (anote essa senha!)
   - **Region**: Brazil (East) - para melhor performance
7. Clique em "Create new project"
8. **Aguarde 2-3 minutos** para o projeto ser criado

### 1.2 Obter Credenciais
1. No dashboard do Supabase, vá em **Settings** → **API**
2. Anote estas informações:
   - **Project URL**: `https://seu-id-unico.supabase.co`
   - **anon public**: `eyJ0eXAiOiJKV1QiLCJhbGc...` (chave longa)

⚠️ **IMPORTANTE**: Guarde essas informações em local seguro!

### 1.3 Configurar Autenticação
1. Vá em **Authentication** → **Settings**
2. Em **Site URL**, configure:
   - Para desenvolvimento: `http://localhost:8000`
   - Para produção: `https://seu-dominio.netlify.app`
3. Em **Redirect URLs**, adicione:
   - `https://seu-dominio.netlify.app/pages/login.html`
   - `http://localhost:8000/pages/login.html`

### 1.4 Criar Tabelas
Execute no **SQL Editor** do Supabase:

```sql
-- Criar tabela de alunos
CREATE TABLE alunos (
  id TEXT PRIMARY KEY,
  nome TEXT NOT NULL,
  turma TEXT,
  nascimento DATE,
  responsavel TEXT,
  cpf TEXT,
  ativo BOOLEAN DEFAULT true,
  "criadoEm" TIMESTAMP DEFAULT NOW(),
  "atualizadoEm" TIMESTAMP DEFAULT NOW()
);

-- Criar tabela de medidas disciplinares
CREATE TABLE medidas_disciplinares (
  id TEXT PRIMARY KEY,
  "alunoId" TEXT REFERENCES alunos(id),
  tipo TEXT NOT NULL,
  descricao TEXT,
  data DATE DEFAULT CURRENT_DATE,
  professor TEXT,
  status TEXT DEFAULT 'ativa',
  "criadoEm" TIMESTAMP DEFAULT NOW()
);

-- Criar tabela de frequência
CREATE TABLE frequencia_diaria (
  id TEXT PRIMARY KEY,
  "alunoId" TEXT REFERENCES alunos(id),
  data DATE NOT NULL,
  presente BOOLEAN DEFAULT true,
  justificada BOOLEAN DEFAULT false,
  observacoes TEXT
);

-- Habilitar Row Level Security
ALTER TABLE alunos ENABLE ROW LEVEL SECURITY;
ALTER TABLE medidas_disciplinares ENABLE ROW LEVEL SECURITY;
ALTER TABLE frequencia_diaria ENABLE ROW LEVEL SECURITY;

-- Criar políticas (permitir acesso para usuários autenticados)
CREATE POLICY "Usuários autenticados podem acessar alunos" ON alunos
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem acessar medidas" ON medidas_disciplinares
FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários autenticados podem acessar frequência" ON frequencia_diaria
FOR ALL USING (auth.role() = 'authenticated');
```

## 🌐 Passo 2: Deploy na Netlify

### 2.1 Conectar Repositório
1. Acesse [netlify.com](https://netlify.com)
2. Faça login com GitHub
3. Clique em "Add new site" → "Import from Git"
4. Escolha GitHub e autorize o acesso
5. Selecione o repositório `Sistema-Disciplinar-Jupiara`
6. Configure:
   - **Branch**: `main`
   - **Build command**: (deixe vazio)
   - **Publish directory**: `.` (ponto)
7. Clique em "Deploy site"

### 2.2 Configurar Variáveis de Ambiente
1. No dashboard do site na Netlify
2. Vá em **Site Settings** → **Environment Variables**
3. Clique em "Add environment variable"
4. Adicione essas variáveis:

| Name | Value |
|------|--------|
| `SUPABASE_URL` | `https://seu-id-unico.supabase.co` |
| `SUPABASE_ANON_KEY` | `eyJ0eXAiOiJKV1QiLCJhbGc...` |
| `NODE_ENV` | `production` |

### 2.3 Configurar Domínio (Opcional)
1. Em **Domain Settings** → **Custom domains**
2. Clique em "Add custom domain"
3. Digite seu domínio
4. Configure DNS conforme instruções

### 2.4 Fazer Redeploy
1. Vá em **Deploys**
2. Clique em "Trigger deploy" → "Deploy site"
3. Aguarde o deploy completar

## ✅ Passo 3: Testar o Sistema

### 3.1 Primeiro Acesso
1. Acesse seu site: `https://seu-site.netlify.app`
2. Deve aparecer a página de login
3. Clique em "Criar conta"
4. Cadastre-se com um email válido
5. Verifique seu email e confirme a conta

### 3.2 Testar Funcionalidades
1. **Login**: Faça login com sua conta
2. **Dashboard**: Verifique se carrega sem erros
3. **Cadastrar Aluno**: Vá em Gestão de Alunos e cadastre um aluno teste
4. **Registrar Medida**: Teste registrar uma medida disciplinar
5. **Relatórios**: Veja se os dados aparecem nos relatórios

### 3.3 Verificar Logs
1. **Netlify**: Functions → View logs
2. **Supabase**: Dashboard → Logs
3. **Browser**: Console (F12) para erros JavaScript

## 🔍 Troubleshooting

### Erro: "Failed to fetch"
**Causa**: Variáveis de ambiente não configuradas
**Solução**: Verifique se `SUPABASE_URL` e `SUPABASE_ANON_KEY` estão corretas

### Erro: "Row Level Security"
**Causa**: Usuário não autenticado ou políticas RLS mal configuradas
**Solução**: Execute novamente os comandos SQL do Passo 1.4

### Site não carrega
**Causa**: Problema nas configurações do Netlify
**Solução**: 
1. Verifique se `netlify.toml` está na raiz
2. Confirme que o branch está correto
3. Veja os logs de build

### Autenticação não funciona
**Causa**: URLs de redirecionamento incorretas
**Solução**: 
1. Vá no Supabase → Authentication → Settings
2. Adicione as URLs corretas do seu domínio

## 📱 Passo 4: Configurações Finais

### 4.1 Backup Automático
1. No Supabase, vá em **Settings** → **Database**
2. Configure backups automáticos
3. Recomendado: backup diário

### 4.2 Monitoramento
1. **Netlify**: Configure notificações de deploy
2. **Supabase**: Configure alertas de uso
3. **Uptime**: Use um serviço como UptimeRobot

### 4.3 Segurança
1. **HTTPS**: Já habilitado automaticamente
2. **Headers**: Configurados via `_headers`
3. **CSP**: Content Security Policy configurada

## 🎯 Próximos Passos

### Melhorias Recomendadas
- [ ] Configurar domínio personalizado
- [ ] Implementar backup regular
- [ ] Configurar monitoramento
- [ ] Adicionar mais usuários
- [ ] Configurar perfis de acesso diferentes

### Manutenção
- [ ] Verificar logs semanalmente
- [ ] Atualizar dados regularmente
- [ ] Monitorar uso do Supabase
- [ ] Revisar políticas de segurança

## 📞 Suporte

### Em caso de problemas:
1. **Verifique os logs**: Netlify e Supabase
2. **Teste localmente**: Use `python -m http.server 8000`
3. **Console do browser**: Pressione F12 e veja erros
4. **Issues no GitHub**: Reporte problemas específicos

### Contatos de Emergência:
- **Supabase Support**: support@supabase.io
- **Netlify Support**: support@netlify.com
- **Documentação**: Este README.md

---

## 🏁 Conclusão

Seguindo este guia, você terá:
- ✅ Sistema rodando na Netlify
- ✅ Banco de dados Supabase configurado
- ✅ Autenticação funcionando
- ✅ HTTPS e segurança configurados
- ✅ Deploy automático ativo

**Tempo estimado**: 30-45 minutos para iniciantes

Agora seu Sistema Disciplinar Jupiara está pronto para uso em produção! 🎉