const mascot = document.getElementById('apex-scroll-mascot');

if (mascot) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobile = window.matchMedia('(max-width: 620px)');
  const sections = [...document.querySelectorAll('main > section[id], main section[id]')];
  let frame = 0;
  let scrollY = window.scrollY;
  let activeSection = 'home';

  const update = () => {
    frame = 0;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const progress = Math.min(1, Math.max(0, scrollY / maxScroll));
    const direction = scrollY > Number(mascot.dataset.lastY || 0) ? 1 : -1;
    mascot.dataset.lastY = String(scrollY);
    mascot.style.setProperty('--scroll-progress', progress.toFixed(4));
    mascot.style.setProperty('--scroll-tilt', reduceMotion.matches ? '0deg' : `${direction * 2.5}deg`);
    mascot.style.setProperty('--scroll-shift', reduceMotion.matches ? '0px' : `${Math.sin(progress * Math.PI * 8) * 8}px`);
    mascot.dataset.section = activeSection;
  };

  const requestUpdate = () => {
    scrollY = window.scrollY;
    if (!frame) frame = window.requestAnimationFrame(update);
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (visible) {
        activeSection = visible.target.id || 'home';
        requestUpdate();
      }
    }, { rootMargin: '-25% 0px -45% 0px', threshold: [0.1, 0.25, 0.5] });
    sections.forEach((section) => observer.observe(section));
  }

  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate, { passive: true });
  reduceMotion.addEventListener?.('change', requestUpdate);
  mobile.addEventListener?.('change', requestUpdate);
  requestUpdate();
}
