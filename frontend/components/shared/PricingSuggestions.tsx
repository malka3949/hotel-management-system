'use client';

import { useState } from 'react';
import { getPricingSuggestions } from '@/lib/api/ai';

export function PricingSuggestions() {
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function fetch() {
    setLoading(true);
    setError('');
    try {
      const suggestions = await getPricingSuggestions();
      setResult(suggestions);
    } catch {
      setError('שגיאה בקבלת הצעות תמחור. נסה שוב.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-lg border p-6" style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold text-lg" style={{ color: 'var(--color-text-primary)' }}>
            🤖 הצעות תמחור AI
          </h3>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-secondary)' }}>
            ניתוח תפוסה ועונתיות לקבלת המלצות מחיר
          </p>
        </div>
        <button
          onClick={() => void fetch()}
          disabled={loading}
          className="px-4 py-2 rounded-lg text-white text-sm font-medium disabled:opacity-50"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          {loading ? 'מנתח...' : 'קבל הצעות'}
        </button>
      </div>

      {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

      {result && (
        <div
          className="rounded-lg p-4 text-sm leading-relaxed"
          style={{
            backgroundColor: 'var(--color-bg-base)',
            color: 'var(--color-text-primary)',
            whiteSpace: 'pre-wrap',
            fontFamily: 'Arial, sans-serif',
            lineHeight: '1.8',
          }}
        >
          {result}
        </div>
      )}

      {!result && !loading && (
        <div
          className="rounded-lg p-8 text-center text-sm"
          style={{ backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-secondary)' }}
        >
          לחץ על &ldquo;קבל הצעות&rdquo; לקבלת המלצות תמחור מבוססות AI
        </div>
      )}
    </div>
  );
}
