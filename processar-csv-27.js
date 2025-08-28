const fs = require('fs');

console.log('📥 Processando CSV com dados até dia 27...');

try {
    // Ler CSV
    const csvContent = fs.readFileSync('temp_csv_data.csv', 'utf8');
    const lines = csvContent.trim().split('\n');
    const header = lines[0].split(',');

    console.log('📋 Cabeçalho:', header);
    console.log('📊 Total de linhas:', lines.length);

    // Dias úteis - extrair do cabeçalho
    const diasUteis = [];
    for (let i = 3; i < header.length; i++) {
        const dia = header[i].trim();
        if (dia && !isNaN(parseInt(dia))) {
            diasUteis.push(parseInt(dia));
        }
    }

    console.log('📅 Dias úteis encontrados:', diasUteis);

    // Processar dados
    const registros = [];
    let registroId = 1;

    for (let i = 1; i < lines.length; i++) {
        const linha = lines[i];
        if (!linha.trim()) continue;
        
        const colunas = linha.split(',');
        if (colunas.length < 4) continue;
        
        const codigo = colunas[0]?.trim();
        const nome = colunas[1]?.trim();
        const turma = colunas[2]?.trim();
        
        if (!codigo || !nome || !turma) continue;
        
        // Processar cada dia
        for (let j = 0; j < diasUteis.length && j < (colunas.length - 3); j++) {
            const diaUtil = diasUteis[j];
            const marcacao = colunas[3 + j]?.trim().toUpperCase();
            
            if (marcacao && ['P', 'F', 'A', 'FC'].includes(marcacao)) {
                const diaFormatado = diaUtil.toString().padStart(2, '0');
                const dataCompleta = `2024-08-${diaFormatado}`;
                
                registros.push({
                    data: dataCompleta,
                    codigo_aluno: codigo,
                    nome_aluno: nome,
                    turma: turma,
                    marcacao: marcacao,
                    id: `freq_${Date.now()}_${i}_${j}`,
                    created_at: new Date().toISOString()
                });
                
                registroId++;
            }
        }
        
        // Progresso a cada 50 alunos
        if (i % 50 === 0) {
            console.log(`📋 Processando... ${i}/${lines.length - 1} alunos`);
        }
    }

    console.log('✅ Total de registros processados:', registros.length);

    // Gerar arquivo JSON final
    const dadosFinais = {
        lastUpdate: new Date().toISOString(),
        version: '2.0',
        total: registros.length,
        diasUteis: diasUteis,
        registros: registros
    };

    // Salvar arquivo
    fs.writeFileSync('dados/frequencia.json', JSON.stringify(dadosFinais, null, 2));

    console.log('💾 Arquivo dados/frequencia.json atualizado!');
    console.log('📈 Estatísticas:');
    console.log('   - Total de registros:', registros.length);
    console.log('   - Dias úteis:', diasUteis.length);
    console.log('   - Alunos únicos:', new Set(registros.map(r => r.codigo_aluno)).size);
    console.log('   - Turmas:', new Set(registros.map(r => r.turma)).size);
    console.log('   - Período: 01/08/2024 a 27/08/2024');

    // Limpar arquivo temporário
    fs.unlinkSync('temp_csv_data.csv');
    console.log('🗑️ Arquivo temporário removido');

} catch (error) {
    console.error('❌ Erro:', error);
}