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

function readContentBody(row) {
  return row?.body && typeof row.body === 'object' && !Array.isArray(row.body)
    ? row.body
    : {};
}

function localizedContent(body, key, fallback) {
  const english = body[`${key}_en`];
  const arabic = body[`${key}_ar`];
  return {
    en: typeof english === 'string' && english.trim() ? english.trim() : fallback,
    ar: typeof arabic === 'string' && arabic.trim() ? arabic.trim() : fallback,
  };
}

function normalizeProjectCategory(value) {
  const category = String(value ?? 'web').trim().toLowerCase().replace(/[\s-]+/g, '_');
  const aliases = {
    commerce: 'ecommerce',
    e_commerce: 'ecommerce',
    shop: 'ecommerce',
    mobile: 'apps',
    mobile_app: 'apps',
    application: 'apps',
    automation: 'ai',
  };
  const normalized = aliases[category] ?? category;
  return ['web', 'ecommerce', 'ai', 'apps'].includes(normalized) ? normalized : 'web';
}

export function mapPublishedProjects(rows, fallback = []) {
  const mapped = (Array.isArray(rows) ? rows : [])
    .filter((row) => row?.content_type === 'project' && typeof row.slug === 'string'
      && row.slug.trim() && typeof row.title === 'string' && row.title.trim())
    .map((row) => {
      const body = readContentBody(row);
      const category = normalizeProjectCategory(body.category);
      const marks = { web: '⌂', ecommerce: '◇', ai: '✳', apps: '↗' };
      const tags = Array.isArray(body.tags)
        ? body.tags.filter((tag) => typeof tag === 'string' && tag.trim()).map((tag) => tag.trim())
        : [];

      return {
        id: row.slug.trim(),
        category,
        mark: typeof body.mark === 'string' && body.mark.trim() ? body.mark.trim().slice(0, 4) : marks[category],
        title: localizedContent(body, 'title', row.title.trim()),
        summary: localizedContent(body, 'summary', typeof row.summary === 'string' ? row.summary.trim() : ''),
        tags,
        isCms: true,
      };
    });

  return mapped.length ? mapped : fallback;
}

export function mapPublishedServices(rows) {
  return (Array.isArray(rows) ? rows : [])
    .filter((row) => row?.content_type === 'service' && typeof row.slug === 'string'
      && row.slug.trim() && typeof row.title === 'string' && row.title.trim())
    .map((row, index) => {
      const body = readContentBody(row);
      const summary = typeof row.summary === 'string' ? row.summary.trim() : '';
      return {
        id: row.slug.trim(),
        no: String(index + 1).padStart(2, '0'),
        title: localizedContent(body, 'title', row.title.trim()),
        body: localizedContent(body, 'summary', summary),
      };
    });
}
