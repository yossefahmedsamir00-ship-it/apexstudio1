import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BarChart3, Bot, CalendarDays, CheckCircle2, FileText, FlaskConical, Instagram, LayoutDashboard, Megaphone, Search, ShieldCheck, Sparkles, Upload, Users, Youtube } from 'lucide-react';
import { adminSupabase as supabase } from './lib/admin-supabase';
import './social-ai.css';

type View = 'overview' | 'brand' | 'content' | 'ugc' | 'ads';
type Overview = { content?: Record<string, number>; connected_accounts?: number; pending_approvals?: number; analytics_last_synced_at?: string | null };
type ContentItem = { id: string; title?: string; status: string; platform?: string; updated_at?: string; latest_version?: { id: string; body?: string; created_at?: string } | null };

const nav: Array<{id:View; label:string; icon:React.ElementType}> = [
  { id:'overview', label:'Command Center', icon:LayoutDashboard },
  { id:'brand', label:'Brand Brain', icon:Sparkles },
  { id:'content', label:'Content Studio', icon:FileText },
  { id:'ugc', label:'UGC Studio', icon:Users },
  { id:'ads', label:'Ads Intelligence', icon:Megaphone },
];

const platformIcons: Record<string, React.ElementType> = { instagram: Instagram, youtube: Youtube, tiktok: Sparkles, x: Search };

function Stat({label,value,detail}:{label:string;value:string|number;detail:string}) {
  return <div className="stat-card"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function App() {
  const [view,setView]=useState<View>('overview');
  const [overview,setOverview]=useState<Overview>({});
  const [content,setContent]=useState<ContentItem[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState('');
  const [brief,setBrief]=useState('');
  const [generated,setGenerated]=useState('');
  const [busy,setBusy]=useState(false);

  const callSocial = async (body: Record<string,unknown>) => {
    const { data, error: fnError } = await supabase.functions.invoke('social-api', { body });
    if (fnError) throw new Error(fnError.message || 'Social API unavailable');
    if ((data as {ok?:boolean;error?:{message?:string}})?.ok === false) throw new Error((data as {error?:{message?:string}}).error?.message || 'Social API request failed');
    return data as Record<string,unknown>;
  };

  const load = async () => {
    setLoading(true); setError('');
    try {
      const [o,c] = await Promise.all([callSocial({ method:'overview' }), callSocial({ method:'content', limit:25 })]);
      setOverview((o.data || {}) as Overview);
      setContent((((c.data || {}) as {items?:ContentItem[]}).items) || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load Social AI data.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const createDraft = async () => {
    if (!brief.trim() || busy) return;
    setBusy(true); setError('');
    try {
      const data = await callSocial({ method:'generate-content', brief:brief.trim(), platforms:['instagram','x','tiktok','youtube'] });
      setGenerated(JSON.stringify(data.data || data, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Content generation failed.');
    } finally { setBusy(false); }
  };

  const counts = overview.content || {};
  const current = useMemo(() => content.slice(0,6), [content]);

  return <div className="social-shell">
    <aside className="social-sidebar">
      <div className="brand"><div className="brand-mark">A</div><div><b>APEX SOCIAL</b><span>AI GROWTH OS</span></div></div>
      <div className="workspace"><span>WORKSPACE</span><b>APEX STUDIO</b><small>Owner workspace</small></div>
      <nav>{nav.map(item => { const Icon=item.icon; return <button key={item.id} className={view===item.id?'active':''} onClick={()=>setView(item.id)}><Icon size={17}/>{item.label}</button>; })}</nav>
      <div className="guard"><ShieldCheck size={16}/><div><b>Human approval</b><small>Publishing and ad spend stay owner-controlled.</small></div></div>
    </aside>
    <main className="social-main">
      <header className="topbar"><div><span className="eyebrow">APEX STUDIO / GROWTH</span><h1>{nav.find(n=>n.id===view)?.label}</h1></div><div className="top-actions"><span className="live"><i/> Owner mode</span><button onClick={()=>void load()} className="ghost">Refresh</button></div></header>
      {error && <div className="error"><ShieldCheck size={16}/>{error}<button onClick={()=>setError('')}>×</button></div>}
      {loading ? <div className="loading">Loading your growth workspace…</div> : <>
        {view==='overview' && <section className="page">
          <div className="hero"><div><span className="eyebrow">GROWTH COMMAND CENTER</span><h2>Turn brand knowledge into measurable content.</h2><p>One workspace for strategy, production, approvals, publishing and learning — with real provider data only.</p></div><div className="hero-icon"><Bot size={38}/></div></div>
          <div className="stats"><Stat label="Drafts" value={counts.draft ?? 0} detail="Content in production"/><Stat label="In review" value={counts.in_review ?? 0} detail="Waiting for you"/><Stat label="Approved" value={counts.approved ?? 0} detail="Ready for scheduling"/><Stat label="Accounts" value={overview.connected_accounts ?? 0} detail="Official connectors"/></div>
          <div className="grid-2"><div className="panel"><div className="panel-head"><div><span className="eyebrow">CONTENT QUEUE</span><h3>Latest work</h3></div><CalendarDays size={18}/></div>{current.length ? current.map(item=><div className="content-row" key={item.id}><div><b>{item.title || 'Untitled content'}</b><small>{item.platform || 'multi-platform'} · {item.status}</small></div><span className="status">{item.status}</span></div>) : <div className="empty">No content returned by the Social API yet.</div>}</div>
          <div className="panel"><div className="panel-head"><div><span className="eyebrow">LEARNING LOOP</span><h3>Signal integrity</h3></div><BarChart3 size={18}/></div><div className="signal"><CheckCircle2/><div><b>Source-backed analytics</b><p>{overview.analytics_last_synced_at ? `Last synced ${new Date(overview.analytics_last_synced_at).toLocaleString()}` : 'No provider analytics have been synced yet.'}</p></div></div><div className="signal"><ShieldCheck/><div><b>{overview.pending_approvals ?? 0} approvals waiting</b><p>AI cannot approve its own work.</p></div></div></div></div>
        </section>}

        {view==='brand' && <section className="page"><div className="section-title"><div><span className="eyebrow">KNOWLEDGE LAYER</span><h2>Brand Brain</h2><p>Canonical brand facts, products, audience evidence, assets and campaign memory.</p></div><button className="primary"><Upload size={16}/> Add source</button></div><div className="cards-3"><div className="feature"><Sparkles/><b>Canonical facts</b><p>Only owner-approved facts become authoritative.</p></div><div className="feature"><Search/><b>Source traceability</b><p>Every extracted claim keeps its source and confidence.</p></div><div className="feature"><ShieldCheck/><b>Conflict review</b><p>Conflicting claims are surfaced instead of silently merged.</p></div></div><div className="panel large"><h3>Brand knowledge pipeline</h3><div className="pipeline"><span>Source</span><i>→</i><span>Extract</span><i>→</i><span>Classify</span><i>→</i><span>Review</span><i>→</i><strong>Canonical</strong></div></div></section>}

        {view==='content' && <section className="page"><div className="section-title"><div><span className="eyebrow">AI CONTENT STUDIO</span><h2>Brief → platform variants</h2><p>Generate drafts for Instagram, X, TikTok and YouTube without blindly cross-posting.</p></div></div><div className="composer"><textarea value={brief} onChange={e=>setBrief(e.target.value)} placeholder="Describe the campaign, product, audience, goal and CTA…"/><button className="primary" onClick={()=>void createDraft()} disabled={busy}>{busy?'Generating…':<><Bot size={16}/> Generate</>}</button></div>{generated && <pre className="output">{generated}</pre>}<div className="platforms">{['instagram','x','tiktok','youtube'].map(p=>{const Icon=platformIcons[p];return <div key={p}><Icon/><b>{p.toUpperCase()}</b><small>Platform-specific output</small></div>})}</div></section>}

        {view==='ugc' && <section className="page"><div className="section-title"><div><span className="eyebrow">UGC STUDIO</span><h2>Production-ready concepts</h2><p>Hooks, shot lists, spoken lines, on-screen text, B-roll and CTA — clearly marked as concepts until verified.</p></div></div><div className="ugc-grid"><div className="ugc-card"><FlaskConical/><b>Problem → solution</b><p>Hook → pain point → demonstrated solution → proof → CTA.</p></div><div className="ugc-card"><Users/><b>Founder story</b><p>Authentic story structure without fabricated customer claims.</p></div><div className="ugc-card"><FileText/><b>Demo / FAQ</b><p>Scene-by-scene script with filming and editing notes.</p></div></div></section>}

        {view==='ads' && <section className="page"><div className="section-title"><div><span className="eyebrow">META ADS INTELLIGENCE</span><h2>Measure first. Recommend second.</h2><p>Read-only analysis of supplied/provider data. No automatic budget changes.</p></div><button className="primary"><Upload size={16}/> Import report</button></div><div className="ads-banner"><Megaphone/><div><b>Safe by default</b><p>CPM, CTR, CPC, CPA and ROAS are shown only when the required source fields exist. AI recommendations remain hypotheses until you approve a test.</p></div></div><div className="cards-3"><div className="feature"><BarChart3/><b>Creative analysis</b><p>Compare hooks, formats and cohorts against a stated baseline.</p></div><div className="feature"><Search/><b>Tracking gaps</b><p>Flag attribution, date-range and sample-size issues.</p></div><div className="feature"><CheckCircle2/><b>Test proposals</b><p>Produce measurable A/B hypotheses instead of guaranteed outcomes.</p></div></div></section>}
      </>}
    </main>
  </div>;
}

createRoot(document.getElementById('social-ai-root')!).render(<App/>);
