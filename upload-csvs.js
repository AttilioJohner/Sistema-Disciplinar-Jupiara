// UPLOAD DOS CSVs DIRETAMENTE PARA SUPABASE
console.log('📋 Script de upload CSV carregado!');

// Dados dos CSVs (você vai colar os dados reais aqui)
const DADOS_ALUNOS = [
    // Exemplo - você substituirá pelos dados reais
    {
        "código (matrícula)": "12345",
        "Nome completo": "João Silva",
        "turma": "9A",
        "responsável": "Maria Silva",
        "Cpf do responsável": "123.456.789-00",
        "Telefone do responsável": "(11) 99999-1111",
        "Telefone do responsável 2": "(11) 99999-2222"
    }
];

const DADOS_MEDIDAS = [
    // Exemplo - você substituirá pelos dados reais
    {
        "Código (Matrícula)": "12345",
        "Nome completo": "João Silva", 
        "turma": "9A",
        "data": "2024-08-15",
        "especificação": "Chegou atrasado",
        "observação": "Primeira ocorrência",
        "tipo de medida": "Advertência",
        "nr medida": "001"
    }
];

// Função para fazer upload dos alunos
async function uploadAlunos() {
    console.log('📚 Fazendo upload de', DADOS_ALUNOS.length, 'alunos...');
    
    if (!window.supabaseSystem || !window.supabaseClient) {
        console.error('❌ Sistema Supabase não disponível');
        return;
    }
    
    const supabase = window.supabaseClient;
    let sucessos = 0;
    let erros = 0;
    
    // Limpar tabela primeiro
    console.log('🗑️ Limpando tabela de alunos...');
    await supabase.from('alunos').delete().neq('codigo', '');
    
    for (const alunoCSV of DADOS_ALUNOS) {
        try {
            const aluno = {
                codigo: alunoCSV["código (matrícula)"] || '',
                nome_completo: alunoCSV["Nome completo"] || '',
                nome: alunoCSV["Nome completo"] || '',
                turma: alunoCSV["turma"] || '',
                responsavel: alunoCSV["responsável"] || '',
                cpf_responsavel: alunoCSV["Cpf do responsável"] || '',
                telefone: alunoCSV["Telefone do responsável"] || '',
                telefone2: alunoCSV["Telefone do responsável 2"] || '',
                status: 'ativo',
                criado_em: new Date().toISOString(),
                atualizado_em: new Date().toISOString()
            };
            
            const { error } = await supabase
                .from('alunos')
                .insert(aluno);
            
            if (error) {
                console.error('❌ Erro ao inserir aluno:', aluno.codigo, error.message);
                erros++;
            } else {
                sucessos++;
                if (sucessos % 50 === 0) {
                    console.log('📊 Progresso alunos:', sucessos, '/', DADOS_ALUNOS.length);
                }
            }
            
        } catch (err) {
            console.error('❌ Erro inesperado:', err);
            erros++;
        }
    }
    
    console.log('✅ Upload alunos concluído:', sucessos, 'sucessos,', erros, 'erros');
    return { sucessos, erros };
}

// Função para fazer upload das medidas
async function uploadMedidas() {
    console.log('📋 Fazendo upload de', DADOS_MEDIDAS.length, 'medidas...');
    
    if (!window.supabaseSystem || !window.supabaseClient) {
        console.error('❌ Sistema Supabase não disponível');
        return;
    }
    
    const supabase = window.supabaseClient;
    let sucessos = 0;
    let erros = 0;
    
    // Limpar tabela primeiro
    console.log('🗑️ Limpando tabela de medidas...');
    await supabase.from('medidas_disciplinares').delete().neq('id', '');
    
    for (const medidaCSV of DADOS_MEDIDAS) {
        try {
            const medida = {
                id: 'medida_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                aluno_codigo: medidaCSV["Código (Matrícula)"] || '',
                aluno_nome: medidaCSV["Nome completo"] || '',
                turma: medidaCSV["turma"] || '',
                data_ocorrencia: medidaCSV["data"] || new Date().toISOString().split('T')[0],
                descricao: medidaCSV["especificação"] || '',
                observacoes: medidaCSV["observação"] || '',
                tipo: medidaCSV["tipo de medida"] || '',
                numero_medida: medidaCSV["nr medida"] || '',
                status: 'ativa',
                responsavel: 'Sistema',
                criado_em: new Date().toISOString(),
                atualizado_em: new Date().toISOString()
            };
            
            const { error } = await supabase
                .from('medidas_disciplinares')
                .insert(medida);
            
            if (error) {
                console.error('❌ Erro ao inserir medida:', medida.id, error.message);
                erros++;
            } else {
                sucessos++;
                if (sucessos % 50 === 0) {
                    console.log('📊 Progresso medidas:', sucessos, '/', DADOS_MEDIDAS.length);
                }
            }
            
        } catch (err) {
            console.error('❌ Erro inesperado:', err);
            erros++;
        }
    }
    
    console.log('✅ Upload medidas concluído:', sucessos, 'sucessos,', erros, 'erros');
    return { sucessos, erros };
}

// Função principal
async function uploadTodosCSVs() {
    console.log('🚀 Iniciando upload completo dos CSVs...');
    
    try {
        // Upload alunos
        console.log('\n=== UPLOAD ALUNOS ===');
        const resultAlunos = await uploadAlunos();
        
        // Upload medidas
        console.log('\n=== UPLOAD MEDIDAS ===');
        const resultMedidas = await uploadMedidas();
        
        console.log('\n🎉 UPLOAD COMPLETO!');
        console.log('📊 Alunos:', resultAlunos?.sucessos || 0, 'importados');
        console.log('📋 Medidas:', resultMedidas?.sucessos || 0, 'importadas');
        
        // Recarregar dashboard
        setTimeout(() => {
            console.log('🔄 Recarregando dashboard...');
            location.reload();
        }, 3000);
        
    } catch (error) {
        console.error('❌ Erro no upload:', error);
    }
}

// Exportar funções
window.uploadAlunos = uploadAlunos;
window.uploadMedidas = uploadMedidas;
window.uploadTodosCSVs = uploadTodosCSVs;

console.log('🔧 Funções disponíveis:');
console.log('- uploadAlunos() // Upload só alunos');
console.log('- uploadMedidas() // Upload só medidas'); 
console.log('- uploadTodosCSVs() // Upload completo');
console.log('');
console.log('⚠️ IMPORTANTE: Substitua os dados de exemplo pelos dados reais dos CSVs!');
console.log('📋 Depois execute: uploadTodosCSVs()');