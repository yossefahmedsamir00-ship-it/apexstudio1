import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BarChart3, Bot, CalendarDays, CheckCircle2, FileText, FlaskConical, Instagram, LayoutDashboard, Megaphone, Search, ShieldCheck, Sparkles, Upload, Users, Youtube } from 'lucide-react';
import { adminSupabase as supabase } from './lib/admin-supabase';
import './social-ai.css';

type View = 'overview' | 'brand' | 'content' | 'ugc' | 'ads';
type ContentItem = { id: string; title?: string; status: string; platform?: string; updated_at?: string; };
type Overview = { content: ContentItem[]; connected_accounts: number; pending_approvals: number; analytics_last_synced_at: string | null; };
type ApiPayload = Record<string, any>;

const nav: Array<{ id: View; label: string; icon: React.ElementType }> = [
  { id: 'overview', label: 'Command Center', icon: LayoutDashboard },
  { id: 'brand', label: 'Brand Brain', icon: Sparkles },
  { id: 'content', label: 'Content Studio', icon: FileText },
  { id: 'ugc', label: 'UGC Studio', icon: Users },
  { id: 'ads', label: 'Ads Intelligence', icon: Megaphone },
];
const platformIcons: Record<string, React.ElementType> = { instagram: Instagram, youtube: Youtube, tiktok: Sparkles, x: Search };
const DEMO_CONTENT: ContentItem[] = [
  { id: 'demo-1', title: 'APEX STUDIO — Brand Introduction', status: 'draft', platform: 'instagram' },
  { id: 'demo-2', title: 'Founder POV — Building better digital products', status: 'in_review', platform: 'x' },
  { id: 'demo-3', title: 'Before / After Website Transformation', status: 'approved', platform: 'tiktok' },
];

function Stat({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return <div className="stat-card"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}
function normalizeOverview(data: ApiPayload): Overview {
  const content = Array.isArray(data.content) ? data.content : [];
  const analytics = Array.isArray(data.analytics) ? data.analytics : [];
  return {
    content,
    connected_accounts: Array.isArray(data.accounts) ? data.accounts.length : 0,
    pending_approvals: content.filter((item: ContentItem) => item.status === 'in_review').length,
    analytics_last_synced_at: analytics[0]?.period_end ?? null,
  };
}

function App() {
  const [view, setView] = useState<View>('overview');
  const [overview, setOverview] = useState<Overview>({ content: [], connected_accounts: 0, pending_approvals: 0, analytics_last_synced_at: null });
  const [content, setContent] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [demoMode, setDemoMode] = useState(false);
  const [brief, setBrief] = useState('');
  const [generated, setGenerated] = useState('');
  const [brandQuestion, setBrandQuestion] = useState('');
  const [brandAnswer, setBrandAnswer] = useState('');
  const [brandTitle, setBrandTitle] = useState('');
  const [brandContent, setBrandContent] = useState('');
  const [ugcBrief, setUgcBrief] = useState('');
  const [ugcResult, setUgcResult] = useState('');
  const [adsResult, setAdsResult] = useState('');
  const [busy, setBusy] = useState(false);

  const callSocial = async (body: Record<string, unknown>): Promise<ApiPayload> => {
    const { data, error: fnError } = await supabase.functions.invoke('social-api', { body });
    if (fnError) throw new Error(fnError.message || 'Social API unavailable');
    const payload = data as ApiPayload;
    if (payload?.ok === false) throw new Error(typeof payload.error === 'string' ? payload.error : payload.error?.message || 'Social API request failed');
    return payload;
  };

  const load = async () => {
    setLoading(true); setError('');
    try {
      const data = await callSocial({ action: 'overview' });
      const normalized = normalizeOverview(data);
      const list = Array.isArray(data.content) ? data.content : [];
      setOverview(normalized); setContent(list); setDemoMode(false);
    } catch {
      const demo = { content: DEMO_CONTENT, connected_accounts: 0, pending_approvals: 1, analytics_last_synced_at: null };
      setOverview(demo); setContent(DEMO_CONTENT); setDemoMode(true);
      setError('Social API is not deployed or the owner workspace is not connected yet. Safe demo data is shown; it does not represent real accounts, posts, analytics or ad spend.');
    } finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const createDraft = async () => {
    if (!brief.trim() || busy) return;
    setBusy(true); setError('');
    try {
      if (demoMode) {
        const clean = brief.trim();
        setGenerated(JSON.stringify({ mode: 'demo', approval_required: true, brief: clean, variants: {
          instagram: { hook: `${clean} — بصوت APEX STUDIO`, caption: 'Draft concept: hook + value + proof + CTA. Replace placeholders with verified brand facts.', cta: 'Send us your idea' },
          x: { hook: clean, body: 'Short-form draft for X. Verify factual claims before publishing.', cta: 'Tell us what you are building.' },
          tiktok: { hook: `Stop scrolling: ${clean}`, scenes: ['Hook', 'Problem', 'Visual demonstration', 'Result', 'CTA'] },
          youtube: { title: `${clean} | APEX STUDIO`, outline: ['Opening hook', 'Context', 'Main value', 'Demonstration', 'Proof', 'CTA'] }
        } }, null, 2));
        return;
      }
      const data = await callSocial({ action: 'content.generate', title: brief.trim().slice(0, 120), brief: brief.trim(), contentType: 'post', platforms: ['instagram', 'x', 'tiktok', 'youtube'] });
      setGenerated(JSON.stringify(data, null, 2)); await load();
    } catch (e) { setError(e instanceof Error ? e.message : 'Content generation failed.'); }
    finally { setBusy(false); }
  };
  const askBrand = async () => {
    if (!brandQuestion.trim() || busy) return;
    setBusy(true); setError('');
    try {
      if (demoMode) { setBrandAnswer('Demo mode: add real brand source documents after the Social API is connected. No brand facts are being invented.'); return; }
      const data = await callSocial({ action: 'brand.brain', question: brandQuestion.trim() });
      setBrandAnswer(String(data.answer ?? 'No answer returned.'));
    } catch (e) { setError(e instanceof Error ? e.message : 'Brand Brain failed.'); }
    finally { setBusy(false); }
  };
  const addBrandSource = async () => {
    if (!brandTitle.trim() || !brandContent.trim() || busy) return;
    setBusy(true); setError('');
    try {
      if (demoMode) { setBrandAnswer('Demo mode: source was not persisted. Connect the backend to store Brand Brain sources safely.'); return; }
      await callSocial({ action: 'brand.document.create', title: brandTitle.trim(), content: brandContent.trim(), documentType: 'brand_note' });
      setBrandTitle(''); setBrandContent(''); setBrandAnswer('Brand source saved successfully.');
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save brand source.'); }
    finally { setBusy(false); }
  };
  const generateUgc = async () => {
    if (!ugcBrief.trim() || busy) return;
    setBusy(true); setError('');
    try {
      if (demoMode) { setUgcResult(JSON.stringify({ mode: 'demo', approval_required: true, brief: ugcBrief.trim(), hook: 'Verified problem → solution hook', shot_list: ['Hook', 'Problem', 'Demonstration', 'Result', 'CTA'], compliance_notes: ['Verify all claims before publishing.'] }, null, 2)); return; }
      const data = await callSocial({ action: 'ugc.generate', title: 'APEX UGC Concept', brief: ugcBrief.trim() });
      setUgcResult(JSON.stringify(data.brief ?? data, null, 2));
    } catch (e) { setError(e instanceof Error ? e.message : 'UGC generation failed.'); }
    finally { setBusy(false); }
  };
  const loadAds = async () => {
    setBusy(true); setError('');
    try {
      if (demoMode) { setAdsResult('Demo mode: no real Meta Ads data is connected.'); return; }
      const data = await callSocial({ action: 'ads.summary' });
      setAdsResult(JSON.stringify(data, null, 2));
    } catch (e) { setError(e instanceof Error ? e.message : 'Ads Intelligence failed.'); }
    finally { setBusy(false); }
  };

  const counts = useMemo(() => content.reduce((acc: Record<string, number>, item) => { acc[item.status] = (acc[item.status] ?? 0) + 1; return acc; }, {}), [content]);
  const current = useMemo(() => content.slice(0, 6), [content]);
  return <div className="social-shell">
    <aside className="social-sidebar"><div className="brand"><div className="brand-mark">A</div><div><b>APEX SOCIAL</b><span>AI GROWTH OS</span></div></div><div className="workspace"><span>WORKSPACE</span><b>APEX STUDIO</b><small>Owner workspace</small></div><nav>{nav.map(item => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? 'active' : ''} onClick={() => setView(item.id)}><Icon size={17}/>{item.label}</button>; })}</nav><div className="guard"><ShieldCheck size={16}/><div><b>Human approval</b><small>Publishing and ad spend stay owner-controlled.</small></div></div></aside>
    <main className="social-main"><header className="topbar"><div><span className="eyebrow">APEX STUDIO / GROWTH</span><h1>{nav.find(n => n.id === view)?.label}</h1></div><div className="top-actions"><span className="live"><i/> {demoMode ? 'Demo mode' : 'Owner mode'}</span><button onClick={() => void load()} className="ghost">Refresh</button></div></header>
      {error && <div className="error"><ShieldCheck size={16}/>{error}<button onClick={() => setError('')}>×</button></div>}
      {loading ? <div className="loading">Loading your growth workspace…</div> : <>
        {view === 'overview' && <section className="page"><div className="hero"><div><span className="eyebrow">GROWTH COMMAND CENTER</span><h2>Turn brand knowledge into measurable content.</h2><p>One workspace for strategy, production, approvals, publishing and learning — with real provider data only when connected.</p></div><div className="hero-icon"><Bot size={38}/></div></div><div className="stats"><Stat label="Drafts" value={counts.draft ?? 0} detail="Content in production"/><Stat label="In review" value={counts.in_review ?? 0} detail="Waiting for owner"/><Stat label="Approved" value={counts.approved ?? 0} detail="Ready for scheduling"/><Stat label="Accounts" value={overview.connected_accounts} detail="Official connectors"/></div><div className="grid-2"><div className="panel"><div className="panel-head"><div><span className="eyebrow">CONTENT QUEUE</span><h3>Latest work</h3></div><CalendarDays size={18}/></div>{current.length ? current.map(item => <div className="content-row" key={item.id}><div><b>{item.title || 'Untitled content'}</b><small>{item.platform || 'multi-platform'} · {item.status}</small></div><span className="status">{item.status}</span></div>) : <div className="empty">No content returned by the Social API yet.</div>}</div><div className="panel"><div className="panel-head"><div><span className="eyebrow">LEARNING LOOP</span><h3>Signal integrity</h3></div><BarChart3 size={18}/></div><div className="signal"><CheckCircle2/><div><b>Source-backed analytics</b><p>{overview.analytics_last_synced_at ? `Last synced ${new Date(overview.analytics_last_synced_at).toLocaleString()}` : 'No provider analytics have been synced yet.'}</p></div></div><div className="signal"><ShieldCheck/><div><b>{overview.pending_approvals} approvals waiting</b><p>AI cannot approve its own work.</p></div></div></div></div></section>}
        {view === 'brand' && <section className="page"><div className="section-title"><div><span className="eyebrow">KNOWLEDGE LAYER</span><h2>Brand Brain</h2><p>Ask the brand memory layer and add source-backed facts without inventing evidence.</p></div></div><div className="cards-3"><div className="feature"><Sparkles/><b>Canonical facts</b><p>Owner-controlled source documents become the knowledge base.</p></div><div className="feature"><Search/><b>Source traceability</b><p>Answers return the source records used by the backend.</p></div><div className="feature"><ShieldCheck/><b>Conflict review</b><p>Missing evidence is surfaced instead of silently invented.</p></div></div><div className="grid-2"><div className="panel large"><h3>Ask Brand Brain</h3><textarea value={brandQuestion} onChange={e => setBrandQuestion(e.target.value)} placeholder="What should APEX STUDIO say about…?"/><button className="primary" disabled={busy} onClick={() => void askBrand()}><Sparkles size={16}/> Ask</button>{brandAnswer && <pre className="output">{brandAnswer}</pre>}</div><div className="panel large"><h3>Add brand source</h3><input value={brandTitle} onChange={e => setBrandTitle(e.target.value)} placeholder="Source title"/><textarea value={brandContent} onChange={e => setBrandContent(e.target.value)} placeholder="Verified brand facts, product notes, customer research…"/><button className="primary" disabled={busy} onClick={() => void addBrandSource()}><Upload size={16}/> Save source</button></div></div></section>}
        {view === 'content' && <section className="page"><div className="section-title"><div><span className="eyebrow">AI CONTENT STUDIO</span><h2>Brief → platform variants</h2><p>Generate drafts for Instagram, X, TikTok and YouTube without blindly cross-posting.</p></div></div><div className="composer"><textarea value={brief} onChange={e => setBrief(e.target.value)} placeholder="Describe the campaign, product, audience, goal and CTA…"/><button className="primary" onClick={() => void createDraft()} disabled={busy}>{busy ? 'Generating…' : <><Bot size={16}/> Generate</>}</button></div>{generated && <pre className="output">{generated}</pre>}<div className="platforms">{['instagram', 'x', 'tiktok', 'youtube'].map(p => { const Icon = platformIcons[p]; return <div key={p}><Icon/><b>{p.toUpperCase()}</b><small>Platform-specific output</small></div>; })}</div></section>}
        {view === 'ugc' && <section className="page"><div className="section-title"><div><span className="eyebrow">UGC STUDIO</span><h2>Production-ready concepts</h2><p>Hooks, shot lists, spoken lines, on-screen text, B-roll and CTA — clearly marked as concepts until verified.</p></div></div><div className="composer"><textarea value={ugcBrief} onChange={e => setUgcBrief(e.target.value)} placeholder="Describe the product, audience, creator angle and goal…"/><button className="primary" disabled={busy} onClick={() => void generateUgc()}><FlaskConical size={16}/> Generate UGC</button></div>{ugcResult && <pre className="output">{ugcResult}</pre>}<div className="ugc-grid"><div className="ugc-card"><FlaskConical/><b>Problem → solution</b><p>Hook → pain point → demonstrated solution → proof → CTA.</p></div><div className="ugc-card"><Users/><b>Founder story</b><p>Authentic story structure without fabricated customer claims.</p></div><div className="ugc-card"><FileText/><b>Demo / FAQ</b><p>Scene-by-scene script with filming and editing notes.</p></div></div></section>}
        {view === 'ads' && <section className="page"><div className="section-title"><div><span className="eyebrow">META ADS INTELLIGENCE</span><h2>Measure first. Recommend second.</h2><p>Read-only analysis of supplied/provider data. No automatic budget changes.</p></div><button className="primary" onClick={() => void loadAds()} disabled={busy}><Upload size={16}/> Load data</button></div><div className="ads-banner"><Megaphone/><div><b>Safe by default</b><p>CPM, CTR, CPC, CPA and ROAS are shown only when the required source fields exist. AI recommendations remain hypotheses until you approve a test.</p></div></div>{adsResult && <pre className="output">{adsResult}</pre>}<div className="cards-3"><div className="feature"><BarChart3/><b>Creative analysis</b><p>Compare hooks, formats and cohorts against a stated baseline.</p></div><div className="feature"><Search/><b>Tracking gaps</b><p>Flag attribution, date-range and sample-size issues.</p></div><div className="feature"><CheckCircle2/><b>Test proposals</b><p>Produce measurable A/B hypotheses instead of guaranteed outcomes.</p></div></div></section>}
      </>}
    </main></div>;
}

createRoot(document.getElementById('social-ai-root')!).render(<App/>);
