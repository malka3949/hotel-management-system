'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  getReservations,
  type Reservation,
  type ReservationFilters,
  type ReservationStatus,
  STATUS_LABELS,
} from '@/lib/api/reservations';
import { getBranches, type Branch } from '@/lib/api/branches';
import { ReservationStatusBadge } from '@/components/shared/ReservationStatusBadge';
import { useAuth } from '@/hooks/useAuth';

const STATUS_OPTIONS: ReservationStatus[] = [
  'pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'no_show',
];

function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round(
    (new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000,
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function ReservationsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'chain_admin';

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ReservationFilters>({ limit: 20 });
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isAdmin) getBranches().then(setBranches).catch(() => {});
  }, [isAdmin]);

  const load = useCallback(async () => {
    if (isAdmin && !filters.branchId) {
      setLoading(false);
      setReservations([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await getReservations({ ...filters, page });
      setReservations(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת הזמנות');
    } finally {
      setLoading(false);
    }
  }, [filters, page, isAdmin]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  function handleSearchChange(value: string) {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      setPage(1);
      setFilters((f) => ({ ...f, search: value || undefined }));
    }, 300);
  }

  const totalPages = Math.ceil(total / (filters.limit ?? 20));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          הזמנות
        </h2>
        <Link
          href="/reservations/new"
          className="text-sm px-4 py-2 rounded-md text-white font-medium"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          + הזמנה חדשה
        </Link>
      </div>

      {/* Filters */}
      <div
        className="mb-5 p-4 rounded-lg border flex flex-wrap gap-3"
        style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
      >
        {isAdmin && (
          <select
            value={filters.branchId ?? ''}
            onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, branchId: e.target.value || undefined })); }}
            className="rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--color-border-default)' }}
          >
            <option value="">בחר סניף</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}

        <select
          value={filters.status ?? ''}
          onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, status: (e.target.value as ReservationStatus) || undefined })); }}
          className="rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--color-border-default)' }}
        >
          <option value="">כל הסטטוסים</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>

        <input
          type="date"
          value={filters.dateFrom ?? ''}
          onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, dateFrom: e.target.value || undefined })); }}
          className="rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--color-border-default)' }}
          placeholder="מתאריך"
        />
        <input
          type="date"
          value={filters.dateTo ?? ''}
          onChange={(e) => { setPage(1); setFilters((f) => ({ ...f, dateTo: e.target.value || undefined })); }}
          className="rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--color-border-default)' }}
          placeholder="עד תאריך"
        />

        <input
          placeholder="חיפוש שם אורח / מזהה הזמנה"
          onChange={(e) => handleSearchChange(e.target.value)}
          className="rounded-md border px-3 py-2 text-sm flex-1 min-w-48"
          style={{ borderColor: 'var(--color-border-default)' }}
        />
      </div>

      {error && (
        <p className="text-sm mb-4 px-3 py-2 rounded-md" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
          {error}
        </p>
      )}

      {isAdmin && !filters.branchId ? (
        <p className="text-sm py-8 text-center" style={{ color: 'var(--color-text-secondary)' }}>
          בחר סניף כדי לצפות בהזמנות
        </p>
      ) : loading ? (
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>טוען...</p>
      ) : (
        <>
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border-default)' }}>
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: 'var(--color-bg-base)' }}>
                <tr>
                  {['אורח', 'חדר', 'כניסה', 'יציאה', 'לילות', 'סטטוס', 'נוצר ע"י', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reservations.map((r, i) => (
                  <tr
                    key={r.id}
                    style={{
                      borderTopColor: 'var(--color-border-default)',
                      borderTopWidth: i > 0 ? 1 : 0,
                      borderTopStyle: 'solid',
                    }}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      <Link href={`/reservations/${r.id}`} style={{ color: 'var(--color-primary)' }}>
                        {r.guest.fullName}
                      </Link>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                      {r.room.number}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                      {formatDate(r.checkInDate)}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                      {formatDate(r.checkOutDate)}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                      {nightsBetween(r.checkInDate, r.checkOutDate)}
                    </td>
                    <td className="px-4 py-3">
                      <ReservationStatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                      {r.createdByUser.name}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/reservations/${r.id}`}
                        className="text-xs px-2 py-1 rounded border"
                        style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}
                      >
                        פרטים
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {reservations.length === 0 && (
              <p className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                אין הזמנות
              </p>
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-2 mt-4 justify-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 rounded border disabled:opacity-40"
                style={{ borderColor: 'var(--color-border-default)' }}
              >
                הקודם
              </button>
              <span>{page} / {totalPages}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 rounded border disabled:opacity-40"
                style={{ borderColor: 'var(--color-border-default)' }}
              >
                הבא
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
