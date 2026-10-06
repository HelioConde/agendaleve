(() => {
  'use strict';

  const CHECK_INTERVAL_MS = 12_000;
  const VERSION_URL = 'version.json';
  const CACHE_BUST_PARAM = '__v';
  const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

  if (LOCAL_HOSTS.has(window.location.hostname)) return;

  const currentUrl = new URL(window.location.href);
  if (currentUrl.searchParams.has(CACHE_BUST_PARAM)) {
    currentUrl.searchParams.delete(CACHE_BUST_PARAM);
    window.history.replaceState(null, '', currentUrl.pathname + currentUrl.search + currentUrl.hash);
  }

  let currentVersion = null;
  let checking = false;
  let reloading = false;

  function getVersion(payload) {
    return String(payload?.sha || payload?.version || '').trim();
  }

  async function fetchVersion() {
    const response = await fetch(VERSION_URL + '?_=' + Date.now(), {
      cache: 'no-store',
      credentials: 'same-origin'
    });
    if (!response.ok) throw new Error('version-check-' + response.status);
    return getVersion(await response.json());
  }

  function showNotice() {
    let notice = document.getElementById('live-update-notice');
    if (notice) return notice;

    notice = document.createElement('div');
    notice.id = 'live-update-notice';
    notice.setAttribute('role', 'status');
    notice.setAttribute('aria-live', 'polite');
    notice.textContent = 'Nova versão publicada. Atualizando automaticamente…';

    Object.assign(notice.style, {
      position: 'fixed',
      left: '50%',
      bottom: '18px',
      transform: 'translateX(-50%)',
      zIndex: '2147483647',
      maxWidth: 'calc(100vw - 24px)',
      padding: '10px 14px',
      borderRadius: '999px',
      background: '#171717',
      color: '#fff',
      font: '600 12px/1.35 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
      boxShadow: '0 10px 35px rgba(0,0,0,.25)',
      textAlign: 'center'
    });

    document.body.appendChild(notice);
    return notice;
  }

  async function refreshRuntimeCaches() {
    try {
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.allSettled(registrations.map(registration => registration.update()));
      }
    } catch {}

    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.allSettled(keys.map(key => caches.delete(key)));
      }
    } catch {}
  }

  async function reloadFresh(nextVersion) {
    if (reloading) return;
    reloading = true;
    showNotice();

    await refreshRuntimeCaches();
    await new Promise(resolve => setTimeout(resolve, 650));

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set(CACHE_BUST_PARAM, nextVersion.slice(0, 16) || Date.now().toString());
    window.location.replace(nextUrl.toString());
  }

  async function checkVersion() {
    if (checking || reloading) return;
    checking = true;

    try {
      const nextVersion = await fetchVersion();
      if (!nextVersion) return;

      if (currentVersion === null) {
        currentVersion = nextVersion;
        return;
      }

      if (nextVersion !== currentVersion) {
        await reloadFresh(nextVersion);
      }
    } catch {
      // Version checks must never interrupt normal page usage.
    } finally {
      checking = false;
    }
  }

  checkVersion();
  window.setInterval(checkVersion, CHECK_INTERVAL_MS);
  window.addEventListener('focus', checkVersion);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkVersion();
  });
})();
