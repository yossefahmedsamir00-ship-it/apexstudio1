export function filterProjects(projects, category = 'all', query = '', locale = 'en') {
  const normalizedQuery = String(query).trim().toLocaleLowerCase(locale === 'ar' ? 'ar' : 'en');
  return projects.filter((project) => {
    if (category !== 'all' && project.category !== category) return false;
    if (!normalizedQuery) return true;
    const searchableText = [
      project.title?.[locale] ?? '',
      project.summary?.[locale] ?? '',
      ...(Array.isArray(project.tags) ? project.tags : []),
    ].join(' ').toLocaleLowerCase(locale === 'ar' ? 'ar' : 'en');
    return searchableText.includes(normalizedQuery);
  });
}

export function validateInquiry({ name, email, description, consent }) {
  const errors = [];
  if (!String(name ?? '').trim()) errors.push('name');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email ?? '').trim())) errors.push('email');
  if (String(description ?? '').trim().length < 20) errors.push('description');
  if (consent !== true) errors.push('consent');
  return errors;
}

export function readStorageItem(storage, key, fallback = null) {
  try {
    return storage?.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeStorageItem(storage, key, value) {
  try {
    if (!storage) return false;
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export function removeStorageItem(storage, key) {
  try {
    if (!storage) return false;
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

export function buildAnalyticsPayload({ eventName, sessionId, locale, path, metadata = {} }) {
  const sourceMetadata = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? metadata
    : {};
  const { projectId, ...eventMetadata } = sourceMetadata;

  return {
    p_event_name: eventName,
    p_project_id: typeof projectId === 'string' && projectId.trim() ? projectId : null,
    p_session_id: sessionId ?? null,
    p_locale: locale ?? null,
    p_path: path ?? null,
    p_metadata: eventMetadata,
  };
}

export function formatChatTranscript(messages, locale = 'en') {
  const labels = locale === 'ar'
    ? { client: 'العميل', owner: 'صاحب الاستوديو', ai: 'APEX AI', system: 'APEX' }
    : { client: 'Client', owner: 'Owner', ai: 'APEX AI', system: 'APEX' };

  return (Array.isArray(messages) ? messages : [])
    .filter((message) => typeof message?.body === 'string' && message.body.trim())
    .map((message) => {
      const sender = labels[message.sender_type] ?? labels.ai;
      return `${sender}: ${message.body.trim()}`;
    })
    .join('\n');
}

export function getChatHistoryCursor(messages) {
  if (!Array.isArray(messages)) return null;
  const oldest = messages.find((message) =>
    typeof message?.created_at === 'string' && !Number.isNaN(Date.parse(message.created_at))
  );
  return oldest?.created_at ?? null;
}
