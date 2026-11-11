import { createClient } from '@supabase/supabase-js';
import { filterProjects, validateInquiry, readStorageItem, writeStorageItem, removeStorageItem, buildAnalyticsPayload, formatChatTranscript, getChatHistoryCursor, mapPublishedProjects, mapPublishedServices, getMessagesForPrepend } from './site-core.js';
import { fallbackProjects } from './site-data.js';
import { translations } from './translations.js';

const browserStorage = (() => {
  try { return window.localStorage; }
  catch { return null; }
})();
const memoryStorage = new Map();

function readStoredValue(key, fallback = null) {
  const storedValue = readStorageItem(browserStorage, key, null);
  return storedValue ?? memoryStorage.get(key) ?? fallback;
}

function writeStoredValue(key, value) {
  if (writeStorageItem(browserStorage, key, value)) memoryStorage.delete(key);
  else memoryStorage.set(key, value);
}

function removeStoredValue(key) {
  const removed = removeStorageItem(browserStorage, key);
  memoryStorage.delete(key);
  return removed;
}

const safeStorage = {
  getItem: (key) => readStoredValue(key),
  setItem: (key, value) => writeStoredValue(key, value),
  removeItem: (key) => removeStoredValue(key),
};

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { storage: safeStorage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
  : null;

let projects = [...fallbackProjects];
let publishedServices = [];

let locale = readStoredValue('apex_locale', 'en') === 'ar' ? 'ar' : 'en';
let activeCategory = 'all';
let conversationId = '';
let chatBootPromise;
let chatBusy = false;
let olderChatBusy = false;
let hasOlderChatMessages = false;
let activeAssistantAgent = 'support';
let selectedProject = null;
let chatPollTimer = null;
let ownerConversationId = '';
let ownerBootPromise = null;
let ownerChatBusy = false;
let ownerPollTimer = null;
const seenOwnerMessageIds = new Set();
const seenChatMessageIds = new Set();
let toastTimer;

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const t = (key) => translations[locale][key] ?? key;
const escapeHTML = (value) => String(value).replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 3200);
}

function applyLocale(nextLocale) {
  locale = nextLocale;
  writeStoredValue('apex_locale', locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  $('#language-toggle').textContent = locale === 'ar' ? 'EN' : 'AR';
  $$('[data-i18n]').forEach((element) => {
    const value = t(element.dataset.i18n);
    if (value.includes('<em>') || value.includes('<br>')) element.innerHTML = value;
    else element.textContent = value;
  });
  $('#chat-input').placeholder = t('chatPlaceholder');
  $('#owner-chat-input').placeholder = t('chatPlaceholder');
  $('#assistant-mode-hint').textContent = activeAssistantAgent === 'technical'
    ? t('technicalModeHint')
    : t('guideModeHint');
  renderProjects();
  renderSuggestions();
  renderCmsServices();
}

function renderProjects() {
  const list = filterProjects(projects, activeCategory, '', locale);
  $('#project-grid').innerHTML = list.map((project, index) => `
    <article class="project-card reveal is-visible" data-project-id="${escapeHTML(project.id)}" role="button" tabindex="0" aria-label="${escapeHTML(project.title[locale])}">
      <div class="project-art"><span class="project-number">0${index + 1}</span><div class="project-shape"><span>${escapeHTML(project.mark)}</span></div><span class="project-kind">${escapeHTML(t('projectLabel'))}</span></div>
      <div class="project-meta"><div><h3>${escapeHTML(project.title[locale])}</h3><p>${escapeHTML(project.summary[locale])}</p></div><span aria-hidden="true">↗</span></div>
    </article>`).join('');
}

function renderCmsServices() {
  if (!publishedServices.length) return;
  const serviceList = $('#service-list');
  if (!serviceList) return;

  serviceList.innerHTML = publishedServices.map((service) => `
    <article class="service-item reveal is-visible">
      <span class="service-number">${escapeHTML(service.no)}</span>
      <div class="service-icon">↗</div>
      <div>
        <h3>${escapeHTML(service.title[locale])}</h3>
        <p>${escapeHTML(service.body[locale])}</p>
      </div>
      <span class="service-arrow" aria-hidden="true">↗</span>
    </article>
  `).join('');
}

function openProject(projectId) {
  const project = projects.find((item) => item.id === projectId);
  if (!project) return;
  if (project.isCms) {
    void captureEvent('project_view', { projectId: project.id }).finally(() => {
      window.location.href = `./project.html?slug=${encodeURIComponent(project.id)}`;
    });
    return;
  }
  selectedProject = project;
  $('#project-modal-title').textContent = project.title[locale];
  $('#project-modal-summary').textContent = project.summary[locale];
  $('#project-modal-tags').textContent = Array.isArray(project.tags) ? project.tags.join(' · ') : (project.tags ?? '');
  openDialog($('#project-modal'));
  void captureEvent('project_view', { projectId: project.id });
}

function renderSuggestions() {
  const suggestions = locale === 'ar'
    ? ['ما الخدمات التي تقدمونها؟','كيف أبدأ مشروعي؟']
    : ['What services do you offer?','How do I start a project?'];
  $('#chat-suggestions').innerHTML = suggestions.map((prompt) => `<button type="button" data-prompt="${escapeHTML(prompt)}">${escapeHTML(prompt)}</button>`).join('');
}

function addChatMessage(text, senderType = 'ai', messageId = null, createdAt = null, prepend = false) {
  if (messageId && seenChatMessageIds.has(messageId)) return;
  if (messageId) seenChatMessageIds.add(messageId);

  const bubble = document.createElement('div');
  const isClient = senderType === 'client' || senderType === 'user';
  bubble.className = `chat-bubble ${isClient ? 'user' : ''}`;
  bubble.dataset.senderType = isClient ? 'client' : senderType;
  if (messageId) bubble.dataset.messageId = messageId;
  if (messageId === 'welcome') bubble.dataset.welcome = 'true';

  const timestamp = typeof createdAt === 'string' && !Number.isNaN(Date.parse(createdAt))
    ? createdAt
    : new Date().toISOString();
  bubble.dataset.createdAt = timestamp;
  bubble.textContent = text;

  const container = $('#chat-messages');
  if (prepend) container.insertBefore(bubble, container.firstElementChild);
  else container.append(bubble);
  if (!prepend) container.scrollTop = container.scrollHeight;
  return bubble;
}

function addOlderChatMessages(messages) {
  const container = $('#chat-messages');
  const previousHeight = container.scrollHeight;
  getMessagesForPrepend(messages).forEach((message) => {
    addChatMessage(
      message.body,
      message.sender_type,
      message.id,
      message.created_at,
      true,
    );
  });
  container.scrollTop += container.scrollHeight - previousHeight;
}

function setOlderChatAvailability(available) {
  hasOlderChatMessages = available === true;
  const button = $('#load-older-chat');
  button.hidden = !hasOlderChatMessages;
  button.disabled = olderChatBusy;
}

function getVisibleChatTranscript() {
  const messages = $('#chat-messages .chat-bubble')
    .filter((bubble) => bubble.dataset.welcome !== 'true')
    .map((bubble) => ({
      sender_type: bubble.dataset.senderType,
      body: bubble.textContent ?? '',
    }));
  return formatChatTranscript(messages, locale);
}

async function ensureSession() {
  if (!supabase) throw new Error('Supabase is not configured.');
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) throw sessionError;
  if (sessionData.session?.access_token) return sessionData.session.access_token;
  const { data, error } = await supabase.auth.signInAnonymously();
  if (error || !data.session?.access_token) throw error || new Error('Could not create visitor session.');
  return data.session.access_token;
}

async function captureEvent(eventName, metadata = {}) {
  if (!supabase) return;
  try {
    await ensureSession();
    const sessionId = readStoredValue('apex_session_id') || crypto.randomUUID();
    writeStoredValue('apex_session_id', sessionId);
    const payload = buildAnalyticsPayload({
      eventName,
      sessionId,
      locale,
      path: window.location.pathname,
      metadata,
    });
    const { error } = await supabase.rpc('capture_site_event', payload);
    if (error) console.warn('APEX analytics event failed:', error.code || 'unknown');
  } catch (error) {
    console.warn('APEX analytics unavailable:', error instanceof Error ? error.message : 'unknown');
  }
}

async function loadPublishedContent() {
  if (!supabase) return;

  try {
    const { data, error } = await supabase
      .from('apex_site_content')
      .select('slug,title,summary,content_type,body')
      .eq('status', 'published')
      .in('content_type', ['project', 'service'])
      .order('sort_order', { ascending: true });

    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    projects = mapPublishedProjects(rows, fallbackProjects);
    publishedServices = mapPublishedServices(rows);
    renderProjects();
    renderCmsServices();
  } catch (error) {
    console.warn('APEX published content unavailable; using curated content:', error);
  }
}

function openDialog(dialog) {
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
}
function closeDialog(dialog) {
  if (typeof dialog.close === 'function') dialog.close();
  else dialog.removeAttribute('open');
}

async function submitInquiry(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const status = $('#form-status');
  const submitButton = $('.submit-button', form);
  const data = new FormData(form);
  const name = String(data.get('name') || '').trim();
  const email = String(data.get('email') || '').trim();
  const description = String(data.get('description') || '').trim();
  const consent = data.get('consentToContact') === 'on';
  const validationErrors = validateInquiry({ name, email, description, consent });
  if (validationErrors.length > 0) {
    status.textContent = t('formInvalid');
    return;
  }
  if (!supabase) {
    status.textContent = 'The request service is not configured yet. Please use WhatsApp or email.';
    return;
  }
  submitButton.disabled = true;
  status.textContent = locale === 'ar' ? 'جارٍ حفظ الطلب…' : 'Saving your request…';
  try {
    await ensureSession();
    const { data: result, error } = await supabase.rpc('capture_project_inquiry', {
      p_client_name: name, p_client_email: email, p_client_phone: String(data.get('whatsapp') || '').trim() || null,
      p_project_type: String(data.get('serviceType') || 'not_sure'),
      p_budget_range: String(data.get('budgetRange') || 'not_sure'),
      p_brief: `${description}\nTimeline: ${String(data.get('timeline') || 'flexible')}`,
      p_conversation_id: conversationId || null
    });
    if (error) throw error;
    if (typeof result !== 'string' || !result) throw new Error('The request could not be confirmed.');
    void captureEvent('inquiry_submitted', { serviceType: String(data.get('serviceType') || 'not_sure') });
    status.textContent = t('formSuccess');
    form.reset();
    showToast(t('formSuccess'));
    setTimeout(() => closeDialog($('#inquiry-modal')), 1100);
  } catch (error) {
    console.error('APEX inquiry failed:', error);
    status.textContent = t('formError');
  } finally {
    submitButton.disabled = false;
  }
}

async function bootChat() {
  if (chatBootPromise) return chatBootPromise;
  chatBootPromise = (async () => {
    if (!supabase) throw new Error('Supabase is not configured.');
    await ensureSession();
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError || !userData.user) throw new Error('Could not confirm the visitor session.');
    const storageKey = `apex_chat_conversation_${userData.user.id}`;
    const cachedId = readStoredValue(storageKey, '') || '';
    let result = await supabase.functions.invoke('apex-client-chat', {
      body: { action: 'open', ...(cachedId ? { conversationId: cachedId } : {}), subject: locale === 'ar' ? 'محادثة موقع APEX' : 'APEX website chat', locale }
    });
    if ((result.error || result.data?.error) && cachedId) {
      removeStoredValue(storageKey);
      result = await supabase.functions.invoke('apex-client-chat', { body: { action: 'open', subject: 'APEX website chat', locale } });
    }
    if (result.error) throw result.error;
    if (result.data?.error) throw new Error(result.data.error);
    conversationId = result.data?.conversation?.id || '';
    if (!conversationId) throw new Error('Could not start the conversation.');
    writeStoredValue(storageKey, conversationId);
    const messages = result.data?.messages || [];
    if (messages.length) {
      messages.forEach((message) => addChatMessage(
        message.body,
        message.sender_type,
        message.id,
        message.created_at,
      ));
    } else {
      addChatMessage(t('chatWelcome'), 'system', 'welcome');
    }
    setOlderChatAvailability(messages.length >= 50);
    if (!chatPollTimer) {
      chatPollTimer = setInterval(async () => {
        if (!conversationId || !$('#ai-modal').open || !supabase) return;
        try {
          const { data, error } = await supabase.functions.invoke('apex-client-chat', { body: { action: 'client_read', conversationId } });
          if (error || data?.error) return;
          (data?.messages || []).filter((message) => message.sender_type !== 'client').forEach((message) => {
            addChatMessage(message.body, message.sender_type, message.id, message.created_at);
          });
        } catch (error) {
          console.warn('APEX chat refresh unavailable:', error);
        }
      }, 15000);
    }
  })();
  try { await chatBootPromise; }
  catch (error) { chatBootPromise = null; throw error; }
}

async function loadOlderChatMessages() {
  if (!conversationId || olderChatBusy || !hasOlderChatMessages) return;
  const container = $('#chat-messages');
  const cursor = getChatHistoryCursor(
    container.firstElementChild
      ? [{ created_at: container.firstElementChild.dataset.createdAt }]
      : [],
  );
  if (!cursor) {
    setOlderChatAvailability(false);
    return;
  }

  olderChatBusy = true;
  const button = $('#load-older-chat');
  button.disabled = true;
  button.textContent = t('loadingOlderMessages');
  $('#chat-status').textContent = '';

  try {
    const { data, error } = await supabase.functions.invoke('apex-client-chat', {
      body: { action: 'client_read', conversationId, before: cursor },
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);

    const olderMessages = Array.isArray(data?.messages) ? data.messages : [];
    addOlderChatMessages(olderMessages);
    setOlderChatAvailability(olderMessages.length >= 50);
  } catch (error) {
    console.warn('APEX older chat history unavailable:', error);
    $('#chat-status').textContent = locale === 'ar'
      ? 'تعذر تحميل الرسائل الأقدم. حاول مرة أخرى.'
      : 'Could not load older messages. Please try again.';
  } finally {
    olderChatBusy = false;
    button.textContent = t('loadOlderMessages');
    button.disabled = !hasOlderChatMessages;
  }
}

async function copyChatTranscript() {
  const transcript = getVisibleChatTranscript();
  if (!transcript) {
    $('#chat-status').textContent = t('emptyTranscript');
    return;
  }

  try {
    if (!navigator.clipboard?.writeText) throw new Error('Clipboard API unavailable');
    await navigator.clipboard.writeText(transcript);
    $('#chat-status').textContent = t('transcriptCopied');
  } catch (error) {
    console.warn('APEX transcript copy unavailable:', error);
    $('#chat-status').textContent = t('copyTranscriptUnavailable');
  }
}

function turnChatIntoProjectBrief() {
  const transcript = getVisibleChatTranscript();
  if (transcript.trim().length < 20) {
    $('#chat-status').textContent = t('transcriptTooShort');
    return;
  }

  const form = $('#inquiry-form');
  form.elements.description.value = transcript;
  form.elements.description.dispatchEvent(new Event('input', { bubbles: true }));
  $('#form-status').textContent = '';
  closeDialog($('#ai-modal'));
  openDialog($('#inquiry-modal'));
}

async function openOwnerChatFromAssistant() {
  closeDialog($('#ai-modal'));
  openDialog($('#owner-modal'));
  if (!ownerConversationId) {
    try {
      await bootOwnerChat();
    } catch (error) {
      $('#owner-chat-status').textContent = locale === 'ar'
        ? 'تعذر فتح المحادثة حاليًا.'
        : 'Could not open the conversation right now.';
      console.warn(error);
    }
  }
}

async function sendChatMessage(rawText) {
  const message = rawText.trim();
  if (!message || chatBusy) return;
  if (message.length > 8000) return;
  chatBusy = true;
  $('#chat-status').textContent = '';
  const pendingBubble = addChatMessage(message, 'client');
  $('#chat-input').value = '';
  try {
    await bootChat();
    const idempotencyKey = `msg_${crypto.randomUUID().replace(/-/g, '')}`;
    const { data, error } = await supabase.functions.invoke('apex-client-chat', {
      body: { action: 'send', conversationId, body: message, idempotencyKey, agent: activeAssistantAgent }
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    (data?.messages || []).filter((item) => item.sender_type !== 'client').forEach((item) => addChatMessage(item.body, item.sender_type, item.id, item.created_at));
    if (data?.aiUnavailable) $('#chat-status').textContent = t('chatUnavailable');
    void captureEvent('ai_message', { length: message.length });
  } catch (error) {
    console.error('APEX chat failed:', error);
    pendingBubble?.remove();
    if (!$('#chat-input').value) $('#chat-input').value = message;
    $('#chat-status').textContent = t('chatError');
  } finally {
    chatBusy = false;
  }
}

function addOwnerMessage(message) {
  if (!message || !message.id || seenOwnerMessageIds.has(message.id)) return;
  seenOwnerMessageIds.add(message.id);
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble ' + (message.sender_type === 'client' ? 'user' : '');
  bubble.textContent = message.body || '';
  $('#owner-messages').append(bubble);
  $('#owner-messages').scrollTop = $('#owner-messages').scrollHeight;
}

async function bootOwnerChat() {
  if (ownerBootPromise) return ownerBootPromise;
  ownerBootPromise = (async () => {
    await ensureSession();
    const userResult = await supabase.auth.getUser();
    if (userResult.error || !userResult.data.user) throw new Error('Could not confirm the visitor session.');
    const storageKey = 'apex_owner_chat_conversation_' + userResult.data.user.id;
    const cachedId = readStoredValue(storageKey, '') || '';
    let result = await supabase.functions.invoke('apex-client-chat', { body: { action: 'open', ...(cachedId ? { conversationId: cachedId } : {}), subject: locale === 'ar' ? 'محادثة مباشرة مع صاحب الموقع' : 'Direct chat with website owner', locale } });
    if ((result.error || result.data?.error) && cachedId) {
      removeStoredValue(storageKey);
      result = await supabase.functions.invoke('apex-client-chat', { body: { action: 'open', subject: 'Direct chat with website owner', locale } });
    }
    if (result.error) throw result.error;
    if (result.data?.error) throw new Error(result.data.error);
    ownerConversationId = result.data?.conversation?.id || '';
    if (!ownerConversationId) throw new Error('Could not open the owner conversation.');
    writeStoredValue(storageKey, ownerConversationId);
    (result.data?.messages || []).forEach(addOwnerMessage);
    if (!result.data?.messages?.length) {
      const welcome = document.createElement('div'); welcome.className = 'chat-bubble';
      welcome.textContent = locale === 'ar' ? 'أهلًا بيك! اكتب رسالتك هنا، وصاحب الاستوديو هيتابعها من لوحة التحكم.' : 'Hello! Leave a message here and the studio owner can follow up from the admin dashboard.';
      $('#owner-messages').append(welcome);
    }
    if (!ownerPollTimer) ownerPollTimer = setInterval(async () => {
      if (!ownerConversationId || !$('#owner-modal').open) return;
      try {
        const response = await supabase.functions.invoke('apex-client-chat', { body: { action: 'client_read', conversationId: ownerConversationId } });
        if (!response.error && !response.data?.error) (response.data?.messages || []).forEach(addOwnerMessage);
      } catch (error) { console.warn('APEX owner chat refresh unavailable:', error); }
    }, 5000);
  })();
  try { await ownerBootPromise; } catch (error) { ownerBootPromise = null; throw error; }
}

async function sendOwnerMessage(rawText) {
  const message = rawText.trim();
  if (!message || ownerChatBusy || message.length > 8000) return;
  ownerChatBusy = true; $('#owner-chat-status').textContent = '';
  const bubble = document.createElement('div'); bubble.className = 'chat-bubble user'; bubble.textContent = message;
  $('#owner-messages').append(bubble); $('#owner-messages').scrollTop = $('#owner-messages').scrollHeight; $('#owner-chat-input').value = '';
  try {
    await bootOwnerChat();
    const idempotencyKey = 'msg_' + crypto.randomUUID().replace(/-/g, '');
    const response = await supabase.functions.invoke('apex-client-chat', { body: { action: 'send', conversationId: ownerConversationId, body: message, idempotencyKey, mode: 'owner' } });
    if (response.error) throw response.error;
    if (response.data?.error) throw new Error(response.data.error);
    (response.data?.messages || []).filter((item) => item.sender_type !== 'client').forEach(addOwnerMessage);
  } catch (error) {
    console.error('APEX owner chat failed:', error);
    bubble.remove();
    if (!$('#owner-chat-input').value) $('#owner-chat-input').value = message;
    $('#owner-chat-status').textContent = locale === 'ar' ? 'تعذر إرسال الرسالة. حاول مرة أخرى.' : 'Could not send the message. Please try again.';
  } finally { ownerChatBusy = false; }
}

function initReveal() {
  const elements = $$('.reveal');
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) {
    elements.forEach((element) => element.classList.add('is-visible'));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -24px 0px' });
  elements.forEach((element) => observer.observe(element));
}

function initEvents() {
  $('#language-toggle').addEventListener('click', () => applyLocale(locale === 'en' ? 'ar' : 'en'));

  $('#menu-toggle').addEventListener('click', () => {
    const open = $('#main-nav').classList.toggle('is-open');
    $('#menu-toggle').setAttribute('aria-expanded', String(open));
  });
  $$('#main-nav a').forEach((link) => link.addEventListener('click', () => {
    $('#main-nav').classList.remove('is-open');
    $('#menu-toggle').setAttribute('aria-expanded', 'false');
    void captureEvent('section_view', { section: link.getAttribute('href')?.slice(1) });
  }));
  $$('[data-open-inquiry]').forEach((button) => button.addEventListener('click', () => {
    openDialog($('#inquiry-modal'));
    void captureEvent('cta_click', { cta: 'start_project' });
  }));
  $$('[data-open-ai]').forEach((button) => button.addEventListener('click', async () => {
    openDialog($('#ai-modal'));
    if (!$('#chat-messages').children.length) {
      try { await bootChat(); }
      catch (error) { $('#chat-status').textContent = t('chatError'); console.warn(error); }
    }
  }));
  $$('#assistant-modes [data-assistant-mode]').forEach((button) => button.addEventListener('click', () => {
    activeAssistantAgent = button.dataset.assistantMode === 'technical' ? 'technical' : 'support';
    $$('#assistant-modes [data-assistant-mode]').forEach((modeButton) => {
      const active = modeButton === button;
      modeButton.classList.toggle('is-active', active);
      modeButton.setAttribute('aria-pressed', String(active));
    });
    $('#assistant-mode-hint').textContent = activeAssistantAgent === 'technical'
      ? t('technicalModeHint')
      : t('guideModeHint');
  }));
  $('#copy-chat-transcript').addEventListener('click', () => void copyChatTranscript());
  $('#load-older-chat').addEventListener('click', () => void loadOlderChatMessages());
  $('#chat-to-brief').addEventListener('click', turnChatIntoProjectBrief);
  $('#open-owner-from-ai').addEventListener('click', () => void openOwnerChatFromAssistant());
  $$('[data-close-modal]').forEach((button) => button.addEventListener('click', () => closeDialog(button.closest('dialog'))));
  $$('.modal').forEach((dialog) => dialog.addEventListener('click', (event) => {
    if (event.target === dialog) closeDialog(dialog);
  }));
  $('#project-filters').addEventListener('click', (event) => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    activeCategory = button.dataset.category;
    $$('.filter-button').forEach((item) => item.classList.toggle('is-active', item === button));
    renderProjects();
  });
  $('#project-grid').addEventListener('click', (event) => {
    const card = event.target.closest('[data-project-id]');
    if (card) openProject(card.dataset.projectId);
  });
  $('#project-grid').addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    const card = event.target.closest('[data-project-id]');
    if (!card) return;
    event.preventDefault();
    openProject(card.dataset.projectId);
  });
  $('#project-modal-inquiry').addEventListener('click', () => {
    closeDialog($('#project-modal'));
    openDialog($('#inquiry-modal'));
    if (selectedProject) {
      const brief = locale === 'ar'
        ? `أريد الاستفسار عن مشروع مشابه لـ ${selectedProject.title.ar}. ${selectedProject.summary.ar}`
        : `I would like to discuss a project similar to ${selectedProject.title.en}. ${selectedProject.summary.en}`;
      $('#inquiry-form').elements.description.value = brief;
      const service = selectedProject.category === 'ecommerce' ? 'ecommerce'
        : selectedProject.category === 'ai' ? 'ai_solution'
        : selectedProject.category === 'apps' ? 'mobile_app' : 'website';
      $('#inquiry-form').elements.serviceType.value = service;
    }
  });
  $('#inquiry-form').addEventListener('submit', submitInquiry);
  $('#open-owner-chat').addEventListener('click', async () => {
    openDialog($('#owner-modal'));
    if (!ownerConversationId) {
      try { await bootOwnerChat(); }
      catch (error) { $('#owner-chat-status').textContent = locale === 'ar' ? 'تعذر فتح المحادثة حاليًا.' : 'Could not open the conversation right now.'; console.warn(error); }
    }
  });
  $('#owner-chat-form').addEventListener('submit', (event) => {
    event.preventDefault();
    void sendOwnerMessage($('#owner-chat-input').value);
  });

  $('#chat-form').addEventListener('submit', (event) => {
    event.preventDefault();
    void sendChatMessage($('#chat-input').value);
  });
  $('#chat-suggestions').addEventListener('click', (event) => {
    const button = event.target.closest('[data-prompt]');
    if (button) void sendChatMessage(button.dataset.prompt);
  });
  $('#back-top').addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
}

applyLocale(locale);
initEvents();
initReveal();
void captureEvent('page_view');
void loadPublishedContent();
