# 🔑 INSTRUÇÕES: Configurar API Key do Google Gemini

## PASSO 1: Criar API Key (GRATUITA)

1. Acesse: **https://aistudio.google.com/app/apikey**

2. Faça login com sua conta Google

3. Clique em **"Create API Key"** (ou "Get API key")

4. Selecione:
   - **"Create API key in new project"** (se não tiver projeto)
   - OU selecione um projeto existente

5. **COPIE a chave gerada** (será algo como: `AIzaSyXXXXXXXXXXXXXXXXXXXXXXXX`)

6. ⚠️ **ATENÇÃO:** Guarde esta chave em local seguro! Não compartilhe publicamente!

---

## PASSO 2: Configurar no Netlify

### Opção A: Via Dashboard do Netlify (RECOMENDADO)

1. Acesse: **https://app.netlify.com**

2. Faça login e selecione o site: **"Sistema-Disciplinar-Jupiara"**

3. Vá em: **"Site settings"** (Configurações do site)

4. No menu lateral, clique em: **"Environment variables"**

5. Clique em **"Add a variable"** (Adicionar variável)

6. Preencha:
   - **Key (Chave):** `GEMINI_API_KEY`
   - **Value (Valor):** Cole a API Key que você copiou no PASSO 1
   - **Scopes:** Marque "All scopes" (todos os escopos)

7. Clique em **"Create variable"** (Criar variável)

8. ✅ **PRONTO!** A variável está configurada

9. **IMPORTANTE:** Após salvar, faça um novo deploy:
   - Vá em **"Deploys"** > **"Trigger deploy"** > **"Deploy site"**

### Opção B: Via Netlify CLI (Linha de Comando)

Se preferir usar o terminal:

```bash
# 1. Instalar Netlify CLI (se não tiver)
npm install -g netlify-cli

# 2. Fazer login
netlify login

# 3. Acessar a pasta do projeto
cd "C:\Users\attil\OneDrive\Área de Trabalho\Sistemas\Jupiara\Sistema-Disciplinar-Jupiara-main"

# 4. Configurar a variável
netlify env:set GEMINI_API_KEY "SUA_API_KEY_AQUI"

# 5. Fazer deploy
netlify deploy --prod
```

---

## PASSO 3: Testar a Configuração

Após fazer o deploy, teste a API:

1. Abra o navegador em: `https://SEU-SITE.netlify.app/api/gemini-assistant`

2. Você deve ver um erro **405** (isso é normal! Significa que a function existe)

3. Se ver **404**, aguarde 1-2 minutos e tente novamente

---

## 📊 LIMITES GRATUITOS DO GEMINI

O plano gratuito do Google Gemini API inclui:

- ✅ **15 requisições por minuto**
- ✅ **1.500 requisições por dia**
- ✅ **1 milhão de tokens por mês**

Para uso escolar (poucos inspetores), isso é **MAIS QUE SUFICIENTE**!

**Exemplo:** Se cada medida usa ~500 tokens, você pode processar **2.000+ medidas por mês** gratuitamente.

---

## 🔒 SEGURANÇA

✅ **BOM:** API Key nas Environment Variables do Netlify
  - Não fica exposta no código
  - Não é visível no GitHub
  - Apenas o servidor consegue acessar

❌ **RUIM:** API Key diretamente no código JavaScript
  - Qualquer pessoa pode ver no código-fonte da página
  - Pode ser roubada e usada por terceiros

---

## ❓ TROUBLESHOOTING

### Problema: "GEMINI_API_KEY não configurada"

**Solução:**
1. Verifique se a variável foi salva no Netlify
2. Certifique-se que o nome está EXATAMENTE assim: `GEMINI_API_KEY`
3. Faça um novo deploy após configurar

### Problema: "403 Forbidden" ou "Invalid API Key"

**Solução:**
1. Verifique se copiou a chave completa (sem espaços extras)
2. Confirme que a API do Gemini está ativada em: https://console.cloud.google.com/apis/library/generativelanguage.googleapis.com
3. Gere uma nova API Key se necessário

### Problema: "429 Too Many Requests"

**Solução:**
- Você excedeu o limite gratuito (15 req/min ou 1500 req/dia)
- Aguarde alguns minutos e tente novamente
- Considere implementar cache no frontend para reduzir chamadas

---

## 📝 PRÓXIMOS PASSOS

Após configurar a API Key, Claude Code continuará com:

- ✅ FASE 2: Estrutura do Supabase
- ✅ FASE 3: Melhorias no formulário
- ✅ FASE 4: Integração da IA
- ✅ FASE 5: Gerador de PDF

---

**Dúvidas?** Cole o erro no chat e Claude Code te ajudará! 🚀
