import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertCircle, ArrowDownLeft, ArrowUpRight, BadgeCheck, Check, CheckCircle2,
  ChevronDown, Clapperboard, Clock3, FileVideo2, Globe2, LayoutDashboard, LockKeyhole,
  LogOut, Megaphone, MessageSquare, Plus, RefreshCw, Send, ShieldCheck, Wallet,
  X,
} from 'lucide-react';
import { FlowApiClientError, FlowEngineClient } from './client';
import type {
  FlowApproval, FlowFinancialEntry, FlowOperation, FlowPublishingDraft,
  FlowScene, FlowVideoProject,
} from './domain';
import { adminSupabase } from '../lib/admin-supabase';
import './flow-engine.css';

type Locale = 'ar' | 'en';
type Section = 'overview' | 'chat' | 'operations' | 'video' | 'approvals' | 'publishing' | 'finance';

const copy = {
  en: {
    eyebrow: 'PRIVATE OPERATIONS CONSOLE', title: 'APEX FLOW ENGINE',
    subtitle: 'One command center for requests, production and review.',
    overview: 'Overview', chat: 'Command chat', operations: 'Operations', video: 'Video studio',
    approvals: 'Approvals', publishing: 'Publishing', finance: 'Revenue',
    refresh: 'Refresh data', signOut: 'Sign out', owner: 'Owner verified',
    online: 'Connected to workspace', noData: 'No records yet',
    overviewTitle: 'Workspace pulse', overviewSub: 'Live records from your private APEX workspace.',
    requests: 'Requests', activeOps: 'Active operations', reviewQueue: 'Awaiting review',
    videoProjects: 'Video projects', publishingDrafts: 'Publishing drafts',
    verifiedFinance: 'Verified finance', financeEmpty: 'No financial records have been added.',
    notConfigured: 'Not configured', manualOnly: 'Manual workflow only',
    chatTitle: 'What should APEX work on?', chatSub: 'Describe a task. It will be stored as a draft operation for review.',
    chatPlaceholder: 'Write your request…',
    sendRequest: 'Create request', draftCreated: 'Request saved as a draft. No AI or external action was run.',
    requestSaved: 'Request recorded', draft: 'Draft', queued: 'Queued', running: 'Running',
    waitingApproval: 'Waiting approval', succeeded: 'Completed', failed: 'Failed',
    cancelled: 'Cancelled', progress: 'Progress', operation: 'Operation',
    operationsTitle: 'Operations ledger', operationsSub: 'A traceable list of owner requests and their current state.',
    noOperations: 'Your first operation will appear here after you create a request.',
    videoTitle: 'Video studio', videoSub: 'Plan projects and scenes. Video generation is not connected.',
    chooseOperation: 'Choose an operation', projectTitle: 'Project title', projectBrief: 'Creative brief',
    createProject: 'Create video project', selectProject: 'Select a project', createScene: 'Add scene',
    sceneTitle: 'Scene title', sceneBrief: 'Scene purpose', script: 'Script / voiceover',
    visualDirection: 'Visual direction', saveScene: 'Save scene', noScenes: 'No scenes in this project yet.',
    requestSceneApproval: 'Request scene approval', revision: 'Revision', planned: 'Planned',
    drafting: 'Drafting', readyReview: 'Ready for review', approved: 'Approved',
    approvalsTitle: 'Approval queue', approvalsSub: 'Each approval is bound to one exact content revision and destination.',
    noApprovals: 'No approvals are waiting.', approve: 'Approve', reject: 'Reject',
    target: 'Target', contentRevision: 'Content revision', noApprovalHistory: 'No approval records yet.',
    publishingTitle: 'Publishing drafts', publishingSub: 'Prepare content and collect approval. Live publishing is disabled.',
    platform: 'Platform', body: 'Post content', createDraft: 'Save publishing draft',
    requestApproval: 'Request approval', publishBlocked: 'Publishing connector is not configured. No posts can be sent.',
    financeTitle: 'Revenue ledger', financeSub: 'Only records you enter or a verified provider reconciles are counted.',
    entryType: 'Entry type', income: 'Income', expense: 'Expense', refund: 'Refund',
    amount: 'Amount', currency: 'Currency', status: 'Status', evidence: 'Evidence / reference',
    evidenceHint: 'Required when marking a record as confirmed',
    addEntry: 'Add record', pending: 'Pending', confirmed: 'Confirmed', estimated: 'Estimated',
    refunded: 'Refunded', voided: 'Voided', totalConfirmed: 'Confirmed net total',
    noVerifiedTotal: 'No confirmed records to total yet.', recorded: 'Record saved.',
    source: 'Source', manual: 'Manual entry', scene: 'Scene', project: 'Project',
    choosePlatform: 'Choose platform', instagram: 'Instagram', facebook: 'Facebook',
    xPlatform: 'X', tiktok: 'TikTok', youtube: 'YouTube', other: 'Other',
    save: 'Save', cancel: 'Cancel', loading: 'Loading workspace…', loginTitle: 'Owner access',
    loginSub: 'Sign in with the verified APEX owner account.', email: 'Email address',
    password: 'Password', sendCode: 'Email code', verifyCode: 'Verify code',
    enterCode: '6-digit email code', signIn: 'Sign in', requestCode: 'Send sign-in code',
    codeSent: 'If this email is eligible, a sign-in code has been sent.',
    authError: 'Owner access could not be verified. Check your sign-in details.',
    authRequired: 'This workspace is private. Verify the APEX owner session to continue.',
    genericError: 'The request could not be completed. Refresh and try again.',
    saved: 'Saved', noProjects: 'No video projects yet.', noDrafts: 'No publishing drafts yet.',
    noEntries: 'No finance records yet.', noOpsSelected: 'Create or select an operation first.',
    actionUnavailable: 'This capability is not enabled in the current zero-budget setup.',
    ready: 'Ready', review: 'In review', noExternal: 'No external action has been performed.',
    recordedDraft: 'Saved as draft', unknown: 'Unknown',
  },
  ar: {
    eyebrow: 'مركز تحكم خاص بالمالك', title: 'APEX FLOW ENGINE',
    subtitle: 'مركز واحد لإدارة الطلبات والإنتاج والمراجعة.',
    overview: 'نظرة عامة', chat: 'محادثة الأوامر', operations: 'العمليات', video: 'استوديو الفيديو',
    approvals: 'الموافقات', publishing: 'النشر', finance: 'الإيرادات',
    refresh: 'تحديث البيانات', signOut: 'تسجيل الخروج', owner: 'تم تأكيد المالك',
    online: 'متصل بمساحة العمل', noData: 'لا توجد سجلات بعد',
    overviewTitle: 'حالة مساحة العمل', overviewSub: 'بيانات حقيقية من مساحة APEX الخاصة.',
    requests: 'الطلبات', activeOps: 'العمليات النشطة', reviewQueue: 'بانتظار المراجعة',
    videoProjects: 'مشروعات الفيديو', publishingDrafts: 'مسودات النشر',
    verifiedFinance: 'السجلات المالية', financeEmpty: 'لم تتم إضافة سجلات مالية بعد.',
    notConfigured: 'غير مهيأ', manualOnly: 'سير عمل يدوي فقط',
    chatTitle: 'ما المهمة التي تريد تنفيذها؟', chatSub: 'اكتب طلبك وسيتم حفظه كعملية مسودة للمراجعة.',
    chatPlaceholder: 'اكتب طلبك هنا…',
    sendRequest: 'تسجيل الطلب', draftCreated: 'تم حفظ الطلب كمسودة. لم يتم تشغيل AI أو أي إجراء خارجي.',
    requestSaved: 'تم تسجيل الطلب', draft: 'مسودة', queued: 'في الانتظار', running: 'جارٍ التنفيذ',
    waitingApproval: 'بانتظار الموافقة', succeeded: 'مكتمل', failed: 'فشل',
    cancelled: 'ملغي', progress: 'التقدم', operation: 'العملية',
    operationsTitle: 'سجل العمليات', operationsSub: 'قائمة قابلة للتتبع لكل الطلبات وحالتها الحالية.',
    noOperations: 'ستظهر أول عملية هنا بعد تسجيل طلب جديد.',
    videoTitle: 'استوديو الفيديو', videoSub: 'خطط للمشروعات والمشاهد. توليد الفيديو غير متصل.',
    chooseOperation: 'اختر عملية', projectTitle: 'اسم المشروع', projectBrief: 'الفكرة الإبداعية',
    createProject: 'إنشاء مشروع فيديو', selectProject: 'اختر مشروعًا', createScene: 'إضافة مشهد',
    sceneTitle: 'عنوان المشهد', sceneBrief: 'هدف المشهد', script: 'النص / التعليق الصوتي',
    visualDirection: 'الاتجاه البصري', saveScene: 'حفظ المشهد', noScenes: 'لا توجد مشاهد في هذا المشروع بعد.',
    requestSceneApproval: 'طلب اعتماد المشهد', revision: 'المراجعة', planned: 'مخطط',
    drafting: 'قيد الإعداد', readyReview: 'جاهز للمراجعة', approved: 'معتمد',
    approvalsTitle: 'قائمة الموافقات', approvalsSub: 'كل موافقة مرتبطة بنسخة محددة وهدف محدد.',
    noApprovals: 'لا توجد موافقات معلقة.', approve: 'اعتماد', reject: 'رفض',
    target: 'الهدف', contentRevision: 'رقم المراجعة', noApprovalHistory: 'لا توجد موافقات بعد.',
    publishingTitle: 'مسودات النشر', publishingSub: 'جهّز المحتوى واطلب اعتماده. النشر المباشر متوقف.',
    platform: 'المنصة', body: 'محتوى المنشور', createDraft: 'حفظ مسودة النشر',
    requestApproval: 'طلب الموافقة', publishBlocked: 'تكامل النشر غير مهيأ. لا يمكن إرسال منشورات.',
    financeTitle: 'السجل المالي', financeSub: 'تُحسب فقط السجلات التي تدخلها أو يؤكدها مزود موثوق.',
    entryType: 'نوع العملية', income: 'إيراد', expense: 'مصروف', refund: 'استرداد',
    amount: 'المبلغ', currency: 'العملة', status: 'الحالة', evidence: 'مستند / مرجع',
    evidenceHint: 'مطلوب عند تسجيل السجل كمؤكد',
    addEntry: 'إضافة سجل', pending: 'معلق', confirmed: 'مؤكد', estimated: 'تقديري',
    refunded: 'مسترد', voided: 'ملغي', totalConfirmed: 'صافي الإجمالي المؤكد',
    noVerifiedTotal: 'لا توجد سجلات مؤكدة لحساب الإجمالي.',
    recorded: 'تم حفظ السجل.', source: 'المصدر', manual: 'إدخال يدوي',
    scene: 'مشهد', project: 'مشروع', choosePlatform: 'اختر المنصة', instagram: 'إنستجرام',
    facebook: 'فيسبوك', xPlatform: 'X', tiktok: 'تيك توك', youtube: 'يوتيوب', other: 'أخرى',
    save: 'حفظ', cancel: 'إلغاء', loading: 'جارٍ تحميل مساحة العمل…', loginTitle: 'دخول المالك',
    loginSub: 'سجل الدخول بحساب مالك APEX المعتمد.', email: 'البريد الإلكتروني',
    password: 'كلمة المرور', sendCode: 'رمز البريد', verifyCode: 'تأكيد الرمز',
    enterCode: 'رمز البريد المكون من 6 أرقام', signIn: 'تسجيل الدخول',
    requestCode: 'إرسال رمز الدخول',
    codeSent: 'لو كان البريد مؤهلًا، تم إرسال رمز تسجيل الدخول.',
    authError: 'تعذر تأكيد صلاحية المالك. راجع بيانات تسجيل الدخول.',
    authRequired: 'هذه المساحة خاصة. أكد جلسة مالك APEX للمتابعة.',
    genericError: 'تعذر إكمال الطلب. حدّث الصفحة وحاول مجددًا.',
    saved: 'تم الحفظ', noProjects: 'لا توجد مشروعات فيديو بعد.',
    noDrafts: 'لا توجد مسودات نشر بعد.', noEntries: 'لا توجد سجلات مالية بعد.',
    noOpsSelected: 'سجل عملية أو اختر عملية أولًا.',
    actionUnavailable: 'هذه الإمكانية غير مفعلة في إعداد الميزانية الصفرية الحالي.',
    ready: 'جاهز', review: 'قيد المراجعة', noExternal: 'لم يتم تنفيذ أي إجراء خارجي.',
    recordedDraft: 'تم الحفظ كمسودة', unknown: 'غير معروف',
  },
} as const;

const statusTone: Record<string, string> = {
  draft: 'muted', queued: 'blue', running: 'blue', waiting_approval: 'gold',
  succeeded: 'green', failed: 'red', cancelled: 'muted', pending: 'gold',
  confirmed: 'green', estimated: 'blue', refunded: 'blue', voided: 'muted',
  approved: 'green', rejected: 'red', revoked: 'muted',
  planned: 'muted', drafting: 'blue', ready_for_review: 'gold',
  completed: 'green', not_configured: 'muted', awaiting_approval: 'gold',
};

function errorMessage(error: unknown, locale: Locale): string {
  if (error instanceof FlowApiClientError) return error.message;
  return copy[locale].genericError;
}

function Status({ value, locale }: { value: string; locale: Locale }) {
  const label = copy[locale][value as keyof typeof copy.en] ?? value.replaceAll('_', ' ');
  return <span className={`flow-status ${statusTone[value] ?? 'muted'}`}>{label}</span>;
}

function OwnerGate({ locale, setLocale }: { locale: Locale; setLocale: (value: Locale) => void }) {
  const t = copy[locale];
  const [checking, setChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [otpMode, setOtpMode] = useState(false);
  const [otpRequested, setOtpRequested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const verifyOwner = useCallback(async (recordLogin = false) => {
    const { data: userData, error: userError } = await adminSupabase.auth.getUser();
    if (userError || !userData.user?.email_confirmed_at) throw new Error('unauthorized');
    const { data, error: claimError } = await adminSupabase.functions.invoke('apex-owner-bootstrap', {
      body: { action: recordLogin ? 'login' : 'verify' },
    });
    if (claimError || data?.configured !== true) throw new Error('unauthorized');
    setUserId(userData.user.id);
  }, []);

  useEffect(() => {
    let active = true;
    const initial = async () => {
      try {
        const { data } = await adminSupabase.auth.getSession();
        if (data.session) await verifyOwner(false);
      } catch {
        if (active) setError(t.authError);
      } finally {
        if (active) setChecking(false);
      }
    };
    void initial();
    const { data } = adminSupabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setUserId(null);
        setChecking(false);
        return;
      }
      queueMicrotask(() => {
        if (active) void verifyOwner(false).catch(() => {
          if (active) setUserId(null);
        });
      });
    });
    return () => {
      active = false;
      data.subscription.unsubscribe();
    };
  }, [verifyOwner, t.authError]);

  const signIn = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const cleanEmail = email.trim();
      if (otpMode && !otpRequested) {
        await adminSupabase.auth.signInWithOtp({
          email: cleanEmail,
          options: { shouldCreateUser: false },
        });
        setOtpRequested(true);
        setNotice(t.codeSent);
      } else if (otpMode) {
        const result = await adminSupabase.auth.verifyOtp({
          email: cleanEmail,
          token: otp.trim(),
          type: 'email',
        });
        if (result.error || !result.data.session) throw new Error('unauthorized');
        await verifyOwner(true);
        setNotice(t.owner);
      } else {
        const result = await adminSupabase.auth.signInWithPassword({
          email: cleanEmail,
          password,
        });
        if (result.error || !result.data.session) throw new Error('unauthorized');
        await verifyOwner(true);
        setNotice(t.owner);
      }
    } catch {
      setError(t.authError);
      setUserId(null);
    } finally {
      setBusy(false);
      setChecking(false);
    }
  };

  const signOut = async () => {
    await adminSupabase.auth.signOut();
    setUserId(null);
    setPassword('');
    setOtp('');
    setOtpRequested(false);
  };

  if (checking) return <div className="flow-gate"><div className="flow-loader" /><span>{t.loading}</span></div>;
  if (userId) return <FlowWorkspace userId={userId} locale={locale} setLocale={setLocale} onSignOut={signOut} />;

  return <main className="flow-login" dir={locale === 'ar' ? 'rtl' : 'ltr'}>
    <div className="flow-login-card">
      <div className="flow-brand-mark">A</div>
      <span className="flow-eyebrow">{t.eyebrow}</span>
      <h1>{t.title}</h1>
      <h2>{t.loginTitle}</h2>
      <p>{t.loginSub}</p>
      <form onSubmit={signIn}>
        <label>{t.email}<input type="email" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" /></label>
        {otpMode ? otpRequested && <label>{t.enterCode}<input value={otp} onChange={e => setOtp(e.target.value)} inputMode="numeric" maxLength={6} required /></label> :
          <label>{t.password}<input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" /></label>}
        {error && <div className="flow-alert error"><AlertCircle size={16}/>{error}</div>}
        {notice && <div className="flow-alert success"><CheckCircle2 size={16}/>{notice}</div>}
        <button className="flow-button primary full" disabled={busy}>
          {busy ? <span className="flow-spinner" /> : <LockKeyhole size={17}/>}
          {busy ? t.loading : otpMode ? otpRequested ? t.verifyCode : t.requestCode : t.signIn}
        </button>
      </form>
      <button className="flow-link-button" onClick={() => { setOtpMode(!otpMode); setOtpRequested(false); setError(''); setNotice(''); }}>
        {otpMode ? t.signIn : t.sendCode}
      </button>
      <button className="flow-language" onClick={() => setLocale(locale === 'ar' ? 'en' : 'ar')}><Globe2 size={15}/>{locale === 'ar' ? 'English' : 'العربية'}</button>
    </div>
  </main>;
}

function FlowWorkspace({
  userId, locale, setLocale, onSignOut,
}: {
  userId: string; locale: Locale; setLocale: (value: Locale) => void; onSignOut: () => void;
}) {
  const t = copy[locale];
  const rtl = locale === 'ar';
  const client = useMemo(() => new FlowEngineClient({
    invoke: (name, options) => adminSupabase.functions.invoke(name, options),
  }), []);
  const [section, setSection] = useState<Section>('overview');
  const [operations, setOperations] = useState<FlowOperation[]>([]);
  const [projects, setProjects] = useState<FlowVideoProject[]>([]);
  const [scenes, setScenes] = useState<FlowScene[]>([]);
  const [approvals, setApprovals] = useState<FlowApproval[]>([]);
  const [drafts, setDrafts] = useState<FlowPublishingDraft[]>([]);
  const [entries, setEntries] = useState<FlowFinancialEntry[]>([]);
  const [selectedOperation, setSelectedOperation] = useState('');
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedScene, setSelectedScene] = useState('');
  const [prompt, setPrompt] = useState('');
  const [projectTitle, setProjectTitle] = useState('');
  const [projectBrief, setProjectBrief] = useState('');
  const [sceneTitle, setSceneTitle] = useState('');
  const [sceneBrief, setSceneBrief] = useState('');
  const [sceneScript, setSceneScript] = useState('');
  const [sceneVisual, setSceneVisual] = useState('');
  const [sceneEdit, setSceneEdit] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftBody, setDraftBody] = useState('');
  const [draftPlatform, setDraftPlatform] = useState<FlowPublishingDraft['platform']>('instagram');
  const [financeType, setFinanceType] = useState<FlowFinancialEntry['entryType']>('income');
  const [financeAmount, setFinanceAmount] = useState('');
  const [financeCurrency, setFinanceCurrency] = useState('EGP');
  const [financeStatus, setFinanceStatus] = useState<FlowFinancialEntry['status']>('pending');
  const [financeEvidence, setFinanceEvidence] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [mobileNav, setMobileNav] = useState(false);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ops, videoProjects, approvalRows, publishingRows, financeRows] = await Promise.all([
        client.listOperations(),
        client.listProjects(),
        client.listApprovals(),
        client.listPublishingDrafts(),
        client.listFinancialEntries(),
      ]);
      setOperations(ops);
      setProjects(videoProjects);
      setApprovals(approvalRows);
      setDrafts(publishingRows);
      setEntries(financeRows);
      if (!selectedOperation && ops[0]) setSelectedOperation(ops[0].id);
      if (!selectedProject && videoProjects[0]) setSelectedProject(videoProjects[0].id);
    } catch (caught) {
      setError(errorMessage(caught, locale));
    } finally {
      setLoading(false);
    }
  }, [client, locale, selectedOperation, selectedProject]);

  const loadScenes = useCallback(async (projectId: string) => {
    if (!projectId) { setScenes([]); return; }
    try {
      const rows = await client.listScenes(projectId);
      setScenes(rows);
      setSelectedScene(current => rows.some(row => row.id === current) ? current : '');
    } catch (caught) {
      setError(errorMessage(caught, locale));
    }
  }, [client, locale]);

  useEffect(() => { void refreshAll(); }, [refreshAll]);
  useEffect(() => { void loadScenes(selectedProject); }, [selectedProject, loadScenes]);

  const runBusy = async (action: () => Promise<unknown>, successMessage?: string) => {
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      if (successMessage) setNotice(successMessage);
      await refreshAll();
      if (selectedProject) await loadScenes(selectedProject);
    } catch (caught) {
      setError(errorMessage(caught, locale));
    } finally {
      setBusy(false);
    }
  };

  const submitRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    const clean = prompt.trim();
    if (!clean || busy) return;
    await runBusy(async () => {
      const result = await client.createRequest({
        prompt: clean,
        locale,
        idempotencyKey: crypto.randomUUID(),
      });
      setSelectedOperation(result.operation.id);
      setPrompt('');
    }, t.draftCreated);
  };

  const createProject = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedOperation) { setError(t.noOpsSelected); return; }
    await runBusy(async () => {
      const project = await client.createProject({
        operationId: selectedOperation,
        title: projectTitle.trim(),
        brief: projectBrief.trim(),
      });
      setSelectedProject(project.id);
      setProjectTitle('');
      setProjectBrief('');
    }, t.saved);
  };

  const createScene = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedProject) return;
    await runBusy(async () => {
      await client.createScene({
        projectId: selectedProject,
        title: sceneTitle.trim(),
        brief: sceneBrief.trim(),
        script: sceneScript,
        visualDirection: sceneVisual,
        sortOrder: scenes.length,
      });
      setSceneTitle('');
      setSceneBrief('');
      setSceneScript('');
      setSceneVisual('');
    }, t.saved);
  };

  const loadSceneForEdit = (scene: FlowScene) => {
    setSelectedScene(scene.id);
    setSceneTitle(scene.title);
    setSceneBrief(scene.brief);
    setSceneScript(scene.script);
    setSceneVisual(scene.visualDirection);
    setSceneEdit(true);
  };

  const saveScene = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedScene) return;
    await runBusy(async () => {
      await client.updateScene({
        sceneId: selectedScene,
        title: sceneTitle,
        brief: sceneBrief,
        script: sceneScript,
        visualDirection: sceneVisual,
      });
      setSceneEdit(false);
    }, t.saved);
  };

  const requestSceneApproval = async (scene: FlowScene) => {
    const project = projects.find(row => row.id === scene.projectId);
    if (!project?.operationId) return;
    await runBusy(() => client.requestApproval({
      operationId: project.operationId!,
      targetType: 'scene',
      targetId: scene.id,
      action: 'approve_scene',
    }), t.saved);
  };

  const createPublishingDraft = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedOperation) { setError(t.noOpsSelected); return; }
    await runBusy(async () => {
      await client.createPublishingDraft({
        operationId: selectedOperation,
        platform: draftPlatform,
        title: draftTitle,
        body: draftBody,
      });
      setDraftTitle('');
      setDraftBody('');
    }, t.saved);
  };

  const requestDraftApproval = async (draft: FlowPublishingDraft) => {
    await runBusy(() => client.requestApproval({
      operationId: draft.operationId,
      targetType: 'publishing_draft',
      targetId: draft.id,
      action: 'publish',
    }), t.saved);
  };

  const decideApproval = async (approvalId: string, decision: 'approved' | 'rejected') => {
    await runBusy(() => client.decideApproval({ approvalId, decision }), t.saved);
  };

  const addFinanceEntry = async (event: React.FormEvent) => {
    event.preventDefault();
    const amount = Number(financeAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError(t.genericError);
      return;
    }
    await runBusy(async () => {
      await client.createFinancialEntry({
        entryType: financeType,
        amountMinor: Math.round(amount * 100),
        currency: financeCurrency.toUpperCase(),
        source: 'manual',
        status: financeStatus,
        evidenceReference: financeEvidence.trim() || undefined,
      });
      setFinanceAmount('');
      setFinanceEvidence('');
    }, t.recorded);
  };

  const nav: Array<{ id: Section; label: string; icon: React.ElementType }> = [
    { id: 'overview', label: t.overview, icon: LayoutDashboard },
    { id: 'chat', label: t.chat, icon: MessageSquare },
    { id: 'operations', label: t.operations, icon: Activity },
    { id: 'video', label: t.video, icon: Clapperboard },
    { id: 'approvals', label: t.approvals, icon: ShieldCheck },
    { id: 'publishing', label: t.publishing, icon: Megaphone },
    { id: 'finance', label: t.finance, icon: Wallet },
  ];

  const pendingApprovals = approvals.filter(row => row.decision === 'pending');
  const activeOperations = operations.filter(row => ['queued', 'running', 'waiting_approval'].includes(row.status));
  const confirmedEntries = entries.filter(row => row.status === 'confirmed');
  const currencyTotals = confirmedEntries.reduce<Record<string, number>>((totals, row) => {
    const amount = row.amountMinor / 100;
    const signed = row.entryType === 'expense' || row.entryType === 'refund' ? -amount : amount;
    totals[row.currency] = (totals[row.currency] ?? 0) + signed;
    return totals;
  }, {});

  const sectionHeader = (title: string, subtitle: string) => <div className="flow-section-head">
    <div><span className="flow-eyebrow">{t.eyebrow}</span><h2>{title}</h2><p>{subtitle}</p></div>
    <button className="flow-button subtle" onClick={() => void refreshAll()} disabled={loading}><RefreshCw size={15}/>{t.refresh}</button>
  </div>;

  const renderOverview = () => <>
    {sectionHeader(t.overviewTitle, t.overviewSub)}
    <div className="flow-metrics">
      <Metric icon={<MessageSquare/>} label={t.requests} value={operations.length} />
      <Metric icon={<Activity/>} label={t.activeOps} value={activeOperations.length} />
      <Metric icon={<ShieldCheck/>} label={t.reviewQueue} value={pendingApprovals.length} />
      <Metric icon={<FileVideo2/>} label={t.videoProjects} value={projects.length} />
      <Metric icon={<Megaphone/>} label={t.publishingDrafts} value={drafts.length} />
    </div>
    <div className="flow-grid two">
      <section className="flow-panel">
        <PanelTitle title={t.operationsTitle} icon={<Activity/>}/>
        {operations.length === 0 ? <Empty>{t.noOperations}</Empty> : operations.slice(0, 5).map(row =>
          <button className="flow-list-row" key={row.id} onClick={() => { setSelectedOperation(row.id); setSection('operations'); }}>
            <span><b>{row.title}</b><small>{new Date(row.createdAt).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en')}</small></span>
            <Status value={row.status} locale={locale}/>
          </button>)}
      </section>
      <section className="flow-panel">
        <PanelTitle title={t.verifiedFinance} icon={<Wallet/>}/>
        {Object.keys(currencyTotals).length === 0 ? <Empty>{t.financeEmpty}</Empty> :
          Object.entries(currencyTotals).map(([currency, amount]) =>
            <div className="flow-total-row" key={currency}><span>{currency}</span><strong>{amount.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en', { maximumFractionDigits: 2 })}</strong></div>)}
        <small className="flow-muted">{t.noExternal}</small>
      </section>
    </div>
  </>;

  const renderChat = () => <>
    {sectionHeader(t.chatTitle, t.chatSub)}
    <section className="flow-chat-panel">
      <div className="flow-chat-notice"><BadgeCheck size={18}/><span>{t.draftCreated}</span></div>
      <div className="flow-chat-intro"><div className="flow-ai-mark">A</div><div><b>APEX COMMAND</b><p>{t.chatSub}</p></div></div>
      <form onSubmit={submitRequest} className="flow-chat-form">
        <textarea value={prompt} onChange={event => setPrompt(event.target.value)} placeholder={t.chatPlaceholder} rows={5} maxLength={8000} required />
        <div className="flow-form-bottom"><small>{prompt.length}/8000</small><button className="flow-button primary" disabled={busy || !prompt.trim()}><Send size={16}/>{t.sendRequest}</button></div>
      </form>
      {operations.length > 0 && <div className="flow-chat-history">
        {operations.slice(0, 6).map(row => <div className="flow-chat-item" key={row.id}>
          <div className="flow-user-bubble">{row.title}</div>
          <div className="flow-assistant-bubble"><span className="flow-mini-mark">A</span><span>{t.requestSaved}: <b>{row.title}</b><small>{t.recordedDraft} · {t.noExternal}</small></span><Status value={row.status} locale={locale}/></div>
        </div>)}
      </div>}
    </section>
  </>;

  const renderOperations = () => <>
    {sectionHeader(t.operationsTitle, t.operationsSub)}
    <div className="flow-operation-list">
      {operations.length === 0 ? <Empty>{t.noOperations}</Empty> : operations.map(row =>
        <button key={row.id} className={`flow-operation-card ${selectedOperation === row.id ? 'selected' : ''}`}
          onClick={() => setSelectedOperation(row.id)}>
          <div className="flow-operation-top"><span className="flow-operation-icon"><Activity size={18}/></span><Status value={row.status} locale={locale}/></div>
          <h3>{row.title}</h3><p>{row.summary}</p>
          <div className="flow-progress"><span style={{ width: `${row.progress}%` }}/></div>
          <small>{t.progress}: {row.progress}% · {new Date(row.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en')}</small>
        </button>)}
    </div>
  </>;

  const renderVideo = () => <>
    {sectionHeader(t.videoTitle, t.videoSub)}
    <div className="flow-not-configured"><Clapperboard size={19}/><span>{t.notConfigured}: Video generation provider</span><small>{t.actionUnavailable}</small></div>
    <div className="flow-grid two">
      <section className="flow-panel">
        <PanelTitle title={t.project} icon={<FileVideo2/>}/>
        <form className="flow-form" onSubmit={createProject}>
          <label>{t.chooseOperation}<select value={selectedOperation} onChange={e => setSelectedOperation(e.target.value)} required>
            <option value="">{t.chooseOperation}</option>{operations.map(row => <option key={row.id} value={row.id}>{row.title}</option>)}
          </select></label>
          <label>{t.projectTitle}<input value={projectTitle} onChange={e => setProjectTitle(e.target.value)} maxLength={160} required/></label>
          <label>{t.projectBrief}<textarea value={projectBrief} onChange={e => setProjectBrief(e.target.value)} rows={3} maxLength={8000}/></label>
          <button className="flow-button primary" disabled={busy || !operations.length}><Plus size={16}/>{t.createProject}</button>
        </form>
        <div className="flow-list-stack">{projects.map(project => <button key={project.id} className={`flow-list-row ${selectedProject === project.id ? 'active' : ''}`} onClick={() => setSelectedProject(project.id)}>
          <span><b>{project.title}</b><small>{project.status}</small></span><ArrowUpRight size={15}/>
        </button>)}{projects.length === 0 && <Empty>{t.noProjects}</Empty>}</div>
      </section>
      <section className="flow-panel">
        <PanelTitle title={t.scene} icon={<Clapperboard/>}/>
        {selectedProject ? <>
          <form className="flow-form" onSubmit={sceneEdit ? saveScene : createScene}>
            <label>{t.sceneTitle}<input value={sceneTitle} onChange={e => setSceneTitle(e.target.value)} maxLength={160} required/></label>
            <label>{t.sceneBrief}<textarea value={sceneBrief} onChange={e => setSceneBrief(e.target.value)} rows={2} maxLength={4000}/></label>
            <label>{t.script}<textarea value={sceneScript} onChange={e => setSceneScript(e.target.value)} rows={3} maxLength={12000}/></label>
            <label>{t.visualDirection}<textarea value={sceneVisual} onChange={e => setSceneVisual(e.target.value)} rows={2} maxLength={4000}/></label>
            <div className="flow-inline-actions"><button className="flow-button primary" disabled={busy}>{sceneEdit ? t.saveScene : t.createScene}</button>
              {sceneEdit && <button type="button" className="flow-button subtle" onClick={() => {setSceneEdit(false);setSelectedScene('');setSceneTitle('');setSceneBrief('');setSceneScript('');setSceneVisual('');}}>{t.cancel}</button>}
            </div>
          </form>
          <div className="flow-scene-list">{scenes.map(scene => <div className="flow-scene-item" key={scene.id}>
            <button className="flow-scene-main" onClick={() => loadSceneForEdit(scene)}>
              <span className="flow-scene-number">{String(scene.sortOrder + 1).padStart(2, '0')}</span>
              <span><b>{scene.title}</b><small>{t.revision} {scene.revision}</small></span>
              <Status value={scene.status} locale={locale}/>
            </button>
            <button className="flow-link-button" onClick={() => void requestSceneApproval(scene)} disabled={busy || scene.status === 'approved'}>{t.requestSceneApproval}</button>
          </div>)}{scenes.length === 0 && <Empty>{t.noScenes}</Empty>}</div>
        </> : <Empty>{t.noProjects}</Empty>}
      </section>
    </div>
  </>;

  const renderApprovals = () => <>
    {sectionHeader(t.approvalsTitle, t.approvalsSub)}
    <div className="flow-approval-list">{approvals.length === 0 ? <Empty>{t.noApprovalHistory}</Empty> :
      approvals.map(approval => <div className="flow-approval-card" key={approval.id}>
        <div className="flow-approval-head"><span className="flow-approval-icon"><ShieldCheck/></span><Status value={approval.decision} locale={locale}/></div>
        <h3>{approval.action.replaceAll('_', ' ')}</h3>
        <div className="flow-detail-grid"><span>{t.target}</span><b>{approval.target}</b><span>{t.contentRevision}</span><b>#{approval.contentRevision}</b><span>SHA-256</span><code>{approval.contentHash.slice(0, 16)}…</code></div>
        {approval.decision === 'pending' && <div className="flow-inline-actions"><button className="flow-button primary" onClick={() => void decideApproval(approval.id, 'approved')} disabled={busy}><Check size={15}/>{t.approve}</button><button className="flow-button danger" onClick={() => void decideApproval(approval.id, 'rejected')} disabled={busy}><X size={15}/>{t.reject}</button></div>}
      </div>)}</div>
  </>;

  const renderPublishing = () => <>
    {sectionHeader(t.publishingTitle, t.publishingSub)}
    <div className="flow-not-configured"><Megaphone size={19}/><span>{t.publishBlocked}</span><small>{t.actionUnavailable}</small></div>
    <div className="flow-grid two">
      <section className="flow-panel"><PanelTitle title={t.createDraft} icon={<MessageSquare/>}/>
        <form className="flow-form" onSubmit={createPublishingDraft}>
          <label>{t.chooseOperation}<select value={selectedOperation} onChange={e => setSelectedOperation(e.target.value)} required>
            <option value="">{t.chooseOperation}</option>{operations.map(row => <option key={row.id} value={row.id}>{row.title}</option>)}
          </select></label>
          <label>{t.platform}<select value={draftPlatform} onChange={e => setDraftPlatform(e.target.value as FlowPublishingDraft['platform'])}>
            {(['instagram','facebook','x','tiktok','youtube','other'] as const).map(value => <option key={value} value={value}>{t[value === 'x' ? 'xPlatform' : value]}</option>)}
          </select></label>
          <label>{t.projectTitle}<input value={draftTitle} onChange={e => setDraftTitle(e.target.value)} maxLength={300}/></label>
          <label>{t.body}<textarea value={draftBody} onChange={e => setDraftBody(e.target.value)} rows={5} maxLength={12000} required/></label>
          <button className="flow-button primary" disabled={busy || !operations.length}><Plus size={16}/>{t.createDraft}</button>
        </form>
      </section>
      <section className="flow-panel"><PanelTitle title={t.publishingDrafts} icon={<Megaphone/>}/>
        <div className="flow-list-stack">{drafts.map(draft => <div className="flow-draft-card" key={draft.id}>
          <div className="flow-row-between"><b>{draft.title || draft.platform}</b><Status value={draft.status} locale={locale}/></div>
          <small>{draft.platform} · {t.revision} {draft.revision}</small>
          <p>{draft.body}</p>
          <code>{draft.contentHash.slice(0, 16)}…</code>
          {draft.status === 'draft' && <button className="flow-link-button" onClick={() => void requestDraftApproval(draft)} disabled={busy}>{t.requestApproval}</button>}
        </div>)}{drafts.length === 0 && <Empty>{t.noDrafts}</Empty>}</div>
      </section>
    </div>
  </>;

  const renderFinance = () => <>
    {sectionHeader(t.financeTitle, t.financeSub)}
    <div className="flow-finance-overview">
      {Object.keys(currencyTotals).length === 0 ? <div className="flow-panel"><span>{t.totalConfirmed}</span><b>{t.noVerifiedTotal}</b></div> :
        Object.entries(currencyTotals).map(([currency, amount]) => <div className="flow-panel" key={currency}><span>{t.totalConfirmed} · {currency}</span><b>{amount.toLocaleString(locale === 'ar' ? 'ar-EG' : 'en', {maximumFractionDigits:2})} {currency}</b></div>)}
    </div>
    <div className="flow-grid two">
      <section className="flow-panel"><PanelTitle title={t.addEntry} icon={<Wallet/>}/>
        <form className="flow-form" onSubmit={addFinanceEntry}>
          <label>{t.entryType}<select value={financeType} onChange={e => setFinanceType(e.target.value as FlowFinancialEntry['entryType'])}>
            <option value="income">{t.income}</option><option value="expense">{t.expense}</option><option value="refund">{t.refund}</option>
          </select></label>
          <div className="flow-form-row"><label>{t.amount}<input type="number" min="0.01" step="0.01" value={financeAmount} onChange={e => setFinanceAmount(e.target.value)} required/></label>
            <label>{t.currency}<input value={financeCurrency} onChange={e => setFinanceCurrency(e.target.value.toUpperCase().slice(0,3))} maxLength={3} required/></label></div>
          <label>{t.status}<select value={financeStatus} onChange={e => setFinanceStatus(e.target.value as FlowFinancialEntry['status'])}>
            <option value="pending">{t.pending}</option><option value="confirmed">{t.confirmed}</option><option value="estimated">{t.estimated}</option><option value="refunded">{t.refunded}</option><option value="voided">{t.voided}</option>
          </select></label>
          <label>{t.evidence}<input value={financeEvidence} onChange={e => setFinanceEvidence(e.target.value)} placeholder={financeStatus === 'confirmed' ? t.evidenceHint : ''}/></label>
          {financeStatus === 'confirmed' && <small className="flow-muted">{t.evidenceHint}</small>}
          <button className="flow-button primary" disabled={busy}><Plus size={16}/>{t.addEntry}</button>
        </form>
      </section>
      <section className="flow-panel"><PanelTitle title={t.verifiedFinance} icon={<Wallet/>}/>
        <div className="flow-list-stack">{entries.map(entry => <div className="flow-list-row" key={entry.id}>
          <span><b>{t[entry.entryType]}</b><small>{entry.source} · {entry.currency} · {new Date(entry.createdAt).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en')}</small></span>
          <span className="flow-money-value">{(entry.amountMinor / 100).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en', {maximumFractionDigits:2})} {entry.currency}</span>
          <Status value={entry.status} locale={locale}/>
        </div>)}{entries.length === 0 && <Empty>{t.noEntries}</Empty>}</div>
      </section>
    </div>
  </>;

  const body = section === 'overview' ? renderOverview()
    : section === 'chat' ? renderChat()
    : section === 'operations' ? renderOperations()
    : section === 'video' ? renderVideo()
    : section === 'approvals' ? renderApprovals()
    : section === 'publishing' ? renderPublishing()
    : renderFinance();

  return <div className="flow-app" dir={rtl ? 'rtl' : 'ltr'}>
    <aside className={`flow-sidebar ${mobileNav ? 'open' : ''}`}>
      <div className="flow-brand"><div className="flow-brand-mark">A</div><span><b>APEX</b><small>FLOW ENGINE</small></span></div>
      <div className="flow-side-label">{t.eyebrow}</div>
      <nav>{nav.map(item => {
        const Icon = item.icon;
        return <button key={item.id} className={section === item.id ? 'active' : ''} onClick={() => {setSection(item.id);setMobileNav(false);}}>
          <Icon size={17}/><span>{item.label}</span>{item.id === 'approvals' && pendingApprovals.length > 0 && <em>{pendingApprovals.length}</em>}
        </button>;
      })}</nav>
      <div className="flow-sidebar-bottom">
        <div className="flow-owner"><span className="flow-owner-dot"/><span><b>{t.owner}</b><small>{userId.slice(0, 8)}…</small></span></div>
        <button className="flow-sidebar-action" onClick={onSignOut}><LogOut size={15}/>{t.signOut}</button>
      </div>
    </aside>
    <main className="flow-main">
      <header className="flow-topbar">
        <button className="flow-mobile-menu" onClick={() => setMobileNav(!mobileNav)}><ChevronDown size={18}/></button>
        <div><span className="flow-top-eyebrow">{t.eyebrow}</span><h1>{t.title}</h1></div>
        <div className="flow-top-actions">
          <span className="flow-connection"><span/> {t.online}</span>
          <button className="flow-icon-button" title={locale === 'ar' ? 'English' : 'العربية'} onClick={() => setLocale(rtl ? 'en' : 'ar')}><Globe2 size={17}/></button>
          <button className="flow-button subtle" onClick={() => void refreshAll()} disabled={loading}><RefreshCw size={15}/>{t.refresh}</button>
        </div>
      </header>
      <div className="flow-content">
        {error && <div className="flow-alert error"><AlertCircle size={16}/>{error}<button onClick={() => setError('')}><X size={15}/></button></div>}
        {notice && <div className="flow-alert success"><CheckCircle2 size={16}/>{notice}<button onClick={() => setNotice('')}><X size={15}/></button></div>}
        {loading ? <div className="flow-loading"><div className="flow-loader"/>{t.loading}</div> : body}
      </div>
      <footer className="flow-footer"><span>APEX STUDIO · PRIVATE WORKSPACE</span><span>{t.noExternal}</span></footer>
    </main>
  </div>;
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <div className="flow-metric"><span className="flow-metric-icon">{icon}</span><small>{label}</small><strong>{value}</strong></div>;
}
function PanelTitle({ title, icon }: { title: string; icon: React.ReactNode }) {
  return <div className="flow-panel-title"><span>{icon}</span><h3>{title}</h3></div>;
}
function Empty({ children }: { children: React.ReactNode }) {
  return <div className="flow-empty">{children}</div>;
}

export default function App() {
  const [locale, setLocale] = useState<Locale>('ar');
  return <OwnerGate locale={locale} setLocale={setLocale}/>;
}
