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
      className="absolute left-0 top-11 z-50 w-80 rounded-xl shadow-xl p-4"
      style={{
        backgroundColor: 'var(--color-bg-surface)',
        border: '1px solid var(--color-border-default)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          סשנים פעילים
        </h3>
        <button
          onClick={onClose}
          className="text-xs px-2 py-0.5 rounded"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          סגור
        </button>
      </div>

      {loading ? (
        <p className="text-xs text-center py-3" style={{ color: 'var(--color-text-secondary)' }}>
          טוען...
        </p>
      ) : (
        <ul className="space-y-2 mb-3">
          {sessions.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between text-xs rounded-lg px-3 py-2"
              style={{ backgroundColor: 'var(--color-bg-base)' }}
            >
              <span style={{ color: 'var(--color-text-secondary)' }}>
                {new Date(s.createdAt).toLocaleString('he-IL')}
              </span>
              <button
                onClick={() => void handleRevoke(s.id)}
                className="text-xs px-2 py-0.5 rounded-md"
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
        className="w-full text-xs rounded-lg py-2 px-3 font-medium"
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
      className="h-14 flex items-center justify-between px-6 gap-4"
      style={{
        backgroundColor: 'var(--color-bg-surface)',
        borderBottom: '1px solid var(--color-border-default)',
      }}
    >
      {/* Search */}
      <div className="flex-1 max-w-xs">
        <div className="relative">
          <svg
            className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
            width="14" height="14" viewBox="0 0 16 16" fill="none"
            style={{ color: 'var(--color-text-muted)' }}
          >
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6"/>
            <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          <input
            type="text"
            placeholder="חיפוש..."
            className="w-full text-sm pr-9 pl-3 py-1.5 rounded-lg outline-none transition-all"
            style={{
              backgroundColor: 'var(--color-bg-base)',
              border: '1px solid var(--color-border-default)',
              color: 'var(--color-text-primary)',
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-accent)';
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(196,162,83,0.15)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-border-default)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        </div>
      </div>

      {/* Actions */}
      {user && (
        <div className="flex items-center gap-3">
          {/* Notification bell */}
          <button
            className="relative w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'var(--color-text-secondary)' }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-bg-base)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            }}
            title="התראות"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 1.5a4.5 4.5 0 00-4.5 4.5v2.5l-1 1.5h11l-1-1.5V6A4.5 4.5 0 008 1.5z"
                stroke="currentColor" strokeWidth="1.4" fill="none"
              />
              <path d="M6.5 11.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none"/>
            </svg>
            <span
              className="absolute top-1 right-1 w-2 h-2 rounded-full"
              style={{ backgroundColor: '#DC2626', border: '1.5px solid var(--color-bg-surface)' }}
            />
          </button>

          {/* Divider */}
          <div className="w-px h-5" style={{ backgroundColor: 'var(--color-border-default)' }} />

          {/* User info */}
          <div className="relative">
            <button
              onClick={() => setShowSessions((v) => !v)}
              className="flex items-center gap-2 text-sm"
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold"
                style={{ backgroundColor: 'var(--color-accent)', color: '#1C1C1E' }}
              >
                {user.name?.charAt(0) ?? '?'}
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold leading-tight" style={{ color: 'var(--color-text-primary)' }}>
                  {user.name}
                </div>
                <div className="text-[10px] leading-tight" style={{ color: 'var(--color-text-secondary)' }}>
                  {ROLE_LABELS[user.role] ?? user.role}
                </div>
              </div>
            </button>
            {showSessions && <SessionsPanel onClose={() => setShowSessions(false)} />}
          </div>

          {/* Logout */}
          <button
            onClick={() => void handleLogout()}
            className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
            style={{
              borderColor: 'var(--color-border-default)',
              color: 'var(--color-text-secondary)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--color-bg-base)';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
            }}
          >
            יציאה
          </button>
        </div>
      )}
    </header>
  );
}
