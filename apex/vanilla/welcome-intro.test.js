import { describe, expect, it } from 'vitest';
import { getWelcomeCopy, shouldShowWelcomeIntro } from './welcome-intro-core.js';

describe('cinematic welcome intro', () => {
  it('shows the intro once per tab unless the visitor already dismissed it', () => {
    expect(shouldShowWelcomeIntro({ getItem: () => null }, false)).toBe(true);
    expect(shouldShowWelcomeIntro({ getItem: () => 'seen' }, false)).toBe(false);
  });

  it('skips the blocking intro when reduced motion is requested', () => {
    expect(shouldShowWelcomeIntro({ getItem: () => null }, true)).toBe(false);
  });

  it('provides localized welcome copy', () => {
    expect(getWelcomeCopy('en').spoken).toBe('Welcome to APEX STUDIO');
    expect(getWelcomeCopy('ar').spoken).toContain('أهلاً بيك');
  });
});
