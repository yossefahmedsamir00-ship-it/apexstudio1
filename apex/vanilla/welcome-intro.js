import { getWelcomeCopy, getWelcomeStages, shouldShowWelcomeIntro } from './welcome-intro-core.js';

const root = document.getElementById('apex-welcome');

if (root) {
  const storage = {
    getItem(key) { return window.sessionStorage.getItem(key); },
    setItem(key, value) { window.sessionStorage.setItem(key, value); },
  };

  if (shouldShowWelcomeIntro(storage)) {
    let savedLocale = '';
    try { savedLocale = window.localStorage.getItem('apex_locale') || ''; } catch { /* Storage may be blocked. */ }
    const locale = savedLocale === 'ar' || document.documentElement.lang === 'ar' ? 'ar' : 'en';
    const copy = getWelcomeCopy(locale);
    const caption = root.querySelector('[data-welcome-caption]');
    const subtitle = root.querySelector('[data-welcome-subtitle]');
    const stageNodes = [...root.querySelectorAll('[data-welcome-stage]')];
    const stages = getWelcomeStages();
    let finished = false;
    let stageTimer = 0;
    let finishTimer = 0;

    const speak = () => {
      if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(copy.spoken);
      utterance.lang = locale === 'ar' ? 'ar-EG' : 'en-US';
      utterance.rate = 0.92;
      utterance.pitch = 0.94;
      utterance.volume = 0.9;
      window.speechSynthesis.speak(utterance);
    };

    const handleKeydown = (event) => {
      if (event.key === 'Escape') event.preventDefault();
    };

    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(stageTimer);
      window.clearTimeout(finishTimer);
      window.speechSynthesis?.cancel();
      document.removeEventListener('keydown', handleKeydown);
      try { storage.setItem('apex_welcome_intro_seen', 'seen'); } catch { /* Session storage may be blocked. */ }
      root.classList.add('is-leaving');
      document.body.classList.remove('welcome-intro-active');
      window.setTimeout(() => root.remove(), 850);
    };

    const showStage = (index) => {
      if (finished) return;
      const stage = stages[index];
      if (!stage) { finish(); return; }
      root.dataset.stage = stage.id;
      stageNodes.forEach((node) => {
        const active = node.dataset.welcomeStage === stage.id;
        node.classList.toggle('is-active', active);
        node.setAttribute('aria-hidden', String(!active));
      });
      if (stage.id === 'greeting') {
        caption.textContent = copy.caption;
        subtitle.textContent = copy.subtitle;
        speak();
      }
      stageTimer = window.setTimeout(() => showStage(index + 1), stage.duration);
    };

    if (!caption || !subtitle || stageNodes.length !== stages.length) {
      root.remove();
    } else {
      document.body.classList.add('welcome-intro-active');
      root.hidden = false;
      root.setAttribute('aria-hidden', 'false');
      root.focus({ preventScroll: true });
      document.addEventListener('keydown', handleKeydown);
      showStage(0);
    }
  } else {
    root.remove();
  }
}
