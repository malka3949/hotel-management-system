'use client';

import { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { portalApi } from '@/lib/api/portal';

function ConfirmationContent() {
  const { token } = useParams<{ token: string }>();
  const searchParams = useSearchParams();
  const action = searchParams.get('action') ?? 'checkin';

  const isPayment = action === 'payment';

  return (
    <div className="text-center py-12 space-y-6">
      <div className="text-6xl">{isPayment ? '💳' : '✅'}</div>
      <div>
        <h2 className="text-2xl font-bold text-primary">
          {isPayment ? 'התשלום התקבל בהצלחה' : 'הצ\'ק-אין אושר בהצלחה'}
        </h2>
        <p className="text-secondary text-sm mt-2">
          {isPayment
            ? 'החשבונית שולמה. תוכל להוריד אותה בכל עת.'
            : 'נתראה בהגעה! אין צורך להמתין בקבלה — פנה לצוות לקבלת המפתח.'}
        </p>
      </div>

      <div className="flex flex-col gap-3 max-w-xs mx-auto">
        {isPayment && (
          <a
            href={portalApi.getInvoicePdfUrl(token)}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center border border-default text-primary rounded-lg py-3 font-medium hover:bg-surface/50 transition"
          >
            הורדת חשבונית PDF
          </a>
        )}
        <Link
          href={`/${token}`}
          className="block w-full text-center text-secondary text-sm underline"
        >
          חזרה לפרטי ההזמנה
        </Link>
      </div>
    </div>
  );
}

export default function ConfirmationPage() {
  return (
    <Suspense fallback={<div className="text-center py-12 text-secondary">טוען...</div>}>
      <ConfirmationContent />
    </Suspense>
  );
}
