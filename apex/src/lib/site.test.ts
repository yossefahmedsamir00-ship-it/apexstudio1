import { describe, expect, it } from 'vitest';
import { filterProjects, validateProjectRequest, type ProjectCard, type ProjectRequestDraft } from './site';

const projects: ProjectCard[] = [
  { id: 'concept-store', title: { en: 'Orbit Store', ar: 'متجر أوربت' }, summary: { en: 'An experimental commerce concept', ar: 'تصور تجريبي للتجارة' }, category: 'ecommerce', kind: 'concept', tags: ['Commerce', 'UI'] },
  { id: 'concept-ai', title: { en: 'Signal AI', ar: 'سيجنال للذكاء الاصطناعي' }, summary: { en: 'A customer assistant concept', ar: 'تصور لمساعد العملاء' }, category: 'ai', kind: 'concept', tags: ['AI', 'Assistant'] },
];

const validDraft: ProjectRequestDraft = {
  name: 'Mina Demo', email: 'mina@example.com', whatsapp: '', serviceType: 'website',
  description: 'I need a clear business website with a services page.', budgetRange: 'not_sure',
  timeline: 'flexible', consentToContact: true,
};

describe('filterProjects', () => {
  it('filters by category and searches both localized titles and summaries', () => {
    expect(filterProjects(projects, 'ai', '', 'en').map((project) => project.id)).toEqual(['concept-ai']);
    expect(filterProjects(projects, 'all', 'متجر', 'ar').map((project) => project.id)).toEqual(['concept-store']);
  });

  it('returns all projects when category and query are empty', () => {
    expect(filterProjects(projects, 'all', '', 'en')).toHaveLength(2);
  });
});

describe('validateProjectRequest', () => {
  it('accepts a complete request', () => {
    expect(validateProjectRequest(validDraft)).toEqual({});
  });

  it('returns actionable errors for missing name, invalid email, short description and missing consent', () => {
    expect(validateProjectRequest({ ...validDraft, name: ' ', email: 'not-an-email', description: 'site', consentToContact: false })).toEqual({
      name: 'Enter your name.',
      email: 'Enter a valid email address.',
      description: 'Add at least 20 characters so we can understand the project.',
      consentToContact: 'Confirm that we may contact you about this request.',
    });
  });
});
