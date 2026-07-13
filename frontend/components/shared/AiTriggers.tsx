'use client';

import { useState } from 'react';

type TriggerKey = 'digest' | 'reminders' | 'upgrades';

const TRIGGERS: { key: TriggerKey; label: string; desc: string }[] = [
  { key: 'digest', label: 'שלח סיכום בוקר', desc: 'שולח AI digest לכל מנהלי הסניפים' },
  { key: 'reminders', label: 'שלח תזכורות צוות', desc: 'תזכורות לצוות לגבי אורחים עם הערות מחר' },
  { key: 'upgrades', label: 'שלח הצעות שדרוג', desc: 'הצעות שדרוג חדר לאורחים המגיעים מחר' },
];

export default function AiTriggers() {
  const [states, setStates] = useState<Record<TriggerKey, 'idle' | 'loading' | 'done' | 'error'>>({
    digest: 'idle',
    reminders: 'idle',
    upgrades: 'idle',
  });

  async function trigger(key: TriggerKey) {
    setStates((s) => ({ ...s, [key]: 'loading' }));
    try {
      const res = await fetch(`/api/v1/ai/trigger/${key}`, { method: 'POST', credentials: 'include' });
      setStates((s) => ({ ...s, [key]: res.ok ? 'done' : 'error' }));
    } catch {
      setStates((s) => ({ ...s, [key]: 'error' }));
    }
    setTimeout(() => setStates((s) => ({ ...s, [key]: 'idle' })), 4000);
  }

  return (
    <div
      className="rounded-lg border p-4"
      style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
    >
      <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
        הפעלה ידנית — AI
      </h3>
      <div className="flex flex-col gap-3">
        {TRIGGERS.map(({ key, label, desc }) => {
          const state = states[key];
          return (
            <div key={key} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text-primary)' }}>
                  {label}
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                  {desc}
                </p>
              </div>
              <button
                onClick={() => trigger(key)}
                disabled={state === 'loading'}
                className="shrink-0 px-3 py-1.5 rounded text-xs font-medium transition-colors disabled:opacity-50"
                style={{
                  backgroundColor:
                    state === 'done'
                      ? '#059669'
                      : state === 'error'
                        ? '#DC2626'
                        : 'var(--color-primary)',
                  color: '#fff',
                }}
              >
                {state === 'loading' ? 'שולח...' : state === 'done' ? 'נשלח ✓' : state === 'error' ? 'שגיאה' : 'הפעל'}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
