'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createRoom, getRoomTypes, createRoomType, type RoomType } from '@/lib/api/rooms';
import { getBranches, type Branch } from '@/lib/api/branches';
import { RoleGate } from '@/components/shared/RoleGate';
import { useAuth } from '@/hooks/useAuth';

export default function NewRoomPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'chain_admin';

  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showNewType, setShowNewType] = useState(false);
  const [selectedBranchId, setSelectedBranchId] = useState('');

  const [form, setForm] = useState({
    roomTypeId: '',
    number: '',
    floor: '',
    notes: '',
  });

  const [typeForm, setTypeForm] = useState({
    name: '',
    basePrice: '',
    maxOccupancy: '',
    description: '',
  });

  useEffect(() => {
    if (isAdmin) {
      getBranches()
        .then(setBranches)
        .catch(() => setError('שגיאה בטעינת סניפים'))
        .finally(() => setLoading(false));
    } else {
      getRoomTypes()
        .then(setRoomTypes)
        .catch(() => setError('שגיאה בטעינת סוגי חדרים'))
        .finally(() => setLoading(false));
    }
  }, [isAdmin]);

  async function handleBranchSelect(branchId: string) {
    setSelectedBranchId(branchId);
    setForm((f) => ({ ...f, roomTypeId: '' }));
    if (branchId) {
      setLoading(true);
      getRoomTypes(branchId)
        .then(setRoomTypes)
        .catch(() => setError('שגיאה בטעינת סוגי חדרים'))
        .finally(() => setLoading(false));
    } else {
      setRoomTypes([]);
    }
  }

  async function handleCreateType(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const rt = await createRoomType({
        ...(isAdmin && selectedBranchId ? { branchId: selectedBranchId } : {}),
        name: typeForm.name,
        basePrice: Number(typeForm.basePrice),
        maxOccupancy: Number(typeForm.maxOccupancy),
        description: typeForm.description || undefined,
      });
      setRoomTypes((prev) => [...prev, rt]);
      setForm((f) => ({ ...f, roomTypeId: rt.id }));
      setShowNewType(false);
      setTypeForm({ name: '', basePrice: '', maxOccupancy: '', description: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת סוג חדר');
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await createRoom({
        ...(isAdmin && selectedBranchId ? { branchId: selectedBranchId } : {}),
        roomTypeId: form.roomTypeId,
        number: form.number,
        floor: form.floor ? Number(form.floor) : undefined,
        notes: form.notes || undefined,
      });
      router.push('/rooms');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת חדר');
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
            חדר חדש
          </h2>
        </div>

        {error && (
          <p className="text-sm mb-4 px-3 py-2 rounded-md" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
            {error}
          </p>
        )}

        {isAdmin && !selectedBranchId ? (
          <div
            className="p-4 rounded-lg border space-y-3"
            style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
          >
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--color-text-primary)' }}>
              בחר סניף
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => handleBranchSelect(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-border-default)' }}
            >
              <option value="">בחר סניף</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>
        ) : loading ? (
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>טוען...</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {isAdmin && (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                <span>סניף: <strong style={{ color: 'var(--color-text-primary)' }}>{branches.find((b) => b.id === selectedBranchId)?.name}</strong></span>
                <button type="button" onClick={() => { setSelectedBranchId(''); setRoomTypes([]); }} style={{ color: 'var(--color-primary-light)' }}>שנה</button>
              </div>
            )}
            <div
              className="p-4 rounded-lg border space-y-3"
              style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
            >
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  סוג חדר
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewType(!showNewType)}
                  className="text-xs"
                  style={{ color: 'var(--color-primary)' }}
                >
                  + סוג חדר חדש
                </button>
              </div>

              {showNewType && (
                <div className="p-3 rounded border space-y-2" style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-base)' }}>
                  <p className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>סוג חדר חדש</p>
                  <input
                    placeholder="שם הסוג (למשל: חדר סטנדרטי)"
                    value={typeForm.name}
                    onChange={(e) => setTypeForm((p) => ({ ...p, name: e.target.value }))}
                    required
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--color-border-default)' }}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder="מחיר בסיס (₪)"
                      value={typeForm.basePrice}
                      onChange={(e) => setTypeForm((p) => ({ ...p, basePrice: e.target.value }))}
                      required
                      min={0}
                      step="0.01"
                      className="rounded-md border px-3 py-2 text-sm"
                      style={{ borderColor: 'var(--color-border-default)' }}
                    />
                    <input
                      type="number"
                      placeholder="קיבולת מקס"
                      value={typeForm.maxOccupancy}
                      onChange={(e) => setTypeForm((p) => ({ ...p, maxOccupancy: e.target.value }))}
                      required
                      min={1}
                      className="rounded-md border px-3 py-2 text-sm"
                      style={{ borderColor: 'var(--color-border-default)' }}
                    />
                  </div>
                  <input
                    placeholder="תיאור (אופציונלי)"
                    value={typeForm.description}
                    onChange={(e) => setTypeForm((p) => ({ ...p, description: e.target.value }))}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    style={{ borderColor: 'var(--color-border-default)' }}
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleCreateType}
                      disabled={saving}
                      className="text-xs px-3 py-1 rounded text-white"
                      style={{ backgroundColor: 'var(--color-primary)' }}
                    >
                      {saving ? 'שומר...' : 'צור סוג'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewType(false)}
                      className="text-xs px-3 py-1 rounded border"
                      style={{ borderColor: 'var(--color-border-default)' }}
                    >
                      ביטול
                    </button>
                  </div>
                </div>
              )}

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
                {saving ? 'שומר...' : 'צור חדר'}
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
