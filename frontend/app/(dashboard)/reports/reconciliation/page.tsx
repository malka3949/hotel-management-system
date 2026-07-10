'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getReconciliation, type ReconciliationReport } from '@/lib/api/billing';
import { useAuth } from '@/hooks/useAuth';

function today() {
  return new Date().toISOString().slice(0, 10);
}
function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
}
function formatDate(d: string) {
  return new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const STATUS_LABELS: Record<string, string> = {
  draft: 'טיוטה', finalized: 'מסוכם', paid: 'שולם', void: 'בוטל',
};
const METHOD_LABELS: Record<string, string> = {
  cash: 'מזומן', credit_card: 'כרטיס אשראי', bank_transfer: 'העברה בנקאית', pos_terminal: 'POS',
};

export default function ReconciliationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [startDate, setStartDate] = useState(monthStart());
  const [endDate, setEndDate] = useState(today());
  const [report, setReport] = useState<ReconciliationReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError('');
    getReconciliation(startDate, endDate)
      .then(setReport)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [startDate, endDate, user]);

  return (
    <div className="max-w-5xl" dir="rtl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push('/reports')} className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          ← חזרה
        </button>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          דוח גביה ותשלומים
        </h2>
      </div>

      <div className="flex gap-4 mb-6 items-end">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>מתאריך</label>
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--color-border-default)' }} />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>עד תאריך</label>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--color-border-default)' }} />
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {loading && <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>טוען...</p>}

      {report && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: 'סה"כ חויב', value: `₪${report.totalInvoiced.toFixed(2)}`, color: 'var(--color-primary)' },
              { label: 'סה"כ נגבה', value: `₪${report.totalCollected.toFixed(2)}`, color: '#059669' },
              { label: 'החזרים', value: `₪${report.totalRefunded.toFixed(2)}`, color: '#DC2626' },
              { label: 'נטו שנגבה', value: `₪${report.netCollected.toFixed(2)}`, color: 'var(--color-accent)' },
            ].map((c) => (
              <div key={c.label} className="p-4 rounded-lg border"
                style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}>
                <p className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>{c.label}</p>
                <p className="text-xl font-bold" style={{ color: c.color }}>{c.value}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 rounded-lg border text-center"
              style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>חשבוניות</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{report.invoiceCount}</p>
            </div>
            <div className="p-4 rounded-lg border text-center"
              style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}>
              <p className="text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>תשלומים</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{report.paymentCount}</p>
            </div>
          </div>

          {report.invoices.length > 0 && (
            <div className="mb-6">
              <h3 className="font-medium text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                חשבוניות בתקופה ({report.invoices.length})
              </h3>
              <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border-default)' }}>
                <table className="w-full text-sm">
                  <thead style={{ backgroundColor: 'var(--color-bg-surface)' }}>
                    <tr>
                      {['#', 'הזמנה', 'נוצר', 'סה"כ', 'סטטוס', ''].map((h) => (
                        <th key={h} className="px-3 py-2 text-right font-medium"
                          style={{ color: 'var(--color-text-secondary)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.invoices.map((inv) => (
                      <tr key={inv.id} className="border-t cursor-pointer hover:bg-gray-50"
                        style={{ borderColor: 'var(--color-border-default)' }}
                        onClick={() => router.push(`/invoices/${inv.id}`)}>
                        <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {inv.id.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                          {inv.reservationId.slice(0, 8).toUpperCase()}
                        </td>
                        <td className="px-3 py-2" style={{ color: 'var(--color-text-secondary)' }}>
                          {formatDate(inv.createdAt)}
                        </td>
                        <td className="px-3 py-2 font-semibold" style={{ color: 'var(--color-primary)' }}>
                          ₪{Number(inv.total).toFixed(2)}
                        </td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                            {STATUS_LABELS[inv.status] ?? inv.status}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {(inv.status === 'finalized' || inv.status === 'draft') && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/payments/checkout?invoiceId=${inv.id}&reservationId=${inv.reservationId}`);
                              }}
                              className="px-2 py-0.5 rounded text-xs font-medium text-white"
                              style={{ backgroundColor: 'var(--color-accent)' }}
                            >
                              לתשלום
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {report.payments.length > 0 && (
            <div>
              <h3 className="font-medium text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
                תשלומים שנגבו ({report.payments.length})
              </h3>
              <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border-default)' }}>
                <table className="w-full text-sm">
                  <thead style={{ backgroundColor: 'var(--color-bg-surface)' }}>
                    <tr>
                      {['#', 'אמצעי', 'סכום', 'שולם ב', 'החזרים'].map((h) => (
                        <th key={h} className="px-3 py-2 text-right font-medium"
                          style={{ color: 'var(--color-text-secondary)' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {report.payments.map((p) => {
                      const refunded = (p.refunds ?? [])
                        .filter((r) => r.status === 'succeeded')
                        .reduce((s, r) => s + Number(r.amount), 0);
                      return (
                        <tr key={p.id} className="border-t"
                          style={{ borderColor: 'var(--color-border-default)' }}>
                          <td className="px-3 py-2 font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                            {p.id.slice(0, 8).toUpperCase()}
                          </td>
                          <td className="px-3 py-2" style={{ color: 'var(--color-text-secondary)' }}>
                            {METHOD_LABELS[p.paymentMethod] ?? p.paymentMethod}
                          </td>
                          <td className="px-3 py-2 font-semibold" style={{ color: '#059669' }}>
                            ₪{Number(p.amount).toFixed(2)}
                          </td>
                          <td className="px-3 py-2" style={{ color: 'var(--color-text-secondary)' }}>
                            {p.paidAt ? formatDate(p.paidAt) : '—'}
                          </td>
                          <td className="px-3 py-2"
                            style={{ color: refunded > 0 ? '#DC2626' : 'var(--color-text-secondary)' }}>
                            {refunded > 0 ? `−₪${refunded.toFixed(2)}` : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
