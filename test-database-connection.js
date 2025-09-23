#!/usr/bin/env node
/**
 * TESTE DE CONEXÃO COM BANCO SUPABASE
 *
 * Este script testa diferentes connection strings para identificar
 * qual funciona melhor no ambiente Render.com
 */

const { Pool } = require('pg');
const dns = require('dns');
const { promisify } = require('util');

const lookup = promisify(dns.lookup);

// Configurações de teste
const CONNECTION_TESTS = [
  {
    name: 'POOLER_SUPABASE_COM',
    url: 'postgresql://postgres.rvppxdhrahcwiwrrwwaz:Jupiara2025@pooler.supabase.com:5432/postgres?sslmode=require&pgbouncer=true',
    description: 'Connection Pooler (Recomendado para produção)'
  },
  {
    name: 'DIRECT_WITH_TIMEOUT',
    url: 'postgresql://postgres.rvppxdhrahcwiwrrwwaz:Jupiara2025@db.rvppxdhrahcwiwrrwwaz.supabase.co:5432/postgres?sslmode=require&connect_timeout=10&application_name=evolution_test',
    description: 'Conexão direta com timeout'
  },
  {
    name: 'SESSION_MODE_6543',
    url: 'postgresql://postgres.rvppxdhrahcwiwrrwwaz:Jupiara2025@db.rvppxdhrahcwiwrrwwaz.supabase.co:6543/postgres?sslmode=require',
    description: 'Session Mode (porta 6543)'
  },
  {
    name: 'ORIGINAL_CONFIG',
    url: 'postgresql://postgres.rvppxdhrahcwiwrrwwaz:Jupiara2025@db.rvppxdhrahcwiwrrwwaz.supabase.co:5432/postgres?sslmode=require',
    description: 'Configuração original (problemática)'
  }
];

async function testDNSResolution(hostname) {
  try {
    console.log(`🔍 Testando resolução DNS para: ${hostname}`);

    const ipv4 = await lookup(hostname, { family: 4 }).catch(() => null);
    const ipv6 = await lookup(hostname, { family: 6 }).catch(() => null);

    console.log(`  └─ IPv4: ${ipv4 ? `✅ ${ipv4.address}` : '❌ Não resolvido'}`);
    console.log(`  └─ IPv6: ${ipv6 ? `✅ ${ipv6.address}` : '❌ Não resolvido'}`);

    return { ipv4, ipv6 };
  } catch (error) {
    console.log(`  └─ ❌ Erro DNS: ${error.message}`);
    return { ipv4: null, ipv6: null };
  }
}

async function testConnection(config) {
  const startTime = Date.now();

  console.log(`\n🧪 TESTE: ${config.name}`);
  console.log(`📝 ${config.description}`);
  console.log(`🔗 URL: ${config.url.replace(/:[^:@]+@/, ':***@')}`);

  // Extrair hostname da URL
  const hostname = config.url.match(/@([^:\/]+)/)?.[1];
  if (hostname) {
    await testDNSResolution(hostname);
  }

  const pool = new Pool({
    connectionString: config.url,
    connectionTimeoutMillis: 15000,
    idleTimeoutMillis: 30000,
    max: 1
  });

  try {
    console.log('⏳ Tentando conectar...');

    const client = await pool.connect();
    const result = await client.query('SELECT version(), current_database(), current_user');

    const duration = Date.now() - startTime;

    console.log(`✅ SUCESSO! (${duration}ms)`);
    console.log(`  └─ Database: ${result.rows[0].current_database}`);
    console.log(`  └─ User: ${result.rows[0].current_user}`);
    console.log(`  └─ Version: ${result.rows[0].version.split(' ')[0]}`);

    client.release();
    await pool.end();

    return { success: true, duration, error: null };

  } catch (error) {
    const duration = Date.now() - startTime;

    console.log(`❌ FALHOU! (${duration}ms)`);
    console.log(`  └─ Erro: ${error.code || 'UNKNOWN'}`);
    console.log(`  └─ Mensagem: ${error.message}`);

    await pool.end();

    return { success: false, duration, error: error.message };
  }
}

async function main() {
  console.log('🚀 TESTE DE CONEXÃO COM BANCO SUPABASE');
  console.log('=====================================\n');

  const results = [];

  for (const config of CONNECTION_TESTS) {
    const result = await testConnection(config);
    results.push({ ...config, ...result });

    // Pausa entre testes
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Resumo dos resultados
  console.log('\n📊 RESUMO DOS TESTES');
  console.log('===================');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  if (successful.length > 0) {
    console.log('\n✅ CONEXÕES BEM-SUCEDIDAS:');
    successful
      .sort((a, b) => a.duration - b.duration)
      .forEach((result, index) => {
        console.log(`  ${index + 1}. ${result.name} (${result.duration}ms)`);
        console.log(`     └─ ${result.description}`);
      });

    console.log(`\n🎯 RECOMENDAÇÃO: Use a configuração "${successful[0].name}"`);
    console.log(`   URL: ${successful[0].url.replace(/:[^:@]+@/, ':***@')}`);
  }

  if (failed.length > 0) {
    console.log('\n❌ CONEXÕES FALHARAM:');
    failed.forEach((result, index) => {
      console.log(`  ${index + 1}. ${result.name}`);
      console.log(`     └─ ${result.error}`);
    });
  }

  console.log(`\n📈 Taxa de sucesso: ${successful.length}/${results.length} (${Math.round(successful.length / results.length * 100)}%)`);

  if (successful.length === 0) {
    console.log('\n🚨 NENHUMA CONEXÃO FUNCIONOU!');
    console.log('   Possíveis soluções:');
    console.log('   1. Verificar configurações no painel Supabase');
    console.log('   2. Verificar IP whitelist');
    console.log('   3. Verificar credenciais');
    console.log('   4. Considerar outro provedor de banco');
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testConnection, CONNECTION_TESTS };