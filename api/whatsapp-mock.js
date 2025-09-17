// API Mock para WhatsApp - Escola Jupiara
// Simula a Evolution API localmente

const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Simular status da API
app.get('/', (req, res) => {
  res.json({
    status: 200,
    message: "Evolution API Mock - Escola Jupiara funcionando!",
    version: "1.0.0-mock",
    clientName: "escola_jupiara_mock"
  });
});

// Simular conexão WhatsApp
app.get('/instance/connect/:instance', (req, res) => {
  const { instance } = req.params;
  
  console.log(`Simulando conexão WhatsApp para instância: ${instance}`);
  
  res.json({
    status: 200,
    message: "QR Code gerado com sucesso (simulado)",
    qrcode: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMockQRCode...",
    instance: instance
  });
});

// Simular envio de mensagem
app.post('/message/sendText/:instance', (req, res) => {
  const { instance } = req.params;
  const { number, text } = req.body;
  const apikey = req.headers.apikey;
  
  console.log(`📱 SIMULANDO ENVIO WhatsApp:`);
  console.log(`   Instância: ${instance}`);
  console.log(`   Número: ${number}`);
  console.log(`   Mensagem: ${text}`);
  console.log(`   API Key: ${apikey}`);
  
  // Simular sucesso
  res.json({
    status: 200,
    message: "Mensagem enviada com sucesso (simulado)",
    data: {
      instance,
      number,
      text,
      timestamp: new Date().toISOString(),
      messageId: `mock_${Date.now()}`
    }
  });
});

// Status da instância
app.get('/instance/connectionState/:instance', (req, res) => {
  const { instance } = req.params;
  
  res.json({
    status: 200,
    instance: {
      instanceName: instance,
      state: "open"
    }
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`🚀 API Mock WhatsApp rodando em http://localhost:${PORT}`);
  console.log(`📱 Teste: http://localhost:${PORT}/instance/connect/escola_jupiara_principal`);
});