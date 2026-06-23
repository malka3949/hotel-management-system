'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { getRoom, getRoomTypes, updateRoom, type Room, type RoomType } from '@/lib/api/rooms';
import { RoleGate } from '@/components/shared/RoleGate';

export default function EditRoomPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [room, setRoom] = useState<Room | null>(null);
  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    roomTypeId: '',
    number: '',
    floor: '',
    notes: '',
  });

  useEffect(() => {
    Promise.all([getRoom(params.id), getRoomTypes()])
      .then(([r, rt]) => {
        setRoom(r);
        setRoomTypes(rt);
        setForm({
          roomTypeId: r.roomTypeId,
          number: r.number,
          floor: r.floor !== null ? String(r.floor) : '',
          notes: r.notes ?? '',
        });
      })
      .catch(() => setError('שגיאה בטעינת חדר'))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateRoom(params.id, {
        roomTypeId: form.roomTypeId || undefined,
        number: form.number || undefined,
        floor: form.floor ? Number(form.floor) : undefined,
        notes: form.notes || undefined,
      });
      router.push('/rooms');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון חדר');
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoleGate
      roles={['chain_admin', 'hotel_manager']}
      fallback={<p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>אין הרשאה.</p>}
    >
      <div className="max-w-lg">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.push('/rooms')}
            className="text-sm"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            ← חזרה
          </button>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            עריכת חדר {room?.number}
          </h2>
        </div>

        {error && (
          <p className="text-sm mb-4 px-3 py-2 rounded-md" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
            {error}
          </p>
        )}

        {loading ? (
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>טוען...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div
              className="p-4 rounded-lg border space-y-3"
              style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
            >
              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  סוג חדר
                </label>
                <select
                  value={form.roomTypeId}
                  onChange={(e) => setForm((f) => ({ ...f, roomTypeId: e.target.value }))}
                  required
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--color-border-default)' }}
                >
                  <option value="">בחר סוג חדר</option>
                  {roomTypes.map((rt) => (
                    <option key={rt.id} value={rt.id}>
                      {rt.name} — ₪{Number(rt.basePrice).toLocaleString('he-IL')} / לילה
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    מספר חדר
                  </label>
                  <input
                    placeholder="למשל: 101"
                    value={form.number}
                    onChange={(e) => setForm((f) => ({ ...f, number: e.target.value }))}
                    required
                    dir="ltr"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--color-border-default)' }}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                    קומה (אופציונלי)
                  </label>
                  <input
                    type="number"
                    placeholder="1"
                    value={form.floor}
                    onChange={(e) => setForm((f) => ({ ...f, floor: e.target.value }))}
                    min={0}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--color-border-default)' }}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                  הערות פנימיות (אופציונלי)
                </label>
                <textarea
                  placeholder="הערות על החדר..."
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  rows={3}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--color-border-default)' }}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="text-sm px-4 py-2 rounded-md text-white font-medium"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {saving ? 'שומר...' : 'שמור שינויים'}
              </button>
              <button
                type="button"
                onClick={() => router.push('/rooms')}
                className="text-sm px-4 py-2 rounded-md border"
                style={{ borderColor: 'var(--color-border-default)' }}
              >
                ביטול
              </button>
            </div>
          </form>
        )}
      </div>
    </RoleGate>
  );
}
