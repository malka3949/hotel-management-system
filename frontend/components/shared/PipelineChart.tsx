'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface PipelinePoint {
  date: string;
  count: number;
}

interface PipelineChartProps {
  data: PipelinePoint[];
  loading?: boolean;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

export function PipelineChart({ data, loading }: PipelineChartProps) {
  if (loading) {
    return (
      <div className="h-64 animate-pulse rounded-lg bg-gray-100" />
    );
  }

  const chartData = data.map((p) => ({ ...p, dateLabel: formatDate(p.date) }));

  return (
    <div dir="ltr" className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 4, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis
            dataKey="dateLabel"
            tick={{ fontSize: 11, fill: '#475569' }}
            interval={6}
          />
          <YAxis tick={{ fontSize: 11, fill: '#475569' }} allowDecimals={false} />
          <Tooltip
            formatter={(v) => [v, 'הזמנות']}
            labelFormatter={(l) => `תאריך: ${l}`}
          />
          <Bar dataKey="count" fill="#3B82F6" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
