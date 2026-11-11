import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('APEX vanilla home page boot', () => {
  beforeAll(async () => {
    const html = readFileSync(resolve(process.cwd(), 'vanilla/index.html'), 'utf8');
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

  it('opens the immersive showroom and exits safely with Escape', () => {
    const enter = document.querySelector('#enter-showroom');
    const exit = document.querySelector('#exit-showroom');

    enter.click();
    expect(document.body.classList.contains('showroom-mode')).toBe(true);
    expect(enter.getAttribute('aria-expanded')).toBe('true');
    expect(exit.hidden).toBe(false);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(document.body.classList.contains('showroom-mode')).toBe(false);
    expect(enter.getAttribute('aria-expanded')).toBe('false');
    expect(exit.hidden).toBe(true);
  });

  it('restores an unsent visitor message when chat initialization fails', async () => {
    const input = document.querySelector('#chat-input');
    const form = document.querySelector('#chat-form');
    const message = 'I need help planning a new website project.';

    input.value = message;
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(input.value).toBe(message);
    expect(document.querySelector('#chat-messages .chat-bubble.user')).toBeNull();
  });
});
