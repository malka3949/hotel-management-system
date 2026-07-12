'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { KPICard } from '@/components/shared/KPICard';
import { OccupancyChart } from '@/components/shared/OccupancyChart';
import { PipelineChart } from '@/components/shared/PipelineChart';
import { PricingSuggestions } from '@/components/shared/PricingSuggestions';
import { NlReportQuery } from '@/components/shared/NlReportQuery';
import {
  getOccupancySummary,
  getRevenueSummary,
  getArrivalsDepartures,
  getOccupancyTrend,
  getReservationPipeline,
  type OccupancySummary,
  type RevenueSummary,
  type ArrivalsDepartures,
  type TrendPoint,
  type PipelinePoint,
} from '@/lib/api/reports';

function formatNIS(n: number) {
  return `₪${n.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const QUICK_LINKS = [
  { label: 'דוח ביטולים', href: '/reports/cancellations', desc: 'רשימת ביטולים ושיעור ביטול' },
  { label: 'הזמנות עתידיות', href: '/reports/future-reservations', desc: 'ייצוא הזמנות קדימה ל-CSV' },
  { label: 'דוח גביה', href: '/reports/reconciliation', desc: 'חשבוניות ותשלומים שנגבו' },
];

export default function ReportsPage() {
  const { user } = useAuth();
  const [occupancy, setOccupancy] = useState<OccupancySummary | null>(null);
  const [revenue, setRevenue] = useState<RevenueSummary | null>(null);
  const [arrivals, setArrivals] = useState<ArrivalsDepartures | null>(null);
  const [trend, setTrend] = useState<TrendPoint[]>([]);
  const [pipeline, setPipeline] = useState<PipelinePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    Promise.all([
      getOccupancySummary(),
      getRevenueSummary(),
      getArrivalsDepartures(),
      getOccupancyTrend(),
      getReservationPipeline(),
    ])
      .then(([occ, rev, arr, tr, pipe]) => {
        setOccupancy(occ);
        setRevenue(rev);
        setArrivals(arr);
        setTrend(tr);
        setPipeline(pipe);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [user]);

  return (
    <div dir="rtl" className="max-w-6xl">
      <h2 className="text-xl font-semibold mb-6" style={{ color: 'var(--color-text-primary)' }}>
        דוחות וסטטיסטיקות
      </h2>

      {error && (
        <div className="p-4 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm mb-6">
          {error}
        </div>
      )}

      {/* KPI Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <KPICard
          label="% תפיסה היום"
          value={loading ? '—' : `${occupancy?.occupancyPct ?? 0}%`}
          subValue={loading ? undefined : `${occupancy?.occupied}/${occupancy?.total} חדרים`}
          color="var(--color-primary)"
          loading={loading}
        />
        <KPICard
          label="הכנסות היום"
          value={loading ? '—' : formatNIS(revenue?.today ?? 0)}
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
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
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
      </div>

      {/* AI Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <NlReportQuery />
        <PricingSuggestions />
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {QUICK_LINKS.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="block p-4 rounded-lg border transition-colors hover:border-blue-300"
            style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
          >
            <p className="text-sm font-semibold mb-1" style={{ color: 'var(--color-primary)' }}>
              {link.label} →
            </p>
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {link.desc}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}
