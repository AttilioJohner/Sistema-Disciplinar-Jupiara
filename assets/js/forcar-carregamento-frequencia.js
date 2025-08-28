// Força carregamento dos dados de frequência atualizados
async function forcarCarregamentoFrequencia() {
    console.log('🔄 Forçando carregamento dos dados de frequência...');
    
    try {
        // Limpar cache primeiro
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
            console.log('🗑️ Cache limpo');
        }
        
        // Carregar arquivo com timestamp para evitar cache
        const timestamp = Date.now();
        const response = await fetch(`dados/frequencia.json?v=${timestamp}`, {
            cache: 'no-cache',
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const dados = await response.json();
        console.log('📊 Dados carregados:', {
            total: dados.total,
            version: dados.version,
            diasUteis: dados.diasUteis?.length,
            ultimaAtualizacao: dados.lastUpdate
        });
        
        if (dados.registros && dados.registros.length > 0) {
            // Atualizar variável global se existir
            if (typeof window !== 'undefined' && 'dadosFrequencia' in window) {
                window.dadosFrequencia = dados.registros;
            }
            
            console.log(`✅ ${dados.registros.length} registros carregados com sucesso!`);
            return dados.registros;
        } else {
            throw new Error('Nenhum registro encontrado no arquivo');
        }
        
    } catch (error) {
        console.error('❌ Erro ao forçar carregamento:', error);
        throw error;
    }
}

// Auto-executar se estiver em uma página
if (typeof window !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Aguardar 2 segundos e então forçar carregamento
        setTimeout(async () => {
            try {
                await forcarCarregamentoFrequencia();
                
                // Se existirem funções de atualização, chamá-las
                if (typeof carregarEstatisticasFrequencia === 'function') {
                    await carregarEstatisticasFrequencia();
                }
                if (typeof carregarAlertasFrequencia === 'function') {
                    await carregarAlertasFrequencia();
                }
                if (typeof carregarResumoTurmas === 'function') {
                    await carregarResumoTurmas();
                }
                if (typeof aplicarFiltrosFrequencia === 'function') {
                    aplicarFiltrosFrequencia();
                }
                
                console.log('🎉 Interface atualizada com dados forçados!');
                
            } catch (error) {
                console.error('⚠️ Falha no carregamento forçado:', error);
            }
        }, 2000);
    });
}

// Disponibilizar globalmente
if (typeof window !== 'undefined') {
    window.forcarCarregamentoFrequencia = forcarCarregamentoFrequencia;
}