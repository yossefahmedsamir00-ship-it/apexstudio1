export function shouldShowWelcomeIntro(storage) {
  try {
    return storage?.getItem('apex_welcome_intro_seen') !== 'seen';
  } catch {
    return true;
  }
}

export function getFocusTrapTarget(activeElement, focusableElements, shiftKey) {
  if (!Array.isArray(focusableElements) || focusableElements.length === 0) return null;
  const first = focusableElements[0];
  const last = focusableElements[focusableElements.length - 1];
  const activeIsInside = focusableElements.includes(activeElement);

  if (shiftKey && (activeElement === first || !activeIsInside)) return last;
  if (!shiftKey && (activeElement === last || !activeIsInside)) return first;
  return null;
}

export function getWelcomeCopy(locale = 'en') {
  return locale === 'ar'
    ? {
        spoken: 'أهلاً بيك في أبيكس ستوديو',
        caption: 'أهلاً بيك في APEX STUDIO',
        subtitle: 'مساحة جديدة لصناعة تجارب رقمية مختلفة.',
        replay: 'إعادة الترحيب الصوتي',
      }
    : {
        spoken: 'Welcome to APEX STUDIO',
        caption: 'WELCOME TO APEX STUDIO',
        subtitle: 'A new dimension of digital experiences.',
        replay: 'Replay welcome voice',
      };
}

export function getWelcomeDuration(prefersReducedMotion) {
  return prefersReducedMotion ? 1800 : 7200;
}

export function getWelcomeStages() {
  return [
    { id: 'hello', duration: 2000 },
    { id: 'evolve', duration: 1800 },
    { id: 'identity', duration: 2000 },
    { id: 'greeting', duration: 2500 },
    { id: 'website', duration: 2200 },
  ];
}
