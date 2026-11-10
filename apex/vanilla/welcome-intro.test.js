import { describe, expect, it } from 'vitest';
import { getFocusTrapTarget, getWelcomeCopy, getWelcomeDuration, shouldShowWelcomeIntro } from './welcome-intro-core.js';

describe('cinematic welcome intro', () => {
  it('shows the intro once per tab unless the visitor already completed it', () => {
    expect(shouldShowWelcomeIntro({ getItem: () => null })).toBe(true);
    expect(shouldShowWelcomeIntro({ getItem: () => 'seen' })).toBe(false);
  });

  it('keeps the mandatory entrance when reduced motion is requested', () => {
    expect(shouldShowWelcomeIntro({ getItem: () => null })).toBe(true);
    expect(getWelcomeDuration(true)).toBeGreaterThan(0);
    expect(getWelcomeDuration(true)).toBeLessThan(getWelcomeDuration(false));
  });

  it('provides localized welcome copy without a skip or early-enter action', () => {
    expect(getWelcomeCopy('en').spoken).toBe('Welcome to APEX STUDIO');
    expect(getWelcomeCopy('ar').spoken).toContain('أهلاً بيك');
    expect(getWelcomeCopy('en')).not.toHaveProperty('skip');
    expect(getWelcomeCopy('ar')).not.toHaveProperty('skip');
    expect(getWelcomeCopy('en')).not.toHaveProperty('enter');
    expect(getWelcomeCopy('ar')).not.toHaveProperty('enter');
  });

  it('wraps focus on the only available voice replay control', () => {
    const replay = {};
    expect(getFocusTrapTarget(replay, [replay], false)).toBe(replay);
    expect(getFocusTrapTarget(replay, [replay], true)).toBe(replay);
  });

  it('recovers focus if it has escaped the modal control', () => {
    const replay = {};
    expect(getFocusTrapTarget({}, [replay], false)).toBe(replay);
    expect(getFocusTrapTarget({}, [replay], true)).toBe(replay);
  });
});
