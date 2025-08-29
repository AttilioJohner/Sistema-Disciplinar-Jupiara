import { supabase } from './scripts/supabaseClient.js';

// Script para executar importação diretamente no navegador
// Usar com: executarImportacaoSupabase()

console.log('🚀 Script de importação carregado!');

async function executarImportacaoSupabase() {
    console.log('🔥 Iniciando importação para Supabase...');
    
    // Verificar se Supabase está configurado
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY || !supabase) {
        console.error('❌ Supabase não configurado');
        console.log('Verificando variáveis...');
        console.log('SUPABASE_URL:', window.SUPABASE_URL ? '✅ Configurado' : '❌ Não encontrado');
        console.log('SUPABASE_ANON_KEY:', window.SUPABASE_ANON_KEY ? '✅ Configurado' : '❌ Não encontrado');
        console.log('Supabase Client:', supabase ? '✅ Carregado' : '❌ Não carregado');
        return;
    }

    console.log('✅ Cliente Supabase pronto');
    
    try {
        // Verificar se já temos dados locais
        if (window.localDb && window.localDb.data) {
            console.log('📊 Dados locais encontrados:');
            const alunos = window.localDb.data.alunos || {};
            const medidas = window.localDb.data.medidas_disciplinares || {};
            
            console.log('- Alunos:', Object.keys(alunos).length);
            console.log('- Medidas:', Object.keys(medidas).length);
            
            if (Object.keys(alunos).length > 0) {
                console.log('🔄 Importando alunos...');
                await importarAlunosParaSupabase(supabase, alunos);
            }
            
            if (Object.keys(medidas).length > 0) {
                console.log('🔄 Importando medidas...');
                await importarMedidasParaSupabase(supabase, medidas);
            }
            
        } else {
            console.log('⚠️ Nenhum dado local encontrado');
            console.log('Tentando carregar do banco...');
            
            if (window.db) {
                await carregarEImportarDoDb(supabase);
            }
        }
        
        console.log('🎉 Importação concluída!');
        await verificarResultados(supabase);
        
    } catch (error) {
        console.error('❌ Erro na importação:', error);
    }
}

async function importarAlunosParaSupabase(supabase, alunos) {
    const alunosArray = Object.values(alunos);
    let importados = 0;
    let erros = 0;
    
    for (const aluno of alunosArray) {
        try {
            const alunoLimpo = {
                codigo: aluno.codigo || aluno.id,
                nome_completo: aluno.nome_completo || aluno.nome || '',
                nome: aluno.nome || aluno.nome_completo || '',
                turma: aluno.turma || '',
                responsavel: aluno.responsavel || '',
                cpf_responsavel: aluno.cpf_responsavel || aluno.cpf || '',
                telefone: aluno.telefone || aluno.telefone_responsavel || '',
                telefone2: aluno.telefone2 || '',
                email: aluno.email || '',
                status: aluno.status || 'ativo',
                criado_em: aluno.criado_em || aluno.criadoEm || new Date().toISOString(),
                atualizado_em: new Date().toISOString()
            };
            
            const { error } = await supabase
                .from('alunos')
                .upsert(alunoLimpo, { onConflict: 'codigo' });
            
            if (error) {
                console.error(`❌ Erro ao importar aluno ${alunoLimpo.codigo}:`, error.message);
                erros++;
            } else {
                importados++;
                if (importados % 10 === 0) {
                    console.log(`📊 Alunos: ${importados}/${alunosArray.length}`);
                }
            }
            
        } catch (error) {
            console.error('❌ Erro inesperado:', error);
            erros++;
        }
    }
    
    console.log(`✅ Alunos importados: ${importados}, Erros: ${erros}`);
}

async function importarMedidasParaSupabase(supabase, medidas) {
    const medidasArray = Object.values(medidas);
    let importadas = 0;
    let erros = 0;
    
    for (const medida of medidasArray) {
        try {
            const medidaLimpa = {
                id: medida.id || `medida_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                aluno_codigo: medida.aluno_codigo || medida.codigo_aluno || medida.alunoId,
                aluno_nome: medida.aluno_nome || medida.alunoNome || '',
                turma: medida.turma || '',
                data_ocorrencia: medida.data_ocorrencia || medida.data || medida.dataOcorrencia || new Date().toISOString(),
                descricao: medida.descricao || medida.especificacao || '',
                observacoes: medida.observacoes || medida.observacao || '',
                tipo: medida.tipo || 'Advertência',
                numero_medida: medida.numero_medida || medida.nr_medida || '',
                status: medida.status || 'ativa',
                responsavel: medida.responsavel || 'Sistema',
                criado_em: medida.criado_em || medida.criadoEm || new Date().toISOString(),
                atualizado_em: new Date().toISOString()
            };
            
            const { error } = await supabase
                .from('medidas')
                .upsert(medidaLimpa, { onConflict: 'id' });
            
            if (error) {
                console.error(`❌ Erro ao importar medida ${medidaLimpa.id}:`, error.message);
                erros++;
            } else {
                importadas++;
                if (importadas % 10 === 0) {
                    console.log(`📊 Medidas: ${importadas}/${medidasArray.length}`);
                }
            }
            
        } catch (error) {
            console.error('❌ Erro inesperado:', error);
            erros++;
        }
    }
    
    console.log(`✅ Medidas importadas: ${importadas}, Erros: ${erros}`);
}

async function carregarEImportarDoDb(supabase) {
    try {
        console.log('🔄 Carregando dados do sistema local...');
        
        // Carregar alunos
        const alunosSnap = await window.db.collection('alunos').get();
        if (alunosSnap.size > 0) {
            console.log(`📊 Encontrados ${alunosSnap.size} alunos no sistema local`);
            const alunosObj = {};
            alunosSnap.docs.forEach(doc => {
                alunosObj[doc.id] = { id: doc.id, ...doc.data() };
            });
            await importarAlunosParaSupabase(supabase, alunosObj);
        }
        
        // Carregar medidas
        const medidasSnap = await window.db.collection('medidas_disciplinares').get();
        if (medidasSnap.size > 0) {
            console.log(`📊 Encontradas ${medidasSnap.size} medidas no sistema local`);
            const medidasObj = {};
            medidasSnap.docs.forEach(doc => {
                medidasObj[doc.id] = { id: doc.id, ...doc.data() };
            });
            await importarMedidasParaSupabase(supabase, medidasObj);
        }
        
    } catch (error) {
        console.error('❌ Erro ao carregar do sistema local:', error);
    }
}

async function verificarResultados(supabase) {
    try {
        // Contar alunos
        const { count: totalAlunos } = await supabase
            .from('alunos')
            .select('*', { count: 'exact', head: true });
        
        // Contar medidas
        const { count: totalMedidas } = await supabase
            .from('medidas')
            .select('*', { count: 'exact', head: true });
        
        console.log('📈 Resultados finais:');
        console.log(`- Total de alunos no Supabase: ${totalAlunos}`);
        console.log(`- Total de medidas no Supabase: ${totalMedidas}`);
        
        // Mostrar alguns exemplos
        const { data: exemploAlunos } = await supabase
            .from('alunos')
            .select('codigo, nome_completo, turma')
            .limit(3);
        
        console.log('📝 Exemplos de alunos importados:');
        console.table(exemploAlunos);
        
    } catch (error) {
        console.error('❌ Erro ao verificar resultados:', error);
    }
}

// Função para limpar dados (use com cuidado!)
async function limparDadosSupabase() {
    if (!confirm('⚠️ ATENÇÃO! Isso vai apagar TODOS os dados do Supabase. Confirma?')) {
        return;
    }
    
    console.log('🗑️ Limpando dados...');
    
    try {
        await supabase.from('medidas').delete().neq('id', '');
        await supabase.from('alunos').delete().neq('codigo', '');
        console.log('✅ Dados limpos com sucesso');
    } catch (error) {
        console.error('❌ Erro ao limpar:', error);
    }
}

// Exportar funções globalmente
window.executarImportacaoSupabase = executarImportacaoSupabase;
window.limparDadosSupabase = limparDadosSupabase;

console.log('🔧 Funções disponíveis:');
console.log('- executarImportacaoSupabase() // Importa dados existentes');
console.log('- limparDadosSupabase() // Limpa todos os dados (cuidado!)');