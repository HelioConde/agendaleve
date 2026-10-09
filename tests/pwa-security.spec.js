const { test, expect } = require('@playwright/test');

test('PWA preserva caches de outros projetos e não guarda tokens privados de reservas', async ({ page }) => {
  await page.goto('/');

  await page.evaluate(async () => {
    const foreign = await caches.open('zerotwo-shell-release-sentinel');
    await foreign.put('/foreign-asset', new Response('keep', { status: 200 }));
    await navigator.serviceWorker.register('./sw.js');
    await navigator.serviceWorker.ready;
  });

  // Ensure the new service worker handles subsequent navigations.
  await page.reload();
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true);

  const privateUrl = '/?negocio=studio-teste&reserva=00000000-0000-4000-8000-000000000000&token=private-regression-token';
  await page.goto(privateUrl, { waitUntil: 'domcontentloaded' });
  // Fetch a non-shell same-origin resource with query parameters.
  await page.evaluate(async () => {
    await fetch('./version.json?token=private-regression-token', { cache: 'no-store' });
  });

  const state = await page.evaluate(async () => {
    const names = await caches.keys();
    const urls = [];
    for (const name of names) {
      const cache = await caches.open(name);
      const keys = await cache.keys();
      urls.push(...keys.map(request => request.url));
    }
    const foreign = await caches.open('zerotwo-shell-release-sentinel');
    return {
      names,
      urls,
      otherAppCacheValue: await (await foreign.match('/foreign-asset'))?.text()
    };
  });
  expect(state.names).toContain('agendaleve-shell-v3');
  expect(state.otherAppCacheValue).toBe('keep');
  expect(state.urls.some(url => url.includes('private-regression-token'))).toBe(false);
  expect(state.urls.some(url => url.includes('/version.json?'))).toBe(false);
});

test('Ao ativar uma nova versão, o PWA apaga somente caches antigos do AgendaLeve', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(async () => {
    await caches.open('agendaleve-shell-v1');
    await caches.open('chibi-gg-offline-assets');
    const registration = await navigator.serviceWorker.register('./sw.js');
    await navigator.serviceWorker.ready;
    if (registration.active?.state !== 'activated') {
      await new Promise(resolve => {
        const worker = registration.installing || registration.waiting;
        if (!worker) return resolve();
        worker.addEventListener('statechange', () => {
          if (worker.state === 'activated') resolve();
        });
      });
    }
  });
  const names = await page.evaluate(() => caches.keys());
  expect(names).toContain('agendaleve-shell-v3');
  expect(names).not.toContain('agendaleve-shell-v1');
  expect(names).toContain('chibi-gg-offline-assets');
});
