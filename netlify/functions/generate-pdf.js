// Netlify Function: Gerador de PDF para Medidas Disciplinares
// Gera PDF de FMD (Ficha de Medida Disciplinar) ou FO (Fato Observado)

// IMPORTANTE: Esta função retorna o PDF em base64 para ser usado no frontend

exports.handler = async (event, context) => {
  // Headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Responder OPTIONS (preflight)
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Apenas aceitar POST
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido. Use POST.' })
    };
  }

  try {
    // Parse do body
    const dados = JSON.parse(event.body);

    // Validação básica
    if (!dados.tipo || !dados.aluno || !dados.fato) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Campos obrigatórios: tipo, aluno, fato' })
      };
    }

    console.log('📄 Gerando PDF:', dados.tipo, 'para', dados.aluno.nome);

    // Nota: jsPDF não funciona bem no backend Node.js
    // Vamos retornar os dados estruturados para gerar PDF no frontend
    // O frontend usará jsPDF que já está carregado via CDN

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: 'Dados preparados para geração de PDF no frontend',
        dados: dados
      })
    };

  } catch (error) {
    console.error('❌ Erro ao preparar PDF:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};
