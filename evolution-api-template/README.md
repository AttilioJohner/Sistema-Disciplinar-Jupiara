# Evolution API - Escola Estadual Cívico-Militar Jupiara

Template personalizado da Evolution API para o sistema de comunicação automática da escola.

## 🚀 Deploy Rápido no Render

### Opção 1: Deploy com 1 Clique
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/AttilioJohner/evolution-api-escola-jupiara)

### Opção 2: Deploy Manual

1. **Fork este repositório**
2. **Crie conta no Render.com**
3. **New Web Service** → Conecte este repositório
4. **Configurações automáticas** (já estão no render.yaml)
5. **Deploy!**

## 📱 Configuração Pós-Deploy

### 1. Obter URL da API
Após o deploy, você receberá uma URL como:
```
https://evolution-api-escola-jupiara.onrender.com
```

### 2. Conectar WhatsApp
1. Acesse: `https://sua-url/instance/connect/escola_jupiara_principal`
2. Escaneie o QR Code com WhatsApp
3. ✅ Pronto!

### 3. Configurar no Sistema da Escola
1. Acesse: https://eecmjupiara.netlify.app/pages/comunicacao.html
2. Vá em "Configurações"
3. Configure:
   - **URL da Evolution API**: `https://sua-url`
   - **Instance Name**: `escola_jupiara_principal`  
   - **API Key**: `escola_jupiara_2025_secure_key`

## 🧪 Testar API

### Enviar Mensagem de Teste
```bash
curl -X POST https://sua-url/message/sendText/escola_jupiara_principal \
  -H "Content-Type: application/json" \
  -H "apikey: escola_jupiara_2025_secure_key" \
  -d '{
    "number": "5566999999999",
    "text": "🏫 Teste da Evolution API - Escola Jupiara funcionando!"
  }'
```

### Status da Instância
```bash
curl https://sua-url/instance/connectionState/escola_jupiara_principal \
  -H "apikey: escola_jupiara_2025_secure_key"
```

## 📋 Endpoints Principais

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/instance/connect/{instance}` | GET | Conectar WhatsApp (QR Code) |
| `/instance/connectionState/{instance}` | GET | Status da conexão |
| `/message/sendText/{instance}` | POST | Enviar mensagem |
| `/instance/logout/{instance}` | DELETE | Desconectar |

## 🔧 Configurações

### Variáveis de Ambiente Principais
- `AUTHENTICATION_API_KEY`: Chave de segurança da API
- `CONFIG_SESSION_PHONE_CLIENT`: Nome que aparece no WhatsApp
- `SERVER_PORT`: Porta do servidor (10000 no Render)

### Limites do Plano Gratuito Render
- ✅ **750 horas/mês** (suficiente para escola)
- ✅ **Sem limite de mensagens** 
- ✅ **SSL automático**
- ⚠️ **Hiberna após 15min sem uso** (primeira mensagem pode demorar 30s)

## 🛠️ Troubleshooting

### API não responde
1. Verifique se o serviço está rodando no Render
2. Aguarde até 30 segundos (hibernação)
3. Teste endpoint: `GET /`

### WhatsApp desconecta
1. Reconecte: `/instance/connect/escola_jupiara_principal`
2. Escaneie novo QR Code
3. Mantenha WhatsApp aberto no celular

### Mensagens não chegam
1. Verifique status: `/instance/connectionState/escola_jupiara_principal`
2. Confirme número no formato: `5566999999999` 
3. Teste com seu próprio número primeiro

## 📞 Suporte

- **Sistema Escola**: https://eecmjupiara.netlify.app
- **Documentação Evolution**: https://doc.evolution-api.com
- **Issues**: https://github.com/AttilioJohner/evolution-api-escola-jupiara/issues

---

**Template criado especificamente para E.E.C.M. Jupiara**  
*Sistema de Comunicação Automática com Pais/Responsáveis*