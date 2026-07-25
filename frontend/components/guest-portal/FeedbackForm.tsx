'use client';

import { useState } from 'react';

const BURST = [
  { a: 270, d: 85,  ch: '✦', s: 22, t: 0    },
  { a: 315, d: 95,  ch: '★', s: 16, t: 0.05 },
  { a:   0, d: 80,  ch: '◆', s: 14, t: 0.1  },
  { a:  45, d: 95,  ch: '✺', s: 18, t: 0.05 },
  { a:  90, d: 85,  ch: '✦', s: 20, t: 0    },
  { a: 135, d: 95,  ch: '★', s: 14, t: 0.1  },
  { a: 180, d: 80,  ch: '◆', s: 16, t: 0.05 },
  { a: 225, d: 95,  ch: '✺', s: 12, t: 0.1  },
  { a: 300, d: 115, ch: '❋', s: 18, t: 0.15 },
  { a:  60, d: 115, ch: '✸', s: 16, t: 0.15 },
  { a: 150, d: 105, ch: '✦', s: 12, t: 0.08 },
  { a: 240, d: 105, ch: '★', s: 20, t: 0.12 },
];

const ANIM_CSS = `
@keyframes burstOut {
  0%   { transform: translate(0,0) scale(1.2); opacity: 1; }
  100% { transform: translate(var(--bx),var(--by)) scale(0); opacity: 0; }
}
@keyframes cardSpring {
  0%   { opacity: 0; transform: translateY(50px) scale(0.85); }
  60%  { transform: translateY(-8px) scale(1.02); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}
@keyframes crownFloat {
  0%,100% { transform: translateY(0) rotate(-4deg) scale(1); }
  50%     { transform: translateY(-10px) rotate(4deg) scale(1.05); }
}
@keyframes shimmerSweep {
  0%   { transform: translateX(200%); }
  100% { transform: translateX(-200%); }
}
@keyframes ringPulse {
  0%   { box-shadow: 0 0 0 0 rgba(202,138,4,0.6), 0 20px 60px rgba(30,58,138,0.4); }
  50%  { box-shadow: 0 0 0 24px rgba(202,138,4,0.1), 0 20px 60px rgba(30,58,138,0.4); }
  100% { box-shadow: 0 0 0 40px rgba(202,138,4,0), 0 20px 60px rgba(30,58,138,0.4); }
}
@keyframes starTwinkle {
  0%,100% { opacity: 0.5; transform: scale(1); }
  50%     { opacity: 0.15; transform: scale(0.6); }
}
`;

function toXY(angleDeg: number, dist: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: Math.round(dist * Math.cos(rad)), y: Math.round(dist * Math.sin(rad)) };
}

const CORNERS = [
  { top: 12, left: 16 },
  { top: 12, right: 16 },
  { bottom: 12, left: 16 },
  { bottom: 12, right: 16 },
] as const;

function SuccessCard() {
  return (
    <div style={{ position: 'relative', overflow: 'visible', marginTop: 24 }}>
      <style>{ANIM_CSS}</style>

      {/* Burst particles — centered on card */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', pointerEvents: 'none', zIndex: 20 }}>
        {BURST.map((p, i) => {
          const { x, y } = toXY(p.a, p.d);
          return (
            <span
              key={i}
              style={{
                position: 'absolute',
                fontSize: p.s,
                color: '#CA8A04',
                '--bx': `${x}px`,
                '--by': `${y}px`,
                animation: `burstOut 0.75s cubic-bezier(0.25,0.46,0.45,0.94) ${p.t}s both`,
                left: '-0.5em',
                top: '-0.5em',
              } as React.CSSProperties}
            >
              {p.ch}
            </span>
          );
        })}
      </div>

      {/* Main card */}
      <div
        style={{
          animation: 'cardSpring 0.65s cubic-bezier(0.34,1.56,0.64,1) 0.15s both, ringPulse 1.5s ease-out 0.4s 1',
          background: 'linear-gradient(145deg, #1E3A8A 0%, #0F172A 60%, #1a0a2e 100%)',
          border: '2px solid #CA8A04',
          borderRadius: 18,
          padding: '36px 28px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Shimmer sweep */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', borderRadius: 16 }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'linear-gradient(105deg, transparent 35%, rgba(202,138,4,0.2) 50%, transparent 65%)',
              animation: 'shimmerSweep 1s ease-in-out 0.6s 1',
            }}
          />
        </div>

        {/* Corner diamonds */}
        {CORNERS.map((pos, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              color: '#CA8A04',
              fontSize: 12,
              animation: `starTwinkle 2s ease-in-out ${i * 0.5}s infinite`,
              ...pos,
            }}
          >
            ◆
          </span>
        ))}

        {/* Crown */}
        <div
          style={{
            fontSize: 52,
            animation: 'crownFloat 3s ease-in-out 0.8s infinite',
            display: 'inline-block',
            filter: 'drop-shadow(0 4px 12px rgba(202,138,4,0.5))',
          }}
        >
          👑
        </div>

        <p
          style={{
            color: '#FCD34D',
            fontSize: 24,
            fontWeight: 700,
            marginTop: 14,
            letterSpacing: '0.02em',
            textShadow: '0 2px 12px rgba(202,138,4,0.4)',
          }}
        >
          תודה רבה!
        </p>
        <p style={{ color: '#93C5FD', fontSize: 15, marginTop: 8, letterSpacing: '0.01em' }}>
          המשוב שלך עוזר לנו להעניק חוויה מושלמת
        </p>
        <div
          style={{
            marginTop: 16,
            padding: '8px 20px',
            background: 'rgba(202,138,4,0.12)',
            border: '1px solid rgba(202,138,4,0.3)',
            borderRadius: 50,
            display: 'inline-block',
          }}
        >
          <p style={{ color: '#CA8A04', fontSize: 13, letterSpacing: '0.05em' }}>✦ נשמח לארח אותך שוב ✦</p>
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

  if (submitted) return <SuccessCard />;

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
