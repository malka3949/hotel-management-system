'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { getBranches, type Branch } from '@/lib/api/branches';
import {
  getArrivals,
  getDepartures,
  getActiveGuests,
  checkIn,
  checkOut,
  type FrontDeskReservation,
  type Invoice,
} from '@/lib/api/checkin';
import { ReservationStatusBadge } from '@/components/shared/ReservationStatusBadge';
import { InvoiceSummary } from '@/components/shared/InvoiceSummary';

const TODAY = new Date().toISOString().slice(0, 10);

type Tab = 'arrivals' | 'departures' | 'active';

export default function FrontDeskPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'chain_admin';

  const [activeTab, setActiveTab] = useState<Tab>('arrivals');
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<string>('');

  const [arrivals, setArrivals] = useState<FrontDeskReservation[]>([]);
  const [departures, setDepartures] = useState<FrontDeskReservation[]>([]);
  const [activeGuests, setActiveGuests] = useState<FrontDeskReservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [checkInTarget, setCheckInTarget] = useState<FrontDeskReservation | null>(null);
  const [checkInNotes, setCheckInNotes] = useState('');
  const [checkInLoading, setCheckInLoading] = useState(false);

  const [checkOutTarget, setCheckOutTarget] = useState<FrontDeskReservation | null>(null);
  const [checkOutNotes, setCheckOutNotes] = useState('');
  const [checkOutInvoice, setCheckOutInvoice] = useState<Invoice | null>(null);
  const [checkOutLoading, setCheckOutLoading] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    getBranches().then(setBranches).catch(() => {});
  }, [isAdmin]);

  const branchId = isAdmin ? selectedBranch || undefined : undefined;

  const load = useCallback(async () => {
    if (!user) return;
    if (isAdmin && !selectedBranch) {
      setArrivals([]);
      setDepartures([]);
      setActiveGuests([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [a, d, g] = await Promise.all([
        getArrivals(TODAY, branchId),
        getDepartures(TODAY, branchId),
        getActiveGuests(branchId),
      ]);
      setArrivals(a);
      setDepartures(d);
      setActiveGuests(g);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת נתוני קבלה');
    } finally {
      setLoading(false);
    }
  }, [user, isAdmin, selectedBranch, branchId]);

  useEffect(() => { void load(); }, [load]);

  async function handleCheckIn() {
    if (!checkInTarget) return;
    setCheckInLoading(true);
    try {
      await checkIn(checkInTarget.id, checkInNotes || undefined);
      setCheckInTarget(null);
      setCheckInNotes('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בצ'ק-אין");
    } finally {
      setCheckInLoading(false);
    }
  }

  function handleCheckOutOpen(reservation: FrontDeskReservation) {
    setCheckOutTarget(reservation);
    setCheckOutInvoice(reservation.invoice ?? null);
    setCheckOutNotes('');
  }

  async function handleCheckOut() {
    if (!checkOutTarget) return;
    setCheckOutLoading(true);
    try {
      await checkOut(checkOutTarget.id, checkOutNotes || undefined);
      setCheckOutTarget(null);
      setCheckOutInvoice(null);
      setCheckOutNotes('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בצ'ק-אאוט");
    } finally {
      setCheckOutLoading(false);
    }
  }

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'arrivals', label: 'הגעות היום', count: arrivals.length },
    { id: 'departures', label: 'עזיבות היום', count: departures.length },
    { id: 'active', label: 'אורחים פעילים', count: activeGuests.length },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          קבלת קהל
        </h2>
        {isAdmin && (
          <select
            value={selectedBranch}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--color-border-default)' }}
          >
            <option value="">בחר סניף</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        )}
      </div>

      {isAdmin && !selectedBranch ? (
        <p className="text-sm py-8 text-center" style={{ color: 'var(--color-text-secondary)' }}>
          בחר סניף כדי לצפות בנתוני קבלה
        </p>
      ) : (
        <>
          <div className="flex gap-1 mb-5 border-b" style={{ borderColor: 'var(--color-border-default)' }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="px-4 py-2 text-sm font-medium transition-colors"
                style={{
                  color: activeTab === tab.id ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                  borderBottom: activeTab === tab.id ? '2px solid var(--color-primary)' : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span
                    className="mr-2 text-xs px-1.5 py-0.5 rounded-full"
                    style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {error && (
            <p className="text-sm mb-4 px-3 py-2 rounded-md" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
              {error}
            </p>
          )}

          {loading ? (
            <p className="text-sm py-4" style={{ color: 'var(--color-text-secondary)' }}>טוען...</p>
          ) : (
            <>
              {activeTab === 'arrivals' && (
                <ReservationTable
                  reservations={arrivals}
                  actionLabel="צ'ק-אין"
                  actionStyle={{ backgroundColor: 'var(--color-accent)', color: '#fff' }}
                  onAction={(r) => { setCheckInTarget(r); setCheckInNotes(''); }}
                />
              )}
              {activeTab === 'departures' && (
                <ReservationTable
                  reservations={departures}
                  actionLabel="צ'ק-אאוט"
                  actionStyle={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}
                  onAction={handleCheckOutOpen}
                />
              )}
              {activeTab === 'active' && (
                <ReservationTable
                  reservations={activeGuests}
                  showCheckInTime
                />
              )}
            </>
          )}
        </>
      )}

      {checkInTarget && (
        <Dialog title={`צ'ק-אין — ${checkInTarget.guest.fullName}`} onClose={() => setCheckInTarget(null)}>
          <p className="text-sm mb-1" style={{ color: 'var(--color-text-secondary)' }}>
            חדר {checkInTarget.room.number} · {checkInTarget.room.roomType.name}
          </p>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            {formatDate(checkInTarget.checkInDate)} – {formatDate(checkInTarget.checkOutDate)}
          </p>
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
            הערות (אופציונלי)
          </label>
          <textarea
            value={checkInNotes}
            onChange={(e) => setCheckInNotes(e.target.value)}
            rows={2}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--color-border-default)' }}
          />
          <div className="flex gap-2 justify-end mt-4">
            <button
              onClick={() => setCheckInTarget(null)}
              className="px-4 py-2 text-sm rounded-md border"
              style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}
            >
              ביטול
            </button>
            <button
              onClick={handleCheckIn}
              disabled={checkInLoading}
              className="px-4 py-2 text-sm rounded-md text-white font-medium disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              {checkInLoading ? 'מבצע...' : "אשר צ'ק-אין"}
            </button>
          </div>
        </Dialog>
      )}

      {checkOutTarget && (
        <Dialog title={`צ'ק-אאוט — ${checkOutTarget.guest.fullName}`} onClose={() => setCheckOutTarget(null)}>
          <p className="text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>
            חדר {checkOutTarget.room.number} · {checkOutTarget.room.roomType.name}
          </p>
          {checkOutInvoice && (
            <div
              className="mb-4 p-3 rounded-md border"
              style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-base)' }}
            >
              <InvoiceSummary invoice={checkOutInvoice} />
            </div>
          )}
          <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
            הערות (אופציונלי)
          </label>
          <textarea
            value={checkOutNotes}
            onChange={(e) => setCheckOutNotes(e.target.value)}
            rows={2}
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--color-border-default)' }}
          />
          <div className="flex gap-2 justify-end mt-4">
            <button
              onClick={() => setCheckOutTarget(null)}
              className="px-4 py-2 text-sm rounded-md border"
              style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}
            >
              ביטול
            </button>
            <button
              onClick={handleCheckOut}
              disabled={checkOutLoading}
              className="px-4 py-2 text-sm rounded-md text-white font-medium disabled:opacity-50"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              {checkOutLoading ? 'מבצע...' : "אשר צ'ק-אאוט"}
            </button>
          </div>
        </Dialog>
      )}
    </div>
  );
}

interface TableProps {
  reservations: FrontDeskReservation[];
  actionLabel?: string;
  actionStyle?: React.CSSProperties;
  onAction?: (r: FrontDeskReservation) => void;
  showCheckInTime?: boolean;
}

function ReservationTable({ reservations, actionLabel, actionStyle, onAction, showCheckInTime }: TableProps) {
  if (reservations.length === 0) {
    return (
      <p className="text-sm py-8 text-center" style={{ color: 'var(--color-text-secondary)' }}>
        אין רשומות
      </p>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border-default)' }}>
      <table className="w-full text-sm">
        <thead style={{ backgroundColor: 'var(--color-bg-base)' }}>
          <tr>
            {['אורח', 'חדר', 'כניסה', 'יציאה', 'סטטוס', ...(showCheckInTime ? ['כניסה בפועל'] : []), ''].map((h) => (
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
              <td className="px-4 py-3">
                <div className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {r.guest.fullName}
                </div>
                <div className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {r.guest.phone}
                </div>
              </td>
              <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                {r.room.number} · {r.room.roomType.name}
              </td>
              <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                {formatDate(r.checkInDate)}
              </td>
              <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                {formatDate(r.checkOutDate)}
              </td>
              <td className="px-4 py-3">
                <ReservationStatusBadge status={r.status as never} />
              </td>
              {showCheckInTime && (
                <td className="px-4 py-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {r.checkIn
                    ? new Date(r.checkIn.actualCheckInAt).toLocaleString('he-IL', { timeStyle: 'short', dateStyle: 'short' })
                    : '—'}
                </td>
              )}
              <td className="px-4 py-3">
                {actionLabel && onAction && (
                  <button
                    onClick={() => onAction(r)}
                    className="text-xs px-3 py-1.5 rounded-md font-medium"
                    style={actionStyle}
                  >
                    {actionLabel}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Dialog({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div
        className="relative rounded-xl shadow-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
        style={{ backgroundColor: 'var(--color-bg-surface)' }}
      >
        <h3 className="text-base font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
          {title}
        </h3>
        {children}
      </div>
    </div>
  );
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
