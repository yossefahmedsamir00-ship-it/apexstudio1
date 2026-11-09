export function filterProjects(projects, category = 'all', query = '', locale = 'en') {
  const normalizedQuery = String(query).trim().toLocaleLowerCase(locale === 'ar' ? 'ar' : 'en');
  return projects.filter((project) => {
    if (category !== 'all' && project.category !== category) return false;
    if (!normalizedQuery) return true;
    const searchableText = [
      project.title?.[locale] ?? '',
      project.summary?.[locale] ?? '',
      ...(project.tags ?? []),
    ].join(' ').toLocaleLowerCase(locale === 'ar' ? 'ar' : 'en');
    return searchableText.includes(normalizedQuery);
  });
}

export function validateInquiry({ name, email, description, consent }) {
  const errors = [];
  if (!String(name ?? '').trim()) errors.push('name');
  if (!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(String(email ?? '').trim())) errors.push('email');
  if (String(description ?? '').trim().length < 20) errors.push('description');
  if (consent !== true) errors.push('consent');
  return errors;
}
