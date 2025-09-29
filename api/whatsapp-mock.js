// API Mock para WhatsApp - Escola Jupiara
// Simula a Evolution API localmente

const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// ⭐ Middleware para rastrear atividade (ajuda o auto-sleep)
let lastActivity = Date.now();
let totalRequests = 0;

app.use((req, res, next) => {
  lastActivity = Date.now();
  totalRequests++;
  console.log(`📊 Request #${totalRequests} - ${req.method} ${req.path}`);
  next();
});

// Health check otimizado para Railway auto-sleep
app.get('/', (req, res) => {
  const uptime = process.uptime();
  const minutesSinceActivity = Math.floor((Date.now() - lastActivity) / 60000);

  res.json({
    status: 200,
    message: "Evolution API Mock - Escola Jupiara funcionando!",
    version: "1.0.0-mock",
    clientName: "escola_jupiara_mock",
    uptime: `${Math.floor(uptime / 60)}m ${Math.floor(uptime % 60)}s`,
    totalRequests: totalRequests,
    lastActivity: new Date(lastActivity).toLocaleString('pt-BR'),
    sleepInfo: {
      enabled: true,
      sleepsAfter: "30 minutos sem atividade",
      wakesOn: "Qualquer requisição HTTP",
      coldStart: "10-30 segundos"
    }
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

const PORT = process.env.PORT || 3001;

// Configurações otimizadas para Railway auto-sleep
const server = app.listen(PORT, () => {
  console.log(`🚀 API Mock WhatsApp rodando em http://localhost:${PORT}`);
  console.log(`📱 Teste: http://localhost:${PORT}/instance/connect/escola_jupiara_principal`);
  console.log(`💤 Auto-sleep: ATIVO (dorme após 30min sem uso)`);
  console.log(`⚡ Wake-up: AUTOMÁTICO (qualquer request HTTP)`);
});

// Graceful shutdown para Railway
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM recebido, fechando servidor...');
  server.close(() => {
    console.log('✅ Servidor fechado gracefully');
    process.exit(0);
  });
});

// Log de atividade a cada 10 minutos
setInterval(() => {
  const minutesSinceActivity = Math.floor((Date.now() - lastActivity) / 60000);
  console.log(`⏰ Atividade: última há ${minutesSinceActivity} minutos`);

  if (minutesSinceActivity >= 25) {
    console.log(`💤 AVISO: Auto-sleep em ~${30 - minutesSinceActivity} minutos`);
  }
}, 10 * 60 * 1000); // A cada 10 minutos