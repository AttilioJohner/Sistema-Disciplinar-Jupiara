// Webhook para sincronização automática entre GitHub, Netlify e Supabase
const { createClient } = require('@supabase/supabase-js');

exports.handler = async (event, context) => {
  // Headers CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { action, data, table, source = 'unknown' } = body;

    console.log(`📡 Webhook recebido - Action: ${action}, Source: ${source}`);

    // Verificar variáveis de ambiente
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Variáveis de ambiente Supabase não configuradas');
    }

    // Inicializar cliente Supabase com service role key
    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    let result = {};

    switch (action) {
      case 'sync_data':
        if (!data || !table) {
          throw new Error('Dados ou tabela não especificados');
        }
        
        // Fazer upsert dos dados
        const { data: upsertData, error: upsertError } = await supabase
          .from(table)
          .upsert(data, { onConflict: 'id' });
        
        if (upsertError) {
          throw upsertError;
        }
        
        result = {
          success: true,
          message: `${data.length} registros sincronizados na tabela ${table}`,
          data: upsertData
        };
        break;

      case 'deploy_status':
        // Verificar status do deploy
        result = {
          success: true,
          message: 'Deploy webhook executado com sucesso',
          timestamp: new Date().toISOString(),
          netlify_context: process.env.CONTEXT || 'production'
        };
        break;

      case 'github_sync':
        // Processar webhook do GitHub
        const githubData = body.github_data || {};
        
        result = {
          success: true,
          message: 'GitHub sync processado',
          commit: githubData.head_commit?.id || 'unknown',
          author: githubData.head_commit?.author?.name || 'unknown'
        };
        break;

      default:
        throw new Error(`Ação não reconhecida: ${action}`);
    }

    // Log de sucesso
    console.log(`✅ Webhook processado com sucesso:`, result);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      })
    };
  }
};