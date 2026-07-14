'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { publicBookingApi, type PublicRoomType } from '@/lib/api/public-booking';

export default function RoomsPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const checkIn = sp.get('checkIn') ?? '';
  const checkOut = sp.get('checkOut') ?? '';
  const [roomTypes, setRoomTypes] = useState<PublicRoomType[]>([]);
  const [availableTypeIds, setAvailableTypeIds] = useState<Set<string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!checkIn || !checkOut) { setError('תאריכים חסרים'); setLoading(false); return; }
    Promise.all([
      publicBookingApi.getRoomTypes(branchId),
      publicBookingApi.getAvailability(branchId, checkIn, checkOut),
    ]).then(([types, rooms]) => {
      setRoomTypes(types);
      const ids = new Set(rooms.map((r) => r.roomType.id));
      setAvailableTypeIds(ids);
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
          return (
            <div
              key={rt.id}
              className={`bg-white rounded-xl border overflow-hidden ${available ? 'border-[#E2E8F0]' : 'border-[#E2E8F0] opacity-60'}`}
            >
              {rt.photos.length > 0 && (
                <img
                  src={rt.photos[0]}
                  alt={rt.name}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-[#0F172A] text-lg">{rt.name}</h3>
                    <p className="text-[#475569] text-sm">עד {rt.maxOccupancy} אורחים</p>
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

                <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
                  <p className="text-sm text-[#475569]">
                    סה״כ: <span className="font-semibold text-[#0F172A]">₪{(Number(rt.basePrice) * nights).toLocaleString()}</span>
                  </p>
                  {available ? (
                    <button
                      onClick={() => router.push(
                        `/book/${branchId}/checkout?checkIn=${checkIn}&checkOut=${checkOut}&roomTypeId=${rt.id}&roomTypeName=${encodeURIComponent(rt.name)}&price=${rt.basePrice}`
                      )}
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
        })}
      </div>
    </div>
  );
}
