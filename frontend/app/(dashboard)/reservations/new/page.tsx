'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GuestSearchCombobox } from '@/components/shared/GuestSearchCombobox';
import { getAvailableRooms } from '@/lib/api/availability';
import type { Room as AvailableRoom } from '@/lib/api/rooms';
import { createReservation, type ReservationSource, SOURCE_LABELS } from '@/lib/api/reservations';
import { getBranches, type Branch } from '@/lib/api/branches';
import { useAuth } from '@/hooks/useAuth';
import type { GuestSearchResult } from '@/lib/api/guests';

const SOURCE_OPTIONS: ReservationSource[] = ['walk_in', 'phone', 'website', 'ota'];

function nightsBetween(checkIn: string, checkOut: string): number {
  if (!checkIn || !checkOut) return 0;
  return Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000);
}

export default function NewReservationPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'chain_admin';

  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState('');
  const [guest, setGuest] = useState<GuestSearchResult | null>(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [availableRooms, setAvailableRooms] = useState<AvailableRoom[]>([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState('');
  const [adults, setAdults] = useState(1);
  const [children, setChildren] = useState(0);
  const [source, setSource] = useState<ReservationSource>('walk_in');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAdmin) getBranches().then(setBranches).catch(() => {});
  }, [isAdmin]);

  const effectiveBranchId = isAdmin ? branchId : (user?.branchId ?? '');

  useEffect(() => {
    if (!checkIn || !checkOut || !effectiveBranchId) return;
    if (new Date(checkOut) <= new Date(checkIn)) return;

    setRoomsLoading(true);
    setSelectedRoomId('');
    setAvailableRooms([]);

    getAvailableRooms({ branchId: effectiveBranchId, checkIn, checkOut })
      .then(setAvailableRooms)
      .catch(() => setAvailableRooms([]))
      .finally(() => setRoomsLoading(false));
  }, [checkIn, checkOut, effectiveBranchId]);

  const nights = nightsBetween(checkIn, checkOut);
  const selectedRoom = availableRooms.find((r) => r.id === selectedRoomId);
  const totalPrice = selectedRoom ? nights * parseFloat(selectedRoom.roomType.basePrice) : 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!guest) { setError('בחר אורח'); return; }
    if (!selectedRoomId) { setError('בחר חדר'); return; }
    if (nights <= 0) { setError('תאריך יציאה חייב להיות אחרי תאריך כניסה'); return; }

    setSubmitting(true);
    try {
      const res = await createReservation({
        branchId: isAdmin ? branchId : undefined,
        roomId: selectedRoomId,
        guestId: guest.id,
        checkInDate: checkIn,
        checkOutDate: checkOut,
        adults,
        children,
        source,
        notes: notes || undefined,
      });
      router.push(`/reservations/${res.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'שגיאה';
      if (msg === 'ROOM_CONFLICT' || msg.includes('ROOM_CONFLICT')) {
        setError('החדר כבר תפוס בתאריכים אלו. בחר חדר אחר או שנה תאריכים.');
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>
        הזמנה חדשה
      </h2>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-md text-sm" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div
          className="p-5 rounded-lg border space-y-4"
          style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
        >
          <h3 className="font-medium text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            פרטי הזמנה
          </h3>

          {isAdmin && (
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                סניף *
              </label>
              <select
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
                required
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--color-border-default)' }}
              >
                <option value="">בחר סניף</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
              אורח ראשי *
            </label>
            <GuestSearchCombobox
              onSelect={setGuest}
              branchId={effectiveBranchId || undefined}
              placeholder="חפש לפי שם, טלפון, אימייל..."
            />
            {guest && (
              <p className="mt-1 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                נבחר: {guest.fullName} · {guest.phone}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                תאריך כניסה *
              </label>
              <input
                type="date"
                value={checkIn}
                onChange={(e) => setCheckIn(e.target.value)}
                required
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--color-border-default)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                תאריך יציאה *
              </label>
              <input
                type="date"
                value={checkOut}
                onChange={(e) => setCheckOut(e.target.value)}
                required
                min={checkIn}
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--color-border-default)' }}
              />
            </div>
          </div>

          {nights > 0 && (
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {nights} לילות
            </p>
          )}
        </div>

        {/* Room selection */}
        <div
          className="p-5 rounded-lg border space-y-3"
          style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
        >
          <h3 className="font-medium text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            בחירת חדר
          </h3>

          {!effectiveBranchId || !checkIn || !checkOut ? (
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              {!effectiveBranchId ? 'בחר סניף כדי לראות חדרים פנויים' : 'בחר תאריכים כדי לראות חדרים פנויים'}
            </p>
          ) : roomsLoading ? (
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>טוען חדרים...</p>
          ) : availableRooms.length === 0 ? (
            <p className="text-sm" style={{ color: '#DC2626' }}>אין חדרים פנויים בתאריכים אלו</p>
          ) : (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {availableRooms.map((room) => {
                const price = nights > 0 ? nights * parseFloat(room.roomType.basePrice) : parseFloat(room.roomType.basePrice);
                const selected = room.id === selectedRoomId;
                return (
                  <button
                    key={room.id}
                    type="button"
                    onClick={() => setSelectedRoomId(room.id)}
                    className="w-full text-right px-4 py-3 rounded-md border text-sm transition-colors"
                    style={{
                      borderColor: selected ? 'var(--color-primary)' : 'var(--color-border-default)',
                      backgroundColor: selected ? '#EFF6FF' : 'transparent',
                      color: 'var(--color-text-primary)',
                    }}
                  >
                    <div className="flex justify-between">
                      <span className="font-medium">חדר {room.number} · {room.roomType.name}</span>
                      <span style={{ color: 'var(--color-text-secondary)' }}>
                        {nights > 0 ? `₪${price.toFixed(0)} סה"כ` : `₪${parseFloat(room.roomType.basePrice).toFixed(0)}/לילה`}
                      </span>
                    </div>
                    {room.floor !== null && (
                      <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                        קומה {room.floor}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {selectedRoom && nights > 0 && (
            <div
              className="mt-3 px-4 py-3 rounded-md text-sm font-medium"
              style={{ backgroundColor: '#EFF6FF', color: 'var(--color-primary)' }}
            >
              סה&quot;כ לתשלום: ₪{totalPrice.toFixed(2)} ({nights} לילות × ₪{parseFloat(selectedRoom.roomType.basePrice).toFixed(2)})
            </div>
          )}
        </div>

        {/* Additional details */}
        <div
          className="p-5 rounded-lg border space-y-4"
          style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
        >
          <h3 className="font-medium text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            פרטים נוספים
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                מבוגרים
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={adults}
                onChange={(e) => setAdults(parseInt(e.target.value) || 1)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--color-border-default)' }}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
                ילדים
              </label>
              <input
                type="number"
                min={0}
                max={10}
                value={children}
                onChange={(e) => setChildren(parseInt(e.target.value) || 0)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--color-border-default)' }}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
              מקור הזמנה
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as ReservationSource)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-border-default)' }}
            >
              {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{SOURCE_LABELS[s]}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
              הערות מיוחדות
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              maxLength={2000}
              placeholder="בקשות מיוחדות, הוראות..."
              className="w-full rounded-md border px-3 py-2 text-sm resize-none"
              style={{ borderColor: 'var(--color-border-default)' }}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting || !guest || !selectedRoomId || nights <= 0}
            className="px-6 py-2 rounded-md text-white text-sm font-medium disabled:opacity-50"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            {submitting ? 'שומר...' : 'צור הזמנה'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2 rounded-md text-sm font-medium border"
            style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}
          >
            ביטול
          </button>
        </div>
      </form>
    </div>
  );
}
