'use client';

import { useState } from 'react';
import { queryNlReports } from '@/lib/api/ai';

const EXAMPLES = [
  'כמה הכנסות היה לנו החודש?',
  'מה שיעור התפוסה הנוכחי?',
  'כמה הזמנות בוטלו בחודש האחרון?',
];

export function NlReportQuery() {
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (!query.trim() || loading) return;
    setLoading(true);
    setError('');
    setAnswer('');
    try {
      const result = await queryNlReports(query);
      setAnswer(result);
    } catch {
      setError('שגיאה בעיבוד השאלה. נסה שוב.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border p-6" style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}>
      <h3 className="font-semibold text-lg mb-1" style={{ color: 'var(--color-text-primary)' }}>
        💬 שאל את הנתונים
      </h3>
      <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
        כתוב שאלה בעברית חופשית וקבל תשובה מבוססת נתונים
      </p>

      <div className="flex gap-2 mb-3">
        <input
          className="flex-1 rounded-lg border px-4 py-2 text-sm outline-none"
          style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-primary)', backgroundColor: 'var(--color-bg-base)' }}
          placeholder="לדוגמה: כמה הכנסות היה לנו החודש?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void submit()}
          disabled={loading}
        />
        <button
          onClick={() => void submit()}
          disabled={loading || !query.trim()}
          className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {loading ? 'מחשב...' : 'שאל'}
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {EXAMPLES.map((ex) => (
          <button
            key={ex}
            onClick={() => setQuery(ex)}
            className="text-xs px-3 py-1 rounded-full border"
            style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}
          >
            {ex}
          </button>
        ))}
      </div>

      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

      {answer && (
        <div
          className="rounded-lg p-4 text-sm leading-relaxed"
          style={{
            backgroundColor: 'var(--color-bg-base)',
            color: 'var(--color-text-primary)',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.8',
          }}
        >
          {answer}
        </div>
      )}
    </div>
  );
}
