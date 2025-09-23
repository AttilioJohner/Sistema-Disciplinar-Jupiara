// 📱 Webhook para receber mensagens do WhatsApp via WAHA
// Integração com Sistema Disciplinar EECM Jupiara
// v2.0 - Deploy forçado

const https = require('https');

exports.handler = async (event, context) => {
  // Headers CORS para permitir requisições do Railway
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Responder OPTIONS para CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  // Só aceitar POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido' })
    };
  }

  try {
    // Parse do body da requisição
    const data = JSON.parse(event.body || '{}');

    // Log detalhado para debug
    console.log('🔔 Webhook recebido:', {
      timestamp: new Date().toISOString(),
      event: data.event,
      session: data.session,
      payload: data.payload
    });

    // Verificar se é uma mensagem recebida
    if (data.event === 'message' && data.payload) {
      const message = data.payload;

      // Só processar mensagens recebidas (não enviadas por nós)
      if (!message.fromMe) {
        await processIncomingMessage(message);
      }
    }

    // Responder OK para o WAHA
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Webhook processado com sucesso',
        timestamp: new Date().toISOString()
      })
    };

  } catch (error) {
    console.error('❌ Erro no webhook:', error);

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erro interno no webhook',
        message: error.message
      })
    };
  }
};

// Processar mensagem recebida
async function processIncomingMessage(message) {
  console.log('📨 Processando mensagem:', {
    from: message.from,
    body: message.body,
    type: message.type,
    timestamp: message.timestamp
  });

  // Extrair número do remetente (remover @c.us)
  const phoneNumber = message.from.replace('@c.us', '');

  // Verificar se é um comando ou consulta
  const messageBody = message.body.toLowerCase().trim();

  // Comandos disponíveis
  if (messageBody.startsWith('/')) {
    await handleCommand(phoneNumber, messageBody, message);
  } else {
    // Mensagem livre - pode ser resposta automática
    await handleFreeMessage(phoneNumber, messageBody, message);
  }
}

// Lidar com comandos
async function handleCommand(phoneNumber, command, originalMessage) {
  console.log(`🤖 Comando recebido de ${phoneNumber}: ${command}`);

  let response = '';

  switch (command) {
    case '/help':
    case '/ajuda':
      response = `📚 *Sistema Disciplinar EECM Jupiara*\n\n` +
                `Comandos disponíveis:\n` +
                `• /help - Esta ajuda\n` +
                `• /status - Status do aluno\n` +
                `• /ocorrencias - Últimas ocorrências\n` +
                `• /contato - Falar com a escola\n\n` +
                `Digite o *nome do aluno* para consultar informações.`;
      break;

    case '/status':
      response = `ℹ️ Para consultar o status, envie o nome do aluno.`;
      break;

    case '/ocorrencias':
      response = `📋 Para ver ocorrências, envie o nome do aluno.`;
      break;

    case '/contato':
      response = `📞 *Contatos da EECM Jupiara*\n\n` +
                `📱 WhatsApp: (66) 8101-0652\n` +
                `📧 Email: eecmjupiara@gmail.com\n` +
                `🏫 Endereço: Jupiara - MT\n\n` +
                `Horário de atendimento: 7h às 17h`;
      break;

    default:
      response = `❓ Comando não reconhecido.\n\nDigite /help para ver os comandos disponíveis.`;
  }

  // Enviar resposta
  await sendWhatsAppMessage(phoneNumber, response);
}

// Lidar com mensagens livres
async function handleFreeMessage(phoneNumber, messageBody, originalMessage) {
  console.log(`💬 Mensagem livre de ${phoneNumber}: ${messageBody}`);

  // Verificar se parece com nome de aluno
  if (messageBody.length > 3 && /^[a-záàâãäéèêëíìîïóòôõöúùûüç\s]+$/i.test(messageBody)) {
    // Buscar informações do aluno
    const studentInfo = await searchStudent(messageBody);

    if (studentInfo) {
      const response = formatStudentInfo(studentInfo);
      await sendWhatsAppMessage(phoneNumber, response);
    } else {
      const response = `🔍 Aluno "${messageBody}" não encontrado.\n\n` +
                      `Verifique a grafia ou entre em contato com a escola.\n\n` +
                      `Digite /help para ver os comandos disponíveis.`;
      await sendWhatsAppMessage(phoneNumber, response);
    }
  } else {
    // Resposta padrão para mensagens não reconhecidas
    const response = `👋 Olá! Sou o assistente do Sistema Disciplinar da EECM Jupiara.\n\n` +
                    `Digite o *nome do aluno* para consultar informações ou /help para ver os comandos.`;
    await sendWhatsAppMessage(phoneNumber, response);
  }
}

// Buscar informações do aluno (simulado - integrar com Supabase depois)
async function searchStudent(studentName) {
  // TODO: Integrar com Supabase para buscar dados reais
  console.log(`🔍 Buscando aluno: ${studentName}`);

  // Por enquanto, retorna dados fictícios para teste
  if (studentName.toLowerCase().includes('joão') || studentName.toLowerCase().includes('joao')) {
    return {
      id: '2025001',
      nome: 'João Silva Santos',
      turma: '8A',
      status: 'ativo',
      responsavel: 'Maria Santos',
      telefone: '66999999999',
      ocorrencias: [
        { data: '2025-01-15', tipo: 'Advertência', motivo: 'Atraso' },
        { data: '2025-01-10', tipo: 'Elogio', motivo: 'Participação exemplar' }
      ]
    };
  }

  return null; // Aluno não encontrado
}

// Formatar informações do aluno
function formatStudentInfo(student) {
  let response = `👤 *${student.nome}*\n\n`;
  response += `🆔 Matrícula: ${student.id}\n`;
  response += `🏫 Turma: ${student.turma}\n`;
  response += `📊 Status: ${student.status.toUpperCase()}\n`;
  response += `👨‍👩‍👧‍👦 Responsável: ${student.responsavel}\n\n`;

  if (student.ocorrencias && student.ocorrencias.length > 0) {
    response += `📋 *Últimas Ocorrências:*\n\n`;
    student.ocorrencias.forEach((ocorrencia, index) => {
      const emoji = ocorrencia.tipo === 'Elogio' ? '✅' : '⚠️';
      response += `${emoji} ${ocorrencia.data} - ${ocorrencia.tipo}\n`;
      response += `   ${ocorrencia.motivo}\n\n`;
    });
  } else {
    response += `✅ *Nenhuma ocorrência registrada.*\n\n`;
  }

  response += `Digite /help para mais opções.`;

  return response;
}

// Enviar mensagem via WAHA
async function sendWhatsAppMessage(phoneNumber, message) {
  try {
    const wahaUrl = 'https://waha-production-7ba4.up.railway.app';
    const endpoint = `${wahaUrl}/api/sendText`;

    const payload = {
      chatId: `${phoneNumber}@c.us`,
      text: message
    };

    console.log(`📤 Enviando resposta para ${phoneNumber}:`, message.substring(0, 100) + '...');

    // Usar fetch se disponível, senão usar https nativo
    if (typeof fetch !== 'undefined') {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        console.log(`✅ Mensagem enviada com sucesso para ${phoneNumber}`);
      } else {
        console.error(`❌ Erro ao enviar mensagem:`, await response.text());
      }
    } else {
      // Fallback para Node.js nativo
      const postData = JSON.stringify(payload);
      const url = new URL(endpoint);

      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = https.request(options, (res) => {
        console.log(`✅ Mensagem enviada - Status: ${res.statusCode}`);
      });

      req.on('error', (e) => {
        console.error(`❌ Erro ao enviar mensagem:`, e);
      });

      req.write(postData);
      req.end();
    }

  } catch (error) {
    console.error('❌ Erro ao enviar mensagem WhatsApp:', error);
  }
}