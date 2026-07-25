'use client';

import { useEffect } from 'react';

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[400px]" dir="rtl">
      <div className="text-center p-8 max-w-md">
        <div className="text-5xl mb-4">⚠️</div>
        <h2 className="text-xl font-bold text-[#0F172A] mb-2">משהו השתבש</h2>
        <p className="text-[#475569] text-sm mb-6">
          {error.message || 'אירעה שגיאה בלתי צפויה. אנא נסה שוב.'}
        </p>
        <button
          onClick={reset}
          className="bg-[#1E3A8A] text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-[#3B82F6] transition-colors"
        >
          נסה שוב
        </button>
      </div>
    </div>
  );
}
