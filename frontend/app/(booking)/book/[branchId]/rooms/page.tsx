'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { publicBookingApi, type PublicRoomType } from '@/lib/api/public-booking';

function RoomCard({
  rt,
  available,
  remainingCount,
  nights,
  onBook,
}: {
  rt: PublicRoomType;
  available: boolean;
  remainingCount: number;
  nights: number;
  onBook: () => void;
}) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const photos = rt.photos.filter(Boolean);

  return (
    <div className={`bg-white rounded-xl border overflow-hidden ${available ? 'border-[#E2E8F0]' : 'border-[#E2E8F0] opacity-60'}`}>
      {/* Photo gallery */}
      {photos.length > 0 && (
        <div className="relative">
          <img
            src={photos[photoIdx]}
            alt={rt.name}
            className="w-full h-48 object-cover"
          />
          {photos.length > 1 && (
            <>
              <button
                onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg"
                aria-label="תמונה קודמת"
              >‹</button>
              <button
                onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg"
                aria-label="תמונה הבאה"
              >›</button>
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                {photos.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPhotoIdx(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${i === photoIdx ? 'bg-white' : 'bg-white/50'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="p-5 space-y-3">
        {/* Name + price */}
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-bold text-[#0F172A] text-lg">{rt.name}</h3>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[#475569] text-sm">עד {rt.maxOccupancy} אורחים</span>
              {rt.bedType && (
                <span className="bg-slate-100 text-[#475569] text-xs px-2 py-0.5 rounded-full">
                  🛏 {rt.bedType}
                </span>
              )}
              {rt.roomSize && (
                <span className="bg-slate-100 text-[#475569] text-xs px-2 py-0.5 rounded-full">
                  📐 {rt.roomSize} מ״ר
                </span>
              )}
            </div>
          </div>
          <div className="text-left">
            <p className="text-2xl font-bold text-[#1E3A8A]">₪{Number(rt.basePrice).toLocaleString()}</p>
            <p className="text-xs text-[#475569]">ללילה</p>
          </div>
        </div>

        {rt.description && (
          <p className="text-[#475569] text-sm">{rt.description}</p>
        )}

        {rt.amenities.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {rt.amenities.map((a) => (
              <span key={a} className="bg-blue-50 text-[#1E3A8A] text-xs px-2 py-1 rounded-full">
                {a}
              </span>
            ))}
          </div>
        )}

        {/* Urgency indicator */}
        {available && remainingCount > 0 && remainingCount <= 3 && (
          <p className="text-amber-600 text-xs font-semibold">
            ⚡ נותרו {remainingCount} חדרים בלבד!
          </p>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
          <p className="text-sm text-[#475569]">
            סה״כ: <span className="font-semibold text-[#0F172A]">₪{(Number(rt.basePrice) * nights).toLocaleString()}</span>
          </p>
          {available ? (
            <button
              onClick={onBook}
              className="bg-[#CA8A04] hover:bg-[#B45309] text-white font-semibold px-6 py-2 rounded-lg text-sm transition-colors"
            >
              הזמן עכשיו
            </button>
          ) : (
            <span className="text-sm text-red-500 font-medium">אין זמינות</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function RoomsPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const checkIn = sp.get('checkIn') ?? '';
  const checkOut = sp.get('checkOut') ?? '';
  const [roomTypes, setRoomTypes] = useState<PublicRoomType[]>([]);
  const [availableTypeIds, setAvailableTypeIds] = useState<Set<string> | null>(null);
  const [availableTypeCounts, setAvailableTypeCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!checkIn || !checkOut) { setError('תאריכים חסרים'); setLoading(false); return; }
    Promise.all([
      publicBookingApi.getRoomTypes(branchId),
      publicBookingApi.getAvailability(branchId, checkIn, checkOut),
    ]).then(([types, rooms]) => {
      setRoomTypes(types);
      const ids = new Set(rooms.map((r) => r.roomType.id));
      setAvailableTypeIds(ids);
      const counts = rooms.reduce<Map<string, number>>((m, r) => {
        m.set(r.roomType.id, (m.get(r.roomType.id) ?? 0) + 1);
        return m;
      }, new Map());
      setAvailableTypeCounts(counts);
    }).catch(() => setError('שגיאה בטעינת החדרים')).finally(() => setLoading(false));
  }, [branchId, checkIn, checkOut]);

  const nights = checkIn && checkOut
    ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    : 0;

  const formatDate = (d: string) => new Date(d).toLocaleDateString('he-IL');

  if (loading) return <div className="text-center py-20 text-[#475569]">טוען חדרים...</div>;
  if (error) return <div className="text-center py-20 text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">בחרו חדר</h1>
          <p className="text-[#475569] text-sm mt-1">
            {formatDate(checkIn)} — {formatDate(checkOut)} · {nights} לילות
          </p>
        </div>
        <button
          onClick={() => router.back()}
          className="text-sm text-[#3B82F6] hover:underline"
        >
          שנה תאריכים
        </button>
      </div>

      {roomTypes.length === 0 && (
        <div className="text-center py-16 text-[#475569]">אין חדרים זמינים לתאריכים אלו</div>
      )}

      <div className="grid gap-4">
        {roomTypes.map((rt) => {
          const available = availableTypeIds?.has(rt.id) ?? false;
          const remainingCount = availableTypeCounts.get(rt.id) ?? 0;
          const firstPhoto = rt.photos.filter(Boolean)[0] ?? '';
          return (
            <RoomCard
              key={rt.id}
              rt={rt}
              available={available}
              remainingCount={remainingCount}
              nights={nights}
              onBook={() => router.push(
                `/book/${branchId}/checkout?checkIn=${checkIn}&checkOut=${checkOut}&roomTypeId=${rt.id}&roomTypeName=${encodeURIComponent(rt.name)}&price=${rt.basePrice}&photo=${encodeURIComponent(firstPhoto)}`
              )}
            />
          );
        })}
      </div>
    </div>
  );
}
