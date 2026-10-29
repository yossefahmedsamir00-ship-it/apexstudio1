// Owner authentication is intentionally login-only in production.
// The owner account must be provisioned in Supabase; the public admin UI must never
// trigger Supabase Auth signUp(), which can consume the project's email quota.
const SIGNUP_LABEL = 'First time? Create owner login';

const hideOwnerSignup = () => {
  const buttons = Array.from(document.querySelectorAll('button'));
  for (const button of buttons) {
    if (button.textContent?.trim() === SIGNUP_LABEL) {
      button.remove();
    }
  }
};

if (typeof document !== 'undefined') {
  hideOwnerSignup();
  new MutationObserver(hideOwnerSignup).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
}
