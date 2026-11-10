import { getWelcomeCopy, shouldShowWelcomeIntro } from './welcome-intro-core.js';

const root = document.getElementById('apex-welcome');
if (root) {
  const storage = {
    getItem(key) { return window.sessionStorage.getItem(key); },
    setItem(key, value) { window.sessionStorage.setItem(key, value); },
  };
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  if (shouldShowWelcomeIntro(storage, reducedMotion)) {
    const copy = getWelcomeCopy(document.documentElement.lang === 'ar' ? 'ar' : 'en');
    const caption = root.querySelector('[data-welcome-caption]');
    const enter = root.querySelector('[data-welcome-enter]');
    const replay = root.querySelector('[data-welcome-replay]');
    const skip = root.querySelector('[data-welcome-skip]');
    let finished = false;
    let voiceTimer;

    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(voiceTimer);
      window.speechSynthesis?.cancel();
      try { storage.setItem('apex_welcome_intro_seen', 'seen'); } catch { /* session storage may be blocked */ }
      root.classList.add('is-leaving');
      document.body.classList.remove('welcome-intro-active');
      window.setTimeout(() => root.remove(), reducedMotion ? 0 : 850);
    };

    const speak = () => {
      if (!('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) return;
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(copy.spoken);
      utterance.lang = document.documentElement.lang === 'ar' ? 'ar-EG' : 'en-US';
      utterance.rate = 0.92;
      utterance.pitch = 0.94;
      utterance.volume = 0.9;
      window.speechSynthesis.speak(utterance);
    };

    caption.textContent = copy.caption;
    enter.textContent = copy.enter;
    replay.textContent = copy.replay;
    skip.textContent = copy.skip;
    document.body.classList.add('welcome-intro-active');
    root.hidden = false;
    root.setAttribute('aria-hidden', 'false');

    enter.addEventListener('click', finish);
    skip.addEventListener('click', finish);
    replay.addEventListener('click', speak);
    voiceTimer = window.setTimeout(speak, 2100);
    window.setTimeout(() => {
      if (!finished) enter.classList.add('is-ready');
    }, 2600);
    window.setTimeout(finish, 7200);
  } else {
    root.remove();
  }
}
