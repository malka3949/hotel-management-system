'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getCrossBranch, type CrossBranchItem } from '@/lib/api/reports';

function formatNIS(n: number) {
  return `₪${n.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function OccupancyBadge({ pct }: { pct: number }) {
  const color = pct >= 80 ? '#059669' : pct >= 50 ? '#B8923F' : '#DC2626';
  const bg = pct >= 80 ? '#D1FAE5' : pct >= 50 ? 'rgba(196,162,83,0.12)' : '#FEE2E2';
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-xs font-semibold shrink-0"
      style={{ color, backgroundColor: bg }}
    >
      {pct}%
    </span>
  );
}

function BranchCard({ branch }: { branch: CrossBranchItem }) {
  const barColor =
    branch.occupancyPct >= 80
      ? '#059669'
      : branch.occupancyPct >= 50
        ? '#C4A253'
        : '#DC2626';

  return (
    <div
      className="rounded-xl border flex flex-col gap-4 p-5 hover:shadow-md transition-shadow cursor-default"
      style={{
        borderColor: 'var(--color-border-default)',
        backgroundColor: 'var(--color-bg-surface)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            className="font-semibold text-base leading-tight truncate"
            style={{ color: 'var(--color-text-primary)' }}
          >
            {branch.branchName}
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
            {branch.totalRooms} חדרים
          </p>
        </div>
        <OccupancyBadge pct={branch.occupancyPct} />
      </div>

      {/* Occupancy bar */}
      <div>
        <div
          className="flex justify-between text-xs mb-1.5"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          <span>תפוסה</span>
          <span>
            {branch.occupiedRooms}/{branch.totalRooms} חדרים
          </span>
        </div>
        <div className="h-1.5 rounded-full" style={{ backgroundColor: 'var(--color-bg-base)' }}>
          <div
            className="h-1.5 rounded-full"
            style={{ width: `${branch.occupancyPct}%`, backgroundColor: barColor }}
          />
        </div>
      </div>

      {/* Revenue */}
      <div
        className="border-t pt-4"
        style={{ borderColor: 'var(--color-border-default)' }}
      >
        <p className="text-xs mb-0.5" style={{ color: 'var(--color-text-secondary)' }}>
          הכנסות החודש
        </p>
        <p className="text-xl font-bold" style={{ color: 'var(--color-accent)' }}>
          {formatNIS(branch.revenueThisMonth)}
        </p>
      </div>

      {/* CTA */}
      <a
        href={`/dashboard?branchId=${branch.branchId}`}
        className="flex items-center justify-center py-2.5 px-4 rounded-lg text-sm font-medium transition-opacity hover:opacity-85"
        style={{ backgroundColor: 'var(--color-primary)', color: '#F0EDE8' }}
      >
        כניסה לסניף
      </a>
    </div>
  );
}

export default function ChainDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [branches, setBranches] = useState<CrossBranchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) return;
    if (user.role !== 'chain_admin') {
      router.replace('/dashboard');
      return;
    }
    getCrossBranch()
      .then(setBranches)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user, router]);

  const totalRooms = branches.reduce((s, b) => s + b.totalRooms, 0);
  const totalOccupied = branches.reduce((s, b) => s + b.occupiedRooms, 0);
  const totalRevenue = branches.reduce((s, b) => s + b.revenueThisMonth, 0);
  const networkPct = totalRooms > 0 ? Math.round((totalOccupied / totalRooms) * 100) : 0;

  return (
    <div dir="rtl" className="max-w-5xl space-y-6">
      {/* Page header */}
      <div>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          דשבורד רשת
        </h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>
          תצוגת על לכל הסניפים
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Network KPI cards */}
      {!loading && branches.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {[
            {
              label: 'סניפים פעילים',
              value: String(branches.length),
              sub: 'במערכת',
              color: 'var(--color-primary)',
            },
            {
              label: 'תפיסה ברשת',
              value: `${networkPct}%`,
              sub: `${totalOccupied}/${totalRooms} חדרים`,
              color: networkPct >= 70 ? '#059669' : 'var(--color-accent)',
            },
            {
              label: 'הכנסות רשת',
              value: formatNIS(totalRevenue),
              sub: 'החודש הנוכחי',
              color: 'var(--color-accent)',
            },
          ].map((c) => (
            <div
              key={c.label}
              className="p-5 rounded-xl border"
              style={{
                borderColor: 'var(--color-border-default)',
                backgroundColor: 'var(--color-bg-surface)',
              }}
            >
              <p
                className="text-xs font-medium mb-2"
                style={{ color: 'var(--color-text-secondary)' }}
              >
                {c.label}
              </p>
              <p className="text-3xl font-bold" style={{ color: c.color }}>
                {c.value}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)' }}>
                {c.sub}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Branch cards */}
      <div>
        <h3
          className="text-sm font-medium mb-4"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          בחר סניף לניהול
        </h3>

        {loading ? (
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-52 rounded-xl animate-pulse" style={{ backgroundColor: 'var(--color-border-default)' }} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {branches.map((b) => (
              <BranchCard key={b.branchId} branch={b} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
