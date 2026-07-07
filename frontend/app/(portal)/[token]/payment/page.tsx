'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { portalApi, InvoiceDetail } from '@/lib/api/portal';

function fmt(n: number) {
  return n.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PortalPaymentPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardToken, setCardToken] = useState('');

  useEffect(() => {
    portalApi.getInvoice(token)
      .then(setInvoice)
      .catch((e: Error) => {
        if (e.message.includes('EXPIRED') || e.message.includes('INVALID') || e.message.includes('TOKEN_ALREADY_USED')) {
          router.push('/expired');
        } else {
          setError(e.message);
        }
      })
      .finally(() => setLoading(false));
  }, [token, router]);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    setSubmitting(true);
    setError(null);
    try {
      await portalApi.processPayment(token, {
        paymentMethod: 'credit_card',
        provider: 'manual',
        token: cardToken || undefined,
        amount: Number(invoice.total),
      });
      router.push(`/${token}/confirmation?action=payment`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בתהליך התשלום');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-secondary">טוען...</div>;
  if (error && !invoice) return <div className="text-center py-12 text-red-500">{error}</div>;
  if (!invoice) return null;

  if (invoice.status === 'paid') {
    return (
      <div className="text-center py-12 space-y-2">
        <div className="text-5xl mb-4">✓</div>
        <h2 className="text-xl font-bold" style={{ color: '#15803D' }}>החשבונית שולמה במלואה</h2>
        <Link href={`/${token}`} className="block text-sm mt-4" style={{ color: 'var(--color-primary-light)' }}>
          חזרה לפורטל
        </Link>
      </div>
    );
  }

  // Guard: if partial payment already made, extras are collected at checkout
  const totalPaid = invoice.payments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0;
  if (totalPaid > 0) {
    const remaining = Number(invoice.total) - totalPaid;
    return (
      <div className="text-center py-12 space-y-3">
        <div className="text-4xl mb-2">🏨</div>
        <h2 className="text-lg font-bold text-primary">שולמו ₪{fmt(totalPaid)} מקוון</h2>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          יתרה ₪{fmt(remaining)} תיגבה בצ&apos;קאאוט בקבלה
        </p>
        <Link
          href={`/${token}`}
          className="inline-block mt-4 px-4 py-2 rounded-lg border text-sm font-medium"
          style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-primary)' }}
        >
          חזרה לפורטל
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-primary">תשלום חשבונית</h2>
        <p className="text-secondary text-sm mt-1">{invoice.branch.name}</p>
      </div>

      <div className="bg-surface border border-default rounded-xl divide-y divide-default">
        {invoice.lineItems.map((item, i) => (
          <div key={i} className="flex justify-between items-center px-4 py-3 text-sm">
            <span className="text-secondary">{item.description}</span>
            <span className="text-primary font-medium">₪{fmt(Number(item.total))}</span>
          </div>
        ))}
        {invoice.charges.map((c, i) => (
          <div key={`c-${i}`} className="flex justify-between items-center px-4 py-3 text-sm">
            <span className="text-secondary">{c.description}</span>
            <span className="text-primary font-medium">₪{fmt(Number(c.amount))}</span>
          </div>
        ))}
        <div className="flex justify-between items-center px-4 py-3">
          <span className="font-bold text-primary">סה&quot;כ לתשלום</span>
          <span className="font-bold text-primary text-lg">₪{fmt(Number(invoice.total))}</span>
        </div>
      </div>

      <form onSubmit={handlePay} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-primary mb-1">פרטי כרטיס אשראי</label>
          <input
            className="w-full border border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="מספר כרטיס (Stripe Elements ייושם בשלב הבא)"
            value={cardToken}
            onChange={e => setCardToken(e.target.value)}
            dir="ltr"
          />
        </div>

        {error && <div className="text-red-500 text-sm">{error}</div>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-accent text-white rounded-lg py-3 font-medium hover:bg-accent/90 disabled:opacity-50 transition"
        >
          {submitting ? 'מעבד תשלום...' : `שלם ₪${fmt(Number(invoice.total))}`}
        </button>
      </form>
    </div>
  );
}
