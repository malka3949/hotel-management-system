'use client';

interface KPICardProps {
  label: string;
  value: string | number;
  subValue?: string;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
}

export function KPICard({ label, value, subValue, color, trend, loading }: KPICardProps) {
  if (loading) {
    return (
      <div
        className="p-4 rounded-lg border animate-pulse"
        style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
      >
        <div className="h-3 w-20 rounded bg-gray-200 mb-3" />
        <div className="h-8 w-16 rounded bg-gray-200" />
      </div>
    );
  }

  const trendColor =
    trend === 'up' ? '#059669' : trend === 'down' ? '#DC2626' : 'var(--color-text-secondary)';
  const trendArrow = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';

  return (
    <div
      className="p-4 rounded-lg border"
      style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
    >
      <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-text-secondary)' }}>
        {label}
      </p>
      <p
        className="text-3xl font-bold"
        style={{ color: color ?? 'var(--color-text-primary)' }}
      >
        {value}
      </p>
      {(subValue || trend) && (
        <p className="text-xs mt-1" style={{ color: trendColor }}>
          {trendArrow} {subValue}
        </p>
      )}
    </div>
  );
}
