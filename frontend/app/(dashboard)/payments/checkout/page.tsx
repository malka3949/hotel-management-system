'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { initiatePayment, type PaymentMethod, type PaymentProvider } from '@/lib/api/billing';
import { getInvoice, type Invoice } from '@/lib/api/checkin';

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'מזומן' },
  { value: 'credit_card', label: 'כרטיס אשראי (Stripe)' },
  { value: 'bank_transfer', label: 'העברה בנקאית' },
  { value: 'pos_terminal', label: 'מסוף POS' },
];

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reservationId = searchParams.get('reservationId') ?? '';
  const invoiceId = searchParams.get('invoiceId') ?? '';

  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [token, setToken] = useState('');
  const [discount, setDiscount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!reservationId) return;
    getInvoice(reservationId)
      .then(setInvoice)
      .catch(() => setError('שגיאה בטעינת חשבונית'));
  }, [reservationId]);

  const providerForMethod = (m: PaymentMethod): PaymentProvider => {
    if (m === 'credit_card') return 'stripe';
    if (m === 'pos_terminal') return 'manual';
    return 'manual';
  };

  const discountAmount = Math.min(parseFloat(discount) || 0, Number(invoice?.total ?? 0));
  const finalAmount = invoice ? Math.max(0, Number(invoice.total) - discountAmount) : 0;

  const handlePay = async () => {
    if (!invoice) return;
    setLoading(true);
    setError('');
    try {
      await initiatePayment(
        invoice.id,
        method,
        providerForMethod(method),
        method === 'credit_card' ? token || undefined : undefined,
        discountAmount > 0 ? finalAmount : undefined,
      );
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בתשלום');
    } finally {
      setLoading(false);
    }
  };

  if (success && invoice) {
    return (
      <div className="p-8 text-center max-w-md mx-auto" dir="rtl">
        <div className="text-green-600 text-4xl mb-3">✓</div>
        <div className="text-green-600 text-xl font-bold mb-2">תשלום הצליח!</div>
        <p className="text-text-secondary mb-6">₪{finalAmount.toFixed(2)} שולם בהצלחה</p>
        <div className="flex flex-col gap-3">
          <button
            onClick={() => router.push(`/invoices/${invoice.id}`)}
            className="w-full rounded bg-primary py-3 text-sm font-semibold text-white hover:bg-primary-light"
          >
            צפה בחשבונית והדפס
          </button>
          <button
            onClick={() => router.push(`/reservations/${reservationId}`)}
            className="w-full rounded border border-border-default py-3 text-sm font-medium text-text-primary hover:bg-gray-50"
          >
            חזור להזמנה
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-lg mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold text-text-primary mb-6">תשלום חשבונית</h1>

      {invoice ? (
        <div className="bg-bg-surface border border-border-default rounded-lg p-4 mb-6">
          <div className="flex justify-between text-sm mb-1">
            <span className="text-text-secondary">סכום בסיס:</span>
            <span>₪{Number(invoice.subtotal).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm mb-1">
            <span className="text-text-secondary">מע"מ 17%:</span>
            <span>₪{Number(invoice.tax).toFixed(2)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-sm text-red-600 mb-1">
              <span>הנחה / זיכוי:</span>
              <span>−₪{discountAmount.toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold mt-2 pt-2 border-t border-border-default">
            <span>סה"כ לתשלום:</span>
            <span className={discountAmount > 0 ? 'text-green-700' : ''}>
              ₪{finalAmount.toFixed(2)}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-4 text-text-secondary text-sm">טוען חשבונית...</div>
      )}

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            אמצעי תשלום
          </label>
          <div className="grid grid-cols-2 gap-2">
            {METHOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setMethod(opt.value)}
                className={`rounded border p-3 text-sm font-medium transition-colors ${
                  method === opt.value
                    ? 'border-primary bg-blue-50 text-primary'
                    : 'border-border-default text-text-secondary hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1">
            הנחה / זיכוי ללקוח (₪)
          </label>
          <input
            type="number"
            min="0"
            max={invoice ? Number(invoice.total) : undefined}
            step="0.01"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
            placeholder="0.00"
            className="w-full rounded border border-border-default p-2 text-sm"
          />
        </div>

        {method === 'credit_card' && (
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              Stripe Payment Method ID
            </label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="pm_card_visa"
              className="w-full rounded border border-border-default p-2 text-sm"
            />
            <p className="mt-1 text-xs text-text-secondary">
              בסביבת ייצור — הכנס Stripe Elements כאן.
            </p>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          onClick={handlePay}
          disabled={loading || !invoice}
          className="w-full rounded bg-accent py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
        >
          {loading ? 'מעבד תשלום...' : `שלם ₪${finalAmount.toFixed(2)}`}
        </button>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="p-8 text-text-secondary">טוען...</div>}>
      <CheckoutContent />
    </Suspense>
  );
}
