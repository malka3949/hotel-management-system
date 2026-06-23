'use client';

import { useEffect, useState } from 'react';
import { getOccupancySummary, type OccupancySummary } from '@/lib/api/availability';

interface Props {
  branchId: string;
  date: string;
}

const STATS: { key: keyof OccupancySummary; label: string; color: string }[] = [
  { key: 'total',       label: 'סה"כ חדרים', color: '#475569' },
  { key: 'occupied',    label: 'תפוסים',      color: '#1D4ED8' },
  { key: 'available',   label: 'פנויים',      color: '#15803D' },
  { key: 'dirty',       label: 'דורשים ניקוי', color: '#A16207' },
  { key: 'maintenance', label: 'תחזוקה',       color: '#DC2626' },
];

export function OccupancySummaryWidget({ branchId, date }: Props) {
  const [summary, setSummary] = useState<OccupancySummary | null>(null);

  useEffect(() => {
    getOccupancySummary(branchId, date).then(setSummary).catch(() => {});
  }, [branchId, date]);

  if (!summary) {
    return <div className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>טוען...</div>;
  }

  return (
    <div className="grid grid-cols-5 gap-3">
      {STATS.map(({ key, label, color }) => (
        <div
          key={key}
          className="bg-surface rounded-lg border p-3 text-center"
          style={{ borderColor: 'var(--color-border-default)' }}
        >
          <div className="text-2xl font-bold" style={{ color }}>
            {summary[key]}
          </div>
          <div className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            {label}
          </div>
        </div>
      ))}
    </div>
  );
}
