import { describe, expect, it } from 'vitest';
import { parseCmsNavigation, parseCmsPage, parseCmsTheme } from './parse';

describe('parseCmsPage', () => {
  it('preserves supported bilingual sections in their supplied order', () => {
    const page = parseCmsPage({
      key: 'home',
      sections: [
        { id: 'hero', type: 'hero', enabled: true, order: 0, content: { title: { en: 'Build', ar: 'ابنِ' } } },
        { id: 'work', type: 'projects', enabled: true, order: 1, content: { heading: { en: 'Work', ar: 'الأعمال' } } },
      ],
    });

    expect(page?.sections.map((section) => section.id)).toEqual(['hero', 'work']);
    expect(page?.sections[0].content.title).toEqual({ en: 'Build', ar: 'ابنِ' });
  });

  it('skips unknown section types without losing valid sections', () => {
    const page = parseCmsPage({
      key: 'home',
      sections: [
        { id: 'hero', type: 'hero', content: {} },
        { id: 'custom-code', type: 'script', content: { code: 'not-rendered' } },
      ],
    });

    expect(page?.sections.map((section) => section.id)).toEqual(['hero']);
  });

  it('returns null for malformed page documents', () => {
    expect(parseCmsPage({ key: '', sections: [] })).toBeNull();
    expect(parseCmsPage({ key: 'home', sections: 'not-an-array' })).toBeNull();
  });
});

describe('parseCmsNavigation', () => {
  it('preserves nested menu order and bilingual labels', () => {
    const navigation = parseCmsNavigation({
      items: [{
        id: 'more',
        label: { en: 'More', ar: 'المزيد' },
        href: '#more',
        children: [
          { id: 'payments', label: { en: 'Payments', ar: 'الدفع' }, href: '#payments' },
          { id: 'contact', label: { en: 'Contact', ar: 'تواصل' }, href: '#contact' },
        ],
      }],
    });

    expect(navigation?.items[0].children.map((item) => item.id)).toEqual(['payments', 'contact']);
    expect(navigation?.items[0].label.ar).toBe('المزيد');
  });

  it('returns null when the navigation root is malformed', () => {
    expect(parseCmsNavigation({ items: 'invalid' })).toBeNull();
  });
});

describe('parseCmsTheme', () => {
  it('accepts string design tokens and defaults optional motion flags', () => {
    expect(parseCmsTheme({ tokens: { accent: '#d7aa5b', surface: '#050505' } })).toEqual({
      tokens: { accent: '#d7aa5b', surface: '#050505' },
      motion: { enabled: true, blurBackground: true, buttonGlow: true },
    });
  });

  it('rejects malformed token collections', () => {
    expect(parseCmsTheme({ tokens: [] })).toBeNull();
  });
});
