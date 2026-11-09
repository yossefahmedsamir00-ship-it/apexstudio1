import { createClient } from '@supabase/supabase-js';
import { filterProjects, validateInquiry } from './site-core.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } })
  : null;

const projects = [
  { id:'apex-ai', category:'ai', mark:'✳', title:{en:'APEX AI Studio',ar:'APEX AI Studio'}, summary:{en:'An AI-assisted coding workspace and multi-agent product concept.',ar:'تصور لمساحة عمل برمجية مدعومة بالذكاء الاصطناعي وتنسيق الوكلاء.'}, tags:'AI · Agents · Product' },
  { id:'loza-sokkar', category:'ecommerce', mark:'◇', title:{en:'Loza & Sokkar',ar:'لوزا و سكر'}, summary:{en:'An Arabic-first commerce experience for a growing product brand.',ar:'تجربة تجارة إلكترونية عربية لعلامة تجارية متنامية.'}, tags:'Commerce · Arabic · Store' },
  { id:'family-studio', category:'web', mark:'⌂', title:{en:'FAMILY STUDIO',ar:'FAMILY STUDIO'}, summary:{en:'Personalized, story-led digital tribute experiences.',ar:'تجارب رقمية شخصية تحكي القصص والذكريات.'}, tags:'Story · Motion · Web' },
  { id:'mobility-os', category:'apps', mark:'↗', title:{en:'AI Mobility Platform',ar:'منصة التنقل الذكي'}, summary:{en:'A future-facing mobility operating system concept.',ar:'تصور لمنصة تنقل ذكية برؤية مستقبلية.'}, tags:'Mobility · Maps · AI' },
];

const translations = {
  en: {
    navWork:'Work',navServices:'Services',navProcess:'Process',navAbout:'About',startProject:'Start a project',eyebrow:'INDEPENDENT DIGITAL STUDIO · CAIRO / REMOTE',heroTitle:'Turn your vision into <em>digital reality.</em>',heroBody:'A creative technology studio for websites, mobile apps, AI systems and digital experiences built to move your business forward.',exploreWork:'Explore selected work',heroNote:'No templates. No noise. Just purposeful digital work.',scroll:'SCROLL TO EXPLORE',selectedWork:'SELECTED WORK',workTitle:'Ideas taking <em>shape.</em>',workBody:'A selection of concepts and digital experiences from the APEX universe.',filterAll:'All work',filterCommerce:'Commerce',filterApps:'Apps',whatWeBuild:'WHAT WE BUILD',servicesTitle:'Digital, made <em>useful.</em>',servicesBody:'From a focused first release to a connected digital ecosystem.',serviceWeb:'Websites & platforms',serviceWebBody:'Company websites, landing pages, portals and custom dashboards.',serviceCommerce:'E-commerce experiences',serviceCommerceBody:'Online stores designed around discovery, trust and conversion.',serviceAI:'AI & automation',serviceAIBody:'AI assistants, smart workflows and practical business automation.',serviceApps:'Mobile & digital products',serviceAppsBody:'Purpose-built applications shaped around real user needs.',ourApproach:'OUR APPROACH',processTitle:'Clear thinking.<br><em>Careful execution.</em>',processBody:'A straightforward process that keeps the goal visible from the first conversation to launch.',stepDiscover:'Discover',stepDiscoverBody:'Understand the goal, audience and constraints.',stepDefine:'Define',stepDefineBody:'Turn the idea into a focused scope and direction.',stepDesign:'Design',stepDesignBody:'Shape the interface, content and interaction.',stepBuild:'Build',stepBuildBody:'Develop, test and refine the real product.',stepLaunch:'Launch',stepLaunchBody:'Ship with a clear handoff and next steps.',theStudio:'THE STUDIO',aboutTitle:'Small by design.<br><em>Serious about outcomes.</em>',aboutBody:'We build precise digital experiences tied to a real outcome. Technology and AI are tools in our process — the result is what matters.',pointClarity:'Clarity first',pointCustom:'Made for your context',pointQuality:'Built to last',startSomething:'START SOMETHING',ctaTitle:'Have an idea that<br><em>should exist?</em>',ctaBody:'Tell us what you are trying to make. We will turn the rough thought into a clearer next step.',buildBrief:'Build my project brief',askApex:'Ask APEX',footerLine:'Turning thoughtful ideas into crafted digital experiences.',backTop:'BACK TO TOP ↑',projectInquiry:'PROJECT INQUIRY',formTitle:"Let's make it real.",formIntro:'Share a few details and the studio can follow up with you.',fieldName:'Your name',fieldEmail:'Email address',fieldService:'What do you need?',fieldBudget:'Budget range',fieldBrief:'Tell us about your idea',fieldWhatsapp:'WhatsApp (optional)',fieldTimeline:'Timeline',consent:'I agree that APEX STUDIO may contact me about this request.',sendBrief:'Send project brief ↗',chatTitle:"Let's explore your idea.",chatIntro:'Ask about our services or how to shape your project.',chatOwner:'CHAT WITH OWNER ↗',ownerChatTitle:'Chat with the owner.',ownerChatIntro:'Your message goes to the APEX STUDIO owner. Replies appear here.',chatPlaceholder:'Write your message…',chatUnavailable:'The assistant is temporarily unavailable. Your message was not sent.',chatWelcome:'Welcome to APEX. Tell me about your idea. This conversation is saved so you can return to it later.',chatError:'Could not send your message. Please try again.',formSuccess:'Your project brief was securely submitted.',formError:'We could not save your request right now. Please try again.',formInvalid:'Please complete all required fields and the contact consent.',projectLabel:'APEX EXPERIMENT'
  },
  ar: {
    navWork:'الأعمال',navServices:'الخدمات',navProcess:'طريقة العمل',navAbout:'عن الاستوديو',startProject:'ابدأ مشروعك',eyebrow:'استوديو رقمي مستقل · القاهرة / عن بُعد',heroTitle:'حوّل فكرتك إلى <em>واقع رقمي.</em>',heroBody:'استوديو تقني إبداعي يبني المواقع وتطبيقات الموبايل وأنظمة الذكاء الاصطناعي والتجارب الرقمية التي تدفع أعمالك للأمام.',exploreWork:'استكشف الأعمال',heroNote:'لا قوالب جاهزة. لا ضوضاء. فقط عمل رقمي له هدف.',scroll:'اكتشف المزيد',selectedWork:'أعمال مختارة',workTitle:'أفكار تتحول إلى <em>واقع.</em>',workBody:'مجموعة من التصورات والتجارب الرقمية من عالم APEX.',filterAll:'كل الأعمال',filterCommerce:'التجارة',filterApps:'التطبيقات',whatWeBuild:'ماذا نبني؟',servicesTitle:'تقنية تصنع <em>فرقًا.</em>',servicesBody:'من أول إصدار مركز إلى منظومة رقمية متكاملة.',serviceWeb:'المواقع والمنصات',serviceWebBody:'مواقع الشركات وصفحات الهبوط والبوابات ولوحات التحكم.',serviceCommerce:'تجارب التجارة الإلكترونية',serviceCommerceBody:'متاجر إلكترونية مصممة لاكتشاف المنتجات وبناء الثقة وزيادة التحويل.',serviceAI:'الذكاء الاصطناعي والأتمتة',serviceAIBody:'مساعدات ذكية وسير عمل مؤتمت وحلول عملية للأعمال.',serviceApps:'تطبيقات ومنتجات رقمية',serviceAppsBody:'تطبيقات مصممة حول احتياجات المستخدم الحقيقية.',ourApproach:'منهجيتنا',processTitle:'تفكير واضح.<br><em>تنفيذ متقن.</em>',processBody:'خطوات عملية تحافظ على وضوح الهدف من أول محادثة وحتى الإطلاق.',stepDiscover:'الاكتشاف',stepDiscoverBody:'نفهم الهدف والجمهور والقيود.',stepDefine:'التحديد',stepDefineBody:'نحوّل الفكرة إلى نطاق واتجاه واضحين.',stepDesign:'التصميم',stepDesignBody:'نبني الواجهة والمحتوى والتفاعل.',stepBuild:'التنفيذ',stepBuildBody:'نطوّر ونختبر ونصقل المنتج الحقيقي.',stepLaunch:'الإطلاق',stepLaunchBody:'نسلّم المنتج بخطوات تالية واضحة.',theStudio:'الاستوديو',aboutTitle:'صغير عن قصد.<br><em>جاد في النتيجة.</em>',aboutBody:'نبني تجارب رقمية دقيقة مرتبطة بهدف حقيقي. التقنية والذكاء الاصطناعي أدوات في طريقتنا، لكن النتيجة هي الأهم.',pointClarity:'وضوح من البداية',pointCustom:'مصمم لاحتياجك',pointQuality:'جودة تدوم',startSomething:'ابدأ شيئًا جديدًا',ctaTitle:'عندك فكرة<br><em>تستحق أن توجد؟</em>',ctaBody:'احكِ لنا ما تريد بناءه، وسنحوّل الفكرة الأولية إلى خطوة تالية أوضح.',buildBrief:'جهّز طلب مشروعك',askApex:'اسأل APEX',footerLine:'نحوّل الأفكار إلى تجارب رقمية مصممة بعناية.',backTop:'العودة للأعلى ↑',projectInquiry:'طلب مشروع',formTitle:'خلينا نحوّلها لحقيقة.',formIntro:'شاركنا بعض التفاصيل وسنتواصل معك لمتابعة المشروع.',fieldName:'اسمك',fieldEmail:'البريد الإلكتروني',fieldService:'ما الخدمة المطلوبة؟',fieldBudget:'الميزانية المتوقعة',fieldBrief:'احكِ لنا عن فكرتك',fieldWhatsapp:'واتساب (اختياري)',fieldTimeline:'الجدول الزمني',consent:'أوافق على تواصل APEX STUDIO معي بخصوص هذا الطلب.',sendBrief:'إرسال طلب المشروع ↗',chatTitle:'خلينا نفهم فكرتك.',chatIntro:'اسأل عن خدماتنا أو كيفية تحويل فكرتك إلى مشروع.',chatOwner:'كلم صاحب الاستوديو ↗',ownerChatTitle:'تواصل مباشر مع صاحب الاستوديو.',ownerChatIntro:'رسالتك هتوصل لصاحب APEX STUDIO والرد هيظهر هنا.',chatPlaceholder:'اكتب رسالتك…',chatUnavailable:'المساعد غير متاح مؤقتًا. لم يتم إرسال رسالتك.',chatWelcome:'أهلًا بيك في APEX. احكي لنا عن فكرتك. المحادثة محفوظة لتقدر ترجع لها لاحقًا.',chatError:'تعذر إرسال الرسالة. حاول مرة أخرى.',formSuccess:'تم إرسال طلب مشروعك وحفظه بنجاح.',formError:'تعذر حفظ الطلب حاليًا. حاول مرة أخرى.',formInvalid:'من فضلك أكمل البيانات المطلوبة والموافقة على التواصل.',projectLabel:'تجربة APEX'
  }
};

let locale = localStorage.getItem('apex_locale') === 'ar' ? 'ar' : 'en';
let activeCategory = 'all';
let conversationId = '';
let chatBootPromise;
let chatBusy = false;
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
  localStorage.setItem('apex_locale', locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  $('#language-toggle').textContent = locale === 'ar' ? 'EN' : 'AR';
  $$('[data-i18n]').forEach((element) => {
    const value = t(element.dataset.i18n);
    if (value.includes('<em>') || value.includes('<br>')) element.innerHTML = value;
    else element.textContent = value;
  });
  $('#chat-input').placeholder = t('chatPlaceholder');
  renderProjects();
  renderSuggestions();
}

function renderProjects() {
  const list = filterProjects(projects, activeCategory, '', locale);
  $('#project-grid').innerHTML = list.map((project, index) => `
    <article class="project-card reveal is-visible" data-project-id="${escapeHTML(project.id)}" role="button" tabindex="0" aria-label="${escapeHTML(project.title[locale])}">
      <div class="project-art"><span class="project-number">0${index + 1}</span><div class="project-shape"><span>${escapeHTML(project.mark)}</span></div><span class="project-kind">${escapeHTML(t('projectLabel'))}</span></div>
      <div class="project-meta"><div><h3>${escapeHTML(project.title[locale])}</h3><p>${escapeHTML(project.summary[locale])}</p></div><span aria-hidden="true">↗</span></div>
    </article>`).join('');
}

function openProject(projectId) {
  const project = projects.find((item) => item.id === projectId);
  if (!project) return;
  selectedProject = project;
  $('#project-modal-title').textContent = project.title[locale];
  $('#project-modal-summary').textContent = project.summary[locale];
  $('#project-modal-tags').textContent = project.tags;
  openDialog($('#project-modal'));
  void captureEvent('project_view', { projectId: project.id });
}

function renderSuggestions() {
  const suggestions = locale === 'ar'
    ? ['ما الخدمات التي تقدمونها؟','كيف أبدأ مشروعي؟']
    : ['What services do you offer?','How do I start a project?'];
  $('#chat-suggestions').innerHTML = suggestions.map((prompt) => `<button type="button" data-prompt="${escapeHTML(prompt)}">${escapeHTML(prompt)}</button>`).join('');
}

function addChatMessage(text, sender = 'ai', messageId = null) {
  if (messageId && seenChatMessageIds.has(messageId)) return;
  if (messageId) seenChatMessageIds.add(messageId);
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${sender === 'user' ? 'user' : ''}`;
  bubble.textContent = text;
  $('#chat-messages').append(bubble);
  $('#chat-messages').scrollTop = $('#chat-messages').scrollHeight;
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
    const sessionId = localStorage.getItem('apex_session_id') || crypto.randomUUID();
    localStorage.setItem('apex_session_id', sessionId);
    const { error } = await supabase.rpc('capture_site_event', {
      p_event_name: eventName, p_project_id: null, p_session_id: sessionId,
      p_locale: locale, p_path: window.location.pathname, p_metadata: metadata
    });
    if (error) console.warn('APEX analytics event failed:', error.code || 'unknown');
  } catch (error) {
    console.warn('APEX analytics unavailable:', error instanceof Error ? error.message : 'unknown');
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
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || description.length < 20 || !consent) {
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
    const cachedId = localStorage.getItem(storageKey) || '';
    let result = await supabase.functions.invoke('apex-client-chat', {
      body: { action: 'open', ...(cachedId ? { conversationId: cachedId } : {}), subject: locale === 'ar' ? 'محادثة موقع APEX' : 'APEX website chat', locale }
    });
    if ((result.error || result.data?.error) && cachedId) {
      localStorage.removeItem(storageKey);
      result = await supabase.functions.invoke('apex-client-chat', { body: { action: 'open', subject: 'APEX website chat', locale } });
    }
    if (result.error) throw result.error;
    if (result.data?.error) throw new Error(result.data.error);
    conversationId = result.data?.conversation?.id || '';
    if (!conversationId) throw new Error('Could not start the conversation.');
    localStorage.setItem(storageKey, conversationId);
    const messages = result.data?.messages || [];
    if (messages.length) messages.forEach((message) => addChatMessage(message.body, message.sender_type === 'client' ? 'user' : 'ai', message.id));
    else addChatMessage(t('chatWelcome'));
    if (!chatPollTimer) {
      chatPollTimer = setInterval(async () => {
        if (!conversationId || !$('#ai-modal').open || !supabase) return;
        try {
          const { data, error } = await supabase.functions.invoke('apex-client-chat', { body: { action: 'client_read', conversationId } });
          if (error || data?.error) return;
          (data?.messages || []).filter((message) => message.sender_type !== 'client').forEach((message) => addChatMessage(message.body, 'ai', message.id));
        } catch (error) {
          console.warn('APEX chat refresh unavailable:', error);
        }
      }, 15000);
    }
  })();
  try { await chatBootPromise; }
  catch (error) { chatBootPromise = null; throw error; }
}

async function sendChatMessage(rawText) {
  const message = rawText.trim();
  if (!message || chatBusy) return;
  if (message.length > 8000) return;
  chatBusy = true;
  $('#chat-status').textContent = '';
  addChatMessage(message, 'user');
  $('#chat-input').value = '';
  try {
    await bootChat();
    const idempotencyKey = `msg_${crypto.randomUUID().replace(/-/g, '')}`;
    const { data, error } = await supabase.functions.invoke('apex-client-chat', {
      body: { action: 'send', conversationId, body: message, idempotencyKey, agent: 'support' }
    });
    if (error) throw error;
    if (data?.error) throw new Error(data.error);
    (data?.messages || []).filter((item) => item.sender_type !== 'client').forEach((item) => addChatMessage(item.body, 'ai', item.id));
    if (data?.aiUnavailable) $('#chat-status').textContent = t('chatUnavailable');
    void captureEvent('ai_message', { length: message.length });
  } catch (error) {
    console.error('APEX chat failed:', error);
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
    const cachedId = localStorage.getItem(storageKey) || '';
    let result = await supabase.functions.invoke('apex-client-chat', { body: { action: 'open', ...(cachedId ? { conversationId: cachedId } : {}), subject: locale === 'ar' ? 'محادثة مباشرة مع صاحب الموقع' : 'Direct chat with website owner', locale } });
    if ((result.error || result.data?.error) && cachedId) {
      localStorage.removeItem(storageKey);
      result = await supabase.functions.invoke('apex-client-chat', { body: { action: 'open', subject: 'Direct chat with website owner', locale } });
    }
    if (result.error) throw result.error;
    if (result.data?.error) throw new Error(result.data.error);
    ownerConversationId = result.data?.conversation?.id || '';
    if (!ownerConversationId) throw new Error('Could not open the owner conversation.');
    localStorage.setItem(storageKey, ownerConversationId);
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
