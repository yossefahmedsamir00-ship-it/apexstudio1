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


describe('saved chat transcript helpers', () => {
  it('formats client, AI and owner messages into a readable bilingual transcript', () => {
    const messages = [
      { sender_type: 'client', body: 'I need a store.' },
      { sender_type: 'ai', body: 'We can plan the store.' },
      { sender_type: 'owner', body: 'I will follow up.' },
    ];
    expect(siteCore.formatChatTranscript?.(messages, 'en')).toBe(
      'Client: I need a store.\nAPEX AI: We can plan the store.\nOwner: I will follow up.'
    );
    expect(siteCore.formatChatTranscript?.(messages, 'ar')).toBe(
      'العميل: I need a store.\nAPEX AI: We can plan the store.\nصاحب الاستوديو: I will follow up.'
    );
  });

  it('ignores empty message rows when building a transcript', () => {
    expect(siteCore.formatChatTranscript?.([
      { sender_type: 'client', body: '   ' },
      { sender_type: 'ai', body: 'A useful answer.' },
    ], 'en')).toBe('APEX AI: A useful answer.');
  });

  it('uses the oldest available message timestamp as the pagination cursor', () => {
    expect(siteCore.getChatHistoryCursor?.([
      { created_at: '2026-11-09T12:00:00.000Z' },
      { created_at: '2026-11-09T12:05:00.000Z' },
    ])).toBe('2026-11-09T12:00:00.000Z');
    expect(siteCore.getChatHistoryCursor?.([])).toBe(null);
  });
});


describe('published CMS content mapping', () => {
  it('maps published project fields without losing Arabic and English copy', () => {
    const projects = siteCore.mapPublishedProjects?.([
      {
        slug: 'cms-store',
        title: 'CMS Store',
        summary: 'A published store project.',
        content_type: 'project',
        body: {
          category: 'commerce',
          title_ar: 'متجر تجريبي',
          summary_ar: 'مشروع متجر منشور.',
          tags: ['Commerce', 'Arabic'],
        },
      },
    ]);
    expect(projects).toEqual([{
      id: 'cms-store',
      category: 'ecommerce',
      mark: '◇',
      title: { en: 'CMS Store', ar: 'متجر تجريبي' },
      summary: { en: 'A published store project.', ar: 'مشروع متجر منشور.' },
      tags: ['Commerce', 'Arabic'],
      isCms: true,
    }]);
  });


  it('marks CMS projects as routable detail-page records', () => {
    const mapped = siteCore.mapPublishedProjects?.([
      { slug: 'published-project', title: 'Published project', summary: 'Public brief', content_type: 'project', body: {} },
    ]);
    expect(mapped?.[0].isCms).toBe(true);
  });

  it('uses curated fallback projects if the CMS has no valid published projects', () => {
    const fallback = [{ id: 'curated', title: { en: 'Curated' } }];
    expect(siteCore.mapPublishedProjects?.([{ content_type: 'service', title: 'Not a project' }], fallback)).toBe(fallback);
  });

  it('maps published services and ignores records with missing titles', () => {
    expect(siteCore.mapPublishedServices?.([
      { slug: 'web-design', title: 'Web design', summary: 'Sites and portals', content_type: 'service', body: { title_ar: 'تصميم الويب', summary_ar: 'مواقع وبوابات' } },
      { slug: 'empty', title: '   ', summary: '', content_type: 'service', body: {} },
    ])).toEqual([{
      id: 'web-design',
      no: '01',
      title: { en: 'Web design', ar: 'تصميم الويب' },
      body: { en: 'Sites and portals', ar: 'مواقع وبوابات' },
      isCms: true,
    }]);
  });
});
