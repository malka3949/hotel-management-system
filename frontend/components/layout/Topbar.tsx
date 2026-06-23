'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { logout } from '@/lib/api/auth';

const ROLE_LABELS: Record<string, string> = {
  chain_admin: 'מנהל רשת',
  hotel_manager: 'מנהל מלון',
  receptionist: 'קבלן',
  housekeeping: 'חדרנית',
};

export function Topbar() {
  const { user, clearUser } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    try {
      await logout();
    } finally {
      clearUser();
      router.push('/login');
    }
  }

  return (
    <header
      className="h-14 bg-surface border-b flex items-center justify-between px-6"
      style={{ borderColor: 'var(--color-border-default)' }}
    >
      <h1 className="text-base font-semibold" style={{ color: 'var(--color-text-primary)' }} />

      {user && (
        <div className="flex items-center gap-3">
          <div className="text-sm text-left" dir="rtl">
            <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
              {user.name}
            </span>
            <span className="mx-2 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#EFF6FF', color: 'var(--color-primary)' }}>
              {ROLE_LABELS[user.role] ?? user.role}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs px-3 py-1.5 rounded-md border transition-colors"
            style={{
              borderColor: 'var(--color-border-default)',
              color: 'var(--color-text-secondary)',
            }}
          >
            יציאה
          </button>
        </div>
      )}
    </header>
  );
}
