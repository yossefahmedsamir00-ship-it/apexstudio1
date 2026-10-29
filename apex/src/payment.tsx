import React, { useCallback, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ArrowUpRight, CheckCircle2, Clock3, ShieldCheck, XCircle } from 'lucide-react';
import './styles.css';
import './payment.css';
import { supabase } from './lib/supabase';
import { APEX_CONTACT } from './contact';

type Invoice = {
  id: string;
  description: string;
  amountMinor: number;
  amountEGP: string;
  currency: string;
  status: string;
  expiresAt: string;
  sessionExpiresAt: string | null;
};

function PaymentPage() {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get('orderId') ?? '';
  const token = params.get('token') ?? '';
  const returningFromProvider = params.get('return') === '1';
  const [locale, setLocale] = useState<'en' | 'ar'>(() => params.get('lang') === 'ar' ? 'ar' : 'en');
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [providerStatus, setProviderStatus] = useState('');

  const ar = locale === 'ar';
  const invoke = useCallback(async (action: 'preview' | 'checkout' | 'status') => {
    const { data, error: functionError } = await supabase.functions.invoke('kashier-payment', {
      body: { action, orderId, token },
    });
    if (functionError) throw new Error(await explainFunctionError(functionError));
    if (data?.error && action !== 'status') throw new Error(String(data.error));
    if (data?.invoice) setInvoice(data.invoice as Invoice);
    if (data?.providerStatus) setProviderStatus(String(data.providerStatus));
    if (data?.error) setError(String(data.error));
    return data as { checkoutUrl?: string; invoice?: Invoice; providerStatus?: string; error?: string };
  }, [orderId, token]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true); setError('');
      if (!orderId || !token) {
        setError('The invoice link is missing required details. Please ask APEX STUDIO to resend it.');
        setLoading(false); return;
      }
      try {
        await invoke('preview');
        if (active && returningFromProvider) await invoke('status');
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Could not open this invoice.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [invoke, orderId, token, returningFromProvider]);

  const startPayment = async () => {
    setPaying(true); setError('');
    try {
      const data = await invoke('checkout');
      if (!data.checkoutUrl) throw new Error(data.error ?? 'Secure checkout could not be started.');
      window.location.assign(data.checkoutUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Secure checkout could not be started.');
    } finally { setPaying(false); }
  };

  const refreshStatus = async () => {
    setRefreshing(true); setError('');
    try { await invoke('status'); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not refresh payment status.'); }
    finally { setRefreshing(false); }
  };

  const amountText = invoice
    ? new Intl.NumberFormat(ar ? 'ar-EG' : 'en-EG', { style: 'currency', currency: 'EGP' }).format(Number(invoice.amountMinor) / 100)
    : '—';
  const paid = invoice?.status === 'paid';
  const refunded = invoice?.status === 'refunded';
  const failed = invoice?.status === 'failed' || invoice?.status === 'cancelled';

  return <main className={ar ? 'paymentPage rtl' : 'paymentPage'} dir={ar ? 'rtl' : 'ltr'}>
    <header className="paymentHeader">
      <a className="paymentBrand" href="./" aria-label="APEX STUDIO home"><span className="paymentMark">A↗</span><span><b>APEX</b><small>STUDIO</small></span></a>
      <button className="paymentLang" onClick={() => setLocale(ar ? 'en' : 'ar')}>{ar ? 'English' : 'العربية'}</button>
    </header>

    <section className="paymentShell">
      <div className="paymentIntroBlock">
        <span className="paymentEyebrow"><ShieldCheck size={15}/>{ar ? 'دفع مستضاف وآمن' : 'HOSTED SECURE CHECKOUT'}</span>
        <h1>{ar ? 'فاتورتك من APEX.' : 'Your APEX invoice.'}</h1>
        <p>{ar ? 'راجع المبلغ والوصف قبل الانتقال إلى صفحة الدفع الآمنة. بيانات بطاقتك لا تمر عبر موقع APEX.' : 'Review the amount and description before continuing to the secure hosted checkout. Your card details never pass through APEX STUDIO.'}</p>
      </div>

      <section className="invoiceCard" aria-live="polite">
        <div className="invoiceCardTop"><span>{ar ? 'تفاصيل الفاتورة' : 'INVOICE DETAILS'}</span><span className={paid ? 'invoiceStatus paid' : failed || refunded ? 'invoiceStatus failed' : 'invoiceStatus'}>{loading ? (ar ? 'جارٍ التحميل' : 'Loading') : paid ? (ar ? 'مدفوع' : 'Paid') : refunded ? (ar ? 'تم رد المبلغ' : 'Refunded') : failed ? (ar ? 'فشل الدفع' : 'Failed') : (ar ? 'بانتظار الدفع' : 'Awaiting payment')}</span></div>
        {loading ? <div className="invoiceLoading"><span className="loadingPulse"/><p>{ar ? 'جارٍ التحقق من الفاتورة…' : 'Checking invoice…'}</p></div> : invoice ? <>
          <div className="invoiceDescription">{invoice.description}</div>
          <div className="invoiceAmount">{amountText}</div>
          <div className="invoiceMeta"><span>{ar ? 'رقم الفاتورة' : 'Invoice reference'}</span><code>{invoice.id.slice(0, 8).toUpperCase()}</code></div>
          <div className="invoiceMeta"><span>{ar ? 'العملة' : 'Currency'}</span><b>EGP · Egyptian Pound</b></div>
          <div className="invoiceMeta"><span>{ar ? 'صلاحية الرابط' : 'Link expiry'}</span><b>{new Date(invoice.expiresAt).toLocaleDateString(ar ? 'ar-EG' : 'en-EG')}</b></div>
          {paid ? <div className="paymentNotice paidNotice"><CheckCircle2 size={20}/><span>{ar ? 'تم تأكيد الدفع من الخادم.' : 'Payment confirmed by the server.'}</span></div>
          : refunded ? <div className="paymentNotice"><CheckCircle2 size={20}/><span>{ar ? 'تم تسجيل رد المبلغ.' : 'The refund is recorded.'}</span></div>
          : failed ? <div className="paymentNotice failedNotice"><XCircle size={20}/><span>{ar ? 'تعذر إتمام الدفع. تواصل مع APEX لإصدار رابط جديد.' : 'The payment did not complete. Contact APEX for a new link.'}</span></div>
          : <div className="paymentNotice"><Clock3 size={20}/><span>{ar ? 'لن يتم اعتبار الفاتورة مدفوعة إلا بعد تأكيد الدفع من مزود الخدمة.' : 'The invoice is marked paid only after the provider confirms the payment server-side.'}</span></div>}
        </> : <div className="invoiceError">{ar ? 'تعذر تحميل بيانات الفاتورة.' : 'Invoice details could not be loaded.'}</div>}
        {invoice && !paid && !refunded && !failed && !loading && <button className="payButton" onClick={() => void startPayment()} disabled={paying}>{paying ? (ar ? 'جارٍ فتح صفحة الدفع…' : 'Opening checkout…') : (ar ? 'انتقل إلى الدفع الآمن' : 'Continue to secure payment')}<ArrowUpRight size={17}/></button>}
        {invoice && !loading && <button className="refreshButton" onClick={() => void refreshStatus()} disabled={refreshing}>{refreshing ? (ar ? 'جارٍ التحديث…' : 'Refreshing…') : (ar ? 'تحديث حالة الدفع' : 'Refresh payment status')}</button>}
        {providerStatus === 'verification_required' && <p className="paymentError">{ar ? 'حالة الدفع تحتاج مراجعة يدوية. لا تكرر الدفع؛ تواصل مع الاستوديو.' : 'Payment status needs manual verification. Do not pay again; contact the studio.'}</p>}
      </section>
      {error && <p role="alert" className="paymentError">{error}</p>}

      <aside className="paymentTrust"><ShieldCheck size={18}/><div><b>{ar ? 'معلومات الدفع محمية' : 'Payment data stays protected'}</b><p>{ar ? 'تتم معالجة البطاقة عبر صفحة Kashier المستضافة. لا تُدخل أرقام بطاقتك في رسالة أو نموذج APEX.' : 'Card payments are handled on the provider-hosted Kashier checkout. Never send card numbers to APEX by email or chat.'}</p></div></aside>
    </section>

    <footer className="paymentFooter"><a href={`mailto:${APEX_CONTACT.email}`}>{APEX_CONTACT.email}</a><a href={`tel:${APEX_CONTACT.phone}`}>{APEX_CONTACT.phone}</a><span>© APEX STUDIO · Created by Ansta</span></footer>
  </main>;
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

createRoot(document.getElementById('payment-root')!).render(<PaymentPage/>);
