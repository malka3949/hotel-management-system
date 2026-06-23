'use client';

import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
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
    <div className="bg-surface rounded-lg border p-8 shadow-sm" style={{ borderColor: 'var(--color-border-default)' }}>
      {/* Header */}
      <div className="text-center mb-8">
        <div
          className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-xl font-bold mx-auto mb-4"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          🏨
        </div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          Hotel Manager
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
          התחבר למערכת
        </p>
      </div>

      {/* Form */}
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
            autoComplete="email"
            className="w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors"
            style={{
              borderColor: 'var(--color-border-default)',
              backgroundColor: 'var(--color-bg-surface)',
              color: 'var(--color-text-primary)',
            }}
            placeholder="user@hotel.co.il"
            dir="ltr"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium mb-1"
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
            className="w-full rounded-md border px-3 py-2 text-sm outline-none transition-colors"
            style={{
              borderColor: 'var(--color-border-default)',
              backgroundColor: 'var(--color-bg-surface)',
              color: 'var(--color-text-primary)',
            }}
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
          {loading ? 'מתחבר...' : 'התחבר'}
        </button>
      </form>
    </div>
  );
}
