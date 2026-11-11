import { createClient } from '@supabase/supabase-js';
import { readStorageItem, writeStorageItem } from './site-core.js';
import { translations, getDetailNotFoundCopy } from './detail-translations.js';
import { getSafeProjectPreview } from './project-preview.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  : null;


const $ = (selector) => document.querySelector(selector);
const params = new URLSearchParams(window.location.search);
const slug = params.get('slug')?.trim() ?? '';
const contentType = document.body.dataset.contentType === 'service' ? 'service' : 'project';
let locale = readStorageItem(safeLocalStorage(), 'apex_locale', 'en') === 'ar' ? 'ar' : 'en';
let projectRecord = null;

function safeLocalStorage() {
  try { return window.localStorage; }
  catch { return null; }
}

function t(key) {
  return translations[locale][key] ?? key;
}

function readLocalized(body, key, fallback = '') {
  const localized = body?.[`${key}_${locale}`];
  if (typeof localized === 'string' && localized.trim()) return localized.trim();

  if (body?.[key] && typeof body[key] === 'object' && !Array.isArray(body[key])) {
    const nested = body[key][locale] ?? body[key].en;
    if (typeof nested === 'string' && nested.trim()) return nested.trim();
  }

  if (typeof body?.[key] === 'string' && body[key].trim()) return body[key].trim();
  return typeof fallback === 'string' ? fallback.trim() : '';
}

function safeHttpsUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

function makeTextElement(tagName, className, value) {
  const element = document.createElement(tagName);
  if (className) element.className = className;
  element.textContent = value;
  return element;
}

function renderSections(body) {
  const container = $('#project-sections');
  container.replaceChildren();
  const sectionKeys = ['overview', 'challenge', 'approach', 'solution', 'results', 'features'];
  let renderedCount = 0;

  sectionKeys.forEach((key) => {
    const value = readLocalized(body, key);
    if (!value) return;
    const section = document.createElement('section');
    section.className = 'project-detail-section';
    section.append(makeTextElement('h2', '', t(key)));
    section.append(makeTextElement('p', '', value));
    container.append(section);
    renderedCount += 1;
  });

  if (Array.isArray(body.details)) {
    body.details.forEach((item) => {
      if (!item || typeof item !== 'object') return;
      const title = readLocalized(item, 'title');
      const description = readLocalized(item, 'description');
      if (!title || !description) return;
      const section = document.createElement('section');
      section.className = 'project-detail-section';
      section.append(makeTextElement('h2', '', title));
      section.append(makeTextElement('p', '', description));
      container.append(section);
      renderedCount += 1;
    });
  }

  $('#project-detail-note').hidden = renderedCount > 0;
  $('#project-detail-note').textContent = t('noExtraDetails');
}

function renderGallery(body, title) {
  const gallery = $('#project-gallery');
  gallery.replaceChildren();
  if (!Array.isArray(body.gallery)) return;

  body.gallery.forEach((entry) => {
    const source = typeof entry === 'string' ? entry : entry?.url;
    const imageUrl = safeHttpsUrl(source);
    if (!imageUrl) return;

    const image = document.createElement('img');
    image.src = imageUrl;
    image.alt = typeof entry?.alt === 'string' ? entry.alt : title;
    image.loading = 'lazy';
    image.decoding = 'async';
    image.referrerPolicy = 'no-referrer';
    gallery.append(image);
  });
  gallery.hidden = gallery.childElementCount === 0;
}

function renderProject(row) {
  const body = row.body && typeof row.body === 'object' && !Array.isArray(row.body) ? row.body : {};
  const title = readLocalized(body, 'title', row.title ?? '');
  const summary = readLocalized(body, 'summary', row.summary ?? '');

  document.title = `${title} | APEX STUDIO`;
  $('#project-title').textContent = title;
  $('#project-summary').textContent = summary;
  $('#project-category').textContent = String(body.category ?? `APEX / ${contentType.toUpperCase()}`).toUpperCase();

  const meta = $('#project-meta');
  meta.replaceChildren();
  const year = typeof body.year === 'string' || typeof body.year === 'number' ? String(body.year) : '';
  const client = typeof body.client === 'string' ? body.client.trim() : '';
  [client, year].filter(Boolean).forEach((value) => {
    meta.append(makeTextElement('span', 'project-meta-chip', value));
  });
  meta.hidden = meta.childElementCount === 0;

  const coverUrl = safeHttpsUrl(body.cover_image_url ?? body.cover_url);
  const cover = $('#project-cover');
  cover.replaceChildren();
  if (coverUrl) {
    const image = document.createElement('img');
    image.src = coverUrl;
    image.alt = title;
    image.loading = 'eager';
    image.decoding = 'async';
    image.referrerPolicy = 'no-referrer';
    cover.append(image);
    cover.hidden = false;
  } else {
    cover.hidden = true;
  }

  const preview = getSafeProjectPreview(body);
  const previewSection = $('#project-preview');
  const previewFrame = $('#project-preview-frame');
  const previewLink = $('#open-project-preview');
  if (contentType === 'project' && preview.url) {
    previewFrame.src = preview.url;
    previewFrame.title = `${title} — ${t('previewTitle')}`;
    previewLink.href = preview.url;
    $('#project-preview-description').textContent = t(preview.demoMode ? 'previewDemoMode' : 'previewDescription');
    previewSection.hidden = false;
  } else {
    previewFrame.removeAttribute('src');
    previewLink.removeAttribute('href');
    previewSection.hidden = true;
  }

  const liveUrl = contentType === 'service'
    ? safeHttpsUrl(body.service_url ?? body.project_url ?? body.live_url)
    : safeHttpsUrl(body.project_url ?? body.live_url);
  const liveLink = $('#project-live-link');
  if (liveUrl) {
    liveLink.href = liveUrl;
    liveLink.textContent = contentType === 'service' ? t('viewService') : t('viewLiveProject');
    liveLink.hidden = false;
  } else {
    liveLink.hidden = true;
  }

  renderSections(body);
  renderGallery(body, title);
  $('#project-detail-loading').hidden = true;
  $('#project-detail-content').hidden = false;
}

function renderState(title, description) {
  $('#project-detail-loading').hidden = true;
  $('#project-detail-content').hidden = true;
  const state = $('#project-detail-state');
  state.replaceChildren(makeTextElement('h1', '', title), makeTextElement('p', '', description));
  state.hidden = false;
}

function applyLocale(nextLocale) {
  locale = nextLocale;
  writeStorageItem(safeLocalStorage(), 'apex_locale', locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  $('#language-toggle').textContent = locale === 'ar' ? 'EN' : 'AR';
  $('#language-toggle').setAttribute('aria-label', locale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية');
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  if (projectRecord) renderProject(projectRecord);
}

async function loadProject() {
  if (!slug) {
    const copy = getDetailNotFoundCopy(contentType, locale);
    renderState(copy.title, copy.description);
    return;
  }
  if (!supabase) {
    renderState(t('loadFailedTitle'), t('loadFailedBody'));
    return;
  }

  try {
    const { data, error } = await supabase
      .from('apex_site_content')
      .select('slug,title,summary,content_type,body,status')
      .eq('slug', slug)
      .eq('content_type', contentType)
      .eq('status', 'published')
      .maybeSingle();

    if (error) throw error;
    if (!data) {
      const copy = getDetailNotFoundCopy(contentType, locale);
      renderState(copy.title, copy.description);
      return;
    }
    projectRecord = data;
    renderProject(projectRecord);
  } catch (error) {
    console.warn('APEX project page could not load:', error);
    renderState(t('loadFailedTitle'), t('loadFailedBody'));
  }
}

const refreshPreviewButton = $('#refresh-project-preview');
if (refreshPreviewButton) {
  refreshPreviewButton.addEventListener('click', () => {
    const frame = $('#project-preview-frame');
    if (frame?.src) frame.src = frame.src;
  });
}

$('#language-toggle').addEventListener('click', () => applyLocale(locale === 'en' ? 'ar' : 'en'));

const menuToggle = $('#menu-toggle');
const mainNav = $('#main-nav');
menuToggle.addEventListener('click', () => {
  const isOpen = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!isOpen));
  menuToggle.setAttribute('aria-label', locale === 'ar' ? (isOpen ? 'فتح القائمة' : 'إغلاق القائمة') : (isOpen ? 'Open navigation' : 'Close navigation'));
  mainNav.classList.toggle('is-open', !isOpen);
});
mainNav.addEventListener('click', (event) => {
  if (!event.target.closest('a')) return;
  mainNav.classList.remove('is-open');
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', locale === 'ar' ? 'فتح القائمة' : 'Open navigation');
});
$('#year').textContent = String(new Date().getFullYear());
applyLocale(locale);
void loadProject();
