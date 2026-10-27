const projects=[
{id:'nova',title:'Nova / Corporate System',summary:'A sharp digital presence for a technology company.',category:'web',kind:'APEX EXPERIMENT',tags:['Strategy','Web','UX']},
{id:'souk',title:'Souk / Commerce Experience',summary:'A commerce concept designed around discovery and trust.',category:'ecommerce',kind:'APEX EXPERIMENT',tags:['Commerce','Product']},
{id:'signal',title:'Signal / AI Concierge',summary:'An AI-assisted customer journey that turns questions into briefs.',category:'ai',kind:'APEX EXPERIMENT',tags:['AI','Assistant']},
{id:'atlas',title:'Atlas / Operations App',summary:'A focused product interface for teams that need clarity.',category:'apps',kind:'APEX EXPERIMENT',tags:['App','Dashboard']},
{id:'mono',title:'Mono / Editorial Web',summary:'A quieter web direction built around content and rhythm.',category:'web',kind:'APEX EXPERIMENT',tags:['Editorial','Web']}];
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const projectsEl=$('#projects');
function renderProjects(filter='all'){projectsEl.innerHTML=projects.filter(p=>filter==='all'||p.category===filter).map((p,i)=>`<article class="project" data-project="${p.id}"><div class="project-art"><span class="index">0${i+1}</span><span class="kind">${p.kind}</span><div class="window"><div class="dots"><i></i><i></i><i></i></div><div class="bars"><i></i><i></i><i></i></div><div class="block"></div><div class="block small"></div></div></div><div class="project-meta"><div><h3>${p.title}</h3><p>${p.summary}</p></div><span>↗</span></div></article>`).join('');
$$('.project').forEach(el=>el.addEventListener('click',()=>openProject(el.dataset.project)))}
function openProject(id){const p=projects.find(x=>x.id===id);if(!p)return;$('#modal-category').textContent=`${p.category.toUpperCase()} / ${p.id.toUpperCase()}`;$('#modal-kind').textContent=p.kind;$('#modal-title').textContent=p.title;$('#modal-summary').textContent=p.summary;$('#modal-tags').innerHTML=p.tags.map(t=>`<span>${t}</span>`).join('');openModal('project-modal')}
function openModal(id){$('#'+id).classList.add('open');document.body.style.overflow='hidden'}
function closeModal(id){$('#'+id).classList.remove('open');if(!document.querySelector('.modal.open'))document.body.style.overflow=''}
function validate(form){const data=new FormData(form);let ok=true;const name=data.get('name').trim(),email=data.get('email').trim(),desc=data.get('description').trim(),consent=form.elements.consent.checked;form.querySelectorAll('small').forEach(x=>x.textContent='');if(!name){form.elements.name.nextElementSibling.textContent='Enter your name.';ok=false}if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){form.elements.email.nextElementSibling.textContent='Enter a valid email address.';ok=false}if(desc.length<20){form.elements.description.nextElementSibling.textContent='Add at least 20 characters so we can understand the project.';ok=false}$('#consent-error').textContent=consent?'':'Confirm that we may contact you about this request.';return ok&&consent}
function sendChat(){const input=$('#chat-input'),v=input.value.trim();if(!v)return;const box=$('#messages');box.insertAdjacentHTML('beforeend',`<div class="msg user"></div>`);box.lastElementChild.textContent=v;box.insertAdjacentHTML('beforeend','<div class="msg bot">Got it. We should define the product type, primary user and business goal. I can turn that into a clean project brief.</div>');input.value='';box.scrollTop=box.scrollHeight}
renderProjects();
$$('[data-scroll]').forEach(b=>b.addEventListener('click',()=>{document.getElementById(b.dataset.scroll)?.scrollIntoView({behavior:'smooth'});$('#nav').classList.remove('open')}));
$$('[data-filter]').forEach(b=>b.addEventListener('click',()=>{$$('[data-filter]').forEach(x=>x.classList.remove('active'));b.classList.add('active');renderProjects(b.dataset.filter)}));
$$('[data-open]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.open==='request'?'request-modal':'assistant-modal';if(b.hasAttribute('data-close-after'))closeModal('project-modal');openModal(id)}));
$$('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.close)));
$$('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)closeModal(m.id)}));
$('#request-form').addEventListener('submit',e=>{e.preventDefault();if(validate(e.target)){$('#request-form-wrap').hidden=true;$('#request-success').hidden=false}});
$('#chat-send').addEventListener('click',sendChat);$('#chat-input').addEventListener('keydown',e=>{if(e.key==='Enter')sendChat()});
$('#menu').addEventListener('click',()=>$('#nav').classList.toggle('open'));
$('#lang').addEventListener('click',()=>alert('Arabic layout is included in the product plan and will be wired into the content layer in the next implementation pass.'));
