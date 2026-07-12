'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getFutureReservations, downloadReservationsCsv, type FutureReservationItem } from '@/lib/api/reports';

function today() {
  return new Date().toISOString().slice(0, 10);
}
function thirtyDays() {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
}
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

const SOURCE_LABELS: Record<string, string> = {
  walk_in: 'כניסה ישירה',
  phone: 'טלפון',
  website: 'אתר',
  ota: 'OTA',
};

export default function FutureReservationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [from, setFrom] = useState(today());
  const [to, setTo] = useState(thirtyDays());
  const [reservations, setReservations] = useState<FutureReservationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    setError('');
    getFutureReservations({ from, to })
      .then(setReservations)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [from, to, user]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  function handleExport() {
    downloadReservationsCsv({ from, to });
  }

  return (
    <div dir="rtl" className="max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => router.push('/reports')} className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          ← חזרה
        </button>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          הזמנות עתידיות
        </h2>
      </div>

      {/* Filters + Export */}
      <div className="flex gap-4 mb-6 items-end flex-wrap">
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
        <button
          onClick={handleExport}
          className="px-4 py-2 rounded-md text-sm font-medium text-white mt-auto"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          ייצוא CSV ↓
        </button>
      </div>

      {error && <p className="text-sm text-red-600 mb-4">{error}</p>}
      {loading && <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>טוען...</p>}

      {!loading && (
        <div className="mb-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {reservations.length} הזמנות בטווח הנבחר
        </div>
      )}

      {!loading && reservations.length === 0 ? (
        <div
          className="p-6 text-center text-sm rounded-lg border"
          style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}
        >
          אין הזמנות בטווח התאריכים שנבחר
        </div>
      ) : (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border-default)' }}>
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: '#F8FAFC' }}>
              <tr>
                {['שם אורח', 'טלפון', 'חדר', 'הגעה', 'עזיבה', 'לילות', 'מחיר', 'מקור'].map((h) => (
                  <th key={h} className="px-3 py-2 text-right font-medium text-xs" style={{ color: 'var(--color-text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => {
                const nights = Math.round(
                  (new Date(r.checkOutDate).getTime() - new Date(r.checkInDate).getTime()) / 86400000,
                );
                return (
                  <tr key={r.id} className="border-t hover:bg-gray-50" style={{ borderColor: 'var(--color-border-default)' }}>
                    <td className="px-3 py-2.5" style={{ color: 'var(--color-text-primary)' }}>{r.guest.fullName}</td>
                    <td className="px-3 py-2.5" style={{ color: 'var(--color-text-secondary)' }}>{r.guest.phone}</td>
                    <td className="px-3 py-2.5" style={{ color: 'var(--color-text-secondary)' }}>{r.room.number}</td>
                    <td className="px-3 py-2.5" style={{ color: 'var(--color-text-secondary)' }}>{formatDate(r.checkInDate)}</td>
                    <td className="px-3 py-2.5" style={{ color: 'var(--color-text-secondary)' }}>{formatDate(r.checkOutDate)}</td>
                    <td className="px-3 py-2.5 text-center" style={{ color: 'var(--color-text-secondary)' }}>{nights}</td>
                    <td className="px-3 py-2.5 font-semibold" style={{ color: 'var(--color-primary)' }}>
                      ₪{r.totalPrice.toFixed(0)}
                    </td>
                    <td className="px-3 py-2.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {SOURCE_LABELS[r.source ?? ''] ?? r.source ?? '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
