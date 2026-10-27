export type Locale = 'en' | 'ar';
export type ProjectCategory = 'all' | 'web' | 'ecommerce' | 'ai' | 'apps';
export type LocalizedText = Record<Locale, string>;
export interface ProjectCard {
  id: string;
  title: LocalizedText;
  summary: LocalizedText;
  category: Exclude<ProjectCategory, 'all'>;
  kind: 'concept' | 'client';
  tags: string[];
}
export interface ProjectRequestDraft {
  name: string;
  email: string;
  whatsapp: string;
  serviceType: string;
  description: string;
  budgetRange: string;
  timeline: string;
  consentToContact: boolean;
}
export type ProjectRequestErrors = Partial<Record<'name' | 'email' | 'description' | 'consentToContact', string>>;

export function filterProjects(projects: ProjectCard[], category: ProjectCategory, query: string, locale: Locale): ProjectCard[] {
  const normalized = query.trim().toLocaleLowerCase(locale === 'ar' ? 'ar' : 'en');
  return projects.filter((project) => {
    const matchesCategory = category === 'all' || project.category === category;
    if (!matchesCategory) return false;
    if (!normalized) return true;
    const haystack = [project.title[locale], project.summary[locale], ...project.tags].join(' ').toLocaleLowerCase(locale === 'ar' ? 'ar' : 'en');
    return haystack.includes(normalized);
  });
}

export function validateProjectRequest(draft: ProjectRequestDraft): ProjectRequestErrors {
  const errors: ProjectRequestErrors = {};
  if (!draft.name.trim()) errors.name = 'Enter your name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim())) errors.email = 'Enter a valid email address.';
  if (draft.description.trim().length < 20) errors.description = 'Add at least 20 characters so we can understand the project.';
  if (!draft.consentToContact) errors.consentToContact = 'Confirm that we may contact you about this request.';
  return errors;
}
