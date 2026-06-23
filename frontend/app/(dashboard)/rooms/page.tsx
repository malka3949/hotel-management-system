'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  getRooms,
  getRoomTypes,
  updateRoomStatus,
  updateCleaningStatus,
  deleteRoom,
  type Room,
  type RoomType,
  type RoomStatus,
  type CleaningStatus,
  type RoomsFilter,
} from '@/lib/api/rooms';
import { getBranches, type Branch } from '@/lib/api/branches';
import { RoomStatusBadge } from '@/components/shared/RoomStatusBadge';
import { CleaningStatusBadge } from '@/components/shared/CleaningStatusBadge';
import { RoleGate } from '@/components/shared/RoleGate';
import { useAuth } from '@/hooks/useAuth';

const ROOM_STATUSES: { value: RoomStatus; label: string }[] = [
  { value: 'available', label: 'פנוי' },
  { value: 'occupied', label: 'תפוס' },
  { value: 'maintenance', label: 'תחזוקה' },
  { value: 'out_of_order', label: 'מושבת' },
];

const CLEANING_STATUSES: { value: CleaningStatus; label: string }[] = [
  { value: 'clean', label: 'נקי' },
  { value: 'dirty', label: 'מלוכלך' },
  { value: 'in_progress', label: 'בניקוי' },
];

export default function RoomsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'chain_admin';

  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<RoomsFilter>({});

  useEffect(() => {
    if (isAdmin) {
      getBranches().then(setBranches).catch(() => {});
    }
  }, [isAdmin]);

  const load = useCallback(async () => {
    if (isAdmin && !filters.branchId) {
      setLoading(false);
      setRooms([]);
      setRoomTypes([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [r, rt] = await Promise.all([
        getRooms(filters),
        getRoomTypes(filters.branchId),
      ]);
      setRooms(r);
      setRoomTypes(rt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת חדרים');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { load(); }, [load]);

  async function handleStatusChange(room: Room, status: RoomStatus) {
    try {
      const updated = await updateRoomStatus(room.id, status);
      setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון סטטוס');
    }
  }

  async function handleCleaningChange(room: Room, cleaningStatus: CleaningStatus) {
    try {
      const updated = await updateCleaningStatus(room.id, cleaningStatus);
      setRooms((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון סטטוס ניקיון');
    }
  }

  async function handleDeactivate(room: Room) {
    if (!confirm(`להשבית חדר ${room.number}?`)) return;
    try {
      await deleteRoom(room.id);
      setRooms((prev) => prev.filter((r) => r.id !== room.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהשבתת חדר');
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          ניהול חדרים
        </h2>
        <RoleGate roles={['chain_admin', 'hotel_manager']}>
          <Link
            href="/rooms/new"
            className="text-sm px-4 py-2 rounded-md text-white font-medium"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            + חדר חדש
          </Link>
        </RoleGate>
      </div>

      {/* Filters */}
      <div
        className="mb-5 p-4 rounded-lg border flex flex-wrap gap-3"
        style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
      >
        {isAdmin && (
          <select
            value={filters.branchId ?? ''}
            onChange={(e) =>
              setFilters((f) => ({ ...f, branchId: e.target.value || undefined, roomTypeId: undefined }))
            }
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
          placeholder="חיפוש לפי מספר חדר"
          value={filters.search ?? ''}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value || undefined }))}
          className="rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--color-border-default)' }}
        />
        <select
          value={filters.status ?? ''}
          onChange={(e) =>
            setFilters((f) => ({ ...f, status: (e.target.value as RoomStatus) || undefined }))
          }
          className="rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--color-border-default)' }}
        >
          <option value="">כל הסטטוסים</option>
          {ROOM_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
        <select
          value={filters.roomTypeId ?? ''}
          onChange={(e) =>
            setFilters((f) => ({ ...f, roomTypeId: e.target.value || undefined }))
          }
          className="rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--color-border-default)' }}
        >
          <option value="">כל הסוגים</option>
          {roomTypes.map((rt) => (
            <option key={rt.id} value={rt.id}>{rt.name}</option>
          ))}
        </select>
        <input
          type="number"
          placeholder="קומה"
          value={filters.floor ?? ''}
          onChange={(e) =>
            setFilters((f) => ({
              ...f,
              floor: e.target.value ? Number(e.target.value) : undefined,
            }))
          }
          className="rounded-md border px-3 py-2 text-sm w-24"
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
          בחר סניף כדי לצפות בחדרים
        </p>
      ) : loading ? (
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>טוען...</p>
      ) : (
        <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border-default)' }}>
          <table className="w-full text-sm">
            <thead style={{ backgroundColor: 'var(--color-bg-base)' }}>
              <tr>
                {['מספר', 'קומה', 'סוג', 'סטטוס', 'ניקיון', 'מחיר/לילה', ''].map((h) => (
                  <th key={h} className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rooms.map((room, i) => (
                <tr
                  key={room.id}
                  style={{
                    borderTopColor: 'var(--color-border-default)',
                    borderTopWidth: i > 0 ? 1 : 0,
                    borderTopStyle: 'solid',
                  }}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {room.number}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                    {room.floor ?? '—'}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                    {room.roomType.name}
                  </td>
                  <td className="px-4 py-3">
                    <RoleGate
                      roles={['chain_admin', 'hotel_manager', 'receptionist']}
                      fallback={<RoomStatusBadge status={room.status} />}
                    >
                      <select
                        value={room.status}
                        onChange={(e) => handleStatusChange(room, e.target.value as RoomStatus)}
                        className="rounded border text-xs px-2 py-1"
                        style={{ borderColor: 'var(--color-border-default)' }}
                      >
                        {ROOM_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </RoleGate>
                  </td>
                  <td className="px-4 py-3">
                    <RoleGate
                      roles={['chain_admin', 'hotel_manager', 'receptionist', 'housekeeping']}
                      fallback={<CleaningStatusBadge status={room.cleaningStatus} />}
                    >
                      <select
                        value={room.cleaningStatus}
                        onChange={(e) =>
                          handleCleaningChange(room, e.target.value as CleaningStatus)
                        }
                        className="rounded border text-xs px-2 py-1"
                        style={{ borderColor: 'var(--color-border-default)' }}
                      >
                        {CLEANING_STATUSES.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </RoleGate>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                    ₪{Number(room.roomType.basePrice).toLocaleString('he-IL')}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <RoleGate roles={['chain_admin', 'hotel_manager']}>
                        <Link
                          href={`/rooms/${room.id}/edit`}
                          className="text-xs px-2 py-1 rounded border"
                          style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}
                        >
                          עריכה
                        </Link>
                        <button
                          onClick={() => handleDeactivate(room)}
                          className="text-xs px-2 py-1 rounded border"
                          style={{ borderColor: '#FCA5A5', color: '#DC2626' }}
                        >
                          השבת
                        </button>
                      </RoleGate>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rooms.length === 0 && (
            <p className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              אין חדרים
            </p>
          )}
        </div>
      )}
    </div>
  );
}
