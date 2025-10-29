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
    // Verificar API Key
    if (!GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY não configurada nas environment variables');
    }

    // Parse do body
    const { fato, faltasSelecionadas, tipoDocumento, aluno, data } = JSON.parse(event.body);

    if (!fato || !fato.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Campo "fato" é obrigatório' })
      };
    }

    console.log('📝 Processando fato:', fato.substring(0, 100) + '...');
    console.log('📋 Faltas selecionadas:', faltasSelecionadas);

    // Construir prompt para o Gemini
    const prompt = construirPrompt({
      fato,
      faltasSelecionadas: faltasSelecionadas || [],
      tipoDocumento: tipoDocumento || 'FMD',
      aluno,
      data
    });

    // Chamar Gemini API
    const geminiResponse = await fetch(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        }
      })
    });

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('❌ Erro na API Gemini:', errorText);
      throw new Error(`Gemini API error: ${geminiResponse.status} - ${errorText}`);
    }

    const geminiData = await geminiResponse.json();

    // Extrair texto da resposta
    const textoGerado = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!textoGerado) {
      throw new Error('Resposta vazia da API Gemini');
    }

    console.log('✅ Texto gerado com sucesso');

    // Parsear resposta JSON do Gemini
    const resultado = parseResposta(textoGerado);

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
    console.error('❌ Erro no handler:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        fallback: true // Indica que o frontend deve permitir edição manual
      })
    };
  }
};

// Construir prompt estruturado
function construirPrompt({ fato, faltasSelecionadas, tipoDocumento, aluno, data }) {
  const faltasTexto = faltasSelecionadas.length > 0
    ? faltasSelecionadas.join(', ')
    : 'não especificadas';

  return `${CONTEXTO_REGULAMENTO}

TAREFA:
Você deve analisar o fato disciplinar descrito abaixo e:
1. Corrigir gramática e ortografia
2. Formalizar a linguagem (adequada para documento oficial escolar)
3. Estruturar o texto de forma clara e objetiva
4. Sugerir artigos aplicáveis do regulamento
5. Gerar o texto da seção "FUNDAMENTO" com base nos artigos

INFORMAÇÕES DO CASO:
- Aluno: ${aluno || 'não informado'}
- Data: ${data || 'não informada'}
- Tipo de documento: ${tipoDocumento}
- Faltas selecionadas: ${faltasTexto}

TEXTO ORIGINAL DO FATO (escrito pelo inspetor):
"""
${fato}
"""

INSTRUÇÕES DE FORMATO:
- Na seção "fato_corrigido", escreva 2-3 parágrafos formais descrevendo:
  a) O que aconteceu (fatos objetivos)
  b) Como isso afronta os valores da escola (respeito, disciplina, hierarquia)
  c) Prejuízo causado (exemplo aos colegas, ambiente escolar)

- Na seção "artigos_aplicaveis", liste os artigos relevantes baseado nas faltas
- Na seção "fundamento_gerado", explique cada artigo aplicável

ATENÇÃO - FORMATO DA RESPOSTA:
Sua resposta deve ser EXCLUSIVAMENTE um objeto JSON válido.
NÃO use blocos de código markdown (não coloque ```json ou ```).
NÃO adicione explicações antes ou depois.
NÃO inclua markdown em NENHUM campo.
Retorne SOMENTE o JSON puro e direto.

Estrutura EXATA da resposta:
{
  "fato_corrigido": "Texto formal em 2-3 parágrafos...",
  "artigos_aplicaveis": ["Art. 6º", "Art. 7º, inciso II", "Anexo I, Item 56"],
  "fundamento_gerado": "Com base no Art. 6º...",
  "sugestoes_adicionais": "Texto opcional com observações"
}

Exemplo CORRETO de resposta:
{"fato_corrigido":"No dia...", "artigos_aplicaveis":["Art. 6º"], "fundamento_gerado":"...", "sugestoes_adicionais":"..."}
`;
}

// Parsear resposta do Gemini (tentar extrair JSON)
function parseResposta(texto) {
  try {
    // Remover TODOS os blocos markdown de forma agressiva
    let textoLimpo = texto.trim();
    // Remover markdown externo
    textoLimpo = textoLimpo.replace(/^```(?:json)?\s*/i, '');
    textoLimpo = textoLimpo.replace(/\s*```$/m, '');
    textoLimpo = textoLimpo.trim();

    // Tentar parsear diretamente
    const json = JSON.parse(textoLimpo);

    // Limpar campos internos que possam ter markdown
    if (json.fato_corrigido && typeof json.fato_corrigido === 'string') {
      json.fato_corrigido = json.fato_corrigido.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/m, '').trim();
    }
    if (json.fundamento_gerado && typeof json.fundamento_gerado === 'string') {
      json.fundamento_gerado = json.fundamento_gerado.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/m, '').trim();
    }
    if (json.sugestoes_adicionais && typeof json.sugestoes_adicionais === 'string') {
      json.sugestoes_adicionais = json.sugestoes_adicionais.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/m, '').trim();
    }

    return json;
  } catch (e) {
    // Se falhar, tentar extrair JSON de dentro de markdown ou texto
    const match = texto.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e2) {
        console.error('Erro ao parsear JSON extraído:', e2);
      }
    }

    // Fallback: retornar texto bruto
    console.warn('⚠️ Não foi possível parsear JSON, retornando texto bruto');
    return {
      fato_corrigido: texto,
      artigos_aplicaveis: [],
      fundamento_gerado: 'Não foi possível gerar automaticamente. Revise manualmente.',
      sugestoes_adicionais: ''
    };
  }
}
