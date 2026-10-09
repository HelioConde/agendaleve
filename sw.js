// Keep every cache scoped to AgendaLeve: GitHub Pages hosts multiple projects on one origin.
const CACHE_NAME = 'agendaleve-shell-v3';
const APP_SHELL = ['./', './index.html', './style.css', './i18n.js', './app.js', './supabase-config.js', './ads-config.js', './ads.js', './manifest.webmanifest', './icon.svg'];
const SCOPE_URL = new URL(self.registration.scope);
const SHELL_PATHS = new Set(APP_SHELL.map(item => new URL(item, self.registration.scope).pathname));

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    // Never delete caches of ZeroTwo, chibi.gg or other apps on helioconde.github.io.
    await Promise.all(names
      .filter(name => name.startsWith('agendaleve-shell-') && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  // Private reservation links may contain booking tokens in their query string.
  // Never save such URLs, or arbitrary same-origin resources, in Cache Storage.
  const canCache = !url.search && SHELL_PATHS.has(url.pathname);
  const isNavigation = event.request.mode === 'navigate';
  if (!canCache && !isNavigation) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(event.request);
      if (canCache && response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(event.request, response.clone());
      }
      return response;
    } catch {
      if (canCache) {
        const cached = await caches.match(event.request);
        if (cached) return cached;
      }
      if (isNavigation) {
        const shell = await caches.match(new URL('./index.html', self.registration.scope).href);
        if (shell) return shell;
      }
      return Response.error();
    }
  })());
});

self.addEventListener('push', event => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data?.text() || 'Você tem um próximo atendimento.' };
  }

  const title = payload.title || 'AgendaLeve';
  const options = {
    body: payload.body || 'Você tem um próximo atendimento.',
    tag: payload.tag || 'agendaleve-reminder',
    renotify: true,
    data: { url: payload.url || './' }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || './', self.registration.scope);
  // Push payloads must not navigate outside this application's scope.
  const url = target.origin === SCOPE_URL.origin && target.pathname.startsWith(SCOPE_URL.pathname)
    ? target.href
    : self.registration.scope;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find(client => client.url.startsWith(self.registration.scope));
    if (existing) {
      await existing.focus();
      if ('navigate' in existing) await existing.navigate(url);
      return;
    }
    await self.clients.openWindow(url);
  })());
});
