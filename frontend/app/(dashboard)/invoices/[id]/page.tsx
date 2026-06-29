'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  getInvoiceById,
  getInvoicePayments,
  downloadInvoicePdf,
  sendInvoiceByEmail,
  type Invoice,
  type Payment,
} from '@/lib/api/billing';
import { AddChargeModal } from '@/components/shared/AddChargeModal';
import { RefundModal } from '@/components/shared/RefundModal';

const STATUS_LABELS: Record<string, string> = {
  draft: 'טיוטה',
  finalized: 'מסוכם',
  paid: 'שולם',
  void: 'בוטל',
};

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  finalized: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  void: 'bg-red-100 text-red-700',
};

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'ממתין',
  processing: 'מעבד',
  succeeded: 'הצליח',
  failed: 'נכשל',
  cancelled: 'בוטל',
  refunded: 'זוכה',
};

const METHOD_LABELS: Record<string, string> = {
  credit_card: 'כרטיס אשראי',
  cash: 'מזומן',
  bank_transfer: 'העברה בנקאית',
  pos_terminal: 'מסוף POS',
};

export default function InvoicePage() {
  const params = useParams<{ id: string }>();
  const invoiceId = params.id;
  const router = useRouter();
  const { user } = useAuth();
  const canRefund = user?.role === 'chain_admin' || user?.role === 'hotel_manager';

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddCharge, setShowAddCharge] = useState(false);
  const [refundTarget, setRefundTarget] = useState<Payment | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [inv, paymentsData] = await Promise.all([
        getInvoiceById(invoiceId),
        getInvoicePayments(invoiceId),
      ]);
      setInvoice(inv);
      setPayments(paymentsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינה');
    } finally {
      setLoading(false);
    }
  }, [invoiceId]);

  useEffect(() => { void loadData(); }, [loadData]);

  const handleDownloadPdf = async () => {
    setPdfLoading(true);
    try {
      const blob = await downloadInvoicePdf(invoiceId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהורדת PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSendEmail = async () => {
    setEmailLoading(true);
    setError('');
    try {
      await sendInvoiceByEmail(invoiceId);
      setEmailSent(true);
      setTimeout(() => setEmailSent(false), 4000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשליחת מייל');
    } finally {
      setEmailLoading(false);
    }
  };

  const handlePrint = async () => {
    setPdfLoading(true);
    try {
      const blob = await downloadInvoicePdf(invoiceId);
      const url = URL.createObjectURL(blob);
      const win = window.open(url, '_blank');
      if (win) win.onload = () => { win.print(); URL.revokeObjectURL(url); };
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהדפסה');
    } finally {
      setPdfLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-text-secondary">טוען...</div>;
  if (error) return <div className="p-8 text-red-600">{error}</div>;
  if (!invoice) return null;

  const succeededPayments = payments.filter((p) => p.status === 'succeeded' || p.status === 'refunded');
  const totalRefunded = payments.flatMap((p) => p.refunds ?? [])
    .filter((r) => r.status === 'succeeded')
    .reduce((s, r) => s + Number(r.amount), 0);
  const canPay = invoice.status === 'finalized' || invoice.status === 'draft';

  return (
    <div className="p-6 max-w-3xl mx-auto" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-text-primary">חשבונית</h1>
          <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_COLORS[invoice.status] ?? 'bg-gray-100 text-gray-700'}`}>
            {STATUS_LABELS[invoice.status] ?? invoice.status}
          </span>
        </div>
        <div className="flex gap-2">
          {canPay && (
            <button
              onClick={() => router.push(`/payments/checkout?invoiceId=${invoice.id}&reservationId=${invoice.reservationId}`)}
              className="rounded bg-accent px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
            >
              בצע תשלום
            </button>
          )}
          <button
            onClick={handleSendEmail}
            disabled={emailLoading || emailSent}
            className="rounded border border-border-default px-4 py-2 text-sm font-medium text-text-primary hover:bg-gray-50 disabled:opacity-50"
          >
            {emailSent ? '✓ נשלח!' : emailLoading ? 'שולח...' : 'שלח במייל'}
          </button>
          <button
            onClick={handlePrint}
            disabled={pdfLoading}
            className="rounded border border-border-default px-4 py-2 text-sm font-medium text-text-primary hover:bg-gray-50 disabled:opacity-50"
          >
            הדפס
          </button>
          <button
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
            className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-light disabled:opacity-50"
          >
            {pdfLoading ? 'מוריד...' : 'הורד PDF'}
          </button>
          {canPay && (
            <button
              onClick={() => setShowAddCharge(true)}
              className="rounded border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-blue-50"
            >
              הוסף חיוב
            </button>
          )}
        </div>
      </div>

      {/* Line Items */}
      {(invoice.lineItems && invoice.lineItems.length > 0) && (
        <section className="bg-bg-surface border border-border-default rounded-lg p-4 mb-4">
          <h2 className="font-semibold text-text-primary mb-3">פריטים</h2>
          <div className="space-y-2">
            {invoice.lineItems.map((item) => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-text-secondary">{item.description} × {item.quantity}</span>
                <span className="text-text-primary font-medium">₪{Number(item.total).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Charges */}
      {(invoice.charges && invoice.charges.length > 0) && (
        <section className="bg-bg-surface border border-border-default rounded-lg p-4 mb-4">
          <h2 className="font-semibold text-text-primary mb-3">חיובים נוספים</h2>
          <div className="space-y-2">
            {invoice.charges.map((charge) => (
              <div key={charge.id} className="flex justify-between text-sm">
                <span className="text-text-secondary">{charge.description}</span>
                <span className="text-text-primary font-medium">₪{Number(charge.amount).toFixed(2)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Totals */}
      <section className="bg-bg-surface border border-border-default rounded-lg p-4 mb-4">
        <h2 className="font-semibold text-text-primary mb-3">סיכום</h2>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-text-secondary">סכום לפני מע"מ</span>
            <span>₪{Number(invoice.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-secondary">מע"מ (17%)</span>
            <span>₪{Number(invoice.tax).toFixed(2)}</span>
          </div>
          <div className="flex justify-between font-semibold text-base pt-2 border-t border-border-default mt-2">
            <span className="text-text-primary">סה"כ לתשלום</span>
            <span className="text-text-primary">₪{Number(invoice.total).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-green-700">
            <span>שולם</span>
            <span>₪{succeededPayments.reduce((s, p) => s + Number(p.amount), 0).toFixed(2)}</span>
          </div>
          {totalRefunded > 0 && (
            <>
              <div className="flex justify-between text-red-600">
                <span>זוכה</span>
                <span>−₪{totalRefunded.toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-semibold pt-2 border-t border-border-default mt-1">
                <span className="text-text-primary">נטו לאחר זיכוי</span>
                <span className="text-text-primary">
                  ₪{(succeededPayments.reduce((s, p) => s + Number(p.amount), 0) - totalRefunded).toFixed(2)}
                </span>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Payments */}
      <section className="bg-bg-surface border border-border-default rounded-lg p-4 mb-4">
        <h2 className="font-semibold text-text-primary mb-3">תשלומים</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-text-secondary">אין תשלומים עדיין</p>
        ) : (
          <div className="space-y-3">
            {payments.map((p) => (
              <div key={p.id} className="rounded border border-border-default overflow-hidden">
                <div className="flex items-center justify-between p-3">
                  <div>
                    <div className="text-sm font-medium text-text-primary">
                      ₪{Number(p.amount).toFixed(2)} — {METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}
                    </div>
                    <div className="text-xs text-text-secondary">
                      {p.paidAt ? new Date(p.paidAt).toLocaleString('he-IL') : ''}
                    </div>
                  </div>
                  <div className="flex gap-2 items-center">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        p.status === 'succeeded'
                          ? 'bg-green-100 text-green-700'
                          : p.status === 'refunded'
                          ? 'bg-orange-100 text-orange-700'
                          : p.status === 'failed'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {PAYMENT_STATUS_LABELS[p.status] ?? p.status}
                    </span>
                    {canRefund && p.status === 'succeeded' && (
                      <button
                        onClick={() => setRefundTarget(p)}
                        className="text-xs text-red-600 hover:underline"
                      >
                        זיכוי
                      </button>
                    )}
                  </div>
                </div>
                {p.refunds && p.refunds.filter((r) => r.status === 'succeeded').length > 0 && (
                  <div className="bg-orange-50 border-t border-orange-100 px-3 py-2 space-y-1">
                    {p.refunds.filter((r) => r.status === 'succeeded').map((r) => (
                      <div key={r.id} className="flex justify-between text-xs text-orange-700">
                        <span>זיכוי — {r.reason}</span>
                        <span>−₪{Number(r.amount).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Modals */}
      {showAddCharge && (
        <AddChargeModal
          invoiceId={invoiceId}
          onSuccess={() => { setShowAddCharge(false); void loadData(); }}
          onClose={() => setShowAddCharge(false)}
        />
      )}
      {refundTarget && (
        <RefundModal
          payment={refundTarget}
          onSuccess={() => { setRefundTarget(null); void loadData(); }}
          onClose={() => setRefundTarget(null)}
        />
      )}
    </div>
  );
}
