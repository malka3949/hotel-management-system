'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/lib/api/auth';

interface NavItem {
  label: string;
  href: string;
  icon: string;
  roles?: UserRole[];
}

const NAV_ITEMS: NavItem[] = [
  { label: 'דשבורד', href: '/dashboard', icon: '⊞' },
  { label: 'חדרים', href: '/rooms', icon: '🛏', roles: ['chain_admin', 'hotel_manager', 'receptionist'] },
  { label: 'לוח סטטוס', href: '/rooms/status-board', icon: '📡', roles: ['chain_admin', 'hotel_manager', 'receptionist', 'housekeeping'] },
  { label: 'סוגי חדרים', href: '/room-types', icon: '🏷️', roles: ['chain_admin', 'hotel_manager'] },
  { label: 'אורחים', href: '/guests', icon: '👤', roles: ['chain_admin', 'hotel_manager', 'receptionist'] },
  { label: 'הזמנות', href: '/reservations', icon: '📋', roles: ['chain_admin', 'hotel_manager', 'receptionist'] },
  { label: 'לוח שנה', href: '/reservations/calendar', icon: '📅', roles: ['chain_admin', 'hotel_manager', 'receptionist'] },
  { label: 'קבלה', href: '/front-desk', icon: '🏨', roles: ['chain_admin', 'hotel_manager', 'receptionist'] },
  { label: 'חדרי שירות', href: '/housekeeping', icon: '🧹', roles: ['chain_admin', 'hotel_manager', 'housekeeping'] },
  { label: 'דוחות', href: '/reports', icon: '📊', roles: ['chain_admin', 'hotel_manager'] },
  { label: 'סניפים', href: '/admin/branches', icon: '🏢', roles: ['chain_admin'] },
  { label: 'משתמשים', href: '/admin/users', icon: '👥', roles: ['chain_admin', 'hotel_manager'] },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  const visibleItems = NAV_ITEMS.filter(
    (item) => !item.roles || (user && item.roles.includes(user.role)),
  );

  return (
    <aside
      className="w-64 bg-surface border-l border-default flex flex-col h-full"
      style={{ borderColor: 'var(--color-border-default)' }}
    >
      {/* Logo */}
      <div
        className="h-14 flex items-center px-5 border-b"
        style={{
          borderColor: 'var(--color-border-default)',
          backgroundColor: 'var(--color-primary)',
        }}
      >
        <span className="text-white font-bold text-lg">🏨 Hotel Manager</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 overflow-y-auto">
        <ul className="space-y-1 px-3">
          {visibleItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: active ? 'var(--color-primary)' : 'transparent',
                    color: active ? '#ffffff' : 'var(--color-text-secondary)',
                  }}
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      {user && (
        <div
          className="h-12 border-t flex items-center px-5 text-xs"
          style={{
            borderColor: 'var(--color-border-default)',
            color: 'var(--color-text-secondary)',
          }}
        >
          {user.email}
        </div>
      )}
    </aside>
  );
}
