import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './lib/supabase';

type Inquiry = {
  id: string; client_name: string; client_email: string; client_phone: string | null;
  project_type: string; budget_range: string | null; brief: string; status: string; created_at: string;
};
type SiteEvent = { id: string; event_name: string; project_id: string | null; locale: string | null; created_at: string };
type Invoice = {
  id: string; inquiry_id: string | null; amount_minor: number; currency: string; status: string;
  description: string; provider: string; provider_reference: string | null; created_at: string;
};
type NewInvoiceResponse = { checkoutUrl?: string; invoice?: { id: string; amount_egp: string; description: string }; error?: string };
type Conversation = {
  id: string; subject: string; status: string; clientName: string | null; clientEmail: string | null;
  clientUserId: string | null; createdAt: string; updatedAt: string; lastClientMessageAt: string | null;
  lastOwnerMessageAt: string | null; lastMessage: { body: string; senderType: string; createdAt: string } | null;
  unreadCount: number;
};
type ChatMessage = {
  id: string; conversation_id: string; sender_type: 'client'|'ai'|'owner'|'system'; sender_user_id: string | null;
  body: string; message_status: string; read_at: string | null; attachment_metadata: unknown[]; created_at: string;
};
type SecurityEvent = {
  id: string; actor_user_id: string | null; event_type: string; severity: string; endpoint: string | null;
  request_id: string | null; origin: string | null; user_agent: string | null; metadata: Record<string,unknown>; created_at: string;
};
type AuditLog = {
  id: string; actor_user_id: string | null; action: string; target_type: string; target_id: string | null;
  metadata: Record<string,unknown>; created_at: string;
};

function App() {
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const [user, setUser] = useState<string | null>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [otpMode,setOtpMode]=useState(false);
  const [otpRequested,setOtpRequested]=useState(false);
  const [otpCode,setOtpCode]=useState('');
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [events, setEvents] = useState<SiteEvent[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [conversations,setConversations]=useState<Conversation[]>([]);
  const [securityEvents,setSecurityEvents]=useState<SecurityEvent[]>([]);
  const [auditLogs,setAuditLogs]=useState<AuditLog[]>([]);
  const [selectedConversation,setSelectedConversation]=useState('');
  const [chatMessages,setChatMessages]=useState<ChatMessage[]>([]);
  const [ownerReply,setOwnerReply]=useState('');
  const [chatBusy,setChatBusy]=useState(false);
  const [replyBusy,setReplyBusy]=useState(false);
  const [conversationQuery,setConversationQuery]=useState('');
  const [error, setError] = useState(''); const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false); const [invoiceBusy, setInvoiceBusy] = useState(false);
  const [amount, setAmount] = useState(''); const [description, setDescription] = useState('');
  const [inquiryId, setInquiryId] = useState(''); const [createdLink, setCreatedLink] = useState('');

  const claimOwner = async () => {
    const { error: claimError } = await supabase.functions.invoke('apex-owner-bootstrap', { body: {} });
    if (claimError) throw new Error(await explainFunctionError(claimError));
  };

  const load = async () => {
    setBusy(true); setError('');
    try {
      const [inq, evt, inv, chat] = await Promise.all([
        supabase.from('project_inquiries').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('site_events').select('id,event_name,project_id,locale,created_at').order('created_at', { ascending: false }).limit(500),
        supabase.from('payment_orders').select('id,inquiry_id,amount_minor,currency,status,description,provider,provider_reference,created_at').order('created_at', { ascending: false }).limit(100),
        supabase.functions.invoke('apex-client-chat', { body: { action: 'owner_list' } }),
      ]);
      const chatData = chat.data as { error?: string; conversations?: Conversation[]; securityEvents?: SecurityEvent[]; auditLogs?: AuditLog[] } | null;
      const firstError = inq.error || evt.error || inv.error || chat.error;
      if (firstError || chatData?.error) setError(chatData?.error || firstError?.message || 'Owner access is not configured yet.');
      setInquiries((inq.data ?? []) as Inquiry[]);
      setEvents((evt.data ?? []) as SiteEvent[]);
      setInvoices((inv.data ?? []) as Invoice[]);
      setConversations(chatData?.conversations ?? []);
      setSecurityEvents(chatData?.securityEvents ?? []);
      setAuditLogs(chatData?.auditLogs ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The admin dashboard could not be refreshed.');
    } finally { setBusy(false); }
  };

  const openConversation = async (id:string) => {
    setSelectedConversation(id); setChatBusy(true); setError('');
    const {data,error:callError}=await supabase.functions.invoke('apex-client-chat',{body:{action:'owner_read',conversationId:id}});
    const result=data as {error?:string;messages?:ChatMessage[]}|null;
    if(callError||result?.error) setError(result?.error || callError?.message || 'Could not load this conversation.');
    else {
      setChatMessages(result?.messages ?? []);
      setConversations(current=>current.map(c=>c.id===id?{...c,unreadCount:0}:c));
    }
    setChatBusy(false);
  };

  const sendOwnerReply = async (e:React.FormEvent) => {
    e.preventDefault();
    const body=ownerReply.trim();
    if(!body||!selectedConversation||replyBusy)return;
    setReplyBusy(true);setError('');
    const idempotencyKey='owner_'+crypto.randomUUID().replace(/-/g,'');
    const {data,error:callError}=await supabase.functions.invoke('apex-client-chat',{
      body:{action:'owner_send',conversationId:selectedConversation,body,idempotencyKey},
    });
    const result=data as {error?:string;messages?:ChatMessage[]}|null;
    if(callError||result?.error) setError(result?.error || callError?.message || 'Could not send the reply.');
    else {
      setChatMessages(current=>{
        const next=new Map(current.map(m=>[m.id,m]));
        for(const message of result?.messages??[])next.set(message.id,message);
        return [...next.values()].sort((a,b)=>Date.parse(a.created_at)-Date.parse(b.created_at)).slice(-100);
      });
      setOwnerReply('');
      setConversations(current=>current.map(c=>c.id===selectedConversation?{...c,status:'waiting_client',lastOwnerMessageAt:new Date().toISOString(),updatedAt:new Date().toISOString()}:c));
      void load();
    }
    setReplyBusy(false);
  };

  const changeConversationStatus = async (id:string,status:string) => {
    const {data,error:callError}=await supabase.functions.invoke('apex-client-chat',{body:{action:'owner_status',conversationId:id,status}});
    const result=data as {error?:string}|null;
    if(callError||result?.error) setError(result?.error || callError?.message || 'Could not update conversation status.');
    else {
      setConversations(current=>current.map(c=>c.id===id?{...c,status}:c));
    }
  };

  const verifyOwnerSession = async (id:string):Promise<boolean> => {
    try {
      await claimOwner();
      setUser(id);
      setError('');
      await load();
      return true;
    } catch (err) {
      setUser(null); setInquiries([]); setEvents([]); setInvoices([]); setConversations([]); setSecurityEvents([]); setAuditLogs([]);
      setError('This account is not authorized for the APEX owner dashboard. Sign in with the verified owner email.');
      await supabase.auth.signOut();
      return false;
    }
  };

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const id = data.session?.user.id ?? null;
      if (id) void verifyOwnerSession(id);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUser(null); setInquiries([]); setEvents([]); setInvoices([]); setConversations([]); setSecurityEvents([]); setAuditLogs([]);
        return;
      }
      // Avoid calling Supabase Auth APIs inside its auth-state callback.
      queueMicrotask(() => { if(active) void verifyOwnerSession(session.user.id); });
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      if (otpMode && !otpRequested) {
        // Supabase sends the same neutral UI response so the form does not confirm account existence.
        const { error: otpRequestError } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { shouldCreateUser: false },
        });
        if (otpRequestError) console.warn('Owner OTP request could not be completed.');
        // Keep the same response for existing and unknown addresses to avoid user enumeration.
        setOtpRequested(true);
        setOtpCode('');
        setNotice('If this email is eligible, a sign-in code has been sent. Check your inbox and spam folder.');
        return;
      }
      if (otpMode && otpRequested) {
        const result = await supabase.auth.verifyOtp({email:email.trim(),token:otpCode.trim(),type:'email'});
        if(result.error || !result.data.session || !result.data.user) {
          setError('The code could not be verified. Check it and try again, or request a new code.');
          return;
        }
        const authorized=await verifyOwnerSession(result.data.user.id);
        if(authorized) setNotice('Owner access verified.');
        return;
      }
      const result = isSignUp
        ? await supabase.auth.signUp({ email: email.trim(), password })
        : await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (result.error) { setError(isSignUp ? 'Account creation failed. Check the form and try again.' : 'Email or password was not accepted.'); return; }
      if (isSignUp && !result.data.session) {
        setNotice('Check your email to confirm the account, then return here and sign in.');
        return;
      }
      if (result.data.session && result.data.user) {
        const authorized=await verifyOwnerSession(result.data.user.id);
        if(authorized) setNotice('Owner account verified.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication could not be completed. Please try again.');
    } finally { setBusy(false); }
  };

  const createInvoice = async (e: React.FormEvent) => {
    e.preventDefault(); setError(''); setNotice(''); setCreatedLink('');
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount < 1 || numericAmount > 1000000) {
      setError('Enter an amount from EGP 1 to EGP 1,000,000.'); return;
    }
    if (Math.abs(numericAmount * 100 - Math.round(numericAmount * 100)) > 0.001) {
      setError('The amount can have at most two decimal places.'); return;
    }
    if (description.trim().length < 3) { setError('Add a short invoice description.'); return; }
    setInvoiceBusy(true);
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('kashier-create-invoice', {
        body: { amountEGP: numericAmount, description: description.trim(), inquiryId: inquiryId || null },
      });
      if (invokeError) throw new Error(await explainFunctionError(invokeError));
      const created = data as NewInvoiceResponse;
      if (!created.checkoutUrl || !created.invoice?.id) throw new Error(created.error ?? 'Invoice creation returned an incomplete response.');
      setCreatedLink(created.checkoutUrl);
      setAmount(''); setDescription('');
      setNotice('Invoice created. Copy the link now; the secret link is only shown once.');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invoice creation failed.');
    } finally { setInvoiceBusy(false); }
  };

  const copyLink = async () => {
    if (!createdLink) return;
    try { await navigator.clipboard.writeText(createdLink); setNotice('Invoice link copied. Send it privately to the client.'); }
    catch { setNotice('Copy is unavailable in this browser. Select and copy the link from the field.'); }
  };

  if (!user) return <main style={page}>
    <section style={{ ...card, maxWidth: 510, margin: '8vh auto' }}>
      <p style={kicker}>APEX / ADMIN</p>
      <h1 style={{ marginBottom: 8 }}>{isSignUp ? 'Create owner login' : 'Owner dashboard'}</h1>
      <p style={muted}>Use the verified APEX contact email to secure the owner account. The first verified owner login can claim the dashboard once.</p>
      <form onSubmit={signIn} style={{ display: 'grid', gap: 12 }}>
        <label style={label}>Owner email
          <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Owner email" style={input} autoComplete="email" disabled={otpRequested && otpMode}/>
        </label>
        {otpMode && otpRequested
          ? <label style={label}>Email verification code
              <input required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} value={otpCode} onChange={e=>setOtpCode(e.target.value.replace(/\\D/g,'').slice(0,6))} placeholder="6-digit code" style={input}/>
            </label>
          : !otpMode && <label style={label}>Password<input required type="password" minLength={8} value={password} onChange={e => setPassword(e.target.value)} placeholder="At least 8 characters" style={input} autoComplete={isSignUp ? 'new-password' : 'current-password'} /></label>}
        <button disabled={busy || (otpMode && otpRequested && otpCode.length!==6)} style={button}>{busy ? 'Please wait…' : otpMode ? otpRequested ? 'Verify email code' : 'Send email code' : isSignUp ? 'Create account' : 'Sign in'}</button>
      </form>
      {!isSignUp && <button onClick={() => { setOtpMode(v=>!v);setOtpRequested(false);setOtpCode('');setError('');setNotice(''); }} style={linkButton}>{otpMode?'Use password instead':'Sign in with email code (OTP)'}</button>}
      {otpMode && otpRequested && <button onClick={()=>{setOtpRequested(false);setOtpCode('');setError('');setNotice('');}} style={linkButton}>Request a new code / change email</button>}
      <button onClick={() => { setIsSignUp(v => !v);setOtpMode(false);setOtpRequested(false);setOtpCode(''); setError(''); setNotice(''); }} style={linkButton}>
        {isSignUp ? 'Already have an account? Sign in' : 'First time? Create owner login'}
      </button>
      {error && <p role="alert" style={errorStyle}>{error}</p>}
      {notice && <p role="status" style={successStyle}>{notice}</p>}
    </section>
  </main>;

  return <main style={page}>
    <header style={topHeader}>
      <div><p style={kicker}>APEX / ADMIN</p><h1 style={{ margin: '0 0 6px' }}>Client & payment studio</h1><p style={muted}>Private owner area · inquiries, invoices and site activity</p></div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={() => void load()} style={secondaryButton}>{busy ? 'Refreshing…' : 'Refresh'}</button>
        <button onClick={() => void supabase.auth.signOut()} style={secondaryButton}>Sign out</button>
      </div>
    </header>

    <section style={statsGrid}>
      {[
        ['Client leads', inquiries.length],
        ['Site events', events.length],
        ['Invoices', invoices.length],
        ['Paid', invoices.filter(x => x.status === 'paid').length],
        ['Conversations', conversations.length],
        ['Unread messages', conversations.reduce((sum,c)=>sum+c.unreadCount,0)],
      ].map(([title, value]) => <div key={String(title)} style={card}><small style={muted}>{title}</small><strong style={{ display: 'block', fontSize: 31, marginTop: 7 }}>{value}</strong></div>)}
    </section>

    <section style={{ ...card, marginBottom: 26 }}>
      <div style={row}>
        <div><p style={kicker}>CLIENT MESSAGING</p><h2 style={{ margin: '0 0 6px' }}>Conversations</h2><p style={muted}>Client messages and AI replies are stored server-side. Only the configured owner can open a conversation.</p></div>
        <input value={conversationQuery} onChange={e=>setConversationQuery(e.target.value)} placeholder="Search name, email or message…" aria-label="Search conversations" style={{ ...input, maxWidth: 300 }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px,.8fr) minmax(0,1.2fr)', gap: 14, marginTop: 16 }}>
        <div style={{ display: 'grid', gap: 8, alignContent: 'start', maxHeight: 580, overflowY: 'auto' }}>
          {conversations.filter(c=>([c.clientName??'',c.clientEmail??'',c.subject,c.lastMessage?.body??''].join(' ')).toLowerCase().includes(conversationQuery.trim().toLowerCase())).map(c=>
            <button key={c.id} onClick={()=>void openConversation(c.id)} style={{ ...card, padding: 13, textAlign: 'left', borderColor: selectedConversation===c.id?'rgba(0,216,255,.75)':'rgba(0,177,255,.18)', background:selectedConversation===c.id?'rgba(0,104,165,.22)':'linear-gradient(145deg,#07182b,#040a16)' }}>
              <span style={{display:'flex',justifyContent:'space-between',gap:8,alignItems:'center'}}><strong>{c.clientName || c.clientEmail || 'Website visitor'}</strong>{c.unreadCount>0&&<span style={{...statusPill('open'),background:'rgba(0,190,255,.12)'}}>{c.unreadCount} unread</span>}</span>
              <small style={muted}>{c.subject} · {c.status}</small>
              {c.lastMessage&&<p style={{...muted,margin:'7px 0 0',overflowWrap:'anywhere'}}>{c.lastMessage.senderType==='client'?'Client: ':c.lastMessage.senderType==='owner'?'You: ':'AI: '}{c.lastMessage.body}</p>}
              <small style={muted}>{new Date(c.updatedAt).toLocaleString()}</small>
            </button>)}
          {!conversations.length&&<div style={card}>No conversations yet. New visitor chats will appear here automatically.</div>}
        </div>
        <div style={{ ...card, padding: 14, display:'flex', flexDirection:'column', minHeight: 420 }}>
          {!selectedConversation?<p style={muted}>Select a conversation to read and reply.</p>:<>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap',paddingBottom:12,borderBottom:'1px solid rgba(0,177,255,.18)'}}>
              <div><strong>{conversations.find(c=>c.id===selectedConversation)?.clientName || 'Website visitor'}</strong><p style={muted}>{conversations.find(c=>c.id===selectedConversation)?.clientEmail || 'Anonymous session'}</p></div>
              <select aria-label="Conversation status" value={conversations.find(c=>c.id===selectedConversation)?.status ?? 'open'} onChange={e=>void changeConversationStatus(selectedConversation,e.target.value)} style={{...input,width:170}}>
                {['open','waiting_owner','ai_handled','waiting_client','closed','escalated'].map(x=><option key={x} value={x}>{x.replace('_',' ')}</option>)}
              </select>
            </div>
            <div style={{display:'grid',gap:8,padding:'14px 0',overflowY:'auto',maxHeight:390}}>
              {chatMessages.map(m=><div key={m.id} style={{padding:11,borderRadius:12,border:'1px solid rgba(0,177,255,.18)',background:m.sender_type==='client'?'rgba(0,132,255,.12)':'rgba(255,255,255,.025)',marginLeft:m.sender_type==='client'?'auto':0,maxWidth:'95%',width:'fit-content'}}>
                <small style={{...muted,color:m.sender_type==='owner'?'#92f1d4':m.sender_type==='ai'?'#65e8ff':'#a7bcd0'}}>{m.sender_type==='owner'?'You':m.sender_type==='ai'?'APEX AI':m.sender_type==='system'?'System':'Client'} · {new Date(m.created_at).toLocaleString()}{m.read_at?' · Read':''}</small>
                <p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',margin:'6px 0 0',fontSize:13}}>{m.body}</p>
              </div>)}
              {!chatMessages.length&&<p style={muted}>{chatBusy?'Loading messages…':'No messages yet.'}</p>}
            </div>
            <form onSubmit={sendOwnerReply} style={{display:'grid',gap:9,marginTop:'auto'}}>
              <textarea required maxLength={8000} value={ownerReply} onChange={e=>setOwnerReply(e.target.value)} placeholder="Write a reply to the client…" rows={3} style={{...input,resize:'vertical'}} disabled={replyBusy||chatBusy}/>
              <button disabled={replyBusy||chatBusy||!ownerReply.trim()} style={button}>{replyBusy?'Sending…':'Send reply'}</button>
            </form>
          </>}
        </div>
      </div>
    </section>

    <section style={{ ...card, marginBottom: 26 }}>
      <p style={kicker}>PAYMENTS / KASHIER</p>
      <h2 style={{ margin: '0 0 8px' }}>Create a client invoice</h2>
      <p style={muted}>Set the agreed project amount yourself. Clients cannot change the amount from the payment link.</p>
      <form onSubmit={createInvoice} style={formGrid}>
        <label style={label}>Amount (EGP)<input required type="number" min="1" max="1000000" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="e.g. 1500.00" style={input} /></label>
        <label style={label}>Attach to project lead<select value={inquiryId} onChange={e => setInquiryId(e.target.value)} style={input}><option value="">No linked lead / custom invoice</option>{inquiries.map(q => <option key={q.id} value={q.id}>{q.client_name} · {q.project_type}</option>)}</select></label>
        <label style={{ ...label, gridColumn: '1 / -1' }}>Invoice description<input required minLength={3} maxLength={300} value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Website project — milestone 1" style={input} /></label>
        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}><button disabled={invoiceBusy} style={button}>{invoiceBusy ? 'Creating…' : 'Create secure invoice link'}</button><span style={muted}>Link expires after 7 days · EGP only</span></div>
      </form>
      {createdLink && <div style={{ ...linkBox, marginTop: 16 }}><strong>New invoice link — copy it now</strong><input readOnly value={createdLink} onFocus={e => e.currentTarget.select()} style={input} aria-label="New invoice URL" /><button onClick={() => void copyLink()} style={button}>Copy link</button></div>}
      <p style={{ ...muted, fontSize: 12, marginBottom: 0 }}>Checkout uses Kashier-hosted payment pages. The invoice link is private: share it only with the intended customer.</p>
    </section>

    <section style={{ marginBottom: 28 }}>
      <h2>Invoices</h2>
      <div style={{ display: 'grid', gap: 10 }}>
        {invoices.map(inv => <article key={inv.id} style={card}>
          <div style={row}>
            <div><strong>{inv.description}</strong><div style={muted}>{inv.provider.toUpperCase()} · {new Date(inv.created_at).toLocaleString()}</div></div>
            <span style={statusPill(inv.status)}>{inv.status.replace('_', ' ')}</span>
          </div>
          <strong style={{ display: 'block', fontSize: 24, marginTop: 12 }}>{(Number(inv.amount_minor) / 100).toLocaleString('en-EG', { style: 'currency', currency: 'EGP' })}</strong>
          <small style={muted}>Invoice ID: {inv.id}{inv.inquiry_id ? ' · linked to a client lead' : ''}</small>
        </article>)}
        {!invoices.length && <div style={card}>No invoices yet. Create one after you agree on the project scope and amount.</div>}
      </div>
    </section>

    <section style={{ marginBottom: 28 }}>
      <h2>Client leads</h2>
      <div style={{ display: 'grid', gap: 10 }}>
        {inquiries.map(q => <article key={q.id} style={card}>
          <div style={row}><div><strong>{q.client_name}</strong><div style={muted}>{q.client_email}{q.client_phone ? ' · ' + q.client_phone : ''}</div></div><span style={statusPill(q.status)}>{q.status}</span></div>
          <p><b>{q.project_type}</b>{q.budget_range ? ' · ' + q.budget_range : ''}</p><p style={{ ...muted, whiteSpace: 'pre-wrap' }}>{q.brief}</p><small style={muted}>{new Date(q.created_at).toLocaleString()}</small>
        </article>)}
        {!inquiries.length && <div style={card}>No leads yet.</div>}
      </div>
    </section>

    <section>
      <h2>Recent events</h2>
      <div style={{ ...card, overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}><thead><tr>{['Event', 'Project', 'Locale', 'Time'].map(x => <th key={x} align="left" style={tableHead}>{x}</th>)}</tr></thead>
          <tbody>{events.slice(0, 100).map(e => <tr key={e.id}><td style={tableCell}>{e.event_name}</td><td style={tableCell}>{e.project_id || '—'}</td><td style={tableCell}>{e.locale || '—'}</td><td style={tableCell}>{new Date(e.created_at).toLocaleString()}</td></tr>)}</tbody>
        </table>
      </div>
    </section>
    <section style={{marginBottom:28}}>
      <h2>Security events</h2>
      <div style={{display:'grid',gap:8}}>
        {securityEvents.slice(0,30).map(event=><article key={event.id} style={card}>
          <div style={{...row,alignItems:'center'}}><strong>{event.event_type.replace(/_/g, ' ')}</strong><span style={statusPill(event.severity)}>{event.severity}</span></div>
          <p style={muted}>{event.endpoint || '—'}{event.origin ? ' · '+event.origin : ''}</p>
          <small style={muted}>{new Date(event.created_at).toLocaleString()} · request {event.request_id?.slice(0,8) || 'n/a'}</small>
        </article>)}
        {!securityEvents.length&&<div style={card}>No recorded security events.</div>}
      </div>
    </section>
    <section style={{marginBottom:28}}>
      <h2>Audit log</h2>
      <div style={{...card,overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse'}}><thead><tr>{['Action','Target','Details','Time'].map(x=><th key={x} align="left" style={tableHead}>{x}</th>)}</tr></thead><tbody>
          {auditLogs.slice(0,100).map(event=><tr key={event.id}><td style={tableCell}>{event.action}</td><td style={tableCell}>{event.target_type} · {event.target_id?.slice(0,10)||'—'}</td><td style={tableCell}>{formatAuditDetails(event.metadata)}</td><td style={tableCell}>{new Date(event.created_at).toLocaleString()}</td></tr>)}
        </tbody></table>
      </div>
    </section>
    {error && <p role="alert" style={errorStyle}>{error}</p>}
    {notice && <p role="status" style={successStyle}>{notice}</p>}
  </main>;
}

function formatAuditDetails(metadata: Record<string, unknown>) {
  const bodyLength = metadata.bodyLength;
  if (typeof bodyLength === 'number' && Number.isFinite(bodyLength) && bodyLength > 0) return `${bodyLength} chars`;
  if (typeof metadata.to === 'string' && metadata.to) return `Status → ${metadata.to}`;
  if (typeof metadata.source === 'string' && metadata.source) return metadata.source;
  return '—';
}

async function explainFunctionError(error: { message: string; context?: unknown }) {
  const context = error.context;
  if (context instanceof Response) {
    try {
      const body = await context.clone().json();
      if (typeof body?.error === 'string') return body.error;
      if (typeof body?.message === 'string') return body.message;
    } catch { /* use SDK message */ }
  }
  return error.message || 'The server rejected the request.';
}

const page: React.CSSProperties = { maxWidth: 1180, margin: '0 auto', padding: 'clamp(16px,4vw,40px)', minHeight: '100vh', color: '#ecf8ff', background: '#020714', fontFamily: '"DM Sans",system-ui,sans-serif' };
const topHeader: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 20, flexWrap: 'wrap', marginBottom: 24 };
const kicker: React.CSSProperties = { color: '#25dcff', letterSpacing: 3, fontSize: 10, fontWeight: 700 };
const muted: React.CSSProperties = { color: '#91a9bf', fontSize: 12, lineHeight: 1.7 };
const card: React.CSSProperties = { padding: 18, borderRadius: 16, border: '1px solid rgba(0,177,255,.24)', background: 'linear-gradient(145deg,#07182b,#040a16)' };
const label: React.CSSProperties = { display: 'grid', gap: 7, color: '#b8d6ea', fontSize: 12 };
const input: React.CSSProperties = { padding: 12, borderRadius: 9, border: '1px solid rgba(0,177,255,.24)', background: '#020a18', color: '#f4fbff', minWidth: 0, width: '100%', boxSizing: 'border-box' };
const button: React.CSSProperties = { padding: '12px 16px', borderRadius: 999, border: '1px solid rgba(80,238,255,.8)', background: 'linear-gradient(105deg,#007bff,#05dfff)', color: '#00101e', fontWeight: 700, cursor: 'pointer' };
const secondaryButton: React.CSSProperties = { padding: '11px 14px', borderRadius: 999, border: '1px solid rgba(0,177,255,.4)', background: '#061326', color: '#dcf8ff', cursor: 'pointer' };
const linkButton: React.CSSProperties = { marginTop: 16, color: '#39ddff', cursor: 'pointer', background: 'transparent', border: 0, padding: 0 };
const formGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,260px),1fr))', gap: 14, marginTop: 18 };
const statsGrid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, margin: '22px 0' };
const row: React.CSSProperties = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' };
const linkBox: React.CSSProperties = { display: 'grid', gap: 10, padding: 14, border: '1px solid rgba(0,208,255,.4)', borderRadius: 12, background: '#031327' };
const tableHead: React.CSSProperties = { padding: 10, borderBottom: '1px solid rgba(0,177,255,.24)', color: '#7fcde7', fontSize: 11 };
const tableCell: React.CSSProperties = { padding: 10, borderBottom: '1px solid rgba(0,177,255,.12)', fontSize: 11 };
const errorStyle: React.CSSProperties = { padding: 12, border: '1px solid rgba(255,84,61,.4)', background: 'rgba(255,84,61,.08)', color: '#ffab9a', borderRadius: 10, fontSize: 12 };
const successStyle: React.CSSProperties = { padding: 12, border: '1px solid rgba(0,213,255,.3)', background: 'rgba(0,135,255,.08)', color: '#b4f5ff', borderRadius: 10, fontSize: 12 };
const statusPill = (status: string): React.CSSProperties => ({ border: '1px solid rgba(0,190,255,.28)', borderRadius: 999, padding: '5px 9px', color: status === 'paid' || status === 'completed' ? '#80f4cf' : status === 'failed' || status === 'cancelled' ? '#ffab9a' : '#b4eaff', fontSize: 10, textTransform: 'capitalize' });

createRoot(document.getElementById('admin-root')!).render(<App/>);
