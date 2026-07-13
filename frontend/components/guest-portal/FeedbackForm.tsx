'use client';

import { useState } from 'react';

interface Props {
  token: string;
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
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center mt-6">
        <p className="text-green-700 text-lg font-medium">תודה על המשוב!</p>
        <p className="text-green-600 text-sm mt-1">חוות דעתך חשובה לנו מאוד</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 mt-6" dir="rtl">
      <h3 className="text-[#0F172A] font-semibold text-lg mb-4">איך הייתה שהותך?</h3>

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
