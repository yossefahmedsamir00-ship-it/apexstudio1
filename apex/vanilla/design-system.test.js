import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const styles = readFileSync('vanilla/styles.css', 'utf8');
const editorial = readFileSync('vanilla/editorial.css', 'utf8');

describe('APEX public design tokens', () => {
  it('defines the black, electric-blue and cyan brand palette', () => {
    expect(styles).toMatch(/--bg:\s*#070a10/i);
    expect(styles).toMatch(/--electric-blue:\s*#1677ff/i);
    expect(styles).toMatch(/--cyan:\s*#12d9ff/i);
    expect(styles).toMatch(/--surface:\s*#0c1422/i);
  });

  it('keeps the editorial layer on the same palette without legacy gold variables', () => {
    expect(editorial).toMatch(/--bg:\\s*#070a10/i);
    expect(editorial).toMatch(/--electric-blue:\\s*#1677ff/i);
    expect(editorial).toMatch(/--cyan:\\s*#12d9ff/i);
    expect(editorial).not.toMatch(/--gold:|var\\(\\s*--gold/i);
  });

  it('keeps a reduced-motion mode for non-essential animation', () => {
    expect(styles).toMatch(/@media\s*\(prefers-reduced-motion:\s*reduce\)/i);
  });
});
