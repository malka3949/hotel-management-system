'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/lib/api/auth';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  roles?: UserRole[];
  exact?: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

function IconGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".8"/>
      <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".8"/>
      <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".8"/>
      <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".8"/>
    </svg>
  );
}
function IconBed() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="8" width="14" height="5" rx="1.5" fill="currentColor" opacity=".8"/>
      <rect x="1" y="4" width="5" height="5" rx="1.5" fill="currentColor" opacity=".6"/>
      <rect x="1" y="11" width="2" height="3" rx="1" fill="currentColor"/>
      <rect x="13" y="11" width="2" height="3" rx="1" fill="currentColor"/>
    </svg>
  );
}
function IconTag() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 2h6l6 6-6 6-6-6V2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" fill="none" opacity=".8"/>
      <circle cx="5.5" cy="5.5" r="1" fill="currentColor"/>
    </svg>
  );
}
function IconScreen() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="2" width="14" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" opacity=".8"/>
      <path d="M5 14h6M8 12v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
function IconUser() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.5" fill="none" opacity=".8"/>
      <path d="M2 14c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="3" width="14" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" opacity=".8"/>
      <path d="M5 1v4M11 1v4M1 7h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
function IconClipboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="12" height="13" rx="1.5" stroke="currentColor" strokeWidth="1.5" fill="none" opacity=".8"/>
      <path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <rect x="5" y="1" width="6" height="3" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    </svg>
  );
}
function IconHotel() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="4" width="14" height="11" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" opacity=".8"/>
      <path d="M5 15V10h6v5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M4 4V3a4 4 0 018 0v1" stroke="currentColor" strokeWidth="1.5" fill="none"/>
    </svg>
  );
}
function IconBroom() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 13L10 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".8"/>
      <ellipse cx="12" cy="11" rx="3" ry="3" transform="rotate(-30 12 11)" stroke="currentColor" strokeWidth="1.5" fill="none" opacity=".8"/>
    </svg>
  );
}
function IconReceipt() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 1h12v14l-2-1.5L10 15l-2-1.5L6 15l-2-1.5L2 15V1z" stroke="currentColor" strokeWidth="1.5" fill="none" opacity=".8"/>
      <path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
}
function IconChart() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M1 14h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity=".6"/>
      <rect x="2" y="8" width="3" height="6" rx="1" fill="currentColor" opacity=".7"/>
      <rect x="6.5" y="5" width="3" height="9" rx="1" fill="currentColor" opacity=".7"/>
      <rect x="11" y="2" width="3" height="12" rx="1" fill="currentColor" opacity=".7"/>
    </svg>
  );
}
function IconGlobe() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6.5" stroke="currentColor" strokeWidth="1.5" fill="none" opacity=".8"/>
      <path d="M8 1.5C8 1.5 5.5 4.5 5.5 8s2.5 6.5 2.5 6.5M8 1.5C8 1.5 10.5 4.5 10.5 8S8 14.5 8 14.5" stroke="currentColor" strokeWidth="1.2" fill="none"/>
      <path d="M1.5 8h13" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  );
}
function IconBuilding() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1" y="3" width="14" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" fill="none" opacity=".8"/>
      <path d="M1 7h14" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="4" y="9" width="2" height="2" rx=".5" fill="currentColor" opacity=".7"/>
      <rect x="7" y="9" width="2" height="2" rx=".5" fill="currentColor" opacity=".7"/>
      <rect x="10" y="9" width="2" height="2" rx=".5" fill="currentColor" opacity=".7"/>
      <path d="M6 15v-3h4v3" stroke="currentColor" strokeWidth="1.2" fill="none"/>
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="6" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.5" fill="none" opacity=".8"/>
      <path d="M1 14c0-2.761 2.239-4 5-4s5 1.239 5 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none"/>
      <path d="M11 8c1.5.3 3 1.5 3 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" opacity=".6"/>
      <circle cx="12" cy="4.5" r="2" stroke="currentColor" strokeWidth="1.3" fill="none" opacity=".6"/>
    </svg>
  );
}

const NAV_GROUPS: NavGroup[] = [
  {
    title: 'ראשי',
    items: [
      { label: 'דשבורד', href: '/dashboard', icon: <IconGrid />, exact: true },
      { label: 'דשבורד רשת', href: '/dashboard/chain', icon: <IconGlobe />, roles: ['chain_admin'] },
    ],
  },
  {
    title: 'חדרים',
    items: [
      { label: 'חדרים', href: '/rooms', icon: <IconBed />, roles: ['chain_admin', 'hotel_manager', 'receptionist'], exact: true },
      { label: 'לוח סטטוס', href: '/rooms/status-board', icon: <IconScreen />, roles: ['chain_admin', 'hotel_manager', 'receptionist', 'housekeeping'] },
      { label: 'סוגי חדרים', href: '/room-types', icon: <IconTag />, roles: ['chain_admin', 'hotel_manager'] },
    ],
  },
  {
    title: 'אורחים והזמנות',
    items: [
      { label: 'אורחים', href: '/guests', icon: <IconUser />, roles: ['chain_admin', 'hotel_manager', 'receptionist'] },
      { label: 'הזמנות', href: '/reservations', icon: <IconClipboard />, roles: ['chain_admin', 'hotel_manager', 'receptionist'], exact: true },
      { label: 'לוח שנה', href: '/reservations/calendar', icon: <IconCalendar />, roles: ['chain_admin', 'hotel_manager', 'receptionist'] },
      { label: 'קבלה', href: '/front-desk', icon: <IconHotel />, roles: ['chain_admin', 'hotel_manager', 'receptionist'] },
    ],
  },
  {
    title: 'תפעול',
    items: [
      { label: 'ניקיון', href: '/housekeeping', icon: <IconBroom />, roles: ['chain_admin', 'hotel_manager', 'housekeeping'], exact: true },
      { label: 'ניהול ניקיון', href: '/housekeeping/manage', icon: <IconBroom />, roles: ['chain_admin', 'hotel_manager'] },
      { label: 'חשבוניות', href: '/invoices', icon: <IconReceipt />, roles: ['chain_admin', 'hotel_manager', 'receptionist'] },
      { label: 'דוחות', href: '/reports', icon: <IconChart />, roles: ['chain_admin', 'hotel_manager'] },
    ],
  },
  {
    title: 'ניהול',
    items: [
      { label: 'סניפים', href: '/admin/branches', icon: <IconBuilding />, roles: ['chain_admin'] },
      { label: 'משתמשים', href: '/admin/users', icon: <IconUsers />, roles: ['chain_admin', 'hotel_manager'] },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();

  return (
    <aside
      className="w-64 flex flex-col h-full"
      style={{ backgroundColor: 'var(--color-bg-sidebar)', borderLeft: '1px solid rgba(255,255,255,0.06)' }}
    >
      {/* Logo */}
      <div className="h-14 flex items-center gap-2.5 px-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-sm font-bold"
          style={{ backgroundColor: 'var(--color-accent)', color: '#1C1C1E' }}
        >
          H
        </div>
        <span className="font-semibold text-sm tracking-wide" style={{ color: '#F0EDE8' }}>
          Hotel Manager
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-3 overflow-y-auto">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter(
            (item) => !item.roles || (user && item.roles.includes(user.role)),
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={group.title} className="mb-1">
              <div
                className="px-5 pt-3 pb-1 text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'rgba(255,255,255,0.28)' }}
              >
                {group.title}
              </div>
              <ul className="px-2 space-y-0.5">
                {visibleItems.map((item) => {
                  const active = item.exact
                    ? pathname === item.href
                    : pathname === item.href || pathname.startsWith(item.href + '/');
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150"
                        style={
                          active
                            ? {
                                backgroundColor: 'var(--color-accent)',
                                color: '#1C1C1E',
                              }
                            : {
                                color: 'rgba(255,255,255,0.58)',
                                backgroundColor: 'transparent',
                              }
                        }
                        onMouseEnter={(e) => {
                          if (!active) {
                            (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.07)';
                            (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.88)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!active) {
                            (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                            (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.58)';
                          }
                        }}
                      >
                        <span className="shrink-0">{item.icon}</span>
                        <span>{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      {user && (
        <div
          className="px-4 py-3 text-xs"
          style={{ borderTop: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.36)' }}
        >
          {user.email}
        </div>
      )}
    </aside>
  );
}
