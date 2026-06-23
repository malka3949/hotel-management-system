'use client';

import { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, type User, type CreateUserPayload } from '@/lib/api/users';
import { getBranches, type Branch } from '@/lib/api/branches';
import { RoleGate } from '@/components/shared/RoleGate';
import type { UserRole } from '@/lib/api/auth';

const ROLE_LABELS: Record<UserRole, string> = {
  chain_admin: 'מנהל רשת',
  hotel_manager: 'מנהל מלון',
  receptionist: 'קבלן',
  housekeeping: 'חדרנית',
};

const ROLES: UserRole[] = ['chain_admin', 'hotel_manager', 'receptionist', 'housekeeping'];

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateUserPayload>({ name: '', email: '', password: '', role: 'receptionist', branchId: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([getUsers(), getBranches()])
      .then(([u, b]) => { setUsers(u); setBranches(b); })
      .catch(() => setError('שגיאה בטעינת נתונים'))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, branchId: form.branchId || undefined };
      const user = await createUser(payload);
      setUsers((prev) => [user, ...prev]);
      setShowForm(false);
      setForm({ name: '', email: '', password: '', role: 'receptionist', branchId: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת משתמש');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(user: User) {
    try {
      const updated = await updateUser(user.id, { isActive: !user.isActive });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בעדכון משתמש');
    }
  }

  const branchName = (id: string | null) => branches.find((b) => b.id === id)?.name ?? '—';

  return (
    <RoleGate roles={['chain_admin', 'hotel_manager']} fallback={<p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>אין הרשאה.</p>}>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>ניהול משתמשים</h2>
          <button onClick={() => setShowForm(!showForm)} className="text-sm px-4 py-2 rounded-md text-white font-medium" style={{ backgroundColor: 'var(--color-accent)' }}>
            + משתמש חדש
          </button>
        </div>

        {error && <p className="text-sm mb-4 px-3 py-2 rounded-md" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>{error}</p>}

        {showForm && (
          <form onSubmit={handleCreate} className="mb-6 p-4 rounded-lg border" style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>משתמש חדש</h3>
            <div className="grid grid-cols-2 gap-3">
              <input placeholder="שם מלא" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--color-border-default)' }} />
              <input type="email" placeholder="מייל" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} required dir="ltr" className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--color-border-default)' }} />
              <input type="password" placeholder="סיסמה (מינ. 8)" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))} required minLength={8} className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--color-border-default)' }} />
              <select value={form.role} onChange={(e) => setForm((p) => ({ ...p, role: e.target.value as UserRole }))} className="rounded-md border px-3 py-2 text-sm" style={{ borderColor: 'var(--color-border-default)' }}>
                {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
              </select>
              <select value={form.branchId} onChange={(e) => setForm((p) => ({ ...p, branchId: e.target.value }))} className="rounded-md border px-3 py-2 text-sm col-span-2" style={{ borderColor: 'var(--color-border-default)' }}>
                <option value="">ללא סניף (מנהל רשת)</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="flex gap-2 mt-3">
              <button type="submit" disabled={saving} className="text-sm px-4 py-2 rounded-md text-white" style={{ backgroundColor: 'var(--color-primary)' }}>{saving ? 'שומר...' : 'שמור'}</button>
              <button type="button" onClick={() => setShowForm(false)} className="text-sm px-4 py-2 rounded-md border" style={{ borderColor: 'var(--color-border-default)' }}>ביטול</button>
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
                  {['שם', 'מייל', 'תפקיד', 'סניף', 'סטטוס', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-text-secondary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} style={{ borderTopColor: 'var(--color-border-default)', borderTopWidth: i > 0 ? 1 : 0, borderTopStyle: 'solid' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>{u.name}</td>
                    <td className="px-4 py-3" dir="ltr" style={{ color: 'var(--color-text-secondary)' }}>{u.email}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>{ROLE_LABELS[u.role]}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>{branchName(u.branchId)}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: u.isActive ? '#DCFCE7' : '#F3F4F6', color: u.isActive ? '#16A34A' : '#6B7280' }}>
                        {u.isActive ? 'פעיל' : 'לא פעיל'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => handleDeactivate(u)} className="text-xs px-2 py-1 rounded border" style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}>
                        {u.isActive ? 'השבת' : 'הפעל'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {users.length === 0 && <p className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>אין משתמשים</p>}
          </div>
        )}
      </div>
    </RoleGate>
  );
}
