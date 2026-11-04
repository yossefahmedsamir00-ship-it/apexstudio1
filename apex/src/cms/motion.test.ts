import { describe, expect, it } from 'vitest';
import { getStaggerDelay } from './motion';

describe('getStaggerDelay', () => {
  it('increases the delay in order for sequential menu items', () => {
    expect([0, 1, 2, 3].map((index) => getStaggerDelay(index))).toEqual([0, 70, 140, 210]);
  });

  it('keeps nested menu items after their parent group', () => {
    expect(getStaggerDelay(2, 70, 420, 140)).toBe(280);
  });

  it('caps long menus and clamps negative indexes to zero', () => {
    expect(getStaggerDelay(20)).toBe(420);
    expect(getStaggerDelay(-3)).toBe(0);
  });
});
