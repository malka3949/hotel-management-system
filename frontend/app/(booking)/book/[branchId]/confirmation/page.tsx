'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function ConfirmationPageInner() {
  const sp = useSearchParams();
  const reservationId = sp.get('reservationId') ?? '';
  const roomType = sp.get('roomType') ?? '';
  const checkIn = sp.get('checkIn') ?? '';
  const checkOut = sp.get('checkOut') ?? '';
  const total = Number(sp.get('total') ?? 0);
  const photo = sp.get('photo') ?? '';

  const formatDate = (d: string) => new Date(d).toLocaleDateString('he-IL');
  const nights = checkIn && checkOut
    ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-8">
      <div className="text-6xl">✓</div>

      <div className="space-y-2">
        <h1 className="text-3xl font-bold" style={{ color: 'var(--color-text-primary)' }}>ההזמנה אושררה!</h1>
        <p style={{ color: 'var(--color-text-secondary)' }}>שלחנו אליך מייל עם קישור לניהול ההזמנה</p>
      </div>

      <div className="rounded-xl border p-6 max-w-sm mx-auto text-right space-y-3" style={{ backgroundColor: 'var(--color-bg-surface)', borderColor: 'var(--color-border-default)' }}>
        {photo && (
          <div className="flex justify-center mb-1">
            <img src={photo} alt={roomType} className="w-20 h-20 object-cover rounded-xl border" style={{ borderColor: 'var(--color-border-default)' }} />
          </div>
        )}
        <div>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>מספר הזמנה</p>
          <p className="font-mono text-sm break-all" style={{ color: 'var(--color-text-primary)' }}>{reservationId}</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>סוג חדר</p>
          <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{roomType}</p>
        </div>
        <div>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>תאריכים</p>
          <p style={{ color: 'var(--color-text-primary)' }}>{formatDate(checkIn)} — {formatDate(checkOut)} ({nights} לילות)</p>
        </div>
        <div className="border-t pt-3" style={{ borderColor: 'var(--color-border-default)' }}>
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>סה״כ לתשלום</p>
          <p className="text-xl font-bold" style={{ color: 'var(--color-accent)' }}>₪{total.toLocaleString()}</p>
          <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>התשלום יבוצע בצ'ק-אין</p>
        </div>
      </div>

      <p className="text-sm max-w-xs mx-auto" style={{ color: 'var(--color-text-secondary)' }}>
        קישור לניהול ההזמנה, עשיית צ'ק-אין מקוון ותשלום — נשלח לאימייל שהזנתם
      </p>
    </div>
  );
}

export default function ConfirmationPage() {
  return <Suspense><ConfirmationPageInner /></Suspense>;
}
