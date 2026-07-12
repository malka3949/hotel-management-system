'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { portalApi, ReservationDetail } from '@/lib/api/portal';
import { AiConcierge } from '@/components/guest-portal/AiConcierge';

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pending: 'ממתין',
    confirmed: 'מאושר',
    checked_in: 'שהייה פעילה',
    checked_out: 'יצא',
    cancelled: 'בוטל',
    no_show: 'לא הגיע',
  };
  const colors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    checked_in: 'bg-green-100 text-green-800',
    checked_out: 'bg-gray-100 text-gray-600',
    cancelled: 'bg-red-100 text-red-800',
    no_show: 'bg-orange-100 text-orange-800',
  };
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${colors[status] ?? 'bg-gray-100'}`}>
      {labels[status] ?? status}
    </span>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmt(n: number) {
  return n.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function PortalLandingPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    portalApi.getReservation(token)
      .then(setReservation)
      .catch((e: Error) => {
        if (e.message.includes('EXPIRED') || e.message.includes('INVALID')) {
          router.push('/expired');
        } else {
          setError(e.message);
        }
      })
      .finally(() => setLoading(false));
  }, [token, router]);

  if (loading) return <div className="text-center py-12 text-secondary">טוען...</div>;
  if (error) return <div className="text-center py-12 text-red-500">{error}</div>;
  if (!reservation) return null;

  const alreadyCheckedIn = !!reservation.checkIn;
  const isPreCheckedIn = !!reservation.onlineCheckIn && !alreadyCheckedIn;
  const isPaid = reservation.invoice?.status === 'paid';

  const totalPaid = reservation.invoice?.payments?.reduce((s, p) => s + Number(p.amount), 0) ?? 0;
  const hasPartialPayment = totalPaid > 0 && reservation.invoice?.status === 'finalized';
  const remaining = Number(reservation.invoice?.total ?? 0) - totalPaid;

  return (
    <div className="space-y-6">
      <div className="bg-surface border border-default rounded-xl p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-primary">{reservation.guest.fullName}</h2>
            <p className="text-secondary text-sm">{reservation.room.roomType.name} — חדר {reservation.room.number}</p>
          </div>
          <StatusBadge status={reservation.status} />
        </div>

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-secondary text-xs mb-0.5">צ&apos;ק-אין</p>
            <p className="font-medium text-primary">{formatDate(reservation.checkInDate)}</p>
          </div>
          <div>
            <p className="text-secondary text-xs mb-0.5">צ&apos;ק-אאוט</p>
            <p className="font-medium text-primary">{formatDate(reservation.checkOutDate)}</p>
          </div>
        </div>

        {reservation.invoice && (
          <div className="border-t border-default pt-3 text-sm space-y-1">
            {isPaid && (
              <div className="flex justify-between font-medium" style={{ color: '#15803D' }}>
                <span>✓ שולם במלואה</span>
                <span>₪{fmt(Number(reservation.invoice.total))}</span>
              </div>
            )}
            {hasPartialPayment && (
              <>
                <div className="flex justify-between" style={{ color: 'var(--color-text-secondary)' }}>
                  <span>שולם מקוון</span>
                  <span>₪{fmt(totalPaid)}</span>
                </div>
                <div className="flex justify-between font-bold" style={{ color: '#92400E' }}>
                  <span>יתרה לצ&apos;קאאוט</span>
                  <span>₪{fmt(remaining)}</span>
                </div>
              </>
            )}
            {!isPaid && !hasPartialPayment && (
              <div className="flex justify-between">
                <span className="text-secondary">סה&quot;כ לתשלום</span>
                <span className="font-bold text-primary">₪{fmt(Number(reservation.invoice.total))}</span>
              </div>
            )}
          </div>
        )}

        {isPreCheckedIn && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-700 text-sm">
            ✓ צ&apos;ק-אין מקוון הושלם — נתראה בהגעה!
          </div>
        )}
      </div>

      <div className="grid gap-3">
        {!alreadyCheckedIn && (
          <Link
            href={`/${token}/check-in`}
            className="block w-full text-center bg-primary text-white rounded-lg py-3 font-medium hover:bg-primary/90 transition"
          >
            {isPreCheckedIn ? "עדכון צ'ק-אין מקוון" : "צ'ק-אין מקוון"}
          </Link>
        )}

        {reservation.invoice && !isPaid && !hasPartialPayment && (
          <Link
            href={`/${token}/payment`}
            className="block w-full text-center bg-accent text-white rounded-lg py-3 font-medium hover:bg-accent/90 transition"
          >
            תשלום חשבונית
          </Link>
        )}

        {hasPartialPayment && (
          <div
            className="rounded-lg px-4 py-3 text-sm text-center"
            style={{ backgroundColor: '#FEF9C3', border: '1px solid #FDE047', color: '#92400E' }}
          >
            שולמו ₪{fmt(totalPaid)} מקוון — יתרה ₪{fmt(remaining)} תיגבה בצ&apos;קאאוט בקבלה
          </div>
        )}

        {!reservation.invoice && reservation.status === 'confirmed' && (
          <p className="text-center text-sm py-2" style={{ color: 'var(--color-text-secondary)' }}>
            התשלום יתאפשר לאחר הצ&apos;ק-אין בקבלה
          </p>
        )}

        {(isPaid || hasPartialPayment) && (
          <a
            href={portalApi.getInvoicePdfUrl(token)}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center border border-default text-primary rounded-lg py-3 font-medium hover:bg-surface/50 transition"
          >
            הורדת חשבונית PDF
          </a>
        )}
      </div>

      <AiConcierge token={token} />
    </div>
  );
}
