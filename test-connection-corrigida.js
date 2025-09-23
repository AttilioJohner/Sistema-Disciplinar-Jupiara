#!/usr/bin/env node
/**
 * TESTE COM CONFIGURAÇÕES CORRETAS DO SUPABASE
 * Baseado nas informações do arquivo "Credenciais SupaBase para API.txt"
 */

const { Pool } = require('pg');

// Configurações corretas baseadas no arquivo de credenciais
const CORRECT_CONFIGS = [
  {
    name: 'SESSION_POOLER_CORRETO',
    url: 'postgresql://postgres.rvppxdhrahcwiwrrwwaz:EECMjupiara25@aws-1-sa-east-1.pooler.supabase.com:5432/postgres',
    description: 'Session pooler AWS South America (RECOMENDADO para DIRECT_URL)'
  },
  {
    name: 'TRANSACTION_POOLER_CORRETO',
    url: 'postgresql://postgres.rvppxdhrahcwiwrrwwaz:EECMjupiara25@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
    description: 'Transaction pooler AWS South America (RECOMENDADO para DATABASE_URL)'
  },
  {
    name: 'DIRECT_CONNECTION_CORRETO',
    url: 'postgresql://postgres.rvppxdhrahcwiwrrwwaz:EECMjupiara25@db.rvppxdhrahcwiwrrwwaz.supabase.co:5432/postgres',
    description: 'Conexão direta com senha correta'
  }
];

async function testConnection(config) {
  const startTime = Date.now();

  console.log(`\n🧪 TESTE: ${config.name}`);
  console.log(`📝 ${config.description}`);
  console.log(`🔗 ${config.url.replace(/:[^:@]+@/, ':***@')}`);

  const pool = new Pool({
    connectionString: config.url,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    max: 1
  });

  try {
    console.log('⏳ Conectando...');

    const client = await pool.connect();
    const result = await client.query('SELECT version(), current_database(), current_user, now()');

    const duration = Date.now() - startTime;

    console.log(`✅ SUCESSO! (${duration}ms)`);
    console.log(`  └─ Database: ${result.rows[0].current_database}`);
    console.log(`  └─ User: ${result.rows[0].current_user}`);
    console.log(`  └─ Timestamp: ${result.rows[0].now}`);

    client.release();
    await pool.end();

    return { success: true, duration };

  } catch (error) {
    const duration = Date.now() - startTime;

    console.log(`❌ FALHOU! (${duration}ms)`);
    console.log(`  └─ Código: ${error.code || 'UNKNOWN'}`);
    console.log(`  └─ Mensagem: ${error.message}`);

    await pool.end();

    return { success: false, duration, error: error.message };
  }
}

async function main() {
  console.log('🎯 TESTE COM CONFIGURAÇÕES CORRETAS DO SUPABASE');
  console.log('===============================================');
  console.log('📋 Baseado em: "Credenciais SupaBase para API.txt"');
  console.log('🔧 Senha correta: EECMjupiara25');
  console.log('🌎 Região: AWS South America East 1\n');

  const results = [];

  for (const config of CORRECT_CONFIGS) {
    const result = await testConnection(config);
    results.push({ ...config, ...result });

    // Pausa entre testes
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Resumo
  console.log('\n📊 RESUMO DOS TESTES');
  console.log('===================');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  if (successful.length > 0) {
    console.log('\n✅ CONEXÕES FUNCIONANDO:');
    successful
      .sort((a, b) => a.duration - b.duration)
      .forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.name} (${result.duration}ms)`);
      });

    console.log('\n🚀 CONFIGURAÇÃO RENDER ATUALIZADA:');
    console.log('DATABASE_URL: Transaction pooler (porta 6543)');
    console.log('DIRECT_URL: Session pooler (porta 5432)');
    console.log('\n✅ PRONTO PARA DEPLOY NO RENDER!');
  }

  if (failed.length > 0) {
    console.log('\n❌ CONEXÕES COM PROBLEMA:');
    failed.forEach(result => {
      console.log(`  - ${result.name}: ${result.error}`);
    });
  }

  console.log(`\n📈 Taxa de sucesso: ${successful.length}/${results.length}`);

  if (successful.length === 0) {
    console.log('\n🚨 PROBLEMA: Verificar IPs permitidos no Supabase');
    console.log('   Render IPs podem não estar no whitelist');
  }
}

if (require.main === module) {
  main().catch(console.error);
}