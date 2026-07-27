'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/lib/api/auth';
import { useAuthStore } from '@/lib/store/auth.store';

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const user = await login(email, password);
      setUser(user);
      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בהתחברות');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-2xl"
      style={{ backgroundColor: 'var(--color-bg-surface)' }}
      dir="rtl"
    >
      {/* Hotel branding header */}
      <div
        className="px-8 py-8 text-center"
        style={{
          backgroundColor: '#1C1C1E',
          borderBottom: '1px solid rgba(196,162,83,0.25)',
        }}
      >
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold mx-auto mb-4"
          style={{ backgroundColor: 'var(--color-accent)', color: '#1C1C1E' }}
        >
          H
        </div>
        <h1
          className="text-xl font-bold tracking-wide"
          style={{ color: '#F0EDE8' }}
        >
          Hotel Manager
        </h1>
        <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.42)' }}>
          מערכת ניהול רשת המלונות
        </p>
      </div>

      {/* Form */}
      <div className="px-8 py-8 space-y-5">
        <h2
          className="text-base font-semibold text-center"
          style={{ color: 'var(--color-text-primary)' }}
        >
          התחברות לחשבון
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium mb-1.5"
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
              autoComplete="email"
              suppressHydrationWarning
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all"
              style={{
                borderColor: 'var(--color-border-default)',
                backgroundColor: 'var(--color-bg-base)',
                color: 'var(--color-text-primary)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-accent)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(196,162,83,0.12)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-default)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              placeholder="user@hotel.co.il"
              dir="ltr"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--color-text-primary)' }}
            >
              סיסמה
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              suppressHydrationWarning
              className="w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-all"
              style={{
                borderColor: 'var(--color-border-default)',
                backgroundColor: 'var(--color-bg-base)',
                color: 'var(--color-text-primary)',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-accent)';
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(196,162,83,0.12)';
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-default)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          {error && (
            <p
              className="text-sm rounded-xl px-4 py-2.5"
              style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl py-3 px-4 text-sm font-semibold transition-opacity disabled:opacity-60 hover:opacity-90"
            style={{ backgroundColor: 'var(--color-accent)', color: '#1C1C1E' }}
          >
            {loading ? 'מתחבר...' : 'כניסה למערכת'}
          </button>
        </form>

        <div className="text-center pt-1">
          <Link
            href="/forgot-password"
            className="text-sm transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            שכחתי סיסמה
          </Link>
        </div>
      </div>
    </div>
  );
}
