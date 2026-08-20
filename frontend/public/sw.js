/**
 * Service worker do tablet.
 *
 * Objetivo único: o tablet do carro continuar mostrando anúncio quando a
 * internet cai (túnel, periferia, chip sem sinal). Não tenta ser um cache
 * esperto de tudo — só garante que o app abre e que a última playlist
 * conhecida chega na tela.
 *
 * Estratégia:
 * - navegação  -> rede primeiro, cai para o shell cacheado
 * - assets     -> cache primeiro (hash no nome do arquivo invalida sozinho)
 * - API        -> nunca cacheia; o app já guarda a playlist em localStorage
 */

const CACHE = 'fastlead-tablet-v2';
const SHELL = ['/', '/tablet', '/manifest.webmanifest', '/favicon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // addAll falha inteiro se um item falhar; individualmente é mais resiliente.
      .then((cache) => Promise.allSettled(SHELL.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Requisições para a API passam direto: dado velho de métrica é pior que erro.
  if (url.pathname.startsWith('/tablet/') || url.pathname.startsWith('/admin/')) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/tablet', copy));
          return res;
        })
        .catch(() => caches.match('/tablet').then((r) => r || caches.match('/')))
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(request, copy));
            }
            return res;
          })
      )
    );
  }
});
