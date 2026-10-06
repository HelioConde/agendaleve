(() => {
  const config = window.AGENDALEVE_ADS || {};
  if (!config.enabled || !config.publisherId) return;

  const placements = {
    'owner-footer': config.slots?.ownerFooter,
    'public-footer': config.slots?.publicFooter
  };

  const active = Array.from(document.querySelectorAll('[data-ad-placement]'))
    .filter(container => {
      const slot = placements[container.dataset.adPlacement];
      if (!slot) return false;

      const ad = container.querySelector('.adsbygoogle');
      if (!ad) return false;

      ad.dataset.adClient = config.publisherId;
      ad.dataset.adSlot = slot;
      container.hidden = false;
      return true;
    });

  if (!active.length) return;

  const script = document.createElement('script');
  script.async = true;
  script.crossOrigin = 'anonymous';
  script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(config.publisherId)}`;
  script.onload = () => {
    active.forEach(() => {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch (error) {
        console.warn('AgendaLeve: anúncio não pôde ser inicializado.', error);
      }
    });
  };
  document.head.append(script);
})();
