'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { logout, getSessions, revokeSession, revokeAllSessions, type Session } from '@/lib/api/auth';

const ROLE_LABELS: Record<string, string> = {
  chain_admin: 'מנהל רשת',
  hotel_manager: 'מנהל מלון',
  receptionist: 'קבלן',
  housekeeping: 'חדרנית',
};

function SessionsPanel({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const { clearUser } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSessions()
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, []);

  async function handleRevoke(id: string) {
    await revokeSession(id);
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  async function handleLogoutAll() {
    await revokeAllSessions();
    clearUser();
    router.push('/login');
  }

  return (
    <div
      className="absolute left-0 top-10 z-50 w-80 rounded-lg border shadow-lg bg-surface p-4"
      style={{ borderColor: 'var(--color-border-default)' }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          סשנים פעילים
        </h3>
        <button onClick={onClose} className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          סגור
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-center py-3" style={{ color: 'var(--color-text-secondary)' }}>טוען...</p>
      ) : (
        <ul className="space-y-2 mb-3">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between text-xs rounded-md px-2 py-2"
              style={{ backgroundColor: 'var(--color-bg-base)' }}
            >
              <span style={{ color: 'var(--color-text-secondary)' }}>
                {new Date(s.createdAt).toLocaleString('he-IL')}
              </span>
              <button
                onClick={() => void handleRevoke(s.id)}
                className="text-xs px-2 py-0.5 rounded"
                style={{ color: '#DC2626', backgroundColor: '#FEF2F2' }}
              >
                נתק
              </button>
            </li>
          ))}
          {sessions.length === 0 && (
            <li className="text-xs text-center py-2" style={{ color: 'var(--color-text-secondary)' }}>
              אין סשנים פעילים
            </li>
          )}
        </ul>
      )}

      <button
        onClick={() => void handleLogoutAll()}
        className="w-full text-xs rounded-md py-2 px-3 font-medium"
        style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}
      >
        התנתקות מכל המכשירים
      </button>
    </div>
  );
}

export function Topbar() {
  const { user, clearUser } = useAuth();
  const router = useRouter();
  const [showSessions, setShowSessions] = useState(false);

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
          <div className="relative">
            <button
              onClick={() => setShowSessions((v) => !v)}
              className="text-sm text-left"
              dir="rtl"
            >
              <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>
                {user.name}
              </span>
              <span className="mx-2 text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: '#EFF6FF', color: 'var(--color-primary)' }}>
                {ROLE_LABELS[user.role] ?? user.role}
              </span>
            </button>
            {showSessions && <SessionsPanel onClose={() => setShowSessions(false)} />}
          </div>
          <button
            onClick={() => void handleLogout()}
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
