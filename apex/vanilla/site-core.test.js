import { describe, expect, it } from 'vitest';
import { filterProjects, validateInquiry } from './site-core.js';
import * as siteCore from './site-core.js';

const sampleProjects = [
  { id: 'store', category: 'ecommerce', title: { en: 'Orbit Store', ar: 'متجر أوربت' }, summary: { en: 'Online commerce', ar: 'تجارة إلكترونية' }, tags: ['shop'] },
  { id: 'assistant', category: 'ai', title: { en: 'Signal AI', ar: 'سيجنال الذكي' }, summary: { en: 'Customer assistant', ar: 'مساعد العملاء' }, tags: ['agent'] },
];


describe('analytics RPC payload mapping', () => {
  it('keeps project identifiers in the dedicated column instead of metadata', () => {
    expect(siteCore.buildAnalyticsPayload?.({
      eventName: 'project_view',
      sessionId: 'session-123',
      locale: 'en',
      path: '/vanilla/',
      metadata: { projectId: 'family-studio', source: 'project-card' },
    })).toEqual({
      p_event_name: 'project_view',
      p_project_id: 'family-studio',
      p_session_id: 'session-123',
      p_locale: 'en',
      p_path: '/vanilla/',
      p_metadata: { source: 'project-card' },
    });
  });
});

describe('safe browser storage access', () => {
  it('reads, writes and removes values without throwing when storage is unavailable', () => {
    expect(siteCore.readStorageItem?.({ getItem: () => 'ar' }, 'apex_locale', 'en')).toBe('ar');
    expect(siteCore.readStorageItem?.({ getItem: () => { throw new Error('blocked'); } }, 'apex_locale', 'en')).toBe('en');
    expect(siteCore.readStorageItem?.(null, 'apex_locale', 'en')).toBe('en');
    expect(siteCore.writeStorageItem?.({ setItem: () => {} }, 'apex_locale', 'ar')).toBe(true);
    expect(siteCore.writeStorageItem?.({ setItem: () => { throw new Error('blocked'); } }, 'apex_locale', 'ar')).toBe(false);
    expect(siteCore.removeStorageItem?.({ removeItem: () => {} }, 'apex_locale')).toBe(true);
    expect(siteCore.removeStorageItem?.({ removeItem: () => { throw new Error('blocked'); } }, 'apex_locale')).toBe(false);
  });
});

describe('vanilla project filtering', () => {
  it('filters by category and localized search text', () => {
    expect(filterProjects(sampleProjects, 'ai', '', 'en').map((item) => item.id)).toEqual(['assistant']);
    expect(filterProjects(sampleProjects, 'all', 'متجر', 'ar').map((item) => item.id)).toEqual(['store']);
  });

  it('returns all projects for the all category and an empty query', () => {
    expect(filterProjects(sampleProjects, 'all', '  ', 'en')).toHaveLength(2);
  });

  it('handles projects with missing tags without throwing', () => {
    const projectsWithoutTags = [{ id: 'plain', category: 'web', title: { en: 'Plain site' }, summary: { en: 'A simple site' } }];
    expect(filterProjects(projectsWithoutTags, 'all', 'plain', 'en').map((item) => item.id)).toEqual(['plain']);
  });
});

describe('vanilla inquiry validation', () => {
  const valid = { name: 'Mina', email: 'mina@example.com', description: 'A business website with a services page.', consent: true };

  it('accepts a complete inquiry with a valid email address', () => {
    expect(validateInquiry(valid)).toEqual([]);
  });

  it('rejects malformed emails, short briefs and missing consent', () => {
    expect(validateInquiry({ ...valid, email: 'invalid', description: 'short', consent: false })).toEqual(['email', 'description', 'consent']);
  });

  it('rejects whitespace inside an email address', () => {
    expect(validateInquiry({ ...valid, email: 'mina @example.com' })).toEqual(['email']);
  });
});
