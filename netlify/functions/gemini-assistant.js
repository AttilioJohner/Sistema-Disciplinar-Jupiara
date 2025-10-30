// Netlify Function: Assistente IA para Medidas Disciplinares
// Usa Google Gemini API para corrigir textos e sugerir artigos do regulamento

// Fetch é nativo no Node 18+ (usado pelo Netlify)

// Configuração da API Gemini
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
// Modelo verificado: gemini-2.5-flash (disponível para esta API Key)
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

// Contexto dos regulamentos EECM-MT (será expandido com parsing dos PDFs)
const CONTEXTO_REGULAMENTO = `
Você é um assistente especializado em regulamentos disciplinares de Escolas Estaduais Cívico-Militares (EECM) do Estado de Mato Grosso.

REFERÊNCIAS PRINCIPAIS:
- Regulamento Disciplinar das EECM-MT
- Manual de Conduta EECM
- Diretrizes Estaduais e Nacionais

ARTIGOS PRINCIPAIS:

Art. 6º – O estudante deve pautar sua conduta pelo respeito mútuo, disciplina e cumprimento das normas institucionais.

Art. 7º, inciso II – É dever do aluno cumprir as normas disciplinares da unidade escolar.

Art. 9º – As faltas disciplinares de natureza média são as relacionadas à ação ou omissão do aluno que interferem na ordem interna, rotina escolar, convivência coletiva, deveres e obrigações ou à prática de reiteradas faltas disciplinares classificadas como de natureza leve.

Art. 14º – A advertência oral é a medida disciplinar branda, que consiste em advertir o aluno sobre fato praticado contrário à disciplina.
§ 1º A advertência será aplicada no cometimento de faltas disciplinares de natureza leve.

Art. 15º – A advertência escrita é aplicável aos casos de cometimento de faltas disciplinares de natureza média ou pela reincidência de faltas de natureza leve.

Art. 34º – São Circunstâncias atenuantes:
- inciso I – Ser aluno novato até 03 (três) meses, a contar da data de ingresso na EECM;

ANEXO I - FALTAS DISCIPLINARES (exemplos):
- Item 16: Fazer ou provocar excessivo barulho em qualquer dependência da EECM, durante o horário de aula.
- Item 18: Perturbar o estudo do(s) colega(s), com ruídos ou brincadeiras.
- Item 56: Ser retirado, por mau comportamento, de sala de aula ou qualquer ambiente em que esteja sendo realizada atividade.
- Item 84: Promover, incitar ou envolver-se em rixa, inclusive luta corporal, dentro ou fora da EECM, estando ou não uniformizado.

LINGUAGEM ESPERADA:
- Formal, técnica, educacional
- Impessoal e objetiva
- Baseada em fatos observáveis
- Referência aos valores: respeito, disciplina, hierarquia
`;

// Handler principal
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
    console.log('🚀 Iniciando processamento...');

    // Verificar API Key
    if (!GEMINI_API_KEY) {
      console.error('❌ GEMINI_API_KEY não configurada');
      throw new Error('GEMINI_API_KEY não configurada nas environment variables');
    }
    console.log('✅ API Key configurada');

    // Parse do body
    console.log('📦 Parseando body da requisição...');
    const { fato, faltasSelecionadas, tipoDocumento, aluno, data } = JSON.parse(event.body);

    if (!fato || !fato.trim()) {
      console.error('❌ Campo fato vazio');
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Campo "fato" é obrigatório' })
      };
    }

    console.log('📝 Processando fato:', fato.substring(0, 100) + '...');
    console.log('📋 Faltas selecionadas:', faltasSelecionadas);

    // Construir prompt para o Gemini
    console.log('🔨 Construindo prompt...');
    const prompt = construirPrompt({
      fato,
      faltasSelecionadas: faltasSelecionadas || [],
      tipoDocumento: tipoDocumento || 'FMD',
      aluno,
      data
    });
    console.log('✅ Prompt construído, tamanho:', prompt.length);

    // Chamar Gemini API
    console.log('🤖 Chamando API Gemini...');
    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.5, // Reduzido de 0.7 para ser mais determinístico e rápido
          topK: 20,         // Reduzido de 40
          topP: 0.8,        // Reduzido de 0.95
          maxOutputTokens: 1024, // REDUZIDO de 2048 para 1024 (50% mais rápido)
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      })
    });

    console.log('📡 Resposta Gemini recebida, status:', geminiResponse.status);

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('❌ Erro na API Gemini:', geminiResponse.status, errorText.substring(0, 200));
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText.substring(0, 100)}`);
    }

    console.log('📄 Parseando resposta JSON...');
    const geminiData = await geminiResponse.json();
    console.log('✅ JSON parseado. Estrutura:', JSON.stringify(geminiData).substring(0, 300));

    // Verificar se há candidates
    if (!geminiData.candidates || geminiData.candidates.length === 0) {
      console.error('❌ Nenhum candidate retornado. Resposta completa:', JSON.stringify(geminiData));
      throw new Error('API Gemini não retornou resultados. Possível bloqueio por safety filters.');
    }

    const candidate = geminiData.candidates[0];
    console.log('📋 Candidate finishReason:', candidate.finishReason);

    // Extrair texto da resposta
    console.log('🔍 Extraindo texto da resposta...');
    const textoGerado = candidate?.content?.parts?.[0]?.text;

    if (!textoGerado) {
      console.error('❌ Resposta vazia. FinishReason:', candidate.finishReason);
      console.error('❌ Candidate completo:', JSON.stringify(candidate));

      // Se foi bloqueado por safety, retornar erro específico
      if (candidate.finishReason === 'SAFETY') {
        throw new Error('Conteúdo bloqueado pelos filtros de segurança da IA. Tente reformular o texto.');
      }

      throw new Error('Resposta vazia da API Gemini');
    }

    console.log('✅ Texto extraído, tamanho:', textoGerado.length);

    // Parsear resposta JSON do Gemini
    console.log('🔄 Parseando resposta do Gemini...');
    const resultado = parseResposta(textoGerado);
    console.log('✅ Resposta parseada com sucesso');

    console.log('🎉 Processamento concluído com sucesso!');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: resultado,
        metadata: {
          processedAt: new Date().toISOString(),
          model: 'gemini-2.5-flash'
        }
      })
    };

  } catch (error) {
    console.error('❌ ERRO NO HANDLER:', error);
    console.error('❌ Stack trace:', error.stack);

    // Retornar erro com statusCode 500 e detalhes
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Erro ao processar requisição. Tente novamente.',
        errorDetails: process.env.NODE_ENV === 'development' ? error.stack : undefined,
        errorType: 'INTERNAL_ERROR',
        fallback: true
      })
    };
  }
};

// Construir prompt estruturado (versão otimizada para velocidade)
function construirPrompt({ fato, faltasSelecionadas, tipoDocumento, aluno, data }) {
  // Prompt SIMPLIFICADO para processar mais rápido (<10s)
  return `Você é um assistente de Escola Cívico-Militar. Formalize o texto abaixo para documento oficial.

TEXTO ORIGINAL:
"${fato}"

TAREFA (seja BREVE e DIRETO):
1. Corrija gramática e formalize a linguagem
2. Escreva em 1-2 parágrafos curtos e objetivos
3. Mencione: respeito, disciplina, prejuízo ao ambiente escolar

RESPONDA APENAS COM ESTE JSON (sem markdown, sem explicações):
{
  "fato_corrigido": "texto formal aqui (máximo 200 palavras)",
  "artigos_aplicaveis": ["Art. 6º", "Art. 7º, inciso II"],
  "fundamento_gerado": "justificativa breve baseada nos artigos (máximo 100 palavras)",
  "disposicoes_finais": "orientação ao aluno sobre comportamento esperado (máximo 50 palavras)",
  "sugestoes_adicionais": ""
}`;
}

// Parsear resposta do Gemini (tentar extrair JSON)
function parseResposta(texto) {
  try {
    // Remover TODOS os blocos markdown de forma agressiva
    let textoLimpo = texto.trim();
    textoLimpo = textoLimpo.replace(/^```(?:json)?\s*/i, '');
    textoLimpo = textoLimpo.replace(/\s*```$/m, '');
    textoLimpo = textoLimpo.trim();

    // Tentar parsear diretamente
    let json = JSON.parse(textoLimpo);

    // DETECTAR JSON ANINHADO (Gemini às vezes retorna JSON como string)
    if (json.fato_corrigido && typeof json.fato_corrigido === 'string') {
      const fato = json.fato_corrigido.trim();

      // Se começa com { ou [ ou ", pode ser JSON aninhado
      if (fato.startsWith('{') || fato.startsWith('"') || fato.startsWith('[')) {
        try {
          console.log('🔄 Tentando parsear JSON aninhado...');
          const jsonAninhado = JSON.parse(fato);

          // Se o parse deu certo e tem fato_corrigido, usar o JSON interno
          if (jsonAninhado && jsonAninhado.fato_corrigido) {
            console.log('✅ JSON aninhado parseado com sucesso');
            json = jsonAninhado;
          }
        } catch (e) {
          // Se falhar, manter o texto original (não é JSON aninhado)
          console.log('ℹ️ Não era JSON aninhado, mantendo texto original');
        }
      }
    }

    // Validar e retornar estrutura esperada
    const resultado = {
      fato_corrigido: json.fato_corrigido || texto,
      artigos_aplicaveis: json.artigos_aplicaveis || [],
      fundamento_gerado: json.fundamento_gerado || 'Não foi possível gerar automaticamente. Revise manualmente.',
      disposicoes_finais: json.disposicoes_finais || '',
      sugestoes_adicionais: json.sugestoes_adicionais || ''
    };

    // Limpar markdown residual dos campos de texto
    if (typeof resultado.fato_corrigido === 'string') {
      resultado.fato_corrigido = resultado.fato_corrigido.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/m, '').trim();
    }
    if (typeof resultado.fundamento_gerado === 'string') {
      resultado.fundamento_gerado = resultado.fundamento_gerado.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/m, '').trim();
    }

    console.log('✅ Resposta parseada:', {
      tem_fato: !!resultado.fato_corrigido,
      num_artigos: resultado.artigos_aplicaveis.length
    });

    return resultado;
  } catch (e) {
    console.error('❌ Erro ao parsear JSON:', e.message);

    // Fallback: tentar extrair JSON com regex
    const match = texto.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        const extracted = JSON.parse(match[0]);
        console.log('✅ JSON extraído com regex');
        return {
          fato_corrigido: extracted.fato_corrigido || texto,
          artigos_aplicaveis: extracted.artigos_aplicaveis || [],
          fundamento_gerado: extracted.fundamento_gerado || 'Não foi possível gerar automaticamente.',
          disposicoes_finais: extracted.disposicoes_finais || '',
          sugestoes_adicionais: extracted.sugestoes_adicionais || ''
        };
      } catch (e2) {
        console.error('❌ Erro ao parsear JSON extraído:', e2.message);
      }
    }

    // Último fallback: retornar texto bruto
    console.warn('⚠️ Usando fallback: texto bruto');
    return {
      fato_corrigido: texto,
      artigos_aplicaveis: [],
      fundamento_gerado: 'Não foi possível gerar automaticamente. Revise manualmente.',
      disposicoes_finais: '',
      sugestoes_adicionais: ''
    };
  }
}
