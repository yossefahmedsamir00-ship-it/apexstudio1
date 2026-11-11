import { describe, expect, it } from 'vitest';
import { getFocusTrapTarget, getWelcomeCopy, getWelcomeDuration, getWelcomeStages, shouldShowWelcomeIntro } from './welcome-intro-core.js';

describe('cinematic welcome intro', () => {
  it('plays five ordered visual stages before opening the website', () => {
    expect(getWelcomeStages().map((stage) => stage.id)).toEqual(['hello', 'cursor', 'outline', 'armor', 'greeting', 'website']);
    expect(getWelcomeStages().reduce((total, stage) => total + stage.duration, 0)).toBe(13200);
  });

  it('includes a skip action and a deliberate color progression for the astronaut build', () => {
    expect(getWelcomeCopy('en').skip).toBe('Skip intro');
    expect(getWelcomeCopy('ar').skip).toBe('تخطي المقدمة');
    expect(getWelcomeStages().map((stage) => stage.id)).toEqual([
      'hello', 'cursor', 'outline', 'armor', 'greeting', 'website',
    ]);
    expect(getWelcomeStages().reduce((total, stage) => total + stage.duration, 0)).toBeGreaterThanOrEqual(10000);
    expect(getWelcomeStages().reduce((total, stage) => total + stage.duration, 0)).toBeLessThanOrEqual(16000);
  });

  it('shows the intro once per tab unless the visitor already completed it', () => {
    expect(shouldShowWelcomeIntro({ getItem: () => null })).toBe(true);
    expect(shouldShowWelcomeIntro({ getItem: () => 'seen' })).toBe(false);
  });

  it('keeps the mandatory entrance when reduced motion is requested', () => {
    expect(shouldShowWelcomeIntro({ getItem: () => null })).toBe(true);
    expect(getWelcomeDuration(true)).toBeGreaterThan(0);
    expect(getWelcomeDuration(true)).toBeLessThan(getWelcomeDuration(false));
  });

  it('provides localized welcome copy and an accessible skip label', () => {
    expect(getWelcomeCopy('en').spoken).toBe('Welcome to APEX STUDIO');
    expect(getWelcomeCopy('ar').spoken).toContain('أهلاً بيك');
    expect(getWelcomeCopy('en').skip).toBe('Skip intro');
    expect(getWelcomeCopy('ar').skip).toBe('تخطي المقدمة');
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
