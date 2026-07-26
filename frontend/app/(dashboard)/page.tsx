'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user?.role === 'chain_admin') {
      router.replace('/dashboard/chain');
    }
  }, [user, router]);

  if (!user || user.role === 'chain_admin') return null;

  return (
    <div>
      <h2
        className="text-xl font-semibold mb-1"
        style={{ color: 'var(--color-text-primary)' }}
      >
        שלום, {user.name}
      </h2>
      <p
        className="text-sm mb-6"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        ברוך הבא למערכת ניהול המלון
      </p>
      <div
        className="rounded-xl border p-6"
        style={{
          borderColor: 'var(--color-border-default)',
          backgroundColor: 'var(--color-bg-surface)',
        }}
      >
        <p style={{ color: 'var(--color-text-secondary)' }}>
          Phase 0 — תשתית בלבד. תוכן יתווסף מ-Phase 1 ואילך.
        </p>
      </div>
    </div>
  );
}
