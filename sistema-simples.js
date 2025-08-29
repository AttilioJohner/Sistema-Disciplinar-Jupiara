import { supabase } from './scripts/supabaseClient.js';

// SISTEMA SIMPLES - APENAS SUPABASE
// Substituir todo o sistema híbrido por algo direto

console.log('🎯 SISTEMA SIMPLES - APENAS SUPABASE');

// Configurar Supabase como único banco
window.configurarSupabaseUnico = function() {
    if (!window.SUPABASE_URL || !window.SUPABASE_ANON_KEY || !supabase) {
        console.error('❌ Supabase não configurado');
        return null;
    }
    
    // SUBSTITUIR window.db pelo Supabase direto
    window.db = {
        collection: (nome) => ({
            get: async () => {
                const { data, error } = await supabase.from(nome).select('*');
                if (error) throw error;
                
                return {
                    size: data.length,
                    empty: data.length === 0,
                    docs: data.map(item => ({
                        id: item.id || item.codigo,
                        data: () => item,
                        exists: true
                    }))
                };
            },
            doc: (id) => ({
                get: async () => {
                    const { data, error } = await supabase
                        .from(nome)
                        .select('*')
                        .eq(nome === 'alunos' ? 'codigo' : 'id', id)
                        .single();
                    
                    return {
                        exists: !error && data,
                        id: id,
                        data: () => data || {}
                    };
                },
                set: async (dados) => {
                    const { error } = await supabase
                        .from(nome)
                        .upsert({ ...dados, [nome === 'alunos' ? 'codigo' : 'id']: id });
                    if (error) throw error;
                },
                update: async (dados) => {
                    const { error } = await supabase
                        .from(nome)
                        .update(dados)
                        .eq(nome === 'alunos' ? 'codigo' : 'id', id);
                    if (error) throw error;
                },
                delete: async () => {
                    const { error } = await supabase
                        .from(nome)
                        .delete()
                        .eq(nome === 'alunos' ? 'codigo' : 'id', id);
                    if (error) throw error;
                }
            }),
            where: (campo, operador, valor) => ({
                get: async () => {
                    const { data, error } = await supabase
                        .from(nome)
                        .select('*')
                        .eq(campo, valor);
                    
                    if (error) throw error;
                    
                    return {
                        size: data.length,
                        docs: data.map(item => ({
                            id: item.id || item.codigo,
                            data: () => item
                        }))
                    };
                }
            })
        })
    };
    
    console.log('✅ Sistema configurado para usar APENAS Supabase');
    console.log('🔥 window.db agora aponta diretamente para Supabase');
    
    return supabase;
};

// Limpar localStorage (eliminar sistema híbrido)
window.limparLocalStorage = function() {
    const keys = Object.keys(localStorage);
    const escolaKeys = keys.filter(k => 
        k.includes('aluno') || 
        k.includes('medida') || 
        k.includes('frequencia') ||
        k.includes('escola') ||
        k.includes('disciplinar')
    );
    
    escolaKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ Removido: ${key}`);
    });
    
    console.log(`✅ ${escolaKeys.length} itens removidos do localStorage`);
};

// Inicializar sistema simples
window.inicializarSistemaSimples = async function() {
    console.log('🚀 Iniciando sistema simples...');
    
    // 1. Limpar localStorage
    limparLocalStorage();
    
    // 2. Configurar Supabase único
    const supabase = configurarSupabaseUnico();
    if (!supabase) return;
    
    // 3. Verificar usuário
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        console.log('⚠️ Nenhum usuário logado. Execute: registrarUsuario()');
        return;
    }
    
    console.log('✅ Usuário logado:', user.email);
    
    // 4. Testar conexão
    try {
        const { data, error } = await supabase.from('alunos').select('*').limit(1);
        if (error) throw error;
        
        console.log('✅ Conexão com Supabase funcionando');
        console.log('🎉 Sistema simples configurado com sucesso!');
        
        // Recarregar página para aplicar mudanças
        setTimeout(() => location.reload(), 2000);
        
    } catch (error) {
        console.error('❌ Erro na conexão:', error.message);
    }
};

// Exportar funções
window.configurarSupabaseUnico = configurarSupabaseUnico;
window.limparLocalStorage = limparLocalStorage;
window.inicializarSistemaSimples = inicializarSistemaSimples;

console.log('🔧 Sistema simples carregado!');
console.log('📋 Execute: inicializarSistemaSimples()');