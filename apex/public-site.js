export const projects = [
  { id: 'apex-ai', title: { en: 'APEX AI Studio', ar: 'APEX AI Studio' }, summary: { en: 'An AI-assisted coding workspace and multi-agent product concept.', ar: 'تصور مساحة عمل للبرمجة بالذكاء الاصطناعي وتنسيق الوكلاء.' }, category: 'ai', kind: 'concept', tags: ['AI', 'Agents', 'Product'] },
  { id: 'loza-sokkar', title: { en: 'Loza & Sokkar', ar: 'لوزا و سكر' }, summary: { en: 'An Arabic-first commerce experience for a growing product brand.', ar: 'تجربة تجارة إلكترونية عربية لعلامة منتجات.' }, category: 'ecommerce', kind: 'concept', tags: ['Commerce', 'Arabic', 'Store'] },
  { id: 'family-studio', title: { en: 'FAMILY STUDIO', ar: 'FAMILY STUDIO' }, summary: { en: 'Personalized, story-led digital tribute experiences.', ar: 'تجارب رقمية شخصية تحكي القصص والذكريات.' }, category: 'web', kind: 'concept', tags: ['Story', 'Motion', 'Web'] },
  { id: 'mobility-os', title: { en: 'AI Mobility Platform', ar: 'منصة التنقل الذكي' }, summary: { en: 'A future-facing mobility operating system concept.', ar: 'تصور لنظام تنقل ذكي برؤية مستقبلية.' }, category: 'apps', kind: 'concept', tags: ['Mobility', 'Maps', 'AI'] }
];

export function filterProjects(items, category = 'all', query = '', locale = 'en') {
  const normalized = String(query).trim().toLocaleLowerCase(locale === 'ar' ? 'ar' : 'en');
  return items.filter((project) => {
    if (category !== 'all' && project.category !== category) return false;
    if (!normalized) return true;
    const searchable = [project.title?.[locale], project.summary?.[locale], ...(project.tags || [])]
      .filter(Boolean).join(' ').toLocaleLowerCase(locale === 'ar' ? 'ar' : 'en');
    return searchable.includes(normalized);
  });
}

export function validateProjectRequest(draft) {
  const errors = {};
  if (!String(draft.name || '').trim()) errors.name = 'Enter your name.';
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(draft.email || '').trim())) errors.email = 'Enter a valid email address.';
  if (String(draft.description || '').trim().length < 20) errors.description = 'Add at least 20 characters so we can understand the project.';
  if (!draft.consentToContact) errors.consentToContact = 'Confirm that we may contact you about this request.';
  return errors;
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}
