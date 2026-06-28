'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  getReservation,
  updateReservationStatus,
  cancelReservation,
  type Reservation,
  type ReservationStatus,
  STATUS_LABELS,
  SOURCE_LABELS,
} from '@/lib/api/reservations';
import { checkIn, checkOut, type Invoice } from '@/lib/api/checkin';
import { ReservationStatusBadge } from '@/components/shared/ReservationStatusBadge';
import { InvoiceSummary } from '@/components/shared/InvoiceSummary';

const VALID_TRANSITIONS: Record<ReservationStatus, ReservationStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['checked_in', 'cancelled'],
  checked_in: ['checked_out', 'no_show'],
  checked_out: [],
  cancelled: [],
  no_show: [],
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function nightsBetween(checkIn: string, checkOut: string): number {
  return Math.round((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000);
}

export default function ReservationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [showCheckInDialog, setShowCheckInDialog] = useState(false);
  const [checkInNotes, setCheckInNotes] = useState('');
  const [showCheckOutDialog, setShowCheckOutDialog] = useState(false);
  const [checkOutNotes, setCheckOutNotes] = useState('');
  const [checkOutInvoice, setCheckOutInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    if (!params.id) return;
    setLoading(true);
    getReservation(params.id)
      .then(setReservation)
      .catch((err) => setError(err instanceof Error ? err.message : 'שגיאה בטעינה'))
      .finally(() => setLoading(false));
  }, [params.id]);

  async function handleStatusChange(newStatus: ReservationStatus) {
    if (!reservation) return;
    setActionError('');
    setSubmitting(true);
    try {
      const updated = await updateReservationStatus(reservation.id, newStatus);
      setReservation(updated);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'שגיאה בעדכון סטטוס');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckIn() {
    if (!reservation) return;
    setActionError('');
    setSubmitting(true);
    try {
      const updated = await checkIn(reservation.id, checkInNotes || undefined);
      setReservation(updated as unknown as Reservation);
      setShowCheckInDialog(false);
      setCheckInNotes('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "שגיאה בצ'ק-אין");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCheckOut() {
    if (!reservation) return;
    setActionError('');
    setSubmitting(true);
    try {
      const result = await checkOut(reservation.id, checkOutNotes || undefined);
      setReservation(result.reservation as unknown as Reservation);
      if (result.invoice) setCheckOutInvoice(result.invoice);
      setShowCheckOutDialog(false);
      setCheckOutNotes('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "שגיאה בצ'ק-אאוט");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCancel() {
    if (!reservation || !cancelReason.trim()) return;
    setActionError('');
    setSubmitting(true);
    try {
      const updated = await cancelReservation(reservation.id, cancelReason.trim());
      setReservation(updated);
      setShowCancelDialog(false);
      setCancelReason('');
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'שגיאה בביטול');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>טוען...</p>;
  }
  if (error || !reservation) {
    return <p className="text-sm" style={{ color: '#DC2626' }}>{error || 'הזמנה לא נמצאה'}</p>;
  }

  const nights = nightsBetween(reservation.checkInDate, reservation.checkOutDate);
  const nextStatuses = VALID_TRANSITIONS[reservation.status].filter(
    (s) => s !== 'cancelled' && s !== 'checked_in' && s !== 'checked_out',
  );
  const canCheckIn = reservation.status === 'confirmed';
  const canCheckOut = reservation.status === 'checked_in';
  const canCancel = VALID_TRANSITIONS[reservation.status].includes('cancelled');

  return (
    <div className="max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          ← חזרה
        </button>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          הזמנה #{reservation.id.slice(0, 8).toUpperCase()}
        </h2>
        <ReservationStatusBadge status={reservation.status} />
      </div>

      {actionError && (
        <div className="mb-4 px-4 py-3 rounded-md text-sm" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Guest card */}
        <div
          className="p-5 rounded-lg border space-y-3"
          style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
        >
          <h3 className="font-medium text-sm" style={{ color: 'var(--color-text-secondary)' }}>אורח ראשי</h3>
          <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>{reservation.guest.fullName}</p>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }} dir="ltr">{reservation.guest.phone}</p>
          {reservation.guest.email && (
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{reservation.guest.email}</p>
          )}
          <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            {reservation.adults} מבוגרים · {reservation.children} ילדים
          </p>
        </div>

        {/* Room card */}
        <div
          className="p-5 rounded-lg border space-y-3"
          style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
        >
          <h3 className="font-medium text-sm" style={{ color: 'var(--color-text-secondary)' }}>חדר</h3>
          <p className="font-semibold" style={{ color: 'var(--color-text-primary)' }}>
            חדר {reservation.room.number} · {reservation.room.roomType.name}
          </p>
          {reservation.room.floor !== null && (
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>קומה {reservation.room.floor}</p>
          )}
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            ₪{parseFloat(reservation.room.roomType.basePrice).toFixed(2)} / לילה
          </p>
        </div>

        {/* Dates card */}
        <div
          className="p-5 rounded-lg border space-y-3"
          style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
        >
          <h3 className="font-medium text-sm" style={{ color: 'var(--color-text-secondary)' }}>תאריכים ומחיר</h3>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="block" style={{ color: 'var(--color-text-secondary)' }}>כניסה</span>
              <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{formatDate(reservation.checkInDate)}</span>
            </div>
            <div>
              <span className="block" style={{ color: 'var(--color-text-secondary)' }}>יציאה</span>
              <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>{formatDate(reservation.checkOutDate)}</span>
            </div>
          </div>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{nights} לילות</p>
          <p className="font-semibold text-lg" style={{ color: 'var(--color-primary)' }}>
            ₪{parseFloat(reservation.totalPrice).toFixed(2)}
          </p>
          {reservation.source && (
            <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              מקור: {SOURCE_LABELS[reservation.source]}
            </p>
          )}
        </div>

        {/* Meta card */}
        <div
          className="p-5 rounded-lg border space-y-3"
          style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
        >
          <h3 className="font-medium text-sm" style={{ color: 'var(--color-text-secondary)' }}>מידע נוסף</h3>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            נוצר ע&quot;י: <span style={{ color: 'var(--color-text-primary)' }}>{reservation.createdByUser.name}</span>
          </p>
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
            {formatDateTime(reservation.createdAt)}
          </p>
          {reservation.notes && (
            <div>
              <span className="block text-xs font-medium mb-1" style={{ color: 'var(--color-text-secondary)' }}>הערות</span>
              <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{reservation.notes}</p>
            </div>
          )}
          {reservation.cancellationReason && (
            <div>
              <span className="block text-xs font-medium mb-1" style={{ color: '#DC2626' }}>סיבת ביטול</span>
              <p className="text-sm" style={{ color: 'var(--color-text-primary)' }}>{reservation.cancellationReason}</p>
              {reservation.cancelledAt && (
                <p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{formatDateTime(reservation.cancelledAt)}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      {(nextStatuses.length > 0 || canCheckIn || canCheckOut || canCancel) && (
        <div
          className="mt-4 p-5 rounded-lg border"
          style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
        >
          <h3 className="font-medium text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>פעולות</h3>
          <div className="flex flex-wrap gap-2">
            {canCheckIn && (
              <button
                onClick={() => setShowCheckInDialog(true)}
                disabled={submitting}
                className="px-4 py-2 rounded-md text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                צ&apos;ק-אין
              </button>
            )}
            {canCheckOut && (
              <button
                onClick={() => setShowCheckOutDialog(true)}
                disabled={submitting}
                className="px-4 py-2 rounded-md text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                צ&apos;ק-אאוט
              </button>
            )}
            {nextStatuses.map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                disabled={submitting}
                className="px-4 py-2 rounded-md text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
            {canCancel && (
              <button
                onClick={() => setShowCancelDialog(true)}
                disabled={submitting}
                className="px-4 py-2 rounded-md text-sm font-medium border disabled:opacity-50"
                style={{ borderColor: '#FCA5A5', color: '#DC2626' }}
              >
                ביטול הזמנה
              </button>
            )}
          </div>
        </div>
      )}

      {checkOutInvoice && (
        <div
          className="mt-4 p-5 rounded-lg border"
          style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
        >
          <h3 className="font-medium text-sm mb-3" style={{ color: 'var(--color-text-secondary)' }}>חשבונית</h3>
          <InvoiceSummary invoice={checkOutInvoice} />
        </div>
      )}

      {/* Check-in dialog */}
      {showCheckInDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md p-6 rounded-lg shadow-xl" style={{ backgroundColor: 'var(--color-bg-surface)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              אישור צ&apos;ק-אין
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              {reservation.guest.fullName} · חדר {reservation.room.number}
            </p>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
              הערות (אופציונלי)
            </label>
            <textarea
              value={checkInNotes}
              onChange={(e) => setCheckInNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border px-3 py-2 text-sm resize-none mb-4"
              style={{ borderColor: 'var(--color-border-default)' }}
            />
            <div className="flex gap-3">
              <button
                onClick={handleCheckIn}
                disabled={submitting}
                className="px-4 py-2 rounded-md text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-accent)' }}
              >
                {submitting ? 'מבצע...' : "אשר צ'ק-אין"}
              </button>
              <button
                onClick={() => { setShowCheckInDialog(false); setCheckInNotes(''); }}
                className="px-4 py-2 rounded-md text-sm font-medium border"
                style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Check-out dialog */}
      {showCheckOutDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="w-full max-w-md p-6 rounded-lg shadow-xl" style={{ backgroundColor: 'var(--color-bg-surface)' }}>
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              אישור צ&apos;ק-אאוט
            </h3>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
              {reservation.guest.fullName} · חדר {reservation.room.number}
            </p>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
              הערות (אופציונלי)
            </label>
            <textarea
              value={checkOutNotes}
              onChange={(e) => setCheckOutNotes(e.target.value)}
              rows={2}
              className="w-full rounded-md border px-3 py-2 text-sm resize-none mb-4"
              style={{ borderColor: 'var(--color-border-default)' }}
            />
            <div className="flex gap-3">
              <button
                onClick={handleCheckOut}
                disabled={submitting}
                className="px-4 py-2 rounded-md text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: 'var(--color-primary)' }}
              >
                {submitting ? 'מבצע...' : "אשר צ'ק-אאוט"}
              </button>
              <button
                onClick={() => { setShowCheckOutDialog(false); setCheckOutNotes(''); }}
                className="px-4 py-2 rounded-md text-sm font-medium border"
                style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div
            className="w-full max-w-md p-6 rounded-lg shadow-xl"
            style={{ backgroundColor: 'var(--color-bg-surface)' }}
          >
            <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--color-text-primary)' }}>
              ביטול הזמנה
            </h3>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--color-text-primary)' }}>
              סיבת ביטול *
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="פרט את סיבת הביטול..."
              className="w-full rounded-md border px-3 py-2 text-sm resize-none mb-4"
              style={{ borderColor: 'var(--color-border-default)' }}
            />
            <div className="flex gap-3">
              <button
                onClick={handleCancel}
                disabled={submitting || !cancelReason.trim()}
                className="px-4 py-2 rounded-md text-sm font-medium text-white disabled:opacity-50"
                style={{ backgroundColor: '#DC2626' }}
              >
                {submitting ? 'מבטל...' : 'אישור ביטול'}
              </button>
              <button
                onClick={() => { setShowCancelDialog(false); setCancelReason(''); }}
                className="px-4 py-2 rounded-md text-sm font-medium border"
                style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
