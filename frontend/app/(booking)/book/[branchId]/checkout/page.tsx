'use client';

import { useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { publicBookingApi } from '@/lib/api/public-booking';

export default function CheckoutPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const sp = useSearchParams();
  const router = useRouter();

  const checkIn = sp.get('checkIn') ?? '';
  const checkOut = sp.get('checkOut') ?? '';
  const roomTypeId = sp.get('roomTypeId') ?? '';
  const roomTypeName = sp.get('roomTypeName') ?? '';
  const pricePerNight = Number(sp.get('price') ?? 0);
  const roomPhoto = sp.get('photo') ?? '';

  const nights = checkIn && checkOut
    ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    : 0;
  const total = pricePerNight * nights;

  const [form, setForm] = useState({ guestName: '', guestEmail: '', guestPhone: '', adults: 1, children: 0, notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof typeof form>(k: K, v: typeof form[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.guestName || !form.guestEmail || !form.guestPhone) { setError('יש למלא את כל השדות החובה'); return; }
    setSubmitting(true);
    setError('');
    try {
      const result = await publicBookingApi.createReservation(branchId, {
        ...form,
        roomTypeId,
        checkInDate: checkIn,
        checkOutDate: checkOut,
      });
      router.push(`/book/${branchId}/confirmation?reservationId=${result.reservationId}&roomType=${encodeURIComponent(result.roomType)}&checkIn=${checkIn}&checkOut=${checkOut}&total=${result.totalPrice}${roomPhoto ? `&photo=${encodeURIComponent(roomPhoto)}` : ''}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת ההזמנה');
    } finally {
      setSubmitting(false);
    }
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString('he-IL');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#0F172A]">פרטי ההזמנה</h1>

      {/* Summary */}
      <div className="bg-[#1E3A8A] text-white rounded-xl p-5 space-y-2">
        <p className="font-semibold text-lg">{roomTypeName}</p>
        <p className="text-blue-200 text-sm">{formatDate(checkIn)} — {formatDate(checkOut)} · {nights} לילות</p>
        <p className="text-xl font-bold mt-2">₪{total.toLocaleString()}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#E2E8F0] p-6 space-y-4">
        <h2 className="font-semibold text-[#0F172A]">פרטים אישיים</h2>

        <div>
          <label className="block text-sm text-[#475569] mb-1">שם מלא *</label>
          <input
            type="text"
            value={form.guestName}
            onChange={(e) => set('guestName', e.target.value)}
            className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm"
            placeholder="ישראל ישראלי"
          />
        </div>

        <div>
          <label className="block text-sm text-[#475569] mb-1">אימייל *</label>
          <input
            type="email"
            value={form.guestEmail}
            onChange={(e) => set('guestEmail', e.target.value)}
            className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm"
            placeholder="name@example.com"
          />
        </div>

        <div>
          <label className="block text-sm text-[#475569] mb-1">טלפון *</label>
          <input
            type="tel"
            value={form.guestPhone}
            onChange={(e) => set('guestPhone', e.target.value)}
            className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm"
            placeholder="050-0000000"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[#475569] mb-1">מבוגרים</label>
            <select
              value={form.adults}
              onChange={(e) => set('adults', Number(e.target.value))}
              className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm"
            >
              {[1,2,3,4].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm text-[#475569] mb-1">ילדים</label>
            <select
              value={form.children}
              onChange={(e) => set('children', Number(e.target.value))}
              className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm"
            >
              {[0,1,2,3].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm text-[#475569] mb-1">בקשות מיוחדות</label>
          <textarea
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            rows={3}
            className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm resize-none"
            placeholder="אלרגיות, קומה מועדפת, וכו׳..."
          />
        </div>

        {error && <p className="text-red-600 text-sm">{error}</p>}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#CA8A04] hover:bg-[#B45309] disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors"
        >
          {submitting ? 'שולח...' : 'אשר הזמנה'}
        </button>
      </form>
    </div>
  );
}
