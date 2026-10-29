import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight, Bot, Check, Globe2, Menu, MoveUpRight, Plus, Send, ShieldCheck, Sparkles, X, Zap } from 'lucide-react';
import './styles.css';
import './vr-showroom.css';
import './payment.css';
import { APEX_CONTACT } from './contact';
import { captureEvent, submitProjectInquiry } from './lib/backend';
import { ensureAnonymousSession, supabase } from './lib/supabase';
import { filterProjects, validateProjectRequest, type Locale, type ProjectCategory, type ProjectRequestDraft, type ProjectCard } from './lib/site';

const projects: ProjectCard[] = [
  { id:'apex-ai', title:{en:'APEX AI Studio',ar:'APEX AI Studio'}, summary:{en:'An AI-assisted coding workspace and multi-agent product concept.',ar:'تصور مساحة عمل للبرمجة بالذكاء الاصطناعي وتنسيق الوكلاء.'}, category:'ai', kind:'concept', tags:['AI','Agents','Product'] },
  { id:'loza-sokkar', title:{en:'Loza & Sokkar',ar:'لوزا و سكر'}, summary:{en:'An Arabic-first commerce experience for a growing product brand.',ar:'تجربة تجارة إلكترونية عربية لعلامة منتجات.'}, category:'ecommerce', kind:'concept', tags:['Commerce','Arabic','Store'] },
  { id:'family-studio', title:{en:'FAMILY STUDIO',ar:'FAMILY STUDIO'}, summary:{en:'Personalized, story-led digital tribute experiences.',ar:'تجارب رقمية شخصية تحكي القصص والذكريات.'}, category:'web', kind:'concept', tags:['Story','Motion','Web'] },
  { id:'mobility-os', title:{en:'AI Mobility Platform',ar:'منصة التنقل الذكي'}, summary:{en:'A future-facing mobility operating system concept.',ar:'تصور لنظام تنقل ذكي برؤية مستقبلية.'}, category:'apps', kind:'concept', tags:['Mobility','Maps','AI'] },
]

const copy = {
  en:{nav:['Work','Services','Process','About'],start:'Start a project',kicker:'Independent digital studio · Cairo / Remote',hero:'Turn your vision into\ndigital reality.',heroBody:'A creative technology studio for websites, mobile apps, AI systems and digital experiences built to move your business forward.',explore:'Explore selected work',proof:'No templates. No noise. Just purposeful digital work.',selected:'Selected work',selectedBody:'A living shelf of concepts, experiments and shipped ideas.',servicesKicker:'What we build',servicesTitle:'From first thought\nto something people can use.',processKicker:'A simple way of working',processTitle:'Clarity first. Craft second.\nLaunch with intent.',aboutKicker:'The studio',aboutTitle:'Small by design.\nSerious about the outcome.',ctaTitle:'Have an idea that should exist?',ctaBody:'Tell us what you are trying to make. We will turn the rough thought into a clearer next step.',ask:'Ask APEX',request:'Build my brief',footer:'Created by Ansta · APEX STUDIO'},
  ar:{nav:['الأعمال','الخدمات','الطريقة','عن الاستوديو'],start:'ابدأ مشروعك',kicker:'استوديو رقمي مستقل · القاهرة / عن بُعد',hero:'حوّل فكرتك إلى\nواقع رقمي.',heroBody:'استوديو تقني إبداعي يبني المواقع وتطبيقات الموبايل وحلول الذكاء الاصطناعي وتجارب رقمية تنقل فكرتك للواقع.',explore:'استكشف الأعمال',proof:'لا قوالب جاهزة. لا ضوضاء. فقط عمل رقمي له هدف.',selected:'أعمال مختارة',selectedBody:'مجموعة متحركة من الأفكار والتجارب والمشاريع.',servicesKicker:'ماذا نبني؟',servicesTitle:'من أول فكرة\nإلى شيء يستطيع الناس استخدامه.',processKicker:'طريقة عمل بسيطة',processTitle:'وضوح أولًا. جودة ثانيًا.\nثم إطلاق له هدف.',aboutKicker:'الاستوديو',aboutTitle:'صغير عن قصد.\nجاد في النتيجة.',ctaTitle:'عندك فكرة تستحق أن توجد؟',ctaBody:'احكِ لنا ما تريد بناءه، وسنحوّل الفكرة الأولية إلى خطوة تالية أوضح.',ask:'اسأل APEX',request:'جهّز طلب المشروع',footer:'Created by Ansta · APEX STUDIO'}
} as const;

const services=[
 {id:'web',no:'01',title:{en:'Web systems',ar:'أنظمة الويب'},body:{en:'Company sites, landing pages, portals and dashboards.',ar:'مواقع الشركات، صفحات الهبوط، البوابات ولوحات التحكم.'},icon:Globe2},
 {id:'commerce',no:'02',title:{en:'Commerce',ar:'التجارة الإلكترونية'},body:{en:'Stores designed around product discovery, trust and conversion.',ar:'متاجر مبنية حول اكتشاف المنتج والثقة والتحويل.'},icon:Zap},
 {id:'ai',no:'03',title:{en:'AI systems',ar:'أنظمة الذكاء الاصطناعي'},body:{en:'Assistants, automation and intelligent workflows.',ar:'مساعدات، أتمتة وسير عمل ذكي.'},icon:Bot},
 {id:'apps',no:'04',title:{en:'Digital products',ar:'المنتجات الرقمية'},body:{en:'Focused web and mobile products built around a real use case.',ar:'منتجات ويب وموبايل مركزة حول استخدام حقيقي.'},icon:Sparkles},
];
const process=[['01','Discover','اكتشاف','Understand the goal, audience and constraints.','نفهم الهدف والجمهور والقيود.'],['02','Define','تحديد','Turn the idea into a focused scope and direction.','نحوّل الفكرة إلى نطاق واتجاه واضحين.'],['03','Design','تصميم','Shape the interface, content and interaction.','نبني الواجهة والمحتوى والتفاعل.'],['04','Build','تنفيذ','Develop, test and refine the real product.','نطوّر ونختبر ونصقل المنتج الحقيقي.'],['05','Launch','إطلاق','Ship with a clear handoff and next steps.','نطلق المشروع مع تسليم واضح وخطوات تالية.']];

function App(){
 const [locale,setLocale]=useState<Locale>('en'); const [menu,setMenu]=useState(false); const [category,setCategory]=useState<ProjectCategory>('all'); const [project,setProject]=useState<ProjectCard|null>(null); const [requestOpen,setRequestOpen]=useState(false); const [assistantOpen,setAssistantOpen]=useState(false); const [vrMode,setVrMode]=useState(false); const [prefillBrief,setPrefillBrief]=useState(''); const [prefillConversationId,setPrefillConversationId]=useState<string|undefined>(undefined); const t=copy[locale]; const ar=locale==='ar';
 const visible=useMemo(()=>filterProjects(projects,category,'',locale),[category,locale]);
 useEffect(()=>{document.documentElement.lang=locale; document.documentElement.dir=ar?'rtl':'ltr'; void captureEvent({eventName:'page_view',locale});},[locale,ar]);

 useEffect(()=>{
  const selectors=['main > section','.heroCopy','.showroomScene','.sectionHeader','.projectCard','.serviceRow','.processGrid article','.aboutVisual','.aboutCopy','.ctaContent','.paymentPanel','.footerBrand','.footerLinks','.contactBlock'];
  const elements=Array.from(document.querySelectorAll<HTMLElement>(selectors.join(',')));
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  elements.forEach((el,index)=>{
   el.classList.add('apex-reveal');
   if(el.matches('.showroomScene,.aboutVisual,.ctaContent')) el.classList.add('apex-reveal-scale');
   else if(index%3===1) el.classList.add('apex-reveal-left');
   if(el.matches('.projectCard,.serviceRow,.processGrid article')) el.style.setProperty('--apex-reveal-delay',`${(index%4)*70}ms`);
  });
  if(reduced||!('IntersectionObserver' in window)){elements.forEach(el=>el.classList.add('apex-revealed'));return;}
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
   if(entry.isIntersecting){entry.target.classList.add('apex-revealed');observer.unobserve(entry.target);}
  }),{threshold:.12,rootMargin:'0px 0px -32px 0px'});
  elements.forEach(el=>observer.observe(el));
  return ()=>observer.disconnect();
 },[locale]);

 const go=(id:string)=>{setMenu(false);document.getElementById(id)?.scrollIntoView({behavior:'smooth'});void captureEvent({eventName:'section_view',locale,metadata:{section:id}})};
 const openRequest=()=>{setRequestOpen(true);void captureEvent({eventName:'cta_click',locale,metadata:{cta:'start_project'}})};
 return <div className={`${ar?'app rtl':'app'} ${vrMode?'vrMode':''}`} dir={ar?'rtl':'ltr'}>
  <header className="topbar"><button className="brand" onClick={()=>go('home')}><span className="brandMark">A</span><span><b>APEX</b><small>STUDIO</small></span></button><nav className={menu?'nav open':'nav'}><button onClick={()=>go('work')}>{t.nav[0]}</button><button onClick={()=>go('services')}>{t.nav[1]}</button><button onClick={()=>go('process')}>{t.nav[2]}</button><button onClick={()=>go('about')}>{t.nav[3]}</button><button onClick={()=>go('payments')}>{ar?'الدفع':'Payments'}</button></nav><div className="topActions"><button className="lang" onClick={()=>setLocale(ar?'en':'ar')}><Globe2 size={15}/>{ar?'EN':'AR'}</button><button className="primary small" onClick={openRequest}>{t.start}<ArrowUpRight size={15}/></button><button className="iconButton menuButton" onClick={()=>setMenu(!menu)}>{menu?<X/>:<Menu/>}</button></div></header>
  <main>
   <section id="home" className="hero sectionPad"><div className="heroCopy"><div className="eyebrow"><span className="dot"/>{t.kicker}</div><h1>{t.hero}</h1><p className="heroBody">{t.heroBody}</p><div className="heroActions"><button className="primary" onClick={openRequest}>{t.start}<ArrowUpRight size={18}/></button><button className="textButton" onClick={()=>go('work')}>{t.explore}<MoveUpRight size={17}/></button></div></div><div className="heroVisual showroomScene" aria-label={ar?'صالة APEX الافتراضية':'APEX immersive showroom'} onPointerMove={e=>{const r=e.currentTarget.getBoundingClientRect();const x=(e.clientX-r.left)/r.width-.5;const y=(e.clientY-r.top)/r.height-.5;e.currentTarget.style.setProperty('--tilt-y',`${x*3}deg`);e.currentTarget.style.setProperty('--tilt-x',`${y*-3}deg`)}} onPointerLeave={e=>{e.currentTarget.style.setProperty('--tilt-y','0deg');e.currentTarget.style.setProperty('--tilt-x','0deg')}}><div className="roomSky"/><div className="sceneCeiling"/><div className="sceneSide sceneSideLeft"/><div className="sceneSide sceneSideRight"/><div className="scenePlanet"/><div className="portalHalo portalOuter"/><div className="portalHalo portalInner"/><div className="sceneFloor"/><div className="apexGlyph"><div className="apexMark" aria-label="APEX symbol"><svg viewBox="0 0 180 145" aria-hidden="true"><defs><linearGradient id="apexMetal" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#e7fcff"/><stop offset=".42" stopColor="#25e8ff"/><stop offset="1" stopColor="#076bff"/></linearGradient><linearGradient id="apexArrow" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#8fffff"/><stop offset=".58" stopColor="#12cfff"/><stop offset="1" stopColor="#0751d8"/></linearGradient></defs><path d="M22 125 70 18 103 74 84 94 71 65 44 125Z" fill="url(#apexMetal)" stroke="#b9fbff" strokeWidth="2"/><path d="M56 123 133 35 111 37 158 13 146 61 138 50 86 111Z" fill="url(#apexArrow)" stroke="#65f3ff" strokeWidth="2"/><ellipse cx="91" cy="116" rx="72" ry="19" transform="rotate(-11 91 116)" fill="none" stroke="#12d9ff" strokeWidth="5"/><ellipse cx="91" cy="116" rx="56" ry="13" transform="rotate(-11 91 116)" fill="none" stroke="#168dff" strokeWidth="2"/></svg></div><strong>APEX</strong><small>STUDIO</small></div><div className="visualLabel top">IMMERSIVE STUDIO / 001</div><div className="visualLabel bottom">IDEAS → DIGITAL REALITY</div><div className="heroContact"><div className="heroContactHead"><span className="heroAvatar">YA</span><div><strong>{APEX_CONTACT.name}</strong><small>{ar?'مؤسس ومطور':'Founder & Developer'}</small></div></div><a href={`mailto:${APEX_CONTACT.email}`}><span>✉</span>{APEX_CONTACT.email}</a><a href={`tel:${APEX_CONTACT.phone}`}><span>↗</span>{APEX_CONTACT.phone}</a></div><button className="vrLaunch" onClick={()=>setVrMode(true)}>{ar?'دخول التجربة الغامرة':'ENTER IMMERSIVE MODE'}</button>{vrMode&&<button className="vrClose" onClick={()=>setVrMode(false)}>{ar?'إنهاء التجربة':'EXIT EXPERIENCE'} ×</button>}</div></section>
   <section className="statement"><div className="sectionPad statementInner"><span>01</span><p>{t.proof}</p><span className="statementArrow">↘</span></div></section>
   <section id="work" className="sectionPad workSection"><div className="sectionHeader"><div><div className="eyebrow">02 / {t.selected}</div><h2>{t.selected}</h2><p>{t.selectedBody}</p></div><button className="outlineButton" onClick={()=>setCategory('all')}>All work <Plus size={16}/></button></div><div className="filters">{(['all','web','ecommerce','ai','apps'] as ProjectCategory[]).map(c=><button key={c} className={category===c?'filter active':'filter'} onClick={()=>setCategory(c)}>{c==='all'?'All':c==='ecommerce'?'Commerce':c==='ai'?'AI':c[0].toUpperCase()+c.slice(1)}</button>)}</div><div className="projectGrid">{visible.map((p,i)=><article className={`projectCard p${i+1}`} key={p.id} role="button" tabIndex={0} onClick={()=>{setProject(p);void captureEvent({eventName:'project_view',projectId:p.id,locale})}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setProject(p);}}}><div className="projectArt"><span className="projectIndex">0{i+1}</span><div className="artWindow"><div className="windowTop"><i/><i/><i/></div><div className="artBars"><b/><b/><b/></div><div className="artBlock"/><div className="artBlock smallBlock"/></div><span className="projectKind">APEX EXPERIMENT</span></div><div className="projectMeta"><div><h3>{p.title[locale]}</h3><p>{p.summary[locale]}</p></div><MoveUpRight size={19}/></div></article>)}</div></section>
   <section id="services" className="darkSection sectionPad"><div className="sectionHeader servicesHead"><div><div className="eyebrow">03 / {t.servicesKicker}</div><h2>{t.servicesTitle}</h2></div><button className="textButton light" onClick={openRequest}>{t.start}<ArrowUpRight size={17}/></button></div><div className="serviceList">{services.map(s=>{const Icon=s.icon;return <article className="serviceRow" key={s.id}><span className="serviceNo">{s.no}</span><Icon size={22}/><div className="serviceText"><h3>{s.title[locale]}</h3><p>{s.body[locale]}</p></div><ArrowUpRight className="rowArrow" size={21}/></article>})}</div></section>
   <section id="process" className="sectionPad processSection"><div className="sectionHeader"><div><div className="eyebrow">04 / {t.processKicker}</div><h2>{t.processTitle}</h2></div></div><div className="processGrid">{process.map(([n,en,arTitle,enBody,arBody])=><article key={n}><span>{n}</span><h3>{ar?arTitle:en}</h3><p>{ar?arBody:enBody}</p></article>)}</div></section>
   <section id="about" className="aboutSection sectionPad"><div className="aboutVisual"><div className="aboutRing"/><span>APEX<br/>STUDIO</span></div><div className="aboutCopy"><div className="eyebrow">05 / {t.aboutKicker}</div><h2>{t.aboutTitle}</h2><p>{ar?'نبني تجارب رقمية دقيقة ومصممة لخدمة هدف حقيقي. الذكاء الاصطناعي جزء من طريقة عملنا، لكنه ليس الهوية.':'We build precise digital experiences tied to a real outcome. AI is part of how we work — it is not the identity.'}</p><div className="aboutFacts"><div><b>01</b><span>Clear scope</span></div><div><b>02</b><span>Custom direction</span></div><div><b>03</b><span>Built to ship</span></div></div></div></section>
   <section className="ctaSection sectionPad"><div className="ctaGlow"/><div className="ctaContent"><div className="eyebrow">06 / START SOMETHING</div><h2>{t.ctaTitle}</h2><p>{t.ctaBody}</p><button className="primary" onClick={openRequest}>{t.request}<ArrowUpRight size={18}/></button></div></section>
   <section id="payments" className="paymentSection sectionPad"><div className="paymentIntro"><div className="eyebrow">07 / {ar?'طرق الدفع':'FLEXIBLE PAYMENTS'}</div><h2>{ar?'الدفع واضح من البداية.':'Clear payment terms. No surprises.'}</h2><p>{ar?'بنحدد طريقة الدفع المناسبة معاك قبل بدء التنفيذ، مع توضيح قيمة كل مرحلة وموعدها.':'We agree on the payment method and milestones before work starts, with clear amounts and timing for each stage.'}</p><button className="primary" onClick={openRequest}>{ar?'ناقش مشروعك':'Discuss your project'}<ArrowUpRight size={17}/></button></div><div className="paymentPanel"><div className="paymentPanelTop"><span className="paymentLiveDot"/>{ar?'خيارات الدفع':'PAYMENT OPTIONS'}</div><div className="paymentMethods"><span>VISA</span><span>Mastercard</span><span>Mobile wallets</span><span>InstaPay*</span><span>Bank transfer</span><span>Kashier checkout</span></div><p className="paymentDisclaimer">{ar?'*توفر طرق الدفع الفعلية يعتمد على تفعيلها في حساب التاجر. هذه الصفحة لا تحصّل أموالًا مباشرة؛ الفاتورة الرسمية تفتح صفحة Kashier المستضافة بعد إعداد المفاتيح.':'*Actual payment methods depend on the verified merchant account. This section is informational; a real invoice opens Kashier-hosted checkout only after merchant keys are configured.'}</p><button className="outlineButton" onClick={openRequest}>{ar?'ابدأ بطلب مشروع':'Start with a project brief'}<ArrowUpRight size={15}/></button></div></section>
  </main>
  <footer className="footer sectionPad">
   <div className="footerIdentity"><div className="footerBrand"><span className="brandMark">A</span><div><b>APEX STUDIO</b><small>{ar?'استوديو تقني إبداعي':'CREATIVE TECHNOLOGY STUDIO'}</small></div></div><p className="footerTagline">{ar?'نحوّل الأفكار إلى تجارب رقمية مصممة بعناية.':'Turning thoughtful ideas into crafted digital experiences.'}</p></div>
   <div className="footerLinks"><b className="footerLabel">{ar?'استكشف':'EXPLORE'}</b><button onClick={()=>go('work')}>{t.nav[0]}</button><button onClick={()=>go('services')}>{t.nav[1]}</button><button onClick={()=>setAssistantOpen(true)}>{t.ask}</button><button onClick={openRequest}>{ar?'ابدأ مشروعك':'Start a project'}</button></div>
   <div className="contactBlock"><b className="footerLabel">{ar?'تواصل مباشر':'CONTACT'}</b><span className="contactPerson">{APEX_CONTACT.name}</span><a className="contactCard" href={`mailto:${APEX_CONTACT.email}`}><span className="contactIcon">✉</span><span><small>{ar?'البريد الإلكتروني':'EMAIL'}</small><b>{APEX_CONTACT.email}</b></span><ArrowUpRight size={15}/></a><a className="contactCard" href={`tel:${APEX_CONTACT.phone}`}><span className="contactIcon">↗</span><span><small>{ar?'الهاتف':'PHONE'}</small><b dir="ltr">{APEX_CONTACT.phone}</b></span><ArrowUpRight size={15}/></a><a className="contactCard" href={`https://wa.me/${APEX_CONTACT.phone.replace(/\D/g,'')}?text=${encodeURIComponent(ar?'مرحبًا، أريد الاستفسار عن مشروع مع APEX STUDIO.':'Hello, I would like to discuss a project with APEX STUDIO.')}`} target="_blank" rel="noopener noreferrer"><span className="contactIcon">◉</span><span><small>WHATSAPP</small><b>{ar?'راسلنا مباشرة':'Chat with the studio'}</b></span><ArrowUpRight size={15}/></a></div>
   <div className="socialBlock"><b className="footerLabel">{ar?'تابع الاستوديو':'FOLLOW THE STUDIO'}</b><p>{ar?'تابع جديد المشاريع والأفكار والتجارب الرقمية.':'Follow new projects, ideas and digital experiments.'}</p><div className="socialLinks"><a href="https://www.instagram.com/" target="_blank" rel="noopener noreferrer" aria-label="Instagram"><span className="socialGlyph">◎</span><span>Instagram</span><ArrowUpRight size={13}/></a><a href="https://www.facebook.com/" target="_blank" rel="noopener noreferrer" aria-label="Facebook"><span className="socialGlyph">f</span><span>Facebook</span><ArrowUpRight size={13}/></a><a href="https://www.linkedin.com/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><span className="socialGlyph">in</span><span>LinkedIn</span><ArrowUpRight size={13}/></a></div><p className="socialHint">{ar?'روابط الصفحات الرسمية تحتاج تأكيد عناوين حساباتك.':'Official profile links can be connected once your exact account URLs are confirmed.'}</p></div>
   <div className="footerBottom"><span>{t.footer}</span><span>© {new Date().getFullYear()} APEX STUDIO</span><a href="./admin.html">Admin ↗</a></div>
  </footer>
  <button className="vrModeFab" onClick={()=>setVrMode(true)} aria-label={ar?"دخول الوضع الغامر":"Enter immersive mode"}>{ar?"وضع VR":"VR MODE"}</button>
  <button className="askFab" onClick={()=>setAssistantOpen(true)}><Bot size={18}/>{t.ask}</button>
  {project&&<ProjectModal project={project} locale={locale} onClose={()=>setProject(null)} onStart={openRequest}/>} {requestOpen&&<RequestModal locale={locale} initialBrief={prefillBrief} conversationId={prefillConversationId} onClose={()=>setRequestOpen(false)}/>} {assistantOpen&&<AssistantModal locale={locale} onClose={()=>setAssistantOpen(false)} onStart={(transcript,conversationId)=>{setPrefillBrief(transcript??'');setPrefillConversationId(conversationId);setAssistantOpen(false);openRequest()}}/>}
 </div>;
}

function ProjectModal({project,locale,onClose,onStart}:{project:ProjectCard;locale:Locale;onClose:()=>void;onStart:()=>void}){return <div className="modalBackdrop" onClick={onClose}><div className="projectModal" onClick={e=>e.stopPropagation()}><button className="close" onClick={onClose}><X/></button><div className="modalArt"><span>{project.category.toUpperCase()} / {project.id.toUpperCase()}</span><div className="modalMark">A</div></div><div className="modalBody"><div className="eyebrow">APEX EXPERIMENT</div><h2>{project.title[locale]}</h2><p>{project.summary[locale]}</p><div className="tagRow">{project.tags.map(x=><span key={x}>{x}</span>)}</div><button className="primary" onClick={onStart}>{locale==='ar'?'ابدأ مشروعًا مشابهًا':'Start a similar project'}<ArrowUpRight size={17}/></button></div></div></div>}

function RequestModal({locale,onClose,initialBrief='',conversationId}:{locale:Locale;onClose:()=>void;initialBrief?:string;conversationId?:string}){
 const ar=locale==='ar'; const [draft,setDraft]=useState<ProjectRequestDraft>({name:'',email:'',whatsapp:'',serviceType:'website',description:initialBrief,budgetRange:'not_sure',timeline:'flexible',consentToContact:false}); const [errors,setErrors]=useState<Record<string,string>>({}); const [status,setStatus]=useState<'idle'|'saving'|'success'|'error'>('idle'); const [message,setMessage]=useState('');
 const update=(key:keyof ProjectRequestDraft,value:string|boolean)=>setDraft(d=>({...d,[key]:value}));
 const submit=async(e:React.FormEvent)=>{e.preventDefault();const next=validateProjectRequest(draft);setErrors(next);if(Object.keys(next).length)return;setStatus('saving');setMessage('');try{await submitProjectInquiry({name:draft.name,email:draft.email,whatsapp:draft.whatsapp,serviceType:draft.serviceType,budgetRange:draft.budgetRange,description:`${draft.description}\nTimeline: ${draft.timeline}`,conversationId});void captureEvent({eventName:'inquiry_submitted',locale,metadata:{serviceType:draft.serviceType}});setStatus('success')}catch(err){setStatus('error');setMessage(err instanceof Error?err.message:'Unable to submit right now.')}};
 return <div className="modalBackdrop" onClick={onClose}><div className="requestModal" onClick={e=>e.stopPropagation()} dir={ar?'rtl':'ltr'}><button className="close" onClick={onClose}><X/></button>{status==='success'?<div className="successState"><div className="successIcon"><Check/></div><div className="eyebrow">APEX / REQUEST RECEIVED</div><h2>{ar?'تم استلام طلبك.':'Your project brief is in.'}</h2><p>{ar?'تم حفظ الطلب بنجاح وسيتحول إلى مسار المتابعة داخل APEX.':'Your brief was securely submitted to APEX for follow-up.'}</p><button className="primary" onClick={onClose}>{ar?'إغلاق':'Close'} <X size={16}/></button></div>:<form onSubmit={submit}><div className="eyebrow">07 / START A PROJECT</div><h2>{ar?'خلينا نبني شيئًا حقيقيًا.':'Let’s build something real.'}</h2><p className="formIntro">{ar?'أعطنا الصورة الأولى، وسنرتب التفاصيل بعد ذلك.':'Give us the first picture. We can shape the details from there.'}</p><div className="formGrid"><label>Name<input required value={draft.name} onChange={e=>update('name',e.target.value)} placeholder="Your name"/>{errors.name&&<small>{errors.name}</small>}</label><label>Email<input required type="email" value={draft.email} onChange={e=>update('email',e.target.value)} placeholder="you@example.com"/>{errors.email&&<small>{errors.email}</small>}</label><label>Service<select value={draft.serviceType} onChange={e=>update('serviceType',e.target.value)}><option value="website">Website</option><option value="ecommerce">E-commerce</option><option value="ai_solution">AI solution</option><option value="web_app">Web app</option><option value="mobile_app">Mobile app</option><option value="custom_system">Custom system</option><option value="not_sure">Not sure</option></select></label><label>Budget<select value={draft.budgetRange} onChange={e=>update('budgetRange',e.target.value)}><option value="not_sure">Not sure</option><option value="small">Small</option><option value="medium">Medium</option><option value="large">Large</option></select></label><label className="full">What are you building?<textarea required value={draft.description} onChange={e=>update('description',e.target.value)} placeholder="Tell us what you want to make..."/>{errors.description&&<small>{errors.description}</small>}</label><label>Timeline<select value={draft.timeline} onChange={e=>update('timeline',e.target.value)}><option value="asap">ASAP</option><option value="1_2_weeks">1–2 weeks</option><option value="1_month">1 month</option><option value="1_3_months">1–3 months</option><option value="flexible">Flexible</option></select></label><label>WhatsApp<input value={draft.whatsapp} onChange={e=>update('whatsapp',e.target.value)} placeholder="Optional"/></label></div><label className="consent"><input type="checkbox" checked={draft.consentToContact} onChange={e=>update('consentToContact',e.target.checked)}/><span>I agree that APEX STUDIO may contact me about this request.</span></label>{errors.consentToContact&&<small className="consentError">{errors.consentToContact}</small>}{status==='error'&&<small className="consentError">{message}</small>}<button className="primary submitButton" disabled={status==='saving'}>{status==='saving'?'Saving…':'Send project brief'} <Send size={17}/></button></form>}</div></div>;
}

type ChatApiMessage = {
  id: string;
  conversation_id: string;
  sender_type: 'client' | 'ai' | 'owner' | 'system';
  sender_user_id: string | null;
  body: string;
  message_status: 'sent' | 'delivered' | 'read' | 'failed';
  read_at: string | null;
  created_at: string;
};
type ChatMessageView = {
  id: string;
  from: 'bot' | 'user';
  text: string;
  senderType: 'client' | 'ai' | 'owner' | 'system';
  createdAt: string;
  readAt?: string | null;
  idempotencyKey?: string;
  optimistic?: boolean;
};
type ChatApiResponse = {
  conversation?: { id: string; status: string };
  messages?: ChatApiMessage[];
  error?: string;
  aiUnavailable?: boolean;
  duplicate?: boolean;
};
function fromApiMessages(messages: ChatApiMessage[]): ChatMessageView[] {
  return messages.map((message) => ({
    id: message.id,
    from: message.sender_type === 'client' ? 'user' : 'bot',
    text: message.body,
    senderType: message.sender_type,
    createdAt: message.created_at,
    readAt: message.read_at,
  }));
}
async function chatFunctionError(error: { message: string; context?: unknown }) {
  if (error.context instanceof Response) {
    try {
      const body = await error.context.clone().json();
      if (typeof body?.error === 'string') return body.error;
    } catch { /* use generic SDK error */ }
  }
  return error.message || 'The chat service is temporarily unavailable.';
}

function AssistantModal({locale,onClose,onStart}:{locale:Locale;onClose:()=>void;onStart:(transcript?:string,conversationId?:string)=>void}){
 const ar=locale==='ar';
 const [assistantMode,setAssistantMode]=useState<'guide'|'technical'>('guide');
 const [copied,setCopied]=useState(false);
 const [messages,setMessages]=useState<ChatMessageView[]>([]);
 const [value,setValue]=useState('');
 const [loading,setLoading]=useState(false);
 const [booting,setBooting]=useState(true);
 const [olderLoading,setOlderLoading]=useState(false);
 const [hasOlder,setHasOlder]=useState(false);
 const [conversationId,setConversationId]=useState('');
 const [error,setError]=useState('');
 const [aiUnavailable,setAiUnavailable]=useState(false); const [ownerRequestBusy,setOwnerRequestBusy]=useState(false); const [ownerRequested,setOwnerRequested]=useState(false);
 const greeting: ChatMessageView = {
   id:'welcome',from:'bot',senderType:'system',createdAt:new Date().toISOString(),
   text:ar?'أهلًا بيك في APEX. احكيلي عن فكرتك، والمحادثة هتتحفظ عشان تقدر ترجع لها بعدين.':'Welcome to APEX. Tell me about your idea. This conversation is saved so you can return to it later.',
 };
 const displayMessages = messages.length ? messages : (booting ? [] : [greeting]);
 const suggestions = useMemo(() => {
   const latest = [...messages].reverse().find((message) => message.from === 'user')?.text.toLocaleLowerCase() ?? '';
   if (latest.includes('mobile') || latest.includes('موبايل') || latest.includes('تطبيق')) {
     return ar ? ['هل التطبيق يحتاج Android و iOS؟','ما المميزات الأساسية؟','كيف نبدأ تصميم التطبيق؟'] : ['Should it support Android and iOS?','What are the core features?','How do we start the app design?'];
   }
   if (latest.includes('ai') || latest.includes('ذكاء') || latest.includes('مساعد')) {
     return ar ? ['ما البيانات التي يحتاجها الذكاء الاصطناعي؟','كيف نحمي بيانات المستخدمين؟','كيف نحدد نطاق الإصدار الأول؟'] : ['What data will the AI need?','How do we protect user data?','How should we scope version one?'];
   }
   if (latest.includes('store') || latest.includes('متجر') || latest.includes('تجارة')) {
     return ar ? ['هل نحتاج دفعًا إلكترونيًا؟','كم عدد المنتجات تقريبًا؟','ما طريقة إدارة الطلبات؟'] : ['Do we need online payments?','How many products are expected?','How should orders be managed?'];
   }
   return ar
     ? ['ما الخدمات التي تقدمونها؟','كيف أبدأ مشروعي؟','هل يمكن تنفيذ تطبيق موبايل؟']
     : ['What services do you offer?','How do I start a project?','Can you build a mobile app?'];
 },[messages,ar]);

 const refreshHistory = async (id:string, before?:string) => {
   const {data,error:callError} = await supabase.functions.invoke('apex-client-chat',{
     body:{action:'client_read',conversationId:id,...(before?{before}:{})},
   });
   if(callError) throw new Error(await chatFunctionError(callError));
   const result = data as ChatApiResponse;
   if(result.error) throw new Error(result.error);
   return result.messages ?? [];
 };

 useEffect(() => {
   let active = true;
   const boot = async () => {
     setBooting(true); setError('');
     try {
       await ensureAnonymousSession();
       const {data:userData,error:userError} = await supabase.auth.getUser();
       if(userError || !userData.user) throw new Error(ar?'تعذر تأكيد الجلسة. أعد تحميل الصفحة.':'Could not confirm the session. Please reload the page.');
       const storageKey = 'apex_chat_conversation_' + userData.user.id;
       const cachedId = localStorage.getItem(storageKey) ?? '';
       let result: {data?:ChatApiResponse|null;error?:{message:string;context?:unknown}|null};
       result = await supabase.functions.invoke('apex-client-chat',{
         body:{action:'open',...(cachedId?{conversationId:cachedId}:{}),subject:ar?'محادثة موقع APEX':'APEX website chat',locale},
       });
       if((result.error || result.data?.error) && cachedId) {
         localStorage.removeItem(storageKey);
         result = await supabase.functions.invoke('apex-client-chat',{
           body:{action:'open',subject:ar?'محادثة موقع APEX':'APEX website chat',locale},
         });
       }
       if(result.error) throw new Error(await chatFunctionError(result.error));
       if(result.data?.error) throw new Error(result.data.error);
       const id = result.data?.conversation?.id;
       if(!id) throw new Error(ar?'تعذر إنشاء المحادثة.':'Could not start the conversation.');
       localStorage.setItem(storageKey,id);
       const rows = result.data?.messages ?? [];
       if(!active) return;
       setConversationId(id);
       setMessages(fromApiMessages(rows));
       setHasOlder(rows.length >= 50);
     } catch(err) {
       if(active) setError(err instanceof Error?err.message:(ar?'تعذر فتح المحادثة.':'Could not open the conversation.'));
     } finally {
       if(active) setBooting(false);
     }
   };
   void boot();
   return () => { active = false; };
 },[]);

 useEffect(() => {
   if(!conversationId) return;
   let active = true;
   const poll = async () => {
     if(loading || booting) return;
     try {
       const rows = await refreshHistory(conversationId);
       if(!active || !rows) return;
       setMessages(current => {
         const keyed = new Map<string,ChatMessageView>();
         for(const message of [...current.filter(m=>!m.optimistic),...fromApiMessages(rows)]) keyed.set(message.id,message);
         return [...keyed.values()].sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt));
       });
       setHasOlder(rows.length >= 50);
     } catch { /* Keep the saved transcript visible during temporary network loss. */ }
   };
   const timer = window.setInterval(()=>void poll(),15000);
   return () => { active=false; window.clearInterval(timer); };
 },[conversationId,loading,booting]);

 const send = async (raw?:string) => {
   const q=(raw ?? value).trim();
   if(!q || loading || booting || !conversationId) return;
   if(q.length > 8000) { setError(ar?'الرسالة طويلة جدًا.':'Message is too long.'); return; }
   const requestKey = 'msg_' + crypto.randomUUID().replace(/-/g,'');
   const optimisticId = 'local_' + requestKey;
   const optimistic:ChatMessageView = {
     id:optimisticId,from:'user',senderType:'client',text:q,createdAt:new Date().toISOString(),
     idempotencyKey:requestKey,optimistic:true,
   };
   setMessages(current=>[...current,optimistic]);
   setValue('');setLoading(true);setError('');setAiUnavailable(false);
   void captureEvent({eventName:'ai_message',locale,metadata:{length:q.length}});
   try {
     const {data,error:callError}=await supabase.functions.invoke('apex-client-chat',{
       body:{action:'send',conversationId,body:q,idempotencyKey:requestKey,agent:assistantMode==='technical'?'technical':'support'},
     });
     if(callError) throw new Error(await chatFunctionError(callError));
     const result=data as ChatApiResponse;
     if(result.error) throw new Error(result.error);
     const serverMessages=fromApiMessages(result.messages ?? []);
     setMessages(current=>{
       const keyed=new Map<string,ChatMessageView>();
       for(const message of current.filter(m=>m.id!==optimisticId)) keyed.set(message.id,message);
       for(const message of serverMessages) keyed.set(message.id,message);
       return [...keyed.values()].sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt));
     });
     if(result.aiUnavailable) {
       setAiUnavailable(true);
       setError(ar?'تم حفظ رسالتك، لكن المساعد غير متاح مؤقتًا. يقدر صاحب الموقع يتابعها.':'Your message was saved, but AI is temporarily unavailable. The studio owner can still follow up.');
     }
   } catch(err) {
     setMessages(current=>current.filter(m=>m.id!==optimisticId));
     setValue(q);
     setError(err instanceof Error?err.message:(ar?'تعذر حفظ الرسالة. حاول مرة أخرى.':'Could not save the message. Please try again.'));
   } finally { setLoading(false); }
 };

 const loadOlder = async () => {
   if(!conversationId || olderLoading || !messages.length) return;
   setOlderLoading(true);
   try {
     const before=messages[0].createdAt;
     const rows=await refreshHistory(conversationId,before);
     const older=fromApiMessages(rows);
     setMessages(current=>{
       const keyed=new Map<string,ChatMessageView>();
       for(const message of [...older,...current]) keyed.set(message.id,message);
       return [...keyed.values()].sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt));
     });
     setHasOlder(rows.length>=50);
   } catch(err) {
     setError(err instanceof Error?err.message:'Could not load older messages.');
   } finally {setOlderLoading(false);}
 };

 const transcript = messages.filter(m=>m.id!=='welcome').map(m=>(m.from==='user'?(ar?'العميل':'Client'):(m.senderType==='owner'?(ar?'صاحب الموقع':'Owner'):'APEX AI')) + ': ' + m.text).join('\n');
 const requestOwner = async () => {
   if(!conversationId || ownerRequestBusy || ownerRequested || booting) return;
   setOwnerRequestBusy(true);setError('');
   try {
     const {data,error:callError}=await supabase.functions.invoke('apex-client-chat',{body:{action:'request_owner',conversationId}});
     if(callError) throw new Error(await chatFunctionError(callError));
     const result=data as ChatApiResponse & {requested?:boolean};
     if(result.error) throw new Error(result.error);
     setMessages(fromApiMessages(result.messages ?? []));
     setOwnerRequested(true);
   } catch(err) {
     setError(err instanceof Error?err.message:(ar?'تعذر إرسال طلب المتابعة. حاول مرة أخرى.':'Could not request owner follow-up. Please try again.'));
   } finally {setOwnerRequestBusy(false);}
 };

 const sendButton = (text:string) => <button className="suggestedQuestion" key={text} onClick={()=>void send(text)} disabled={loading||booting}>{text}</button>;

 return <div className="modalBackdrop" onClick={onClose}>
  <div className="assistantModal" onClick={e=>e.stopPropagation()} dir={ar?'rtl':'ltr'}>
   <div className="assistantHead"><div><div className="eyebrow">APEX AI / ASSISTANT</div><h2>{ar?'اسأل APEX':'Ask APEX'}</h2><p className="assistantDisclosure">{ar?'مساعد ذكاء اصطناعي. الرسائل محفوظة ويمكن لفريق APEX متابعتها.':'AI assistant. Messages are saved so APEX can follow up when needed.'}</p></div><button className="close" onClick={onClose}><X/></button></div>
   <div className="chatConversationMeta"><span className="chatStateDot"/>{booting?(ar?'جارٍ استعادة المحادثة…':'Restoring conversation…'):(ar?'محادثة محفوظة':'Conversation saved')}<span className="chatSecureLabel"><ShieldCheck size={13}/>{ar?'جلسة خاصة':'Private session'}</span></div>
   <div className="assistantTools"><div className="assistantModes"><button className={assistantMode==='guide'?'assistantMode active':'assistantMode'} onClick={()=>setAssistantMode('guide')}>{ar?'مساعد المشاريع':'Project guide'}</button><button className={assistantMode==='technical'?'assistantMode active':'assistantMode'} onClick={()=>setAssistantMode('technical')}>{ar?'مساعد تقني':'Technical mode'}</button></div><button className="chatToolButton" disabled={!messages.length} onClick={()=>{void navigator.clipboard?.writeText(transcript).then(()=>setCopied(true)).catch(()=>setCopied(false));}}>{copied?(ar?'تم النسخ':'Copied'):(ar?'نسخ المحادثة':'Copy transcript')}</button></div>
   <div className="assistantModeHint">{assistantMode==='technical'?(ar?'هركّز على المتطلبات التقنية، التكاملات، الأمان، الأداء والاختبارات.':'I’ll focus on architecture, integrations, security, performance and testing.'): (ar?'هساعدك توضّح الفكرة والجمهور والميزانية والخطوة التالية.':'I’ll help clarify the idea, audience, budget and next step.')}</div>
   <div className="messages" aria-live="polite">
    {hasOlder&&<button className="loadOlder" onClick={()=>void loadOlder()} disabled={olderLoading}>{olderLoading?(ar?'جارٍ التحميل…':'Loading…'):(ar?'تحميل رسائل أقدم':'Load older messages')}</button>}
    {displayMessages.map((m,i)=><div className={m.from==='bot'?'msg bot':'msg user'} key={m.id||i}>
      <div>{m.text}</div>
      <small className="chatMessageMeta">{m.senderType==='owner'?(ar?'صاحب الموقع':'Owner'):m.senderType==='ai'?'APEX AI':m.from==='user'?(ar?'أنت':'You'):'APEX'} · {new Date(m.createdAt).toLocaleTimeString(ar?'ar-EG':'en-EG',{hour:'2-digit',minute:'2-digit'})}{m.readAt?' · ✓✓':''}</small>
    </div>)}
    {loading&&<div className="msg bot"><span className="chatTypingDots">•••</span> {ar?'جاري التفكير…':'Thinking…'}</div>}
    {booting&&<div className="msg bot">{ar?'جارٍ الاتصال الآمن…':'Connecting securely…'}</div>}
   </div>
   {!booting&&<div className="suggestedQuestionsRow" aria-label={ar?'أسئلة مقترحة':'Suggested questions'}>{suggestions.map(sendButton)}</div>}
   {error&&<p className="chatError" role="alert">{error}</p>}
   <div className="assistantInput"><input value={value} maxLength={8000} onChange={e=>setValue(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();void send()}}} placeholder={ar?'اكتب رسالتك…':'Write your message…'} disabled={loading||booting||!conversationId}/><button onClick={()=>void send()} disabled={loading||booting||!value.trim()||!conversationId} aria-label={ar?'إرسال':'Send'}><Send size={17}/></button></div>
   <button className="briefButton" onClick={()=>onStart(transcript,conversationId)} disabled={booting||!messages.length}>{ar?'حوّل المحادثة إلى طلب مشروع':'Turn this conversation into a project brief'} <ArrowUpRight size={16}/></button>
   <button className="ownerChatButton" onClick={()=>void requestOwner()} disabled={booting||ownerRequestBusy||ownerRequested||!conversationId}>
    {ownerRequestBusy?(ar?'جارٍ إرسال الطلب…':'Sending request…'):ownerRequested?(ar?'تم طلب رد صاحب الموقع':'Owner reply requested'):(ar?'طلب التحدث مع صاحب الموقع':'Request a reply from the owner')}
    {ownerRequested?<Check size={15}/>:<ArrowUpRight size={15}/>}
   </button>
   <p className="ownerChatHint">{ownerRequested?(ar?'تم تسجيل طلبك في صندوق رسائل APEX.':'Your request is now in the APEX owner inbox.'): (ar?'لو محتاج تتكلم مع صاحب الموقع، ابعت طلب وسيظهر في صندوق الرسائل.':'Need to speak with the studio owner? Request a follow-up and it will appear in the owner inbox.')}</p>
   {aiUnavailable&&<p className="chatTinyNotice">{ar?'الرسالة محفوظة في قاعدة البيانات.':'Your message remains saved in the database.'}</p>}
  </div>
 </div>;
}

createRoot(document.getElementById('root')!).render(<App/>);
