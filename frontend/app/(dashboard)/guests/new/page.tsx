'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createGuest } from '@/lib/api/guests';
import { useAuth } from '@/hooks/useAuth';

const NATIONALITIES = [
  { code: 'IL', label: 'ישראל' },
  { code: 'US', label: 'ארה"ב' },
  { code: 'GB', label: 'בריטניה' },
  { code: 'FR', label: 'צרפת' },
  { code: 'DE', label: 'גרמניה' },
  { code: 'RU', label: 'רוסיה' },
  { code: 'UA', label: 'אוקראינה' },
  { code: 'IN', label: 'הודו' },
  { code: 'CN', label: 'סין' },
  { code: 'BR', label: 'ברזיל' },
];

export default function NewGuestPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [duplicateWarning, setDuplicateWarning] = useState('');

  const [form, setForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    passportId: '',
    nationality: '',
    dateOfBirth: '',
    notes: '',
  });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
    if (duplicateWarning) setDuplicateWarning('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setDuplicateWarning('');
    try {
      await createGuest({
        fullName: form.fullName,
        phone: form.phone,
        email: form.email || undefined,
        passportId: form.passportId || undefined,
        nationality: form.nationality || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        notes: form.notes || undefined,
      });
      router.push('/guests');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'שגיאה';
      if (msg.includes('DUPLICATE_GUEST')) {
        setDuplicateWarning(
          msg === 'DUPLICATE_GUEST_EMAIL'
            ? 'אורח עם אימייל זה כבר קיים בסניף.'
            : 'אורח עם מספר דרכון/ת.ז זה כבר קיים בסניף.',
        );
      } else {
        setError(msg);
      }
    } finally {
      setSaving(false);
    }
  }

  if (user?.role === 'housekeeping') {
    return <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>אין הרשאה.</p>;
  }

  return (
    <div className="max-w-lg">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/guests')}
          className="text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          ← חזרה
        </button>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          אורח חדש
        </h2>
      </div>

      {error && (
        <p className="text-sm mb-4 px-3 py-2 rounded-md" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
          {error}
        </p>
      )}

      {duplicateWarning && (
        <div className="text-sm mb-4 px-3 py-2 rounded-md" style={{ backgroundColor: '#FFFBEB', color: '#92400E', border: '1px solid #FCD34D' }}>
          <p className="font-medium">אזהרת כפילות</p>
          <p>{duplicateWarning}</p>
          <p className="mt-1 text-xs">ניתן להמשיך ולשמור — האורח יישמר בכל מקרה.</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          className="p-4 rounded-lg border space-y-3"
          style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
        >
          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              שם מלא *
            </label>
            <input
              value={form.fullName}
              onChange={(e) => set('fullName', e.target.value)}
              required
              placeholder="ישראל ישראלי"
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-border-default)' }}
            />
          </div>

          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              טלפון *
            </label>
            <input
              value={form.phone}
              onChange={(e) => set('phone', e.target.value)}
              required
              placeholder="050-0000000"
              dir="ltr"
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-border-default)' }}
            />
          </div>

          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              אימייל
            </label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              placeholder="example@email.com"
              dir="ltr"
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-border-default)' }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                מספר דרכון / ת.ז
              </label>
              <input
                value={form.passportId}
                onChange={(e) => set('passportId', e.target.value)}
                dir="ltr"
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--color-border-default)' }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                לאום (קוד מדינה)
              </label>
              <select
                value={form.nationality}
                onChange={(e) => set('nationality', e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--color-border-default)' }}
              >
                <option value="">—</option>
                {NATIONALITIES.map((n) => (
                  <option key={n.code} value={n.code}>{n.label} ({n.code})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              תאריך לידה
            </label>
            <input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => set('dateOfBirth', e.target.value)}
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-border-default)' }}
            />
          </div>

          <div>
            <label className="block text-xs mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              הערות פנימיות
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              placeholder="הערות על האורח..."
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
            {saving ? 'שומר...' : 'צור אורח'}
          </button>
          <button
            type="button"
            onClick={() => router.push('/guests')}
            className="text-sm px-4 py-2 rounded-md border"
            style={{ borderColor: 'var(--color-border-default)' }}
          >
            ביטול
          </button>
        </div>
      </form>
    </div>
  );
}
