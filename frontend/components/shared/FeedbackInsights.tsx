'use client';

import { useEffect, useState } from 'react';

interface Insights {
  total: number;
  averageRating: number;
  sentimentBreakdown: Record<string, number>;
  recent: Array<{ rating: number; comment?: string; sentiment?: string; aiSummary?: string; createdAt: string }>;
}

const SENTIMENT_LABEL: Record<string, string> = {
  positive: 'חיובי',
  neutral: 'ניטרלי',
  negative: 'שלילי',
};

const SENTIMENT_COLOR: Record<string, string> = {
  positive: 'text-green-600 bg-green-50',
  neutral: 'text-yellow-600 bg-yellow-50',
  negative: 'text-red-600 bg-red-50',
};

export default function FeedbackInsights() {
  const [data, setData] = useState<Insights | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/v1/reports/feedback-insights', { credentials: 'include' })
      .then((r) => r.json())
      .then((res) => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-[#475569] text-sm p-4">טוען...</div>;
  if (!data || data.total === 0)
    return <div className="text-[#475569] text-sm p-4">אין ביקורות עדיין</div>;

  return (
    <div dir="rtl" className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#1E3A8A]">{data.averageRating}</p>
          <p className="text-xs text-[#475569] mt-1">ממוצע ציון</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-[#1E3A8A]">{data.total}</p>
          <p className="text-xs text-[#475569] mt-1">סה&quot;כ ביקורות</p>
        </div>
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{data.sentimentBreakdown['positive'] ?? 0}</p>
          <p className="text-xs text-[#475569] mt-1">חיוביות</p>
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4">
        <h4 className="text-sm font-semibold text-[#0F172A] mb-3">ביקורות אחרונות</h4>
        <div className="space-y-3">
          {data.recent.map((f, i) => (
            <div key={i} className="border-b border-[#E2E8F0] pb-3 last:border-0 last:pb-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-yellow-400">{'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}</span>
                {f.sentiment && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${SENTIMENT_COLOR[f.sentiment] ?? ''}`}>
                    {SENTIMENT_LABEL[f.sentiment] ?? f.sentiment}
                  </span>
                )}
              </div>
              {f.aiSummary && <p className="text-xs text-[#475569] italic">{f.aiSummary}</p>}
              {f.comment && !f.aiSummary && <p className="text-xs text-[#475569]">{f.comment}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
