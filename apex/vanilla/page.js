import { createClient } from '@supabase/supabase-js';
import {
  buildAnalyticsPayload,
  mapPublishedProjects,
  mapPublishedServices,
  readStorageItem,
  writeStorageItem,
} from './site-core.js';
import { fallbackProjects, fallbackServices } from './site-data.js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabase = SUPABASE_URL && SUPABASE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
  : null;

const translations = {
  en: {
    navWork: 'Work', navServices: 'Services', navAbout: 'About', navPayments: 'Payments',
    startProject: 'Start a project ↗', backTop: 'Back to top ↑', startSomething: 'START SOMETHING',
    aboutEyebrow: 'THE STUDIO / ABOUT', aboutTitle: 'Small by design.<br><em>Serious about outcomes.</em>',
    aboutIntro: 'APEX STUDIO is an independent digital studio building websites, mobile applications, commerce experiences, software and AI solutions around real goals.',
    valueClarity: 'Clarity first', valueClarityBody: 'Understand the goal, audience and constraints before choosing the technology.',
    valueCraft: 'Craft with purpose', valueCraftBody: 'Make each interface, interaction and system serve a clear user need.',
    valueEngineering: 'Engineering that lasts', valueEngineeringBody: 'Build in small, testable steps with maintainable code and deliberate decisions.',
    processEyebrow: 'HOW WE WORK', processTitle: 'Clear thinking.<br><em>Careful execution.</em>',
    processBody: 'A straightforward process that keeps the goal visible from the first conversation to launch.',
    stepDiscover: 'Discover', stepDiscoverBody: 'Understand the goal, audience and constraints.',
    stepDefine: 'Define', stepDefineBody: 'Turn the idea into a focused scope and direction.',
    stepDesign: 'Design', stepDesignBody: 'Shape the interface, content and interaction.',
    stepBuild: 'Build', stepBuildBody: 'Develop, test and refine the real product.',
    stepLaunch: 'Launch', stepLaunchBody: 'Ship with a clear handoff and next steps.',
    ctaTitle: 'Have an idea that<br><em>should exist?</em>',
    ctaBody: 'Tell us what you are trying to make. We will turn the rough thought into a clearer next step.',
    servicesEyebrow: 'WHAT WE BUILD', servicesTitle: 'Digital, made <em>useful.</em>',
    servicesIntro: 'From a focused first release to a connected digital experience, every service starts with the outcome you need.',
    serviceCtaTitle: "Let's find the right starting point.",
    serviceCtaBody: 'Share the problem you want to solve and we will help define the next step.',
    workEyebrow: 'SELECTED WORK', workTitle: 'Ideas taking <em>shape.</em>',
    workIntro: 'A selection of published projects and curated concepts from the APEX universe.',
    filterAll: 'All work', filterCommerce: 'Commerce', filterApps: 'Apps', workCtaTitle: 'Have a project in mind?',
    workCtaBody: "Let's shape the next idea into something people can use.",
    conceptLabel: 'CURATED CONCEPT', publishedLabel: 'PUBLISHED PROJECT',
    emptyProjects: 'No projects are available in this category yet.',
    projectDialogStart: 'Start a project ↗',
    viewService: 'Explore service ↗',
  },
  ar: {
    navWork: 'الأعمال', navServices: 'الخدمات', navAbout: 'عن الاستوديو', navPayments: 'الدفع',
    startProject: 'ابدأ مشروعك ↗', backTop: 'العودة للأعلى ↑', startSomething: 'ابدأ شيئًا جديدًا',
    aboutEyebrow: 'الاستوديو / من نحن', aboutTitle: 'صغير عن قصد.<br><em>جاد في النتيجة.</em>',
    aboutIntro: 'APEX STUDIO استوديو رقمي مستقل يبني المواقع وتطبيقات الموبايل وتجارب التجارة الإلكترونية والبرمجيات وحلول الذكاء الاصطناعي حول أهداف حقيقية.',
    valueClarity: 'وضوح من البداية', valueClarityBody: 'نفهم الهدف والجمهور والقيود قبل اختيار التقنية المناسبة.',
    valueCraft: 'تنفيذ له هدف', valueCraftBody: 'كل واجهة وتفاعل ونظام لازم يخدم احتياجًا واضحًا للمستخدم.',
    valueEngineering: 'هندسة قابلة للاستمرار', valueEngineeringBody: 'نبني بخطوات صغيرة قابلة للاختبار وكود سهل الصيانة وقرارات مدروسة.',
    processEyebrow: 'طريقة العمل', processTitle: 'تفكير واضح.<br><em>تنفيذ متقن.</em>',
    processBody: 'خطوات عملية تحافظ على وضوح الهدف من أول محادثة وحتى الإطلاق.',
    stepDiscover: 'الاكتشاف', stepDiscoverBody: 'نفهم الهدف والجمهور والقيود.',
    stepDefine: 'التحديد', stepDefineBody: 'نحوّل الفكرة إلى نطاق واتجاه واضحين.',
    stepDesign: 'التصميم', stepDesignBody: 'نبني الواجهة والمحتوى والتفاعل.',
    stepBuild: 'التنفيذ', stepBuildBody: 'نطوّر ونختبر ونصقل المنتج الحقيقي.',
    stepLaunch: 'الإطلاق', stepLaunchBody: 'نسلّم المشروع بخطوات تالية واضحة.',
    ctaTitle: 'عندك فكرة<br><em>تستحق أن توجد؟</em>',
    ctaBody: 'احكِ لنا ما تريد بناءه، وسنحوّل الفكرة الأولية إلى خطوة تالية أوضح.',
    servicesEyebrow: 'ماذا نبني؟', servicesTitle: 'تقنية تصنع <em>فرقًا.</em>',
    servicesIntro: 'من أول إصدار مركز إلى تجربة رقمية متكاملة، كل خدمة بتبدأ من النتيجة اللي محتاج تحققها.',
    serviceCtaTitle: 'خلينا نحدد البداية المناسبة.',
    serviceCtaBody: 'شاركنا المشكلة اللي عايز تحلها، ونساعدك تحدد الخطوة التالية.',
    workEyebrow: 'أعمال مختارة', workTitle: 'أفكار تتحول إلى <em>واقع.</em>',
    workIntro: 'مجموعة من المشاريع المنشورة والتصورات المختارة من عالم APEX.',
    filterAll: 'كل الأعمال', filterCommerce: 'التجارة', filterApps: 'التطبيقات', workCtaTitle: 'عندك مشروع في بالك؟',
    workCtaBody: 'خلينا نحول الفكرة القادمة إلى شيء يستطيع الناس استخدامه.',
    conceptLabel: 'تصور مختار', publishedLabel: 'مشروع منشور',
    emptyProjects: 'لا توجد مشاريع في هذا التصنيف حتى الآن.',
    projectDialogStart: 'ابدأ مشروعك ↗',
    viewService: 'استكشف الخدمة ↗',
  },
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const page = document.body.dataset.page;
const copy = () => translations[locale];
let locale = readStorageItem(getLocalStorage(), 'apex_locale', 'en') === 'ar' ? 'ar' : 'en';
let projects = [...fallbackProjects];
let services = [...fallbackServices];
let activeCategory = 'all';
let analyticsSessionId = '';

function getLocalStorage() {
  try { return window.localStorage; }
  catch { return null; }
}

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
}

function applyLocale(nextLocale) {
  locale = nextLocale;
  writeStorageItem(getLocalStorage(), 'apex_locale', locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  $('#language-toggle').textContent = locale === 'ar' ? 'EN' : 'AR';
  $('#language-toggle').setAttribute('aria-label', locale === 'ar' ? 'Switch to English' : 'التبديل إلى العربية');

  $$('[data-i18n]').forEach((element) => {
    const value = copy()[element.dataset.i18n];
    if (value === undefined) return;
    if (value.includes('<em>') || value.includes('<br>')) element.innerHTML = value;
    else element.textContent = value;
  });

  if (page === 'services') renderServices();
  if (page === 'work') renderProjects();
}

async function ensureAnonymousSession() {
  if (!supabase) return;
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (data.session?.access_token) return;

  const { error: signInError } = await supabase.auth.signInAnonymously();
  if (signInError) throw signInError;
}

async function captureEvent(eventName, metadata = {}) {
  if (!supabase) return;
  try {
    await ensureAnonymousSession();
    analyticsSessionId ||= readStorageItem(getLocalStorage(), 'apex_session_id', '') || crypto.randomUUID();
    writeStorageItem(getLocalStorage(), 'apex_session_id', analyticsSessionId);
    const { error } = await supabase.rpc('capture_site_event', buildAnalyticsPayload({
      eventName,
      sessionId: analyticsSessionId,
      locale,
      path: window.location.pathname,
      metadata,
    }));
    if (error) console.warn('APEX page analytics unavailable:', error.code || 'unknown');
  } catch (error) {
    console.warn('APEX page analytics unavailable:', error);
  }
}

async function loadPublishedContent() {
  if (!supabase || !['services', 'work'].includes(page)) return;
  try {
    const { data, error } = await supabase
      .from('apex_site_content')
      .select('slug,title,summary,content_type,body')
      .eq('status', 'published')
      .in('content_type', ['project', 'service'])
      .order('sort_order', { ascending: true });
    if (error) throw error;

    const rows = Array.isArray(data) ? data : [];
    if (page === 'services') {
      const cmsServices = mapPublishedServices(rows);
      if (cmsServices.length) services = cmsServices;
      renderServices();
    }
    if (page === 'work') {
      projects = mapPublishedProjects(rows, fallbackProjects);
      renderProjects();
    }
  } catch (error) {
    console.warn('APEX CMS content unavailable; curated page data remains visible:', error);
  }
}

function renderServices() {
  const container = $('#services-page-grid');
  if (!container) return;

  container.innerHTML = services.map((service) => {
    const href = service.isCms
      ? `./service.html?slug=${encodeURIComponent(service.id)}`
      : './index.html#contact';
    const action = service.isCms ? copy().viewService : copy().startProject;
    return `
      <article class="service-page-card reveal is-visible">
        <span class="service-number">${escapeHTML(service.no)}</span>
        <div class="service-icon" aria-hidden="true">↗</div>
        <h2>${escapeHTML(service.title[locale])}</h2>
        <p>${escapeHTML(service.body[locale])}</p>
        <a class="text-link" href="${escapeHTML(href)}">${escapeHTML(action)} <span aria-hidden="true">↗</span></a>
      </article>
    `;
  }).join('');
}

function renderProjects() {
  const container = $('#work-page-grid');
  if (!container) return;

  const filtered = activeCategory === 'all'
    ? projects
    : projects.filter((project) => project.category === activeCategory);
  container.innerHTML = filtered.map((project, index) => `
    <article class="project-card reveal is-visible" data-project-id="${escapeHTML(project.id)}" role="button" tabindex="0" aria-label="${escapeHTML(project.title[locale])}">
      <div class="project-art">
        <span class="project-number">0${index + 1}</span>
        <div class="project-shape"><span>${escapeHTML(project.mark)}</span></div>
        <span class="project-kind">${escapeHTML(project.isCms ? copy().publishedLabel : copy().conceptLabel)}</span>
      </div>
      <div class="project-meta">
        <div><h3>${escapeHTML(project.title[locale])}</h3><p>${escapeHTML(project.summary[locale])}</p></div>
        <span aria-hidden="true">↗</span>
      </div>
    </article>
  `).join('');
  $('#work-page-empty').hidden = filtered.length > 0;
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

  $('#work-project-title').textContent = project.title[locale];
  $('#work-project-summary').textContent = project.summary[locale];
  $('#work-project-tags').textContent = Array.isArray(project.tags) ? project.tags.join(' · ') : project.tags;
  $('#work-project-modal').showModal();
  void captureEvent('project_view', { projectId: project.id });
}

function closeProject() {
  $('#work-project-modal').close();
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
document.querySelectorAll('.current-year').forEach((element) => {
  element.textContent = String(new Date().getFullYear());
});

if (page === 'work') {
  $('#work-page-filters').addEventListener('click', (event) => {
    const button = event.target.closest('[data-category]');
    if (!button) return;
    activeCategory = button.dataset.category;
    $$('#work-page-filters .filter-button').forEach((item) => item.classList.toggle('is-active', item === button));
    renderProjects();
  });
  $('#work-page-grid').addEventListener('click', (event) => {
    const card = event.target.closest('[data-project-id]');
    if (card) openProject(card.dataset.projectId);
  });
  $('#work-page-grid').addEventListener('keydown', (event) => {
    if (!['Enter', ' '].includes(event.key)) return;
    const card = event.target.closest('[data-project-id]');
    if (!card) return;
    event.preventDefault();
    openProject(card.dataset.projectId);
  });
  $('#close-work-project').addEventListener('click', closeProject);
  $('#work-project-modal').addEventListener('click', (event) => {
    if (event.target === $('#work-project-modal')) closeProject();
  });
}

applyLocale(locale);
if (page === 'services') renderServices();
if (page === 'work') renderProjects();
void captureEvent('page_view', { page });
void loadPublishedContent();
