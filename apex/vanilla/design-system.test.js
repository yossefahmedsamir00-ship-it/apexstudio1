import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const styles = readFileSync('vanilla/styles.css', 'utf8');
const editorial = readFileSync('vanilla/editorial.css', 'utf8');

describe('APEX public design tokens', () => {
  it('defines the black, electric-blue and cyan brand palette', () => {
    expect(styles.includes('--bg: #070a10')).toBe(true);
    expect(styles.includes('--electric-blue: #1677ff')).toBe(true);
    expect(styles.includes('--cyan: #12d9ff')).toBe(true);
    expect(styles.includes('--surface: #0c1422')).toBe(true);
  });

  it('keeps the editorial layer on the same palette without legacy gold variables', () => {
    expect(editorial.includes('--bg: #070a10')).toBe(true);
    expect(editorial.includes('--electric-blue: #1677ff')).toBe(true);
    expect(editorial.includes('--cyan: #12d9ff')).toBe(true);
    expect(editorial.includes('--gold:')).toBe(false);
    expect(editorial.includes('var(--gold')).toBe(false);
  });

  it('keeps a reduced-motion mode for non-essential animation', () => {
    expect(styles.includes('prefers-reduced-motion: reduce')).toBe(true);
  });
});
