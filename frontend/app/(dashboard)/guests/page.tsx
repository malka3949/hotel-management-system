'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { getGuests, deleteGuest, type Guest, type GuestsFilter } from '@/lib/api/guests';
import { getBranches, type Branch } from '@/lib/api/branches';
import { RoleGate } from '@/components/shared/RoleGate';
import { useAuth } from '@/hooks/useAuth';

export default function GuestsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'chain_admin';

  const [guests, setGuests] = useState<Guest[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<GuestsFilter>({ limit: 20 });
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isAdmin) {
      getBranches().then(setBranches).catch(() => {});
    }
  }, [isAdmin]);

  const load = useCallback(async () => {
    if (isAdmin && !filters.branchId) {
      setLoading(false);
      setGuests([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await getGuests({ ...filters, page });
      setGuests(result.items);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת אורחים');
    } finally {
      setLoading(false);
    }
  }, [filters, page, isAdmin]);

  useEffect(() => { load(); }, [load]);

  function handleSearchChange(value: string) {
    if (searchRef.current) clearTimeout(searchRef.current);
    searchRef.current = setTimeout(() => {
      setPage(1);
      setFilters((f) => ({ ...f, search: value || undefined }));
    }, 300);
  }

  async function handleDelete(guest: Guest) {
    if (!confirm(`למחוק את האורח ${guest.fullName}?`)) return;
    try {
      await deleteGuest(guest.id);
      setGuests((prev) => prev.filter((g) => g.id !== guest.id));
      setTotal((t) => t - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקת אורח');
    }
  }

  const totalPages = Math.ceil(total / (filters.limit ?? 20));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          ניהול אורחים
        </h2>
        <RoleGate roles={['chain_admin', 'hotel_manager', 'receptionist']}>
          <Link
            href="/guests/new"
            className="text-sm px-4 py-2 rounded-md text-white font-medium"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            + אורח חדש
          </Link>
        </RoleGate>
      </div>

      <div
        className="mb-5 p-4 rounded-lg border flex flex-wrap gap-3"
        style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
      >
        {isAdmin && (
          <select
            value={filters.branchId ?? ''}
            onChange={(e) => {
              setPage(1);
              setFilters((f) => ({ ...f, branchId: e.target.value || undefined }));
            }}
            className="rounded-md border px-3 py-2 text-sm font-medium"
            style={{ borderColor: 'var(--color-border-default)' }}
          >
            <option value="">בחר סניף</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
        <input
          placeholder="חיפוש לפי שם, טלפון, אימייל, ת.ז..."
          defaultValue={filters.search ?? ''}
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
          בחר סניף כדי לצפות באורחים
        </p>
      ) : loading ? (
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>טוען...</p>
      ) : (
        <>
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border-default)' }}>
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: 'var(--color-bg-base)' }}>
                <tr>
                  {['שם', 'טלפון', 'אימייל', 'ת.ז / דרכון', 'לאום', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {guests.map((guest, i) => (
                  <tr
                    key={guest.id}
                    style={{
                      borderTopColor: 'var(--color-border-default)',
                      borderTopWidth: i > 0 ? 1 : 0,
                      borderTopStyle: 'solid',
                    }}
                  >
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      <Link href={`/guests/${guest.id}`} style={{ color: 'var(--color-primary)' }}>
                        {guest.fullName}
                      </Link>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }} dir="ltr">
                      {guest.phone}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                      {guest.email ?? '—'}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }} dir="ltr">
                      {guest.passportId ?? '—'}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                      {guest.nationality ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Link
                          href={`/guests/${guest.id}/edit`}
                          className="text-xs px-2 py-1 rounded border"
                          style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}
                        >
                          עריכה
                        </Link>
                        <RoleGate roles={['chain_admin', 'hotel_manager']}>
                          <button
                            onClick={() => handleDelete(guest)}
                            className="text-xs px-2 py-1 rounded border"
                            style={{ borderColor: '#FCA5A5', color: '#DC2626' }}
                          >
                            מחיקה
                          </button>
                        </RoleGate>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {guests.length === 0 && (
              <p className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                אין אורחים
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
