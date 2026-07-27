'use client';

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface TrendPoint {
  date: string;
  occupancyPct: number;
}

interface OccupancyChartProps {
  data: TrendPoint[];
  loading?: boolean;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function OccupancyChart({ data, loading }: OccupancyChartProps) {
  if (loading) {
    return (
      <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
    );
  }

  const chartData = data.map((p) => ({ ...p, dateLabel: formatDate(p.date) }));

  return (
    <div dir="ltr" className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 11, fill: '#475569' }}
            interval={6}
          />
          <YAxis
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}%`}
            tick={{ fontSize: 11, fill: '#475569' }}
          />
          <Tooltip
            formatter={(v) => [`${v}%`, '% תפיסה']}
            labelFormatter={(l) => `תאריך: ${l}`}
          />
          <Line
            type="monotone"
            dataKey="occupancyPct"
            stroke="#C4A253"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
