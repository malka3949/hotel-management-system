'use client';

import { useState, useRef, useEffect } from 'react';
import { sendConciergeMessage, type ConversationMessage } from '@/lib/api/ai';

interface Props {
  token: string;
}

export function AiConcierge({ token }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  async function send() {
    if (!input.trim() || loading) return;
    const userMsg = input.trim();
    setInput('');
    setError('');
    setHistory((h) => [...h, { role: 'user', content: userMsg }]);
    setLoading(true);
    try {
      const reply = await sendConciergeMessage(token, userMsg, history);
      setHistory((h) => [...h, { role: 'assistant', content: reply }]);
    } catch {
      setError('שגיאה בתקשורת עם הקונסיירז׳. נסה שוב.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mt-4">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="w-full rounded-lg py-3 text-white font-medium transition"
          style={{ backgroundColor: 'var(--color-primary)' }}
        >
          💬 שאל את הקונסיירז׳ שלנו
        </button>
      ) : (
        <div
          className="rounded-lg border overflow-hidden flex flex-col"
          style={{ borderColor: 'var(--color-border-default)', height: '360px' }}
        >
          <div
            className="flex items-center justify-between px-4 py-2 text-white text-sm font-medium"
            style={{ backgroundColor: 'var(--color-primary)' }}
          >
            <span>🤖 קונסיירז׳ AI</span>
            <button onClick={() => setOpen(false)} className="opacity-80 hover:opacity-100">✕</button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2" style={{ backgroundColor: 'var(--color-bg-base)' }}>
            {history.length === 0 && (
              <p className="text-xs text-center py-4" style={{ color: 'var(--color-text-secondary)' }}>
                שלום! אני הקונסיירז׳ של המלון. במה אוכל לעזור?
              </p>
            )}
            {history.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-start' : 'justify-end'}`}>
                <div
                  className="max-w-[80%] rounded-lg px-3 py-2 text-sm"
                  style={{
                    backgroundColor: m.role === 'user' ? 'var(--color-bg-surface)' : 'var(--color-primary)',
                    color: m.role === 'user' ? 'var(--color-text-primary)' : '#fff',
                    border: m.role === 'user' ? '1px solid var(--color-border-default)' : 'none',
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {m.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-end">
                <div className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: 'var(--color-primary)', color: '#fff' }}>
                  מקליד...
                </div>
              </div>
            )}
            {error && <p className="text-xs text-red-500 text-center">{error}</p>}
            <div ref={bottomRef} />
          </div>

          <div className="flex gap-2 p-2" style={{ borderTop: '1px solid var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}>
            <input
              className="flex-1 rounded border px-3 py-2 text-sm outline-none"
              style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-primary)' }}
              placeholder="שאל שאלה..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void send()}
              disabled={loading}
            />
            <button
              onClick={() => void send()}
              disabled={loading || !input.trim()}
              className="px-3 py-2 rounded text-white text-sm font-medium disabled:opacity-40"
              style={{ backgroundColor: 'var(--color-primary)' }}
            >
              שלח
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
