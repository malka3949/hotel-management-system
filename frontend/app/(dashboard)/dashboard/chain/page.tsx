'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { getCrossBranch, type CrossBranchItem } from '@/lib/api/reports';

function formatNIS(n: number) {
  return `₪${n.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
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
    <div dir="rtl" className="max-w-5xl">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.push('/dashboard')}
          className="text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          ← חזרה
        </button>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          דשבורד רשת
        </h2>
      </div>

      {error && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm mb-6">
          {error}
        </div>
      )}

      {/* Network Summary */}
      {!loading && branches.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'סניפים פעילים', value: branches.length, color: 'var(--color-primary)' },
            { label: 'תפיסה ברשת', value: `${networkPct}%`, color: '#059669' },
            { label: 'הכנסות רשת החודש', value: formatNIS(totalRevenue), color: 'var(--color-accent)' },
          ].map((c) => (
            <div
              key={c.label}
              className="p-4 rounded-lg border"
              style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
            >
              <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
                {c.label}
              </p>
              <p className="text-3xl font-bold" style={{ color: c.color }}>
                {c.value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Branch Table */}
      <div
        className="rounded-lg border"
        style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
      >
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-default)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            כל הסניפים
          </h3>
        </div>

        {loading ? (
          <div className="p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded bg-gray-100 animate-pulse mb-2" />
            ))}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC' }}>
                {['סניף', 'חדרים', 'תפוסים', '% תפיסה', 'הכנסות החודש', ''].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2 text-right font-medium text-xs"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {branches.map((b) => (
                <tr
                  key={b.branchId}
                  className="border-t"
                  style={{ borderColor: 'var(--color-border-default)' }}
                >
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                    {b.branchName}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                    {b.totalRooms}
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                    {b.occupiedRooms}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-gray-100 max-w-20">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${b.occupancyPct}%`,
                            backgroundColor:
                              b.occupancyPct >= 80
                                ? '#059669'
                                : b.occupancyPct >= 50
                                  ? '#C4A253'
                                  : '#DC2626',
                          }}
                        />
                      </div>
                      <span className="text-xs font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {b.occupancyPct}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-semibold" style={{ color: 'var(--color-primary)' }}>
                    {formatNIS(b.revenueThisMonth)}
                  </td>
                  <td className="px-4 py-3">
                    <a
                      href={`/dashboard?branchId=${b.branchId}`}
                      className="text-xs font-medium"
                      style={{ color: 'var(--color-primary)' }}
                    >
                      פרטים →
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
