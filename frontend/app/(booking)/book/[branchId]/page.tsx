'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { publicBookingApi, type PublicBranch } from '@/lib/api/public-booking';

export default function BranchLandingPage() {
  const { branchId } = useParams<{ branchId: string }>();
  const router = useRouter();
  const [branch, setBranch] = useState<PublicBranch | null>(null);
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
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
    router.push(`/book/${branchId}/rooms?checkIn=${checkIn}&checkOut=${checkOut}`);
  }

  if (loading) return <div className="text-center py-20 text-[#475569]">טוען...</div>;
  if (error && !branch) return <div className="text-center py-20 text-red-600">{error}</div>;
  if (!branch) return null;

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="rounded-2xl overflow-hidden bg-[#1E3A8A] text-white relative min-h-[220px] flex flex-col justify-end">
        {branch.coverPhoto && (
          <img
            src={branch.coverPhoto}
            alt={branch.name}
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
        )}
        <div className="relative p-8 space-y-1">
          <h1 className="text-3xl font-bold">{branch.name}</h1>
          <p className="text-blue-200 text-sm">{branch.address}</p>
          {branch.phone && <p className="text-blue-200 text-sm">{branch.phone}</p>}
        </div>
      </div>

      {branch.description && (
        <p className="text-[#475569] text-base leading-relaxed">{branch.description}</p>
      )}

      {/* Date picker */}
      <div className="bg-white rounded-xl border border-[#E2E8F0] p-6 space-y-4">
        <h2 className="font-semibold text-[#0F172A] text-lg">בחרו תאריכים</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-[#475569] mb-1">תאריך הגעה</label>
            <input
              type="date"
              value={checkIn}
              min={today}
              onChange={(e) => { setCheckIn(e.target.value); setError(''); }}
              className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-[#475569] mb-1">תאריך עזיבה</label>
            <input
              type="date"
              value={checkOut}
              min={checkIn || today}
              onChange={(e) => { setCheckOut(e.target.value); setError(''); }}
              className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <button
          onClick={handleSearch}
          className="w-full bg-[#CA8A04] hover:bg-[#B45309] text-white font-semibold py-3 rounded-lg transition-colors"
        >
          חפש חדרים זמינים
        </button>
      </div>
    </div>
  );
}
