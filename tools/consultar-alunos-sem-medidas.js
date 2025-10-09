const { createClient } = require('@supabase/supabase-js');

// Configuração do Supabase
const SUPABASE_URL = 'https://rvppxdhrahcwiwrrwwaz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ2cHB4ZGhyYWhjd2l3cnJ3d2F6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0MDUyMzAsImV4cCI6MjA3MTk4MTIzMH0.JhNGeLdbaRiL_CHCLiVcExc62Hd7MYhLeycJSQyr9nM';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function consultarAlunosSemMedidasNegativas() {
    try {
        console.log('🔍 Consultando todos os alunos...');

        // Buscar todos os alunos
        const { data: alunos, error: alunosError } = await supabase
            .from('alunos')
            .select('codigo, "Nome completo", turma, responsável, "Telefone do responsável"')
            .order('codigo');

        if (alunosError) {
            throw new Error(`Erro ao buscar alunos: ${alunosError.message}`);
        }

        console.log(`✅ Total de alunos encontrados: ${alunos.length}`);

        // Buscar todas as medidas negativas (tipo_medida não é null ou diferente de positivo)
        const { data: medidas, error: medidasError } = await supabase
            .from('medidas')
            .select('codigo_matricula')
            .not('tipo_medida', 'is', null);

        if (medidasError) {
            throw new Error(`Erro ao buscar medidas: ${medidasError.message}`);
        }

        console.log(`📊 Total de registros de medidas encontrados: ${medidas.length}`);

        // Criar set com códigos de alunos que possuem medidas negativas
        const codigosComMedidas = new Set(medidas.map(m => m.codigo_matricula.toString()));

        // Filtrar alunos sem medidas negativas
        const alunosSemMedidas = alunos.filter(aluno =>
            !codigosComMedidas.has(aluno.codigo.toString())
        );

        console.log(`✨ Alunos SEM medidas negativas: ${alunosSemMedidas.length}`);

        // Criar conteúdo do arquivo TXT
        let conteudo = '====================================================================\n';
        conteudo += '   ALUNOS SEM MEDIDAS DISCIPLINARES NEGATIVAS - EECM JUPIARA\n';
        conteudo += '====================================================================\n';
        conteudo += `Data da consulta: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}\n`;
        conteudo += `Total de alunos: ${alunosSemMedidas.length}\n`;
        conteudo += '====================================================================\n\n';

        alunosSemMedidas.forEach((aluno, index) => {
            conteudo += `${index + 1}. ${'-'.repeat(60)}\n`;
            conteudo += `   Nome: ${aluno['Nome completo'] || 'Não informado'}\n`;
            conteudo += `   Código: ${aluno.codigo}\n`;
            conteudo += `   Turma: ${aluno.turma || 'Não informada'}\n`;
            conteudo += `   Responsável: ${aluno.responsável || 'Não informado'}\n`;
            conteudo += `   Telefone: ${aluno['Telefone do responsável'] || 'Não informado'}\n\n`;
        });

        conteudo += '====================================================================\n';
        conteudo += `Fim da listagem - Total: ${alunosSemMedidas.length} alunos\n`;
        conteudo += '====================================================================\n';

        // Salvar arquivo
        const fs = require('fs');
        const path = require('path');
        const dataAtual = new Date().toISOString().split('T')[0];
        const nomeArquivo = `alunos-sem-medidas-${dataAtual}.txt`;
        const caminhoArquivo = path.join(__dirname, '..', nomeArquivo);

        fs.writeFileSync(caminhoArquivo, conteudo, 'utf8');

        console.log(`\n✅ Arquivo criado com sucesso: ${nomeArquivo}`);
        console.log(`📍 Localização: ${caminhoArquivo}`);
        console.log(`\n📊 Resumo:`);
        console.log(`   - Total de alunos cadastrados: ${alunos.length}`);
        console.log(`   - Alunos com medidas negativas: ${codigosComMedidas.size}`);
        console.log(`   - Alunos SEM medidas negativas: ${alunosSemMedidas.length}`);

        return caminhoArquivo;

    } catch (error) {
        console.error('❌ Erro ao consultar alunos:', error.message);
        throw error;
    }
}

// Executar consulta
consultarAlunosSemMedidasNegativas()
    .then(arquivo => {
        console.log('\n✨ Processo concluído com sucesso!');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ Processo finalizado com erro:', error);
        process.exit(1);
    });
