'use client';

import { useState, useEffect } from 'react';
import { getBranches, createBranch, type Branch } from '@/lib/api/branches';
import { RoleGate } from '@/components/shared/RoleGate';

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', address: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getBranches()
      .then(setBranches)
      .catch(() => setError('שגיאה בטעינת סניפים'))
      .finally(() => setLoading(false));
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const branch = await createBranch(formData);
      setBranches((prev) => [branch, ...prev]);
      setShowForm(false);
      setFormData({ name: '', address: '', phone: '', email: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת סניף');
    } finally {
      setSaving(false);
    }
  }

  return (
    <RoleGate roles={['chain_admin']} fallback={<p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>אין הרשאה לצפות בדף זה.</p>}>
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>ניהול סניפים</h2>
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-sm px-4 py-2 rounded-md text-white font-medium"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            + סניף חדש
          </button>
        </div>

        {error && <p className="text-sm mb-4 px-3 py-2 rounded-md" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>{error}</p>}

        {showForm && (
          <form onSubmit={handleCreate} className="mb-6 p-4 rounded-lg border" style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}>
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>סניף חדש</h3>
            <div className="grid grid-cols-2 gap-3">
              {(['name', 'address', 'phone', 'email'] as const).map((field) => (
                <input
                  key={field}
                  type={field === 'email' ? 'email' : 'text'}
                  placeholder={{ name: 'שם סניף', address: 'כתובת', phone: 'טלפון', email: 'מייל' }[field]}
                  value={formData[field]}
                  onChange={(e) => setFormData((p) => ({ ...p, [field]: e.target.value }))}
                  required={field === 'name' || field === 'address'}
                  className="rounded-md border px-3 py-2 text-sm"
                  style={{ borderColor: 'var(--color-border-default)' }}
                />
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <button type="submit" disabled={saving} className="text-sm px-4 py-2 rounded-md text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
                {saving ? 'שומר...' : 'שמור'}
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="text-sm px-4 py-2 rounded-md border" style={{ borderColor: 'var(--color-border-default)' }}>
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
                  {['שם', 'כתובת', 'טלפון', 'סטטוס'].map((h) => (
                    <th key={h} className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-text-secondary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {branches.map((b, i) => (
                  <tr key={b.id} style={{ borderTopColor: 'var(--color-border-default)', borderTopWidth: i > 0 ? 1 : 0, borderTopStyle: 'solid' }}>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>{b.name}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>{b.address}</td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>{b.phone ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: b.isActive ? '#DCFCE7' : '#F3F4F6', color: b.isActive ? '#16A34A' : '#6B7280' }}>
                        {b.isActive ? 'פעיל' : 'לא פעיל'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {branches.length === 0 && (
              <p className="px-4 py-8 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>אין סניפים עדיין</p>
            )}
          </div>
        )}
      </div>
    </RoleGate>
  );
}
