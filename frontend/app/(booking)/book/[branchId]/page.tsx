'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { publicBookingApi, type PublicBranch } from '@/lib/api/public-booking';

function BranchLandingPageInner() {
  const { branchId } = useParams<{ branchId: string }>();
  const router = useRouter();
  const sp = useSearchParams();
  const [branch, setBranch] = useState<PublicBranch | null>(null);
  const [checkIn, setCheckIn] = useState(sp.get('checkIn') ?? '');
  const [checkOut, setCheckOut] = useState(sp.get('checkOut') ?? '');
  const [adults, setAdults] = useState(Number(sp.get('adults') ?? '2'));
  const [children, setChildren] = useState(Number(sp.get('children') ?? '0'));
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    publicBookingApi.getBranch(branchId)
      .then(setBranch)
      .catch(() => setError('הסניף לא נמצא'))
      .finally(() => setLoading(false));
  }, [branchId]);

  function handleSearch() {
    if (!checkIn || !checkOut) { setError('יש לבחור תאריכים'); return; }
    if (new Date(checkIn) >= new Date(checkOut)) { setError('תאריך עזיבה חייב להיות אחרי תאריך הגעה'); return; }
    const params = new URLSearchParams({ checkIn, checkOut, adults: String(adults) });
    if (children > 0) params.set('children', String(children));
    router.push(`/book/${branchId}/rooms?${params}`);
  }

  if (loading) return <div className="text-center py-20 text-[var(--color-text-secondary)]">טוען...</div>;
  if (error && !branch) return <div className="text-center py-20 text-red-600">{error}</div>;
  if (!branch) return null;

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Hero */}
      <div className="rounded-2xl overflow-hidden bg-[var(--color-primary)] text-white relative min-h-[220px] flex flex-col justify-end">
        {branch.coverPhoto && (
          <img
            src={branch.coverPhoto}
            alt={branch.name}
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
        )}
        <div className="relative p-8 space-y-1">
          <h1 className="text-3xl font-bold">{branch.name}</h1>
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(branch.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-200 text-sm hover:text-white underline underline-offset-2"
          >
            📍 {branch.address}
          </a>
          {branch.phone && <p className="text-blue-200 text-sm">{branch.phone}</p>}
        </div>
      </div>

      {branch.description && (
        <p className="text-[var(--color-text-secondary)] text-base leading-relaxed">{branch.description}</p>
      )}

      {branch.amenities.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {branch.amenities.map((a) => (
            <span key={a} className="text-sm px-3 py-1 rounded-full" style={{ backgroundColor: 'rgba(196,162,83,0.1)', color: 'var(--color-accent)', border: '1px solid rgba(196,162,83,0.3)' }}>
              ✓ {a}
            </span>
          ))}
        </div>
      )}

      {branch.cancellationPolicy && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
          <span className="text-xl">🔄</span>
          <div>
            <p className="font-semibold text-[#0F172A] text-sm mb-1">מדיניות ביטול</p>
            <p className="text-[var(--color-text-secondary)] text-sm leading-relaxed">{branch.cancellationPolicy}</p>
          </div>
        </div>
      )}

      {/* Date picker */}
      <div className="bg-white rounded-xl border border-[var(--color-border-default)] p-6 space-y-4">
        <h2 className="font-semibold text-[#0F172A] text-lg">בחרו תאריכים ואורחים</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">תאריך הגעה</label>
            <input
              type="date"
              value={checkIn}
              min={today}
              onChange={(e) => { setCheckIn(e.target.value); setError(''); }}
              className="w-full border border-[var(--color-border-default)] rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">תאריך עזיבה</label>
            <input
              type="date"
              value={checkOut}
              min={checkIn || today}
              onChange={(e) => { setCheckOut(e.target.value); setError(''); }}
              className="w-full border border-[var(--color-border-default)] rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">מבוגרים</label>
            <select
              value={adults}
              onChange={(e) => setAdults(Number(e.target.value))}
              className="w-full border border-[var(--color-border-default)] rounded-lg px-3 py-2 text-sm bg-white"
            >
              {Array.from({ length: 9 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>{n} {n === 1 ? 'מבוגר' : 'מבוגרים'}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">ילדים</label>
            <select
              value={children}
              onChange={(e) => setChildren(Number(e.target.value))}
              className="w-full border border-[var(--color-border-default)] rounded-lg px-3 py-2 text-sm bg-white"
            >
              {Array.from({ length: 10 }, (_, i) => i).map((n) => (
                <option key={n} value={n}>{n === 0 ? 'ללא ילדים' : `${n} ${n === 1 ? 'ילד' : 'ילדים'}`}</option>
              ))}
            </select>
          </div>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          onClick={handleSearch}
          className="w-full text-white font-semibold py-3 rounded-lg transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--color-accent)' }}
        >
          חפש חדרים זמינים
        </button>
      </div>
    </div>
  );
}

export default function BranchLandingPage() {
  return <Suspense><BranchLandingPageInner /></Suspense>;
}
