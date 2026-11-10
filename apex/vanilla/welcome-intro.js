import { getFocusTrapTarget, getWelcomeCopy, getWelcomeDuration, shouldShowWelcomeIntro } from './welcome-intro-core.js';

const root = document.getElementById('apex-welcome');

if (root) {
  const storage = {
    getItem(key) {
      return window.sessionStorage.getItem(key);
    },
    setItem(key, value) {
      window.sessionStorage.setItem(key, value);
    },
  };
  const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

  if (shouldShowWelcomeIntro(storage)) {
    let savedLocale = '';
    try {
      savedLocale = window.localStorage.getItem('apex_locale') || '';
    } catch {
      // Local storage may be blocked by the browser.
    }

    const locale = savedLocale === 'ar' || document.documentElement.lang === 'ar' ? 'ar' : 'en';
    const copy = getWelcomeCopy(locale);
    const caption = root.querySelector('[data-welcome-caption]');
    const subtitle = root.querySelector('[data-welcome-subtitle]');
    const replay = root.querySelector('[data-welcome-replay]');
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = [replay].filter((element) => element instanceof HTMLButtonElement);
    let finished = false;
    let voiceTimer;

    if (!caption || !subtitle || focusable.length !== 1) {
      root.remove();
    } else {
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
        if (event.key === 'Escape') {
          event.preventDefault();
          return;
        }

        if (event.key !== 'Tab') return;
        const target = getFocusTrapTarget(document.activeElement, focusable, event.shiftKey);
        if (target) {
          event.preventDefault();
          target.focus();
        }
      };

      const finish = () => {
        if (finished) return;
        finished = true;
        window.clearTimeout(voiceTimer);
        window.speechSynthesis?.cancel();
        document.removeEventListener('keydown', handleKeydown);
        try {
          storage.setItem('apex_welcome_intro_seen', 'seen');
        } catch {
          // Session storage may be blocked.
        }
        root.classList.add('is-leaving');
        document.body.classList.remove('welcome-intro-active');
        window.setTimeout(() => {
          root.remove();
          previousFocus?.focus?.({ preventScroll: true });
        }, reducedMotion ? 0 : 850);
      };

      caption.textContent = copy.caption;
      subtitle.textContent = copy.subtitle;
      replay.textContent = copy.replay;
      document.body.classList.add('welcome-intro-active');
      root.hidden = false;
      root.setAttribute('aria-hidden', 'false');
      document.addEventListener('keydown', handleKeydown);
      replay.focus({ preventScroll: true });

      replay.addEventListener('click', speak);
      voiceTimer = window.setTimeout(speak, reducedMotion ? 450 : 2100);
      window.setTimeout(finish, getWelcomeDuration(reducedMotion));
    }
  } else {
    root.remove();
  }
}
