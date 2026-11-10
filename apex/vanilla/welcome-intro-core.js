export function shouldShowWelcomeIntro(storage, prefersReducedMotion) {
  if (prefersReducedMotion) return false;
  try {
    return storage?.getItem('apex_welcome_intro_seen') !== 'seen';
  } catch {
    return true;
  }
}

export function getWelcomeCopy(locale = 'en') {
  return locale === 'ar'
    ? { spoken: 'أهلاً بيك في أبيكس ستوديو', caption: 'أهلاً بيك في APEX STUDIO', enter: 'ادخل الاستوديو', replay: 'اسمع الترحيب مرة تانية', skip: 'تخطي المقدمة' }
    : { spoken: 'Welcome to APEX STUDIO', caption: 'WELCOME TO APEX STUDIO', enter: 'Enter the studio', replay: 'Replay welcome', skip: 'Skip intro' };
}
