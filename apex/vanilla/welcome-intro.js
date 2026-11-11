import { getWelcomeCopy, getWelcomeStages, shouldShowWelcomeIntro } from './welcome-intro-core.js';

const root = document.getElementById('apex-welcome');

if (root) {
  const storage = {
    getItem(key) { return window.sessionStorage.getItem(key); },
    setItem(key, value) { window.sessionStorage.setItem(key, value); },
  };

  const finishImmediately = () => {
    root.remove();
    document.body.classList.remove('welcome-intro-active');
  };

  if (!shouldShowWelcomeIntro(storage)) {
    finishImmediately();
  } else {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const locale = (() => {
      try {
        return window.localStorage.getItem('apex_locale') === 'ar' || document.documentElement.lang === 'ar' ? 'ar' : 'en';
      } catch {
        return document.documentElement.lang === 'ar' ? 'ar' : 'en';
      }
    })();
    const copy = getWelcomeCopy(locale);
    const caption = root.querySelector('[data-welcome-caption]');
    const subtitle = root.querySelector('[data-welcome-subtitle]');
    const skip = root.querySelector('[data-welcome-skip]');
    const stages = getWelcomeStages();
    let stageTimer = 0;
    let removalTimer = 0;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(stageTimer);
      window.clearTimeout(removalTimer);
      document.removeEventListener('keydown', onKeydown);
      try { storage.setItem('apex_welcome_intro_seen', 'seen'); } catch { /* Session storage may be blocked. */ }
      root.classList.add('is-leaving');
      document.body.classList.remove('welcome-intro-active');
      removalTimer = window.setTimeout(() => root.remove(), 700);
    };

    const onKeydown = (event) => {
      if (event.key === 'Escape') finish();
    };

    const showStage = (index) => {
      if (finished) return;
      const stage = stages[index];
      if (!stage) {
        finish();
        return;
      }
      root.dataset.stage = stage.id;
      if (stage.id === 'greeting') {
        caption.textContent = copy.caption;
        subtitle.textContent = copy.subtitle;
      }
      stageTimer = window.setTimeout(() => showStage(index + 1), stage.duration);
    };

    if (!caption || !subtitle || !skip) {
      finishImmediately();
    } else {
      skip.textContent = copy.skip;
      skip.addEventListener('click', finish);
      document.body.classList.add('welcome-intro-active');
      root.hidden = false;
      root.setAttribute('aria-hidden', 'false');
      root.focus({ preventScroll: true });
      document.addEventListener('keydown', onKeydown);
      if (reducedMotion.matches) {
        root.dataset.stage = 'website';
        caption.textContent = copy.caption;
        subtitle.textContent = copy.subtitle;
        stageTimer = window.setTimeout(finish, 1500);
      } else {
        showStage(0);
      }
    }
  }
}
