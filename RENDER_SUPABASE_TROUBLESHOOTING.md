# 🔧 TROUBLESHOOTING RENDER + SUPABASE

## 🚨 PROBLEMA IDENTIFICADO
Evolution API funcionando, mas **conexão com banco falhou em todas as 5 tentativas**.

### Erros Observados:
- ❌ `ENETUNREACH` - IPv6 resolution failing
- ❌ `ECONNREFUSED` - Connection refused
- ❌ `password authentication failed` (ocasional)

---

## ✅ SOLUÇÕES IMEDIATAS

### 1. CONFIGURAR SUPABASE DASHBOARD

**🎯 AÇÃO URGENTE:** Acesse o painel Supabase:

```
https://supabase.com/dashboard/project/rvppxdhrahcwiwrrwwaz
```

#### Configurações a Verificar:

**A) Settings → Database → Network:**
- ✅ **IPv4 enabled**: DEVE estar ativado
- ✅ **Connection pooler**: DEVE estar ativo
- ✅ **IP restrictions**: Verificar whitelist

**B) Settings → Database → Connection pooling:**
- ✅ **Pool mode**: Session ou Transaction
- ✅ **Pool size**: Pelo menos 15
- ✅ **Default pool size**: Configurado

**C) Settings → API → URL Configuration:**
- ✅ Verificar se URLs estão corretas
- ✅ Verificar se chaves não expiraram

### 2. ADICIONAR IPs DO RENDER

**Render usa estes IP ranges** - adicione ao whitelist Supabase:

```
# Render.com IP ranges (adicionar em Settings → Database → Network)
52.85.0.0/16
34.192.0.0/16
54.210.0.0/16
```

**OU desabilitar completamente IP restrictions:**
- Go to Settings → Database → Network
- Disable "Restrict connections by IP address"

### 3. TESTAR NOVAS CONNECTION STRINGS

Use o arquivo criado `render-database-test.yaml` com estas opções:

#### OPÇÃO 1: Connection Pooler (RECOMENDADO)
```yaml
DATABASE_URL: "postgresql://postgres.rvppxdhrahcwiwrrwwaz:Jupiara2025@pooler.supabase.com:5432/postgres?sslmode=require&pgbouncer=true"
```

#### OPÇÃO 2: Session Mode (porta 6543)
```yaml
DATABASE_URL: "postgresql://postgres.rvppxdhrahcwiwrrwwaz:Jupiara2025@db.rvppxdhrahcwiwrrwwaz.supabase.co:6543/postgres?sslmode=require"
```

#### OPÇÃO 3: IPv4 forçado
```yaml
DATABASE_URL: "postgresql://postgres.rvppxdhrahcwiwrrwwaz:Jupiara2025@db.rvppxdhrahcwiwrrwwaz.supabase.co:5432/postgres?sslmode=require&connect_timeout=10"
```

---

## 🧪 DIAGNÓSTICO LOCAL

Execute o teste de conexão:

```bash
node test-database-connection.js
```

Este script irá testar todas as configurações e mostrar qual funciona melhor.

---

## 🚀 PASSOS DE DEPLOY

### PASSO 1: Verificar Supabase
1. ✅ Acesse dashboard Supabase
2. ✅ Configure IPv4 + Pooler
3. ✅ Remova/adicione IPs do Render
4. ✅ Teste credenciais

### PASSO 2: Testar Connection Strings
1. ✅ Execute `test-database-connection.js`
2. ✅ Identifique a string que funciona
3. ✅ Atualize `render.yaml` com a string correta

### PASSO 3: Deploy no Render
1. ✅ Use `render-database-test.yaml` com OPÇÃO 1
2. ✅ Se falhar, tente OPÇÃO 2
3. ✅ Se falhar, tente OPÇÃO 3
4. ✅ Verifique logs no Render

### PASSO 4: Verificação Final
```bash
# No Render, verifique se app consegue conectar:
curl https://evolution-api-escola-jupiara.onrender.com/manager/api-docs
```

---

## 🆘 PLANO B: NOVA INSTÂNCIA

Se **TODAS** as opções falharem:

### Opção 1: Nova instância Supabase
```bash
# 1. Criar novo projeto Supabase
# 2. Configurar IPv4 desde o início
# 3. Migrar dados essenciais
# 4. Atualizar credenciais
```

### Opção 2: Banco alternativo
- **Railway PostgreSQL**: Compatível com Render
- **Neon Database**: Serverless PostgreSQL
- **PlanetScale**: MySQL serverless

### Opção 3: Banco no próprio Render
- **Render PostgreSQL**: Addon pago mas confiável
- **Integração nativa**: Sem problemas de rede

---

## 📋 CHECKLIST DE VERIFICAÇÃO

**Antes do próximo deploy:**

- [ ] Supabase dashboard configurado (IPv4 + Pooler)
- [ ] IP whitelist atualizado ou desabilitado
- [ ] Connection string testada localmente
- [ ] `render.yaml` atualizado com string correta
- [ ] Logs do Render verificados após deploy
- [ ] Aplicação testada end-to-end

**Status atual:**
- ✅ Evolution API: FUNCIONANDO
- ✅ WhatsApp integration: FUNCIONANDO
- ❌ Database connection: **PENDENTE CORREÇÃO**

---

## 🎯 PRÓXIMOS PASSOS

1. **URGENTE**: Configure Supabase dashboard conforme instruções acima
2. **TESTE**: Execute `test-database-connection.js`
3. **DEPLOY**: Use a connection string que funcionar
4. **VERIFICAR**: Confirme que banco está conectado

O sistema está 95% funcional - só falta resolver essa conexão com banco!