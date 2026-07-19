'use client';

import { useEffect, useState, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { publicBookingApi, type PublicRoomType } from '@/lib/api/public-booking';

function RoomCard({
  rt,
  available,
  remainingCount,
  nights,
  onBook,
  onDetails,
}: {
  rt: PublicRoomType;
  available: boolean;
  remainingCount: number;
  nights: number;
  onBook: () => void;
  onDetails: () => void;
}) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const photos = rt.photos.filter(Boolean);

  return (
    <div className={`bg-white rounded-xl border overflow-hidden ${available ? 'border-[#E2E8F0]' : 'border-[#E2E8F0] opacity-60'}`}>
      {photos.length > 0 && (
        <div className="relative">
          <img src={photos[photoIdx]} alt={rt.name} className="w-full h-48 object-cover" />
          {photos.length > 1 && (
            <>
              <button
                onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg"
                aria-label="תמונה קודמת"
              >›</button>
              <button
                onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full w-8 h-8 flex items-center justify-center text-lg"
                aria-label="תמונה הבאה"
              >‹</button>
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
                {photos.map((_, i) => (
                  <button key={i} onClick={() => setPhotoIdx(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${i === photoIdx ? 'bg-white' : 'bg-white/50'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div className="p-5 space-y-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <h3 className="font-bold text-[#0F172A] text-lg">{rt.name}</h3>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[#475569] text-sm">עד {rt.maxOccupancy} אורחים</span>
              {rt.bedType && (
                <span className="bg-slate-100 text-[#475569] text-xs px-2 py-0.5 rounded-full">🛏 {rt.bedType}</span>
              )}
              {rt.roomSize && (
                <span className="bg-slate-100 text-[#475569] text-xs px-2 py-0.5 rounded-full">📐 {rt.roomSize} מ״ר</span>
              )}
            </div>
          </div>
          <div className="text-end">
            <p className="text-2xl font-bold text-[#1E3A8A]">₪{Number(rt.basePrice).toLocaleString()}</p>
            <p className="text-xs text-[#475569]">ללילה</p>
          </div>
        </div>

        {rt.description && (
          <p className="text-[#475569] text-sm line-clamp-2">{rt.description}</p>
        )}

        {rt.amenities.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {rt.amenities.slice(0, 4).map((a) => (
              <span key={a} className="bg-blue-50 text-[#1E3A8A] text-xs px-2 py-1 rounded-full">{a}</span>
            ))}
            {rt.amenities.length > 4 && (
              <span className="text-[#475569] text-xs px-1 py-1">+{rt.amenities.length - 4}</span>
            )}
          </div>
        )}

        {available && remainingCount > 0 && remainingCount <= 3 && (
          <p className="text-amber-600 text-xs font-semibold">⚡ נותרו {remainingCount} חדרים בלבד!</p>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
          <p className="text-sm text-[#475569]">
            סה״כ: <span className="font-semibold text-[#0F172A]">₪{(Number(rt.basePrice) * nights).toLocaleString()}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={onDetails}
              className="border border-[#1E3A8A] text-[#1E3A8A] hover:bg-blue-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              פרטים
            </button>
            {available ? (
              <button
                onClick={onBook}
                className="bg-[#CA8A04] hover:bg-[#B45309] text-white font-semibold px-4 py-2 rounded-lg text-sm transition-colors"
              >
                הזמן עכשיו
              </button>
            ) : (
              <span className="text-sm text-red-500 font-medium self-center">אין זמינות</span>
            )}
          </div>
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
  const adults = Number(sp.get('adults') ?? '2');
  const children = Number(sp.get('children') ?? '0');
  const totalGuests = adults + children;
  const bedTypeFilter = sp.get('bedType') ?? '';
  const sort = sp.get('sort') ?? 'price_asc';

  const [allRoomTypes, setAllRoomTypes] = useState<PublicRoomType[]>([]);
  const [availableTypeIds, setAvailableTypeIds] = useState<Set<string> | null>(null);
  const [availableTypeCounts, setAvailableTypeCounts] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const missingDates = !checkIn || !checkOut;

  useEffect(() => {
    if (missingDates) return;
    Promise.all([
      publicBookingApi.getRoomTypes(branchId),
      publicBookingApi.getAvailability(branchId, checkIn, checkOut),
    ]).then(([types, rooms]) => {
      setAllRoomTypes(types.filter((rt) => {
        if (rt.maxOccupancy < totalGuests) return false;
        if (rt.maxAdults != null && rt.maxAdults < adults) return false;
        if (rt.maxChildren != null && rt.maxChildren < children) return false;
        return true;
      }));
      const ids = new Set(rooms.map((r) => r.roomType.id));
      setAvailableTypeIds(ids);
      const counts = rooms.reduce<Map<string, number>>((m, r) => {
        m.set(r.roomType.id, (m.get(r.roomType.id) ?? 0) + 1);
        return m;
      }, new Map());
      setAvailableTypeCounts(counts);
    }).catch(() => setError('שגיאה בטעינת החדרים')).finally(() => setLoading(false));
  }, [branchId, checkIn, checkOut, missingDates]);

  const bedTypeOptions = useMemo(() => {
    const types = [...new Set(allRoomTypes.map((rt) => rt.bedType).filter(Boolean))] as string[];
    return types;
  }, [allRoomTypes]);

  const roomTypes = useMemo(() => {
    let list = bedTypeFilter ? allRoomTypes.filter((rt) => rt.bedType === bedTypeFilter) : allRoomTypes;
    list = [...list].sort((a, b) =>
      sort === 'price_desc'
        ? Number(b.basePrice) - Number(a.basePrice)
        : Number(a.basePrice) - Number(b.basePrice)
    );
    return list;
  }, [allRoomTypes, bedTypeFilter, sort]);

  function setParam(key: string, value: string) {
    const p = new URLSearchParams(sp.toString());
    if (value) p.set(key, value); else p.delete(key);
    router.replace(`/book/${branchId}/rooms?${p}`);
  }

  const nights = checkIn && checkOut
    ? Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000)
    : 0;

  const formatDate = (d: string) => new Date(d).toLocaleDateString('he-IL');

  function buildParams() {
    return new URLSearchParams(sp.toString());
  }

  if (missingDates) return <div className="text-center py-20 text-red-600">תאריכים חסרים</div>;
  if (loading) return <div className="text-center py-20 text-[#475569]">טוען חדרים...</div>;
  if (error) return <div className="text-center py-20 text-red-600">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#0F172A]">בחרו חדר</h1>
          <p className="text-[#475569] text-sm mt-1">
            {formatDate(checkIn)} — {formatDate(checkOut)} · {nights} לילות · {adults} מבוגרים{children > 0 ? ` + ${children} ילדים` : ''}
          </p>
        </div>
        <button onClick={() => router.back()} className="text-sm text-[#3B82F6] hover:underline">
          שנה תאריכים
        </button>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 items-center bg-white border border-[#E2E8F0] rounded-xl px-4 py-3">
        <span className="text-sm font-medium text-[#475569]">סינון:</span>
        {bedTypeOptions.length > 0 && (
          <div className="flex items-center gap-1">
            <select
              value={bedTypeFilter}
              onChange={(e) => setParam('bedType', e.target.value)}
              className="border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            >
              <option value="">כל סוגי המיטות</option>
              {bedTypeOptions.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {bedTypeFilter && (
              <button onClick={() => setParam('bedType', '')} className="text-[#475569] hover:text-red-500 text-lg leading-none">×</button>
            )}
          </div>
        )}
        <div className="flex items-center gap-1 mr-auto">
          <span className="text-sm text-[#475569]">מיון:</span>
          <select
            value={sort}
            onChange={(e) => setParam('sort', e.target.value)}
            className="border border-[#E2E8F0] rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
          >
            <option value="price_asc">מחיר: נמוך לגבוה</option>
            <option value="price_desc">מחיר: גבוה לנמוך</option>
          </select>
        </div>
      </div>

      {roomTypes.length === 0 && (
        <div className="text-center py-16 text-[#475569]">
          {bedTypeFilter
            ? `אין חדרים מסוג "${bedTypeFilter}" התואמים את הדרישות`
            : `אין חדרים המתאימים ל-${totalGuests} אורחים בתאריכים אלו`}
        </div>
      )}

      <div className="grid gap-4">
        {roomTypes.map((rt) => {
          const available = availableTypeIds?.has(rt.id) ?? false;
          const remainingCount = availableTypeCounts.get(rt.id) ?? 0;
          const firstPhoto = rt.photos.filter(Boolean)[0] ?? '';
          const currentParams = buildParams();
          return (
            <RoomCard
              key={rt.id}
              rt={rt}
              available={available}
              remainingCount={remainingCount}
              nights={nights}
              onDetails={() => router.push(`/book/${branchId}/rooms/${rt.id}?${currentParams}`)}
              onBook={() => {
                const p = new URLSearchParams({ checkIn, checkOut, roomTypeId: rt.id, roomTypeName: rt.name, price: String(rt.basePrice), photo: firstPhoto, adults: String(adults) });
                if (children > 0) p.set('children', String(children));
                router.push(`/book/${branchId}/checkout?${p}`);
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
