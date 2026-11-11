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
        skip: 'تخطي المقدمة',
      }
    : {
        spoken: 'Welcome to APEX STUDIO',
        caption: 'WELCOME TO APEX STUDIO',
        subtitle: 'A new dimension of digital experiences.',
        replay: 'Replay welcome voice',
        skip: 'Skip intro',
      };
}

export function getWelcomeDuration(prefersReducedMotion) {
  return prefersReducedMotion ? 1500 : 13200;
}

export function getWelcomeStages() {
  return [
    { id: 'hello', duration: 2100 },
    { id: 'cursor', duration: 2100 },
    { id: 'outline', duration: 2100 },
    { id: 'armor', duration: 2400 },
    { id: 'greeting', duration: 2400 },
    { id: 'website', duration: 2100 },
  ];
}
