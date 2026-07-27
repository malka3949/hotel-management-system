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
        <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--color-text-primary)' }}>משהו השתבש</h2>
        <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>
          {error.message || 'אירעה שגיאה בלתי צפויה. אנא נסה שוב.'}
        </p>
        <button
          onClick={reset}
          className="text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          נסה שוב
        </button>
      </div>
    </div>
  );
}
