// SISTEMA DE CACHE BUSTING INTELIGENTE
// Força refresh de cache na primeira visita da sessão
console.log('🔄 Sistema de cache busting inicializando...');

class CacheBuster {
    constructor() {
        this.sessionKey = 'cache_buster_session';
        this.versionKey = 'app_version';
        this.currentVersion = this.getCurrentVersion();
        this.init();
    }

    getCurrentVersion() {
        // Usar timestamp do deploy ou versão do app
        const deployVersion = document.querySelector('meta[name="deploy-version"]')?.content;
        if (deployVersion) return deployVersion;
        
        // Fallback: usar data atual (atualiza diariamente)
        const today = new Date();
        return `${today.getFullYear()}${(today.getMonth()+1).toString().padStart(2,'0')}${today.getDate().toString().padStart(2,'0')}`;
    }

    needsCacheRefresh() {
        const sessionActive = sessionStorage.getItem(this.sessionKey);
        const storedVersion = localStorage.getItem(this.versionKey);
        
        // Se não há sessão ativa OU versão mudou, precisa refresh
        return !sessionActive || storedVersion !== this.currentVersion;
    }

    markSessionActive() {
        sessionStorage.setItem(this.sessionKey, 'true');
        localStorage.setItem(this.versionKey, this.currentVersion);
    }

    forcePageReload() {
        if (this.needsCacheRefresh()) {
            console.log('🔄 Cache desatualizado detectado, forçando reload...');
            
            // Marcar sessão antes do reload para evitar loop
            this.markSessionActive();
            
            // Força reload ignorando cache
            window.location.reload(true);
            return true;
        }
        return false;
    }

    addCacheBustingToResources() {
        // Adicionar versão a recursos CSS/JS carregados dinamicamente
        const timestamp = Date.now();
        const resources = document.querySelectorAll('link[rel="stylesheet"], script[src]');
        
        resources.forEach(resource => {
            if (resource.href && !resource.href.includes('?v=')) {
                resource.href += `?v=${this.currentVersion}`;
            } else if (resource.src && !resource.src.includes('?v=')) {
                resource.src += `?v=${this.currentVersion}`;
            }
        });
    }

    setupServiceWorkerRefresh() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').then(registration => {
                // Verificar por updates periodicamente
                setInterval(() => {
                    registration.update();
                }, 60000); // Check every minute
                
                console.log('🔄 Service Worker registrado para cache refresh');
            }).catch(err => {
                console.log('ℹ️ Service Worker não disponível');
            });
        }
    }

    forceDataRefresh() {
        // Força refresh de dados do localStorage/sessionStorage relacionados ao app
        const dataKeys = [
            'alunos_cache',
            'medidas_cache', 
            'stats_cache',
            'supabase_data_cache'
        ];
        
        dataKeys.forEach(key => {
            const data = localStorage.getItem(key);
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    if (parsed.timestamp) {
                        // Se dados tem mais de 1 hora, remover
                        const oneHour = 60 * 60 * 1000;
                        if (Date.now() - parsed.timestamp > oneHour) {
                            localStorage.removeItem(key);
                            console.log(`🗑️ Cache de ${key} removido (expirado)`);
                        }
                    }
                } catch (e) {
                    localStorage.removeItem(key);
                    console.log(`🗑️ Cache de ${key} removido (inválido)`);
                }
            }
        });
    }

    addRefreshButton() {
        // Adicionar botão de refresh manual (desenvolvimento)
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            const refreshBtn = document.createElement('button');
            refreshBtn.innerHTML = '🔄 Force Refresh';
            refreshBtn.style.cssText = `
                position: fixed; 
                top: 10px; 
                right: 10px; 
                z-index: 9999; 
                padding: 5px 10px; 
                background: #ff6b6b; 
                color: white; 
                border: none; 
                border-radius: 4px;
                cursor: pointer;
                font-size: 12px;
            `;
            
            refreshBtn.onclick = () => {
                localStorage.removeItem(this.versionKey);
                sessionStorage.removeItem(this.sessionKey);
                window.location.reload(true);
            };
            
            document.body.appendChild(refreshBtn);
            console.log('🛠️ Botão de force refresh adicionado (modo dev)');
        }
    }

    init() {
        console.log(`🔄 Cache Buster v${this.currentVersion} inicializado`);
        
        // Marcar sessão como ativa (mesmo se não precisou refresh)
        this.markSessionActive();
        
        // Limpar dados expirados
        this.forceDataRefresh();
        
        // Setup service worker se disponível
        this.setupServiceWorkerRefresh();
        
        // Botão de refresh em desenvolvimento
        this.addRefreshButton();
        
        console.log('✅ Sistema de cache busting ativo');
    }

    // Método para chamar manualmente
    static forceFullRefresh() {
        localStorage.clear();
        sessionStorage.clear();
        
        // Adicionar timestamp para forçar reload de recursos
        const url = new URL(window.location.href);
        url.searchParams.set('_refresh', Date.now());
        window.location.href = url.toString();
    }
}

// Função para adicionar cache busting a URLs dinamicamente
function addCacheBuster(url, type = 'data') {
    if (!url) return url;
    
    const separator = url.includes('?') ? '&' : '?';
    const cacheBuster = type === 'data' ? `cb=${Date.now()}` : `v=${window.cacheBuster.currentVersion}`;
    
    return `${url}${separator}${cacheBuster}`;
}

// Interceptar fetch para adicionar cache busting automaticamente
const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
    // Apenas para requests de dados (não recursos estáticos)
    if (typeof url === 'string' && !url.includes('?v=') && !url.includes('?cb=')) {
        if (url.includes('/api/') || url.includes('supabase')) {
            url = addCacheBuster(url, 'data');
        }
    }
    
    return originalFetch.call(this, url, options);
};

// Inicializar sistema
const cacheBuster = new CacheBuster();
window.cacheBuster = cacheBuster;

// Disponibilizar funções globalmente
window.addCacheBuster = addCacheBuster;
window.forceFullRefresh = CacheBuster.forceFullRefresh;

// Auto-refresh em mudança de foco (usuário voltou à aba)
let lastRefresh = Date.now();
document.addEventListener('visibilitychange', () => {
    if (!document.hidden) {
        const timeSinceLastRefresh = Date.now() - lastRefresh;
        const fiveMinutes = 5 * 60 * 1000;
        
        // Se usuário ficou fora por mais de 5 min, verificar cache
        if (timeSinceLastRefresh > fiveMinutes) {
            console.log('👁️ Usuário retornou após longo tempo, verificando cache...');
            cacheBuster.forceDataRefresh();
            lastRefresh = Date.now();
        }
    }
});

console.log('✅ Cache Buster carregado e ativo');