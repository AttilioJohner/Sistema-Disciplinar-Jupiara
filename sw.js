// SERVICE WORKER PARA CONTROLE INTELIGENTE DE CACHE
// Sistema Disciplinar Jupiara - Cache Strategy
const CACHE_VERSION = 'v2.2.0-20250902-1553';
const CACHE_NAME = `jupiara-cache-${CACHE_VERSION}`;
const DATA_CACHE_NAME = `jupiara-data-cache-${CACHE_VERSION}`;

// Recursos para cache (estaticos)
const STATIC_CACHE_URLS = [
  '/',
  '/index.html',
  '/assets/css/style.css',
  '/assets/css/components.css', 
  '/assets/css/dashboard.css',
  '/assets/js/cache-buster.js',
  '/assets/js/unified-auth.js',
  '/assets/js/env-config.js',
  '/pages/login.html'
];

// URLs que nunca devem ser cacheadas (dados dinâmicos)
const NO_CACHE_PATTERNS = [
  /supabase\.co/,
  /netlify-env\.js/,
  /\?cb=/,
  /\?_refresh=/
];

// URLs que devem ter cache de dados (com TTL)
const DATA_CACHE_PATTERNS = [
  /\/api\//,
  /supabase.*select/,
  /stats/
];

// Instalar Service Worker
self.addEventListener('install', event => {
  console.log(`🔧 SW: Instalando versão ${CACHE_VERSION}`);
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 SW: Cache estático criado');
        return cache.addAll(STATIC_CACHE_URLS);
      })
      .then(() => self.skipWaiting()) // Força ativação imediata
  );
});

// Ativar Service Worker
self.addEventListener('activate', event => {
  console.log(`✅ SW: Ativando versão ${CACHE_VERSION}`);
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Remover caches antigos
          if (cacheName !== CACHE_NAME && cacheName !== DATA_CACHE_NAME) {
            console.log(`🗑️ SW: Removendo cache antigo: ${cacheName}`);
            return caches.delete(cacheName);
          }
        })
      );
    })
    .then(() => self.clients.claim()) // Controla clientes imediatamente
  );
});

// Interceptar requests
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  
  // Skip para requests que não devem ser cacheados
  if (NO_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
    return; // Deixa passar direto para a rede
  }
  
  // Strategy para recursos estáticos
  if (STATIC_CACHE_URLS.some(staticUrl => request.url.includes(staticUrl))) {
    event.respondWith(
      caches.match(request)
        .then(response => {
          if (response) {
            console.log(`📦 SW: Servindo do cache: ${request.url}`);
            return response;
          }
          
          // Se não está no cache, buscar da rede
          return fetch(request)
            .then(response => {
              // Só cachear responses válidos
              if (!response || response.status !== 200 || response.type !== 'basic') {
                return response;
              }
              
              const responseToCache = response.clone();
              caches.open(CACHE_NAME)
                .then(cache => {
                  cache.put(request, responseToCache);
                });
              
              return response;
            });
        })
    );
    return;
  }
  
  // Strategy para dados dinâmicos (cache com TTL)
  if (DATA_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
    event.respondWith(
      caches.open(DATA_CACHE_NAME)
        .then(cache => {
          return cache.match(request)
            .then(response => {
              // Se tem cache, verificar se ainda é válido
              if (response) {
                const cachedDate = response.headers.get('sw-cached-date');
                const cacheAge = Date.now() - parseInt(cachedDate || '0');
                const maxAge = 10 * 60 * 1000; // 10 minutos
                
                if (cacheAge < maxAge) {
                  console.log(`📊 SW: Servindo dados do cache: ${request.url}`);
                  return response;
                }
              }
              
              // Cache expirado ou não existe, buscar da rede
              return fetch(request)
                .then(networkResponse => {
                  if (networkResponse && networkResponse.status === 200) {
                    const responseToCache = networkResponse.clone();
                    
                    // Adicionar timestamp ao header
                    const headers = new Headers(responseToCache.headers);
                    headers.set('sw-cached-date', Date.now().toString());
                    
                    const cachedResponse = new Response(responseToCache.body, {
                      status: responseToCache.status,
                      statusText: responseToCache.statusText,
                      headers: headers
                    });
                    
                    cache.put(request, cachedResponse);
                  }
                  
                  return networkResponse;
                })
                .catch(error => {
                  // Se rede falha, usar cache mesmo que expirado
                  if (response) {
                    console.log(`⚠️ SW: Rede falhou, usando cache expirado: ${request.url}`);
                    return response;
                  }
                  throw error;
                });
            });
        })
    );
    return;
  }
  
  // Para outros requests, strategy network-first
  event.respondWith(
    fetch(request)
      .catch(() => {
        // Se rede falha, tentar cache
        return caches.match(request);
      })
  );
});

// Escutar mensagens do cliente
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('🔄 SW: Forçando ativação via mensagem');
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    console.log('🗑️ SW: Limpando cache via mensagem');
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
      );
    });
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({
      type: 'VERSION_RESPONSE',
      version: CACHE_VERSION
    });
  }
});

console.log(`🚀 Service Worker ${CACHE_VERSION} carregado`);