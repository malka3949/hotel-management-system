'use client';

import { useState } from 'react';

interface Props {
  token: string;
}

const SPARKLES = [
  { char: '✦', left: 8,  size: 18, delay: 0 },
  { char: '★', left: 20, size: 14, delay: 0.1 },
  { char: '✧', left: 35, size: 22, delay: 0.05 },
  { char: '✦', left: 50, size: 16, delay: 0.18 },
  { char: '★', left: 63, size: 20, delay: 0.08 },
  { char: '✧', left: 78, size: 14, delay: 0.14 },
  { char: '✦', left: 90, size: 18, delay: 0.02 },
];

function GoldSparkles() {
  return (
    <>
      <style>{`
        @keyframes goldRise {
          0%   { transform: translateY(0) scale(1);   opacity: 1; }
          60%  { opacity: 0.8; }
          100% { transform: translateY(-72px) scale(0.4); opacity: 0; }
        }
      `}</style>
      <div className="relative h-20 pointer-events-none overflow-hidden" aria-hidden="true">
        {SPARKLES.map((s, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: `${s.left}%`,
              bottom: 0,
              fontSize: s.size,
              color: '#D97706',
              animation: `goldRise 1.6s ease-out ${s.delay}s forwards`,
            }}
          >
            {s.char}
          </span>
        ))}
      </div>
    </>
  );
}

export default function FeedbackForm({ token }: Props) {
  const [rating, setRating] = useState(0);
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

  if (submitted) {
    return (
      <div className="rounded-xl mt-6 overflow-hidden">
        <GoldSparkles />
        <div
          className="border rounded-b-xl p-6 text-center"
          style={{ borderColor: '#FCD34D', backgroundColor: '#FFFBEB' }}
        >
          <p className="font-semibold text-lg" style={{ color: '#92400E' }}>תודה על המשוב!</p>
          <p className="text-sm mt-1" style={{ color: '#B45309' }}>חוות דעתך חשובה לנו מאוד</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 mt-6" dir="rtl">
      <h3 className="text-[#0F172A] font-semibold text-lg mb-1">שתף אותנו בחוויה שלך</h3>
      <p className="text-sm text-[#475569] mb-4">ניתן לשלוח משוב בכל שלב של השהייה</p>

      <div className="flex gap-2 mb-4 justify-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            className={`text-3xl transition-transform hover:scale-110 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
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
