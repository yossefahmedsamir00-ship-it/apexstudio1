import { getWelcomeCopy, shouldShowWelcomeIntro } from './welcome-intro-core.js';

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

  if (shouldShowWelcomeIntro(storage, reducedMotion)) {
    let savedLocale = '';
    try {
      savedLocale = window.localStorage.getItem('apex_locale') || '';
    } catch {
      // Local storage may be blocked by the browser.
    }

    const locale = savedLocale === 'ar' || document.documentElement.lang === 'ar' ? 'ar' : 'en';
    const copy = getWelcomeCopy(locale);
    const caption = root.querySelector('[data-welcome-caption]');
    const enter = root.querySelector('[data-welcome-enter]');
    const replay = root.querySelector('[data-welcome-replay]');
    const skip = root.querySelector('[data-welcome-skip]');
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusable = [enter, replay, skip].filter((element) => element instanceof HTMLButtonElement);
    let finished = false;
    let voiceTimer;

    if (!caption || focusable.length !== 3) {
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
          finish();
          return;
        }

        if (event.key !== 'Tab') return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
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
      enter.textContent = copy.enter;
      replay.textContent = copy.replay;
      skip.textContent = copy.skip;
      document.body.classList.add('welcome-intro-active');
      root.hidden = false;
      root.setAttribute('aria-hidden', 'false');
      document.addEventListener('keydown', handleKeydown);
      enter.focus({ preventScroll: true });

      enter.addEventListener('click', finish);
      skip.addEventListener('click', finish);
      replay.addEventListener('click', speak);
      voiceTimer = window.setTimeout(speak, 2100);
      window.setTimeout(() => {
        if (!finished) enter.classList.add('is-ready');
      }, 2600);
      window.setTimeout(finish, 7200);
    }
  } else {
    root.remove();
  }
}
