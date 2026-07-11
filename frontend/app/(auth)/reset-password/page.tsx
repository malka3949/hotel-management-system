'use client';

import { useState, FormEvent, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { resetPassword } from '@/lib/api/auth';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (newPassword !== confirm) {
      setError('הסיסמאות אינן תואמות');
      return;
    }
    if (newPassword.length < 8) {
      setError('הסיסמה חייבת להכיל לפחות 8 תווים');
      return;
    }

    setLoading(true);
    try {
      await resetPassword(token, newPassword);
      router.push('/login?reset=1');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'הטוקן לא תקין או פג תוקף');
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <p className="text-sm text-center" style={{ color: '#DC2626' }}>
        קישור לא תקין.{' '}
        <Link href="/forgot-password" style={{ color: 'var(--color-primary-light)' }}>
          בקש קישור חדש
        </Link>
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="new-password"
          className="block text-sm font-medium mb-1"
          style={{ color: 'var(--color-text-primary)' }}
        >
          סיסמה חדשה
        </label>
        <input
          id="new-password"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          required
          minLength={8}
          className="w-full rounded-md border px-3 py-2 text-sm outline-none"
          style={{
            borderColor: 'var(--color-border-default)',
            backgroundColor: 'var(--color-bg-surface)',
            color: 'var(--color-text-primary)',
          }}
        />
      </div>

      <div>
        <label
          htmlFor="confirm-password"
          className="block text-sm font-medium mb-1"
          style={{ color: 'var(--color-text-primary)' }}
        >
          אישור סיסמה
        </label>
        <input
          id="confirm-password"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          className="w-full rounded-md border px-3 py-2 text-sm outline-none"
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
        {loading ? 'מאפס...' : 'אפס סיסמה'}
      </button>

      <div className="text-center">
        <Link href="/login" className="text-sm" style={{ color: 'var(--color-primary-light)' }}>
          חזור להתחברות
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="bg-surface rounded-lg border p-8 shadow-sm" style={{ borderColor: 'var(--color-border-default)' }}>
      <div className="text-center mb-8">
        <h1 className="text-xl font-bold" style={{ color: 'var(--color-text-primary)' }}>
          איפוס סיסמה
        </h1>
      </div>
      <Suspense fallback={<p className="text-center text-sm">טוען...</p>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
