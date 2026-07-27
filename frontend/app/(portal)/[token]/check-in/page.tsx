'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { portalApi, ReservationDetail } from '@/lib/api/portal';

export default function OnlineCheckInPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    fullName: '',
    passportId: '',
    email: '',
    phone: '',
    estimatedArrivalTime: '',
    specialRequests: '',
  });

  useEffect(() => {
    portalApi.getReservation(token)
      .then((r) => {
        setReservation(r);
        setForm(f => ({
          ...f,
          fullName: r.guest.fullName,
          passportId: r.guest.passportId ?? '',
          email: r.guest.email ?? '',
          phone: r.guest.phone,
        }));
      })
      .catch((e: Error) => {
        if (e.message.includes('EXPIRED') || e.message.includes('INVALID')) {
          router.push('/expired');
        } else {
          setError(e.message);
        }
      })
      .finally(() => setLoading(false));
  }, [token, router]);

  const windowCheck = () => {
    if (!reservation) return null;
    const now = new Date();
    const checkIn = new Date(reservation.checkInDate);
    checkIn.setHours(0, 0, 0, 0);
    const windowOpen = new Date(checkIn);
    windowOpen.setHours(windowOpen.getHours() - 24);
    if (now < windowOpen) {
      const diff = Math.ceil((windowOpen.getTime() - now.getTime()) / 3600000);
      return `חלון הצ'ק-אין ייפתח בעוד כ-${diff} שעות (24 שעות לפני ההגעה)`;
    }
    if (reservation.checkIn) return 'הצ\'ק-אין כבר הושלם ע"י הצוות';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await portalApi.submitCheckIn(token, {
        fullName: form.fullName,
        passportId: form.passportId,
        email: form.email || undefined,
        phone: form.phone || undefined,
        estimatedArrivalTime: form.estimatedArrivalTime || undefined,
        specialRequests: form.specialRequests || undefined,
      });
      router.push(`/${token}/confirmation?action=checkin`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה בלתי צפויה');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-secondary">טוען...</div>;
  if (error && !reservation) return <div className="text-center py-12 text-red-500">{error}</div>;

  const blockReason = windowCheck();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-primary">צ&apos;ק-אין מקוון</h2>
        <p className="text-secondary text-sm mt-1">אשר את פרטיך לפני ההגעה</p>
      </div>

      {blockReason && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-yellow-800 text-sm">
          {blockReason}
        </div>
      )}

      {!blockReason && (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-primary mb-1">שם מלא *</label>
            <input
              className="w-full border border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={form.fullName}
              onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">מספר דרכון / ת.ז *</label>
            <input
              className="w-full border border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={form.passportId}
              onChange={e => setForm(f => ({ ...f, passportId: e.target.value }))}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-primary mb-1">טלפון</label>
              <input
                type="tel"
                className="w-full border border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-primary mb-1">אימייל</label>
              <input
                type="email"
                className="w-full border border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">שעת הגעה משוערת</label>
            <input
              type="time"
              className="w-full border border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              value={form.estimatedArrivalTime}
              onChange={e => setForm(f => ({ ...f, estimatedArrivalTime: e.target.value }))}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-primary mb-1">בקשות מיוחדות</label>
            <textarea
              rows={3}
              className="w-full border border-default rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              value={form.specialRequests}
              onChange={e => setForm(f => ({ ...f, specialRequests: e.target.value }))}
            />
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-primary text-white rounded-lg py-3 font-medium hover:bg-primary/90 disabled:opacity-50 transition"
          >
            {submitting ? "שולח..." : "אישור צ'ק-אין"}
          </button>
        </form>
      )}
    </div>
  );
}
