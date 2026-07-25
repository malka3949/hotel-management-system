'use client';

import { useState } from 'react';

const PARTICLES = [
  { char: '✦', left: 12, size: 14, delay: 0.1,  dur: 2.2 },
  { char: '◆', left: 28, size: 9,  delay: 0.35, dur: 2.5 },
  { char: '✦', left: 50, size: 18, delay: 0,    dur: 2.0 },
  { char: '✺', left: 68, size: 11, delay: 0.25, dur: 2.3 },
  { char: '◆', left: 82, size: 13, delay: 0.15, dur: 2.1 },
  { char: '✦', left: 40, size: 8,  delay: 0.45, dur: 2.4 },
];

const CSS = `
@keyframes cardSlideIn {
  0%   { opacity: 0; transform: translateY(28px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes gentleRise {
  0%   { transform: translateY(0) scale(1); opacity: 0.9; }
  100% { transform: translateY(-90px) scale(0.5); opacity: 0; }
}
@keyframes dividerGrow {
  0%   { width: 0; opacity: 0; }
  100% { width: 48px; opacity: 1; }
}
@keyframes textFadeUp {
  0%   { opacity: 0; transform: translateY(10px); }
  100% { opacity: 1; transform: translateY(0); }
}
@keyframes iconPulse {
  0%,100% { transform: scale(1); }
  50%     { transform: scale(1.08); }
}
`;

function ThankYouCard() {
  return (
    <div style={{ position: 'relative', marginTop: 24, overflow: 'visible' }}>
      <style>{CSS}</style>

      {/* Rising particles */}
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            bottom: 20,
            left: `${p.left}%`,
            fontSize: p.size,
            color: '#CA8A04',
            pointerEvents: 'none',
            zIndex: 10,
            animation: `gentleRise ${p.dur}s ease-out ${p.delay}s both`,
          }}
        >
          {p.char}
        </span>
      ))}

      {/* Card */}
      <div
        style={{
          animation: 'cardSlideIn 0.5s ease-out 0.05s both',
          background: '#FFFBEB',
          border: '1.5px solid #CA8A04',
          borderRadius: 16,
          overflow: 'hidden',
        }}
      >
        {/* Gold top stripe */}
        <div style={{ height: 4, background: 'linear-gradient(90deg, #CA8A04, #FCD34D, #CA8A04)' }} />

        <div style={{ padding: '32px 28px', textAlign: 'center' }}>
          <div
            style={{
              fontSize: 36,
              animation: 'iconPulse 3s ease-in-out 0.6s infinite',
              display: 'inline-block',
            }}
          >
            ✉️
          </div>

          <div
            style={{
              height: 2,
              background: '#CA8A04',
              margin: '16px auto',
              borderRadius: 2,
              animation: 'dividerGrow 0.6s ease-out 0.4s both',
            }}
          />

          <p
            style={{
              color: '#92400E',
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: '0.02em',
              animation: 'textFadeUp 0.5s ease-out 0.5s both',
              opacity: 0,
            }}
          >
            תודה רבה!
          </p>

          <p
            style={{
              color: '#78350F',
              fontSize: 15,
              marginTop: 8,
              animation: 'textFadeUp 0.5s ease-out 0.65s both',
              opacity: 0,
            }}
          >
            המשוב שלך חשוב לנו מאוד
          </p>

          <p
            style={{
              color: '#CA8A04',
              fontSize: 13,
              marginTop: 16,
              letterSpacing: '0.05em',
              animation: 'textFadeUp 0.5s ease-out 0.8s both',
              opacity: 0,
            }}
          >
            ✦ נשמח לארח אותך שוב ✦
          </p>
        </div>
      </div>
    </div>
  );
}

interface Props {
  token: string;
}

export default function FeedbackForm({ token }: Props) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (rating === 0) return;
    setLoading(true);
    try {
      await fetch(`/api/v1/portal/feedback/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, comment }),
      });
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  }

  if (submitted) return <ThankYouCard />;

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 mt-6" dir="rtl">
      <h3 className="text-[#0F172A] font-semibold text-lg mb-1">שתף אותנו בחוויה</h3>
      <p className="text-[#475569] text-sm mb-4">ניתן לשלוח משוב בכל שלב של השהייה</p>

      <div className="flex gap-2 mb-4 justify-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className={`text-4xl transition-all duration-100 hover:scale-125 active:scale-95 ${
              star <= (hover || rating) ? 'text-yellow-400 drop-shadow-sm' : 'text-gray-300'
            }`}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="ספר לנו על החוויה שלך (אופציונלי)"
        rows={3}
        className="w-full border border-[#E2E8F0] rounded-lg p-3 text-sm text-[#0F172A] resize-none focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
      />

      <button
        onClick={handleSubmit}
        disabled={rating === 0 || loading}
        className="mt-3 w-full bg-[#1E3A8A] text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-40 hover:bg-[#3B82F6] transition-colors"
      >
        {loading ? 'שולח...' : 'שלח משוב'}
      </button>
    </div>
  );
}
