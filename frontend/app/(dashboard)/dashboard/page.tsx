'use client';

import { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { KPICard } from '@/components/shared/KPICard';
import { OccupancyChart } from '@/components/shared/OccupancyChart';
import { PipelineChart } from '@/components/shared/PipelineChart';
import {
  getOccupancySummary,
  getRevenueSummary,
  getArrivalsDepartures,
  getOccupancyTrend,
  getReservationPipeline,
  getFutureReservations,
  type OccupancySummary,
  type RevenueSummary,
  type ArrivalsDepartures,
  type TrendPoint,
  type PipelinePoint,
  type FutureReservationItem,
} from '@/lib/api/reports';

function formatNIS(n: number) {
  return `₪${n.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
}

function DashboardPageInner() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const branchId = searchParams.get('branchId') ?? undefined;

  const [occupancy, setOccupancy] = useState<OccupancySummary | null>(null);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [arrivals, setArrivals] = useState<ArrivalsDepartures | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [pipeline, setPipeline] = useState<PipelinePoint[]>([]);
  const [todayArrivals, setTodayArrivals] = useState<FutureReservationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const canSeeRevenue = user?.role === 'chain_admin' || user?.role === 'hotel_manager';
  const canSeeReports = canSeeRevenue || user?.role === 'receptionist';

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    if (!canSeeReports) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');

    const today = new Date().toISOString().split('T')[0];

    const baseRequests = [
      getOccupancySummary(branchId),
      getArrivalsDepartures(branchId),
      getOccupancyTrend(branchId),
      getReservationPipeline(branchId),
      getFutureReservations({ from: today, to: today, branchId }),
    ] as const;

    const revenueRequest = canSeeRevenue ? getRevenueSummary(branchId) : Promise.resolve(null);

    Promise.all([...baseRequests, revenueRequest])
      .then(([occ, arr, tr, pipe, futRes, rev]) => {
        setOccupancy(occ);
        setArrivals(arr);
        setTrend(tr);
        setPipeline(pipe);
        setTodayArrivals(futRes);
        if (rev) setRevenue(rev);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user, branchId, canSeeReports, canSeeRevenue]);

  return (
    <div dir="rtl" className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          דשבורד
        </h2>
        {user?.role === 'chain_admin' && (
          <Link
            href="/dashboard/chain"
            className="text-sm font-medium px-3 py-1.5 rounded-md text-white"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            דשבורד רשת →
          </Link>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm mb-6">
          {error}
        </div>
      )}

      {!canSeeReports && (
        <div className="p-4 rounded-lg border mb-6 text-sm" style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)', color: 'var(--color-text-secondary)' }}>
          ברוך הבא! לצפייה בנתונים, פנה למנהל המלון.
        </div>
      )}

      {canSeeReports && <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        <KPICard
          label="חדרים תפוסים"
          value={loading ? '—' : `${occupancy?.occupied ?? 0}/${occupancy?.total ?? 0}`}
          subValue={loading ? undefined : `${occupancy?.occupancyPct ?? 0}% תפיסה`}
          color="var(--color-primary)"
          loading={loading}
        />
        <KPICard
          label="חדרים פנויים"
          value={loading ? '—' : (occupancy?.available ?? 0)}
          color="#059669"
          loading={loading}
        />
        <KPICard
          label="הגעות היום"
          value={loading ? '—' : (arrivals?.arrivalsToday ?? 0)}
          color="var(--color-accent)"
          loading={loading}
        />
        <KPICard
          label="עזיבות היום"
          value={loading ? '—' : (arrivals?.departuresToday ?? 0)}
          color="#7C3AED"
          loading={loading}
        />
        {canSeeRevenue && (
          <KPICard
            label="הכנסות החודש"
            value={loading ? '—' : formatNIS(revenue?.thisMonth ?? 0)}
            subValue={
              !loading && revenue
                ? `חודש קודם: ${formatNIS(revenue.prevMonth)}`
                : undefined
            }
            trend={
              !loading && revenue
                ? revenue.thisMonth >= revenue.prevMonth
                  ? 'up'
                  : 'down'
                : undefined
            }
            color="var(--color-primary)"
            loading={loading}
          />
        )}
        <KPICard
          label="הגעות מחר"
          value={loading ? '—' : (arrivals?.arrivalsTomorrow ?? 0)}
          color="#475569"
          loading={loading}
        />
      </div>}

      {canSeeReports && <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div
          className="rounded-lg border p-4"
          style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            % תפיסה — 30 יום אחורה
          </h3>
          <OccupancyChart data={trend} loading={loading} />
        </div>
        <div
          className="rounded-lg border p-4"
          style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
        >
          <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
            צינור הזמנות — 30 יום קדימה
          </h3>
          <PipelineChart data={pipeline} loading={loading} />
        </div>
      </div>}

      {canSeeReports &&
      <div
        className="rounded-lg border"
        style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
      >
        <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-border-default)' }}>
          <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            הגעות היום ({arrivals?.arrivalsToday ?? 0})
          </h3>
        </div>
        {loading ? (
          <div className="p-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded bg-gray-100 animate-pulse mb-2" />
            ))}
          </div>
        ) : todayArrivals.length === 0 ? (
          <div className="p-6 text-center text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            אין הגעות מתוכננות להיום
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: '#F8FAFC' }}>
                {['שם אורח', 'חדר', 'הגעה', 'עזיבה', 'סטטוס'].map((h) => (
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
              {todayArrivals.map((r) => (
                <tr
                  key={r.id}
                  className="border-t hover:bg-gray-50"
                  style={{ borderColor: 'var(--color-border-default)' }}
                >
                  <td className="px-4 py-2.5" style={{ color: 'var(--color-text-primary)' }}>
                    {r.guest.fullName}
                  </td>
                  <td className="px-4 py-2.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {r.room.number}
                  </td>
                  <td className="px-4 py-2.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {formatDate(r.checkInDate)}
                  </td>
                  <td className="px-4 py-2.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {formatDate(r.checkOutDate)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: 'rgba(196,162,83,0.12)', color: 'var(--color-accent)' }}>
                      {r.status === 'confirmed' ? 'מאושר' : r.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>}
    </div>
  );
}

export default function DashboardPage() {
  return <Suspense><DashboardPageInner /></Suspense>;
}
