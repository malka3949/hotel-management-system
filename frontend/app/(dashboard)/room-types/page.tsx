'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getRoomTypes,
  createRoomType,
  updateRoomType,
  deleteRoomType,
  type RoomType,
} from '@/lib/api/rooms';
import { getBranches, type Branch } from '@/lib/api/branches';
import { RoleGate } from '@/components/shared/RoleGate';
import { useAuth } from '@/hooks/useAuth';

export default function RoomTypesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'chain_admin';

  const [roomTypes, setRoomTypes] = useState<RoomType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [createForm, setCreateForm] = useState({ branchId: '', name: '', basePrice: '', maxOccupancy: '', description: '' });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ name: '', basePrice: '', maxOccupancy: '', description: '' });

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError('');
    try {
      const rt = await getRoomTypes();
      setRoomTypes(rt);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בטעינת סוגי חדרים');
    } finally {
      setLoading(false);
    }
  }, [user]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);

  async function openCreate() {
    setShowCreate(true);
    if (isAdmin && branches.length === 0) {
      setBranchesLoading(true);
      try {
        const b = await getBranches();
        setBranches(b);
      } finally {
        setBranchesLoading(false);
      }
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const rt = await createRoomType({
        ...(isAdmin ? { branchId: createForm.branchId } : {}),
        name: createForm.name,
        basePrice: Number(createForm.basePrice),
        maxOccupancy: Number(createForm.maxOccupancy),
        description: createForm.description || undefined,
      });
      setRoomTypes((prev) => [...prev, rt]);
      setShowCreate(false);
      setCreateForm({ branchId: '', name: '', basePrice: '', maxOccupancy: '', description: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת סוג חדר');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(rt: RoomType) {
    setEditingId(rt.id);
    setEditForm({
      name: rt.name,
      basePrice: rt.basePrice,
      maxOccupancy: String(rt.maxOccupancy),
      description: rt.description ?? '',
    });
  }

  async function handleUpdate(id: string) {
    setSaving(true);
    setError('');
    try {
      const updated = await updateRoomType(id, {
        name: editForm.name,
        basePrice: Number(editForm.basePrice),
        maxOccupancy: Number(editForm.maxOccupancy),
        description: editForm.description || undefined,
      });
      setRoomTypes((prev) => prev.map((rt) => (rt.id === updated.id ? updated : rt)));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון סוג חדר');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(rt: RoomType) {
    if (!confirm(`למחוק את סוג החדר "${rt.name}"?`)) return;
    setError('');
    try {
      await deleteRoomType(rt.id);
      setRoomTypes((prev) => prev.filter((r) => r.id !== rt.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה במחיקת סוג חדר');
    }
  }

  return (
    <RoleGate
      roles={['chain_admin', 'hotel_manager']}
      fallback={<p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>אין הרשאה.</p>}
    >
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            ניהול סוגי חדרים
          </h2>
          <button
            onClick={openCreate}
            className="text-sm px-4 py-2 rounded-md text-white font-medium"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            + סוג חדר חדש
          </button>
        </div>

        {error && (
          <p className="text-sm mb-4 px-3 py-2 rounded-md" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
            {error}
          </p>
        )}

        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="mb-6 p-4 rounded-lg border space-y-3"
            style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
          >
            <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>סוג חדר חדש</h3>

            {isAdmin && (
              <select
                value={createForm.branchId}
                onChange={(e) => setCreateForm((p) => ({ ...p, branchId: e.target.value }))}
                required
                disabled={branchesLoading}
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--color-border-default)' }}
              >
                <option value="">{branchesLoading ? 'טוען סניפים...' : 'בחר סניף'}</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            )}

            <input
              placeholder="שם הסוג (למשל: חדר סטנדרטי)"
              value={createForm.name}
              onChange={(e) => setCreateForm((p) => ({ ...p, name: e.target.value }))}
              required
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-border-default)' }}
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                placeholder="מחיר בסיס (₪)"
                value={createForm.basePrice}
                onChange={(e) => setCreateForm((p) => ({ ...p, basePrice: e.target.value }))}
                required
                min={0}
                step="0.01"
                className="rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--color-border-default)' }}
              />
              <input
                type="number"
                placeholder="קיבולת מקסימלית"
                value={createForm.maxOccupancy}
                onChange={(e) => setCreateForm((p) => ({ ...p, maxOccupancy: e.target.value }))}
                required
                min={1}
                className="rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--color-border-default)' }}
              />
            </div>
            <input
              placeholder="תיאור (אופציונלי)"
              value={createForm.description}
              onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-border-default)' }}
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="text-sm px-4 py-2 rounded-md text-white"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {saving ? 'שומר...' : 'צור סוג'}
              </button>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="text-sm px-4 py-2 rounded-md border"
                style={{ borderColor: 'var(--color-border-default)' }}
              >
                ביטול
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>טוען...</p>
        ) : (
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border-default)' }}>
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: 'var(--color-bg-base)' }}>
                <tr>
                  {['שם', 'מחיר / לילה', 'קיבולת מקס', 'תיאור', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {roomTypes.map((rt, i) => (
                  <tr
                    key={rt.id}
                    style={{
                      borderTopColor: 'var(--color-border-default)',
                      borderTopWidth: i > 0 ? 1 : 0,
                      borderTopStyle: 'solid',
                    }}
                  >
                    {editingId === rt.id ? (
                      <>
                        <td className="px-4 py-2">
                          <input
                            value={editForm.name}
                            onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                            className="w-full rounded border px-2 py-1 text-sm"
                            style={{ borderColor: 'var(--color-border-default)' }}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={editForm.basePrice}
                            onChange={(e) => setEditForm((p) => ({ ...p, basePrice: e.target.value }))}
                            min={0}
                            step="0.01"
                            className="w-24 rounded border px-2 py-1 text-sm"
                            style={{ borderColor: 'var(--color-border-default)' }}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="number"
                            value={editForm.maxOccupancy}
                            onChange={(e) => setEditForm((p) => ({ ...p, maxOccupancy: e.target.value }))}
                            min={1}
                            className="w-16 rounded border px-2 py-1 text-sm"
                            style={{ borderColor: 'var(--color-border-default)' }}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            value={editForm.description}
                            onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                            className="w-full rounded border px-2 py-1 text-sm"
                            style={{ borderColor: 'var(--color-border-default)' }}
                          />
                        </td>
                        <td className="px-4 py-2">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleUpdate(rt.id)}
                              disabled={saving}
                              className="text-xs px-2 py-1 rounded text-white"
                              style={{ backgroundColor: 'var(--color-primary)' }}
                            >
                              {saving ? '...' : 'שמור'}
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="text-xs px-2 py-1 rounded border"
                              style={{ borderColor: 'var(--color-border-default)' }}
                            >
                              ביטול
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                          {rt.name}
                        </td>
                        <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                          ₪{Number(rt.basePrice).toLocaleString('he-IL')}
                        </td>
                        <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                          {rt.maxOccupancy}
                        </td>
                        <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                          {rt.description ?? '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <button
                              onClick={() => startEdit(rt)}
                              className="text-xs px-2 py-1 rounded border"
                              style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}
                            >
                              עריכה
                            </button>
                            <button
                              onClick={() => handleDelete(rt)}
                              className="text-xs px-2 py-1 rounded border"
                              style={{ borderColor: '#FCA5A5', color: '#DC2626' }}
                            >
                              מחיקה
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {roomTypes.length === 0 && (
              <p className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                אין סוגי חדרים
              </p>
            )}
          </div>
        )}
      </div>
    </RoleGate>
  );
}
