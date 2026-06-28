'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  getCalendarReservations,
  type CalendarReservation,
  type ReservationStatus,
} from '@/lib/api/reservations';
import { getBranches, type Branch } from '@/lib/api/branches';
import { getRooms, type Room } from '@/lib/api/rooms';
import { useAuth } from '@/hooks/useAuth';

const STATUS_COLORS: Record<ReservationStatus, string> = {
  pending: '#FEF3C7',
  confirmed: '#DBEAFE',
  checked_in: '#D1FAE5',
  checked_out: '#F3F4F6',
  cancelled: '#FEE2E2',
  no_show: '#EDE9FE',
};

const STATUS_TEXT_COLORS: Record<ReservationStatus, string> = {
  pending: '#92400E',
  confirmed: '#1E40AF',
  checked_in: '#065F46',
  checked_out: '#374151',
  cancelled: '#991B1B',
  no_show: '#5B21B6',
};

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function formatDateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function ReservationsCalendarPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'chain_admin';

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [reservations, setReservations] = useState<CalendarReservation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const effectiveBranchId = isAdmin ? branchId : (user?.branchId ?? '');

  useEffect(() => {
    if (isAdmin) getBranches().then(setBranches).catch(() => {});
  }, [isAdmin]);

  useEffect(() => {
    if (!effectiveBranchId) return;
    getRooms({ branchId: effectiveBranchId }).then(setRooms).catch(() => {});
  }, [effectiveBranchId]);

  const load = useCallback(async () => {
    if (!effectiveBranchId) return;
    setLoading(true);
    setError('');
    const firstDay = formatDateKey(year, month, 1);
    const lastDay = formatDateKey(year, month, daysInMonth(year, month));
    try {
      const data = await getCalendarReservations(firstDay, lastDay, effectiveBranchId);
      setReservations(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה');
    } finally {
      setLoading(false);
    }
  }, [year, month, effectiveBranchId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  function prevMonth() {
    if (month === 0) { setYear((y) => y - 1); setMonth(11); }
    else setMonth((m) => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear((y) => y + 1); setMonth(0); }
    else setMonth((m) => m + 1);
  }

  const totalDays = daysInMonth(year, month);
  const days = Array.from({ length: totalDays }, (_, i) => i + 1);

  const monthNames = [
    'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
    'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
  ];

  function getReservationsForRoomAndDay(roomId: string, day: number): CalendarReservation[] {
    const date = new Date(year, month, day);
    return reservations.filter((r) => {
      if (r.roomId !== roomId) return false;
      const checkIn = new Date(r.checkInDate);
      const checkOut = new Date(r.checkOutDate);
      return checkIn <= date && checkOut > date;
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            לוח שנה — הזמנות
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="px-2 py-1 rounded border text-sm"
              style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}
            >
              ‹
            </button>
            <span className="text-sm font-medium min-w-32 text-center" style={{ color: 'var(--color-text-primary)' }}>
              {monthNames[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="px-2 py-1 rounded border text-sm"
              style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}
            >
              ›
            </button>
          </div>
        </div>

        {isAdmin && (
          <select
            value={branchId}
            onChange={(e) => setBranchId(e.target.value)}
            className="rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: 'var(--color-border-default)' }}
          >
            <option value="">בחר סניף</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        )}
      </div>

      {error && (
        <p className="text-sm mb-4" style={{ color: '#DC2626' }}>{error}</p>
      )}

      {!effectiveBranchId ? (
        <p className="text-sm py-8 text-center" style={{ color: 'var(--color-text-secondary)' }}>
          בחר סניף כדי לצפות בלוח השנה
        </p>
      ) : loading ? (
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>טוען...</p>
      ) : rooms.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>אין חדרים בסניף</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="text-xs border-collapse" style={{ minWidth: `${200 + totalDays * 36}px` }}>
            <thead>
              <tr>
                <th
                  className="sticky right-0 z-10 px-3 py-2 text-right font-medium border-b border-l"
                  style={{
                    color: 'var(--color-text-secondary)',
                    borderColor: 'var(--color-border-default)',
                    backgroundColor: 'var(--color-bg-base)',
                    minWidth: '120px',
                  }}
                >
                  חדר
                </th>
                {days.map((d) => {
                  const today = new Date();
                  const isToday = today.getFullYear() === year && today.getMonth() === month && today.getDate() === d;
                  return (
                    <th
                      key={d}
                      className="px-1 py-2 text-center font-medium border-b border-l"
                      style={{
                        color: isToday ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        borderColor: 'var(--color-border-default)',
                        backgroundColor: isToday ? '#EFF6FF' : 'var(--color-bg-base)',
                        minWidth: '36px',
                      }}
                    >
                      {d}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {rooms.map((room) => (
                <tr key={room.id}>
                  <td
                    className="sticky right-0 z-10 px-3 py-2 text-right font-medium border-b border-l"
                    style={{
                      color: 'var(--color-text-primary)',
                      borderColor: 'var(--color-border-default)',
                      backgroundColor: 'var(--color-bg-surface)',
                    }}
                  >
                    {room.number}
                    <span className="block font-normal" style={{ color: 'var(--color-text-secondary)' }}>
                      {room.roomType.name}
                    </span>
                  </td>
                  {days.map((d) => {
                    const dayReservations = getReservationsForRoomAndDay(room.id, d);
                    const res = dayReservations[0];
                    return (
                      <td
                        key={d}
                        className="border-b border-l p-0"
                        style={{
                          borderColor: 'var(--color-border-default)',
                          height: '40px',
                        }}
                      >
                        {res && (
                          <Link
                            href={`/reservations/${res.id}`}
                            title={`${res.guest.fullName} — ${res.id.slice(0, 8)}`}
                            className="block h-full w-full flex items-center justify-center text-center overflow-hidden"
                            style={{
                              backgroundColor: STATUS_COLORS[res.status],
                              color: STATUS_TEXT_COLORS[res.status],
                              fontSize: '10px',
                            }}
                          >
                            <span className="truncate px-1">{res.guest.fullName.split(' ')[0]}</span>
                          </Link>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Legend */}
      <div className="mt-4 flex flex-wrap gap-3">
        {(Object.entries(STATUS_COLORS) as [ReservationStatus, string][]).map(([s, bg]) => (
          <div key={s} className="flex items-center gap-1.5 text-xs">
            <span className="w-3 h-3 rounded-sm inline-block" style={{ backgroundColor: bg }} />
            <span style={{ color: 'var(--color-text-secondary)' }}>
              {s === 'pending' ? 'ממתין' :
               s === 'confirmed' ? 'מאושר' :
               s === 'checked_in' ? 'שהייה' :
               s === 'checked_out' ? 'עזב' :
               s === 'cancelled' ? 'בוטל' : 'לא הגיע'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
