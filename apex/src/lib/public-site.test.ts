import { describe, expect, it } from 'vitest';
import { escapeHtml, filterProjects, projects, validateProjectRequest } from '../../public-site.js';

describe('public website helpers', () => {
  it('filters projects by category and localized text', () => {
    expect(filterProjects(projects, 'ai', '', 'en').map((item) => item.id)).toEqual(['apex-ai']);
    expect(filterProjects(projects, 'all', 'لوزا', 'ar').map((item) => item.id)).toEqual(['loza-sokkar']);
  });

  it('validates project requests before submission', () => {
    expect(validateProjectRequest({
      name: 'Youssef',
      email: 'invalid',
      description: 'short',
      consentToContact: false
    })).toMatchObject({
      email: 'Enter a valid email address.',
      description: 'Add at least 20 characters so we can understand the project.',
      consentToContact: 'Confirm that we may contact you about this request.'
    });
    expect(validateProjectRequest({
      name: 'Youssef',
      email: 'hello@example.com',
      description: 'I need a responsive website for my project.',
      consentToContact: true
    })).toEqual({});
  });

  it('escapes user-controlled text before HTML insertion', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
  });
});
