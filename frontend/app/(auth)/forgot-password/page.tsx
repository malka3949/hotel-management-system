'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { forgotPassword } from '@/lib/api/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await forgotPassword(email);
      setSent(true);
    } catch {
      setError('שגיאה. נסה שוב מאוחר יותר.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-surface rounded-lg border p-8 shadow-sm" style={{ borderColor: 'var(--color-border-default)' }}>
      <div className="text-center mb-8">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          שכחתי סיסמה
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          הכנס את כתובת המייל שלך
        </p>
      </div>

      {sent ? (
        <div className="space-y-4">
          <p
            className="text-sm rounded-md px-3 py-3 text-center"
            style={{ backgroundColor: '#F0FDF4', color: '#16A34A' }}
          >
            אם המייל קיים במערכת, נשלח אליו קישור לאיפוס סיסמה.
          </p>
          <Link
            href="/login"
            className="block text-center text-sm"
            style={{ color: 'var(--color-primary-light)' }}
          >
            חזור להתחברות
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium mb-1"
              style={{ color: 'var(--color-text-primary)' }}
            >
              כתובת מייל
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-md border px-3 py-2 text-sm outline-none"
              style={{
                borderColor: 'var(--color-border-default)',
                backgroundColor: 'var(--color-bg-surface)',
                color: 'var(--color-text-primary)',
              }}
              placeholder="user@hotel.co.il"
              dir="ltr"
            />
          </div>

          {error && (
            <p className="text-sm rounded-md px-3 py-2" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md py-2 px-4 text-sm font-medium text-white transition-opacity disabled:opacity-60"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            {loading ? 'שולח...' : 'שלח קישור לאיפוס'}
          </button>

          <div className="text-center">
            <Link href="/login" className="text-sm" style={{ color: 'var(--color-primary-light)' }}>
              חזור להתחברות
            </Link>
          </div>
        </form>
      )}
    </div>
  );
}
