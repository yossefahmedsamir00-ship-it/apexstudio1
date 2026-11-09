import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

describe('APEX vanilla home page boot', () => {
  beforeAll(async () => {
    const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
    document.open();
    document.write(html);
    document.close();

    if (!window.matchMedia) {
      window.matchMedia = (query) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addListener() {},
        removeListener() {},
        addEventListener() {},
        removeEventListener() {},
        dispatchEvent() { return false; },
      });
    }

    await import('./app.js');
  });

  it('initializes all primary page controls without throwing', () => {
    expect(document.querySelector('#language-toggle')).not.toBeNull();
    expect(document.querySelector('#menu-toggle')).not.toBeNull();
    expect(document.querySelector('#assistant-modes')).not.toBeNull();
    expect(document.querySelector('[data-open-ai]')).not.toBeNull();
  });

  it('switches the document direction when the language changes', () => {
    document.querySelector('#language-toggle').click();
    expect(document.documentElement.lang).toBe('ar');
    expect(document.documentElement.dir).toBe('rtl');

    document.querySelector('#language-toggle').click();
    expect(document.documentElement.lang).toBe('en');
    expect(document.documentElement.dir).toBe('ltr');
  });

  it('opens the AI assistant and activates technical mode', () => {
    const technicalMode = document.querySelector('#assistant-modes [data-assistant-mode="technical"]');
    technicalMode.click();

    expect(technicalMode.getAttribute('aria-pressed')).toBe('true');
    expect(document.querySelector('#assistant-mode-hint').textContent).toContain('requirements');

    document.querySelector('[data-open-ai]').click();
    expect(document.querySelector('#ai-modal').hasAttribute('open')).toBe(true);
  });
});
