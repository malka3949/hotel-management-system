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
        <h1 className="text-3xl font-bold text-[#0F172A]">ההזמנה אושרה!</h1>
        <p className="text-[#475569]">שלחנו אליך מייל עם קישור לניהול ההזמנה</p>
      </div>

      <div className="bg-white rounded-xl border border-[var(--color-border-default)] p-6 max-w-sm mx-auto text-right space-y-3">
        {photo && (
          <div className="flex justify-center mb-1">
            <img src={photo} alt={roomType} className="w-20 h-20 object-cover rounded-xl border border-[var(--color-border-default)]" />
          </div>
        )}
        <div>
          <p className="text-xs text-[#475569]">מספר הזמנה</p>
          <p className="font-mono text-sm text-[#0F172A] break-all">{reservationId}</p>
        </div>
        <div>
          <p className="text-xs text-[#475569]">סוג חדר</p>
          <p className="font-semibold text-[#0F172A]">{roomType}</p>
        </div>
        <div>
          <p className="text-xs text-[#475569]">תאריכים</p>
          <p className="text-[#0F172A]">{formatDate(checkIn)} — {formatDate(checkOut)} ({nights} לילות)</p>
        </div>
        <div className="border-t border-[var(--color-border-default)] pt-3">
          <p className="text-xs text-[#475569]">סה״כ לתשלום</p>
          <p className="text-xl font-bold text-[var(--color-accent)]">₪{total.toLocaleString()}</p>
          <p className="text-xs text-[#475569] mt-1">התשלום יבוצע בצ׳ק-אין</p>
        </div>
      </div>

      <p className="text-[#475569] text-sm max-w-xs mx-auto">
        קישור לניהול ההזמנה, עשיית צ׳ק-אין מקוון ותשלום — נשלח לאימייל שהזנתם
      </p>
    </div>
  );
}

export default function ConfirmationPage() {
  return <Suspense><ConfirmationPageInner /></Suspense>;
}
