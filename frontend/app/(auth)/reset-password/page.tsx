'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

// Legacy: /reset-password?token=X → /reset-password/X (token in path, not query)
function LegacyRedirect() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  useEffect(() => {
    if (token) {
      void router.replace(`/reset-password/${token}`);
    } else {
      void router.replace('/forgot-password');
    }
  }, [token, router]);

  return <p className="text-center text-sm">מעביר...</p>;
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<p className="text-center text-sm">טוען...</p>}>
      <LegacyRedirect />
    </Suspense>
  );
}
