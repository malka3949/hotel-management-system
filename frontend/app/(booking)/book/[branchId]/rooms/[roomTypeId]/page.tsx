'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { publicBookingApi, type PublicRoomType } from '@/lib/api/public-booking';

function Lightbox({ photos, startIdx, onClose }: { photos: string[]; startIdx: number; onClose: () => void }) {
  const [idx, setIdx] = useState(startIdx);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') setIdx((i) => (i - 1 + photos.length) % photos.length);
      if (e.key === 'ArrowLeft') setIdx((i) => (i + 1) % photos.length);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [photos.length, onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center" onClick={onClose}>
      <button className="absolute top-4 left-4 text-white text-3xl hover:text-gray-300" onClick={onClose}>×</button>
      <div className="relative flex items-center" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setIdx((i) => (i - 1 + photos.length) % photos.length)}
          className="absolute right-[-48px] text-white text-4xl hover:text-gray-300 px-2"
        >›</button>
        <img src={photos[idx]} alt="" className="max-h-[80vh] max-w-[90vw] rounded-lg object-contain" />
        <button
          onClick={() => setIdx((i) => (i + 1) % photos.length)}
          className="absolute left-[-48px] text-white text-4xl hover:text-gray-300 px-2"
        >‹</button>
      </div>
      <div className="flex gap-2 mt-4">
        {photos.map((_, i) => (
          <button
            key={i}
            onClick={(e) => { e.stopPropagation(); setIdx(i); }}
            className={`w-2 h-2 rounded-full transition-colors ${i === idx ? 'bg-white' : 'bg-white/40'}`}
          />
        ))}
      </div>
      <p className="text-white/60 text-sm mt-2">{idx + 1} / {photos.length}</p>
    </div>
  );
}

function RoomTypePageInner() {
  const { branchId, roomTypeId } = useParams<{ branchId: string; roomTypeId: string }>();
  const sp = useSearchParams();
  const router = useRouter();

  const checkIn = sp.get('checkIn') ?? '';
  const checkOut = sp.get('checkOut') ?? '';
  const adults = Number(sp.get('adults') ?? '2');
  const children = Number(sp.get('children') ?? '0');

  const [rt, setRt] = useState<PublicRoomType | null>(null);
  const [available, setAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const missingDates = !checkIn || !checkOut;

  useEffect(() => {
    if (missingDates) return;
    Promise.all([
      publicBookingApi.getRoomTypes(branchId),
      publicBookingApi.getAvailability(branchId, checkIn, checkOut),
    ]).then(([types, rooms]) => {
      const found = types.find((t) => t.id === roomTypeId);
      if (!found) { setError('החדר לא נמצא'); return; }
      setRt(found);
      setAvailable(rooms.some((r) => r.roomType.id === roomTypeId));
    }).catch(() => setError('שגיאה בטעינה')).finally(() => setLoading(false));
  }, [branchId, roomTypeId, checkIn, checkOut, missingDates]);

  const nights = checkIn && checkOut
    ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    : 0;

  const backUrl = `/book/${branchId}/rooms?${sp.toString()}`;

  function handleBook() {
    if (!rt) return;
    const firstPhoto = rt.photos.filter(Boolean)[0] ?? '';
    const p = new URLSearchParams({ checkIn, checkOut, roomTypeId: rt.id, roomTypeName: rt.name, price: String(rt.basePrice), photo: firstPhoto, adults: String(adults) });
    if (children > 0) p.set('children', String(children));
    router.push(`/book/${branchId}/checkout?${p}`);
  }

  if (missingDates) return (
    <div className="text-center py-20">
      <p className="text-red-600 mb-4">תאריכים חסרים</p>
      <button onClick={() => router.push(backUrl)} className="text-[var(--color-accent)] hover:underline text-sm">← חזרה לרשימה</button>
    </div>
  );
  if (loading) return <div className="text-center py-20 text-[#475569]">טוען...</div>;
  if (error || !rt) return (
    <div className="text-center py-20">
      <p className="text-red-600 mb-4">{error || 'החדר לא נמצא'}</p>
      <button onClick={() => router.push(backUrl)} className="text-[var(--color-accent)] hover:underline text-sm">← חזרה לרשימה</button>
    </div>
  );

  const photos = rt.photos.filter(Boolean);

  return (
    <>
      {lightboxIdx !== null && (
        <Lightbox photos={photos} startIdx={lightboxIdx} onClose={() => setLightboxIdx(null)} />
      )}

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 pb-28">
        {/* Back */}
        <button onClick={() => router.push(backUrl)} className="flex items-center gap-1 text-sm text-[var(--color-accent)] hover:underline">
          ← כל החדרים
        </button>

        {/* Photo gallery grid */}
        {photos.length > 0 && (
          <div className={`grid gap-2 rounded-2xl overflow-hidden ${photos.length === 1 ? 'grid-cols-1' : photos.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
            {photos.map((src, i) => (
              <button key={i} onClick={() => setLightboxIdx(i)} className={`relative overflow-hidden ${i === 0 && photos.length >= 3 ? 'col-span-2 row-span-2' : ''}`}>
                <img
                  src={src}
                  alt={`${rt.name} — תמונה ${i + 1}`}
                  className="w-full h-48 object-cover hover:opacity-90 transition-opacity"
                />
              </button>
            ))}
          </div>
        )}

        {/* Name + availability */}
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-3xl font-bold text-[#0F172A]">{rt.name}</h1>
          <span className={`shrink-0 text-sm font-semibold px-3 py-1 rounded-full ${available ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {available ? '✓ זמין' : '✗ לא זמין'}
          </span>
        </div>

        {/* Chips */}
        <div className="flex flex-wrap gap-2">
          <span className="bg-slate-100 text-[#475569] text-sm px-3 py-1.5 rounded-full">👥 עד {rt.maxOccupancy} אורחים</span>
          {rt.maxAdults != null && (
            <span className="bg-slate-100 text-[#475569] text-sm px-3 py-1.5 rounded-full">🧑 עד {rt.maxAdults} מבוגרים</span>
          )}
          {rt.maxChildren != null && (
            <span className="bg-slate-100 text-[#475569] text-sm px-3 py-1.5 rounded-full">🧒 עד {rt.maxChildren} ילדים</span>
          )}
          {rt.bedType && (
            <span className="bg-slate-100 text-[#475569] text-sm px-3 py-1.5 rounded-full">🛏 {rt.bedType}</span>
          )}
          {rt.roomSize && (
            <span className="bg-slate-100 text-[#475569] text-sm px-3 py-1.5 rounded-full">📐 {rt.roomSize} מ״ר</span>
          )}
        </div>

        {/* Description */}
        {rt.description && (
          <div className="bg-white border border-[var(--color-border-default)] rounded-xl p-5">
            <h2 className="font-semibold text-[#0F172A] mb-2">על החדר</h2>
            <p className="text-[#475569] leading-relaxed">{rt.description}</p>
          </div>
        )}

        {/* Amenities */}
        {rt.amenities.length > 0 && (
          <div className="bg-white border border-[var(--color-border-default)] rounded-xl p-5">
            <h2 className="font-semibold text-[#0F172A] mb-3">שירותים ואמניות</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {rt.amenities.map((a) => (
                <div key={a} className="flex items-center gap-2 text-sm text-[#475569]">
                  <span className="text-green-500 font-bold">✓</span>
                  {a}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky booking bar */}
      <div className="fixed bottom-0 inset-x-0 bg-white border-t border-[var(--color-border-default)] shadow-lg z-40">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-2xl font-bold text-[var(--color-accent)]">₪{Number(rt.basePrice).toLocaleString()}<span className="text-sm font-normal text-[#475569]"> ללילה</span></p>
            {nights > 0 && (
              <p className="text-sm text-[#475569]">{nights} לילות · סה״כ <span className="font-semibold text-[#0F172A]">₪{(Number(rt.basePrice) * nights).toLocaleString()}</span></p>
            )}
          </div>
          {available ? (
            <button
              onClick={handleBook}
              className="text-white font-bold px-8 py-3 rounded-xl text-base transition-opacity hover:opacity-90 whitespace-nowrap"
              style={{ backgroundColor: 'var(--color-accent)' }}
            >
              הזמן עכשיו
            </button>
          ) : (
            <span className="text-red-500 font-medium">אין זמינות לתאריכים אלו</span>
          )}
        </div>
      </div>
    </>
  );
}

export default function RoomTypePage() {
  return <Suspense><RoomTypePageInner /></Suspense>;
}
