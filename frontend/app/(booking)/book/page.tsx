'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { publicBookingApi, PublicBranchSummary } from '@/lib/api/public-booking';

function HotelCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden animate-pulse">
      <div className="w-full h-52 bg-gray-200" />
      <div className="p-5 space-y-3">
        <div className="h-6 bg-gray-200 rounded w-3/4" />
        <div className="h-4 bg-gray-200 rounded w-1/2" />
        <div className="h-4 bg-gray-200 rounded w-full" />
        <div className="h-4 bg-gray-200 rounded w-5/6" />
        <div className="flex gap-2">
          <div className="h-6 bg-gray-200 rounded-full w-16" />
          <div className="h-6 bg-gray-200 rounded-full w-20" />
          <div className="h-6 bg-gray-200 rounded-full w-14" />
        </div>
        <div className="flex justify-between items-center pt-2">
          <div className="h-6 bg-gray-200 rounded w-24" />
          <div className="h-9 bg-gray-200 rounded-lg w-24" />
        </div>
      </div>
    </div>
  );
}

function HotelCard({ branch, checkIn, checkOut, adults, numChildren }: { branch: PublicBranchSummary; checkIn: string; checkOut: string; adults: number; numChildren: number }) {
  const params = new URLSearchParams();
  if (checkIn) params.set('checkIn', checkIn);
  if (checkOut) params.set('checkOut', checkOut);
  params.set('adults', String(adults));
  if (numChildren > 0) params.set('children', String(numChildren));
  const href = `/book/${branch.id}${params.toString() ? `?${params}` : ''}`;
  const mapsHref = `https://maps.google.com/?q=${encodeURIComponent(branch.address)}`;

  const chips = branch.amenities.slice(0, 3);
  const extra = branch.amenities.length - 3;

  return (
    <div className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden hover:shadow-lg transition-shadow">
      {branch.coverPhoto ? (
        <img src={branch.coverPhoto} alt={branch.name} className="w-full h-52 object-cover" />
      ) : (
        <div className="w-full h-52 bg-gradient-to-br from-[#1E3A8A] to-[#3B82F6] flex items-center justify-center">
          <span className="text-6xl">🏨</span>
        </div>
      )}
      <div className="p-5 space-y-3">
        <h2 className="text-xl font-bold text-[#0F172A]">{branch.name}</h2>
        <a
          href={mapsHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-sm text-[#475569] hover:text-[#1E3A8A]"
        >
          <span>📍</span>
          <span>{branch.address}</span>
        </a>
        {branch.description && (
          <p className="text-sm text-[#475569] line-clamp-2">{branch.description}</p>
        )}
        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {chips.map((a) => (
              <span key={a} className="bg-blue-50 text-[#1E3A8A] text-xs px-2 py-1 rounded-full">
                {a}
              </span>
            ))}
            {extra > 0 && (
              <span className="text-[#475569] text-xs px-2 py-1">+{extra} נוספים</span>
            )}
          </div>
        )}
        <div className="flex items-center justify-between pt-2 border-t border-[#E2E8F0]">
          <div>
            {branch.minPrice != null ? (
              <span className="text-lg font-bold text-[#1E3A8A]">
                מ-₪{branch.minPrice.toLocaleString('he-IL')} ללילה
              </span>
            ) : (
              <span className="text-sm text-[#475569]">בירור מחיר</span>
            )}
          </div>
          <Link
            href={href}
            className="bg-[#CA8A04] hover:bg-[#B45309] text-white px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
          >
            לפרטים ←
          </Link>
        </div>
      </div>
    </div>
  );
}

function BookPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [branches, setBranches] = useState<PublicBranchSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrow = useMemo(() => { const d = new Date(); d.setDate(d.getDate() + 1); return d.toISOString().split('T')[0]; }, []);

  const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') ?? '');
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') ?? '');
  const [adults, setAdults] = useState(Number(searchParams.get('adults') ?? '2'));
  const [children, setChildren] = useState(Number(searchParams.get('children') ?? '0'));

  useEffect(() => {
    publicBookingApi.listBranches()
      .then(setBranches)
      .catch(() => setError('אירעה שגיאה בטעינת המלונות'))
      .finally(() => setLoading(false));
  }, []);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    params.set('adults', String(adults));
    if (children > 0) params.set('children', String(children));
    const qs = params.toString();
    router.replace(`/book${qs ? `?${qs}` : ''}`);
  }

  return (
    <div>
      {/* Hero */}
      <div className="bg-gradient-to-l from-[#1E3A8A] to-[#1e40af] text-white py-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">גלו את המלון המושלם עבורכם</h1>
          <p className="text-xl text-blue-200">{branches.length > 0 ? `${branches.length} יעדים מובחרים ברחבי הארץ` : 'יעדים מובחרים ברחבי הארץ'}</p>
        </div>
      </div>

      {/* Date search bar */}
      <div className="max-w-6xl mx-auto px-4 -mt-8 mb-10">
        <form
          onSubmit={handleSearch}
          className="bg-white rounded-2xl shadow-md p-5 flex flex-wrap gap-4 items-end"
        >
          <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-[#475569]">תאריך הגעה</label>
            <input
              type="date"
              min={today}
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            />
          </div>
          <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
            <label className="text-xs font-medium text-[#475569]">תאריך עזיבה</label>
            <input
              type="date"
              min={checkIn || tomorrow}
              value={checkOut}
              onChange={(e) => setCheckOut(e.target.value)}
              className="border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A]"
            />
          </div>
          <div className="flex flex-col gap-1 min-w-[100px]">
            <label className="text-xs font-medium text-[#475569]">מבוגרים</label>
            <select
              value={adults}
              onChange={(e) => setAdults(Number(e.target.value))}
              className="border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] bg-white"
            >
              {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n} {n === 1 ? 'מבוגר' : 'מבוגרים'}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1 min-w-[100px]">
            <label className="text-xs font-medium text-[#475569]">ילדים</label>
            <select
              value={children}
              onChange={(e) => setChildren(Number(e.target.value))}
              className="border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1E3A8A] bg-white"
            >
              {Array.from({ length: 10 }, (_, i) => i).map((n) => (
                <option key={n} value={n}>{n === 0 ? 'ללא ילדים' : `${n} ${n === 1 ? 'ילד' : 'ילדים'}`}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            className="bg-[#1E3A8A] hover:bg-[#3B82F6] text-white px-6 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap"
          >
            חפש
          </button>
        </form>
      </div>

      {/* Hotel cards grid */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        {error && (
          <p className="text-center text-red-500 mb-8">{error}</p>
        )}
        <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {loading
            ? Array.from({ length: 3 }).map((_, i) => <HotelCardSkeleton key={i} />)
            : branches.map((b) => (
                <HotelCard key={b.id} branch={b} checkIn={checkIn} checkOut={checkOut} adults={adults} numChildren={children} />
              ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-[#E2E8F0] py-6 text-center text-sm text-[#475569]">
        <p>© 2026 רשת מלונות — כל הזכויות שמורות</p>
        <div className="flex justify-center gap-4 mt-2">
          <a href="#" className="hover:text-[#1E3A8A]">מדיניות פרטיות</a>
          <span>|</span>
          <a href="#" className="hover:text-[#1E3A8A]">צור קשר</a>
        </div>
      </footer>
    </div>
  );
}

export default function BookPage() {
  return (
    <Suspense>
      <BookPageInner />
    </Suspense>
  );
}
