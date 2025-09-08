# 📧 Configurar Autenticação Sem Email

## 🎯 Objetivo
Permitir cadastro e login de usuários sem necessidade de verificação de email.

## ⚙️ Configuração no Supabase Dashboard

### 1️⃣ Desabilitar Verificação de Email

1. Acesse **Supabase Dashboard** → seu projeto
2. Vá para **Authentication** → **Providers** → **Email**
3. **DESMARQUE**: `Confirm email` (Confirmação de email)
4. **DESMARQUE**: `Secure email change` 
5. **DESMARQUE**: `Secure password change`
6. Clique em **Save**

### 2️⃣ Configurar Auto-Confirmação

1. Ainda em **Authentication** → **Settings**
2. Em **Auth Settings**:
   - `Enable email confirmations`: **DESLIGADO**
   - `Enable email change confirmations`: **DESLIGADO**
3. Clique em **Save**

### 3️⃣ Executar Script SQL

1. Vá para **SQL Editor**
2. Execute o conteúdo de: `sql/setup-usuarios-sistema.sql`
3. Isso criará:
   - Tabela `usuarios_sistema` para mapear username → email
   - Políticas RLS apropriadas
   - Usuário admin padrão

## 🔧 Como Funciona

### Fluxo de Cadastro:
1. Admin acessa `/pages/cadastro-usuario.html`
2. Preenche: username, email, senha
3. Sistema cria:
   - Usuário no Supabase Auth (já confirmado)
   - Registro em `usuarios_sistema` com username

### Fluxo de Login:
1. Usuário acessa `/pages/login.html`
2. Pode usar **username** OU **email**
3. Sistema:
   - Se for username → busca email na tabela `usuarios_sistema`
   - Se for email → login direto
   - Autentica com Supabase Auth

## 📝 Criar Usuários Programaticamente

```javascript
// No console do navegador ou via código
const result = await window.unifiedAuth.createUserNoEmail(
  'maria.silva',           // username
  'maria@escola.com',      // email
  'senha123',              // senha
  'Maria da Silva'         // nome completo
);

console.log(result);
```

## 🚀 Vantagens

✅ **Cadastro imediato** - Sem aguardar confirmação  
✅ **Login simplificado** - Username ou email  
✅ **Controle total** - Admin gerencia usuários  
✅ **Sem emails externos** - Tudo local  

## ⚠️ Importante

- Senhas devem ter no mínimo 6 caracteres
- Usernames: apenas letras, números e underscore
- Emails devem ser únicos no sistema
- Username → email é mapeamento 1:1

## 🆘 Troubleshooting

**Erro: "User not confirmed"**
- Verifique se desabilitou confirmação de email no Dashboard

**Erro: "Username já existe"**
- Username deve ser único na tabela `usuarios_sistema`

**Erro: "Email já cadastrado"**
- Email já existe no Supabase Auth

## 📌 URLs Importantes

- **Cadastro**: `/pages/cadastro-usuario.html`
- **Login**: `/pages/login.html`
- **Dashboard**: `/index.html`