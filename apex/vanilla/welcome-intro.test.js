import { describe, expect, it } from 'vitest';
import { getFocusTrapTarget, getWelcomeCopy, shouldShowWelcomeIntro } from './welcome-intro-core.js';

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

  it('wraps focus from the last intro control to the first', () => {
    const first = {};
    const last = {};
    expect(getFocusTrapTarget(last, [first, {}, last], false)).toBe(first);
  });

  it('wraps focus from the first intro control to the last with Shift+Tab', () => {
    const first = {};
    const last = {};
    expect(getFocusTrapTarget(first, [first, {}, last], true)).toBe(last);
  });

  it('recovers focus if it has escaped the modal controls', () => {
    const first = {};
    const last = {};
    expect(getFocusTrapTarget({}, [first, {}, last], false)).toBe(first);
    expect(getFocusTrapTarget({}, [first, {}, last], true)).toBe(last);
  });
});
