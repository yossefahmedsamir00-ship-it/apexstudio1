import { describe, expect, it } from 'vitest';
import { routeAgent } from './router';

describe('AI router', () => {
  it('routes technical requests to technical agent', () => {
    expect(routeAgent('I need a Firebase API and database architecture')).toBe('technical');
  });

  it('routes Arabic UX requests to UX agent', () => {
    expect(routeAgent('عايز تصميم واجهة موبايل وتجربة مستخدم')).toBe('ux');
  });

  it('uses discovery as the safe default', () => {
    expect(routeAgent('I have an idea for a new project')).toBe('discovery');
  });
});
