'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getCancellations, type CancellationsReport } from '@/lib/api/reports';

function today() {
  return new Date().toISOString().slice(0, 10);
}
function monthAgo() {
  const d = new Date();
  d.setDate(d.getDate() - 30);
  return d.toISOString().slice(0, 10);
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function CancellationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [from, setFrom] = useState(monthAgo());
  const [to, setTo] = useState(today());
  const [report, setReport] = useState<CancellationsReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    setError('');
    getCancellations({ from, to })
      .then(setReport)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [from, to, user]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  return (
    <div dir="rtl" className="max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push('/reports')} className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          ← חזרה
        </button>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          דוח ביטולים
        </h2>
      </div>

      {/* Filters */}
      <div className="flex gap-4 mb-6 items-end">
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>מתאריך</label>
          <input
            type="date" value={from} onChange={(e) => setFrom(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--color-border-default)' }}
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>עד תאריך</label>
          <input
            type="date" value={to} onChange={(e) => setTo(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--color-border-default)' }}
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}

      {/* Summary */}
      {report && (
        <>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'סך ביטולים', value: report.totalCancelled, color: '#DC2626' },
              { label: 'שיעור ביטול', value: `${report.cancellationRate}%`, color: 'var(--color-primary)' },
              { label: 'סך הזמנות בטווח', value: report.totalInRange, color: 'var(--color-text-secondary)' },
            ].map((c) => (
              <div
                key={c.label}
                className="p-4 rounded-lg border"
                style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
              >
                <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>{c.label}</p>
                <p className="text-3xl font-bold" style={{ color: c.color }}>{c.value}</p>
              </div>
            ))}
          </div>

          {loading ? (
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>טוען...</p>
          ) : report.items.length === 0 ? (
            <div
              className="p-6 text-center text-sm rounded-lg border"
              style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}
            >
              אין ביטולים בטווח התאריכים שנבחר
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border-default)' }}>
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: '#F8FAFC' }}>
                  <tr>
                    {['שם אורח', 'חדר', 'הגעה מתוכננת', 'תאריך ביטול', 'סכום', 'סיבה'].map((h) => (
                      <th key={h} className="px-4 py-2 text-right font-medium text-xs" style={{ color: 'var(--color-text-secondary)' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.items.map((r) => (
                    <tr key={r.id} className="border-t" style={{ borderColor: 'var(--color-border-default)' }}>
                      <td className="px-4 py-2.5" style={{ color: 'var(--color-text-primary)' }}>{r.guest.fullName}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--color-text-secondary)' }}>{r.room.number}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--color-text-secondary)' }}>{formatDate(r.checkInDate)}</td>
                      <td className="px-4 py-2.5" style={{ color: 'var(--color-text-secondary)' }}>
                        {r.cancelledAt ? formatDate(r.cancelledAt) : '—'}
                      </td>
                      <td className="px-4 py-2.5 font-medium" style={{ color: '#DC2626' }}>
                        ₪{r.totalPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-xs max-w-xs truncate" style={{ color: 'var(--color-text-secondary)' }}>
                        {r.cancellationReason ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
