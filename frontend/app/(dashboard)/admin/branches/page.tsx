'use client';

import { useState, useEffect, useRef } from 'react';
import { getBranches, createBranch, updateBranch, type Branch } from '@/lib/api/branches';
import { uploadPhoto } from '@/lib/api/uploads';
import { RoleGate } from '@/components/shared/RoleGate';

function AmenitiesInput({ amenities, onChange }: { amenities: string[]; onChange: (a: string[]) => void }) {
  const [input, setInput] = useState('');
  function add() {
    const v = input.trim();
    if (!v || amenities.includes(v)) return;
    onChange([...amenities, v]);
    setInput('');
  }
  return (
    <div className="space-y-2">
      <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>שירותי הסניף (amenities)</p>
      <div className="flex gap-2">
        <input
          placeholder="בריכה, חניה, חדר כושר..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
          className="flex-1 rounded-md border px-2 py-1 text-xs"
          style={{ borderColor: 'var(--color-border-default)' }}
        />
        <button type="button" onClick={add} className="text-xs px-2 py-1 rounded border" style={{ borderColor: 'var(--color-border-default)' }}>הוסף</button>
      </div>
      <div className="flex flex-wrap gap-1">
        {amenities.map((a) => (
          <span key={a} className="flex items-center gap-1 bg-blue-50 text-blue-800 text-xs px-2 py-0.5 rounded-full">
            {a}
            <button type="button" onClick={() => onChange(amenities.filter((x) => x !== a))} className="text-blue-500 hover:text-red-500">×</button>
          </span>
        ))}
      </div>
    </div>
  );
}

interface BranchFormData {
  name: string;
  address: string;
  phone: string;
  email: string;
  description: string;
  coverPhoto: string;
  amenities: string[];
  cancellationPolicy: string;
}

const emptyForm: BranchFormData = { name: '', address: '', phone: '', email: '', description: '', coverPhoto: '', amenities: [], cancellationPolicy: '' };

function CoverPhotoInput({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadPhoto(file);
      onChange(url);
    } catch {
      /* ignore upload error */
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="url"
          placeholder="URL תמונת כריכה (הדבק קישור)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 rounded-md border px-3 py-2 text-sm"
          style={{ borderColor: 'var(--color-border-default)' }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="text-sm px-3 py-2 rounded-md border whitespace-nowrap"
          style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}
        >
          {uploading ? 'מעלה...' : 'העלה תמונה'}
        </button>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
      </div>
      {value && (
        <div className="flex items-center gap-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="תצוגה מקדימה" className="h-16 w-24 object-cover rounded-md border" style={{ borderColor: 'var(--color-border-default)' }} />
          <button type="button" onClick={() => onChange('')} className="text-xs" style={{ color: '#DC2626' }}>הסר</button>
        </div>
      )}
    </div>
  );
}

export default function BranchesPage() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<BranchFormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<BranchFormData>(emptyForm);
  const [editSaving, setEditSaving] = useState(false);

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
      const branch = await createBranch({
        name: formData.name,
        address: formData.address,
        phone: formData.phone || undefined,
        email: formData.email || undefined,
        description: formData.description || undefined,
        coverPhoto: formData.coverPhoto || undefined,
        amenities: formData.amenities,
        cancellationPolicy: formData.cancellationPolicy || undefined,
      });
      setBranches((prev) => [branch, ...prev]);
      setShowForm(false);
      setFormData(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת סניף');
    } finally {
      setSaving(false);
    }
  }

  function startEdit(b: Branch) {
    setEditingId(b.id);
    setEditData({
      name: b.name,
      address: b.address,
      phone: b.phone ?? '',
      email: b.email ?? '',
      description: b.description ?? '',
      coverPhoto: b.coverPhoto ?? '',
      amenities: b.amenities ?? [],
      cancellationPolicy: b.cancellationPolicy ?? '',
    });
  }

  async function handleUpdate(e: React.FormEvent, id: string) {
    e.preventDefault();
    setEditSaving(true);
    try {
      const updated = await updateBranch(id, {
        name: editData.name,
        address: editData.address,
        phone: editData.phone || undefined,
        email: editData.email || undefined,
        description: editData.description || undefined,
        coverPhoto: editData.coverPhoto || undefined,
        amenities: editData.amenities,
        cancellationPolicy: editData.cancellationPolicy || undefined,
      });
      setBranches((prev) => prev.map((b) => (b.id === id ? updated : b)));
      setEditingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בשמירת סניף');
    } finally {
      setEditSaving(false);
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
            <div className="grid grid-cols-2 gap-3 mb-3">
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
            <textarea
              placeholder="תיאור הסניף (יוצג בעמוד ההזמנה הציבורי)"
              value={formData.description}
              onChange={(e) => setFormData((p) => ({ ...p, description: e.target.value }))}
              rows={3}
              className="w-full rounded-md border px-3 py-2 text-sm mb-3"
              style={{ borderColor: 'var(--color-border-default)' }}
            />
            <div className="mb-3">
              <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>תמונת כריכה</label>
              <CoverPhotoInput value={formData.coverPhoto} onChange={(url) => setFormData((p) => ({ ...p, coverPhoto: url }))} />
            </div>
            <div className="mb-3">
              <AmenitiesInput amenities={formData.amenities} onChange={(amenities) => setFormData((p) => ({ ...p, amenities }))} />
            </div>
            <textarea
              placeholder="מדיניות ביטול (תוצג לאורחים באתר ההזמנה)..."
              value={formData.cancellationPolicy}
              onChange={(e) => setFormData((p) => ({ ...p, cancellationPolicy: e.target.value }))}
              rows={3}
              className="w-full rounded-md border px-3 py-2 text-sm mb-3"
              style={{ borderColor: 'var(--color-border-default)' }}
            />
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
                  {['שם', 'כתובת', 'טלפון', 'סטטוס', ''].map((h, i) => (
                    <th key={i} className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-text-secondary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {branches.map((b, i) => (
                  <>
                    <tr key={b.id} style={{ borderTopColor: 'var(--color-border-default)', borderTopWidth: i > 0 ? 1 : 0, borderTopStyle: 'solid' }}>
                      <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>{b.name}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>{b.address}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>{b.phone ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: b.isActive ? '#DCFCE7' : '#F3F4F6', color: b.isActive ? '#16A34A' : '#6B7280' }}>
                          {b.isActive ? 'פעיל' : 'לא פעיל'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-left">
                        <button
                          onClick={() => editingId === b.id ? setEditingId(null) : startEdit(b)}
                          className="text-xs px-3 py-1 rounded border"
                          style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}
                        >
                          {editingId === b.id ? 'סגור' : 'עריכה'}
                        </button>
                      </td>
                    </tr>
                    {editingId === b.id && (
                      <tr key={`edit-${b.id}`} style={{ borderTopColor: 'var(--color-border-default)', borderTopWidth: 1, borderTopStyle: 'solid' }}>
                        <td colSpan={5} className="px-4 py-4" style={{ backgroundColor: 'var(--color-bg-base)' }}>
                          <form onSubmit={(e) => handleUpdate(e, b.id)}>
                            <div className="grid grid-cols-2 gap-3 mb-3">
                              {(['name', 'address', 'phone', 'email'] as const).map((field) => (
                                <input
                                  key={field}
                                  type={field === 'email' ? 'email' : 'text'}
                                  placeholder={{ name: 'שם סניף', address: 'כתובת', phone: 'טלפון', email: 'מייל' }[field]}
                                  value={editData[field]}
                                  onChange={(e) => setEditData((p) => ({ ...p, [field]: e.target.value }))}
                                  required={field === 'name' || field === 'address'}
                                  className="rounded-md border px-3 py-2 text-sm"
                                  style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
                                />
                              ))}
                            </div>
                            <textarea
                              placeholder="תיאור הסניף (יוצג בעמוד ההזמנה הציבורי)"
                              value={editData.description}
                              onChange={(e) => setEditData((p) => ({ ...p, description: e.target.value }))}
                              rows={3}
                              className="w-full rounded-md border px-3 py-2 text-sm mb-3"
                              style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
                            />
                            <div className="mb-3">
                              <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>תמונת כריכה</label>
                              <CoverPhotoInput value={editData.coverPhoto} onChange={(url) => setEditData((p) => ({ ...p, coverPhoto: url }))} />
                            </div>
                            <div className="mb-3">
                              <AmenitiesInput amenities={editData.amenities} onChange={(amenities) => setEditData((p) => ({ ...p, amenities }))} />
                            </div>
                            <textarea
                              placeholder="מדיניות ביטול (תוצג לאורחים באתר ההזמנה)..."
                              value={editData.cancellationPolicy}
                              onChange={(e) => setEditData((p) => ({ ...p, cancellationPolicy: e.target.value }))}
                              rows={3}
                              className="w-full rounded-md border px-3 py-2 text-sm mb-3"
                              style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
                            />
                            <div className="flex gap-2">
                              <button type="submit" disabled={editSaving} className="text-sm px-4 py-2 rounded-md text-white" style={{ backgroundColor: 'var(--color-primary)' }}>
                                {editSaving ? 'שומר...' : 'שמור שינויים'}
                              </button>
                              <button type="button" onClick={() => setEditingId(null)} className="text-sm px-4 py-2 rounded-md border" style={{ borderColor: 'var(--color-border-default)' }}>
                                ביטול
                              </button>
                            </div>
                          </form>
                        </td>
                      </tr>
                    )}
                  </>
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
