'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getGuest, getGuestDocuments, type Guest, type GuestDocument } from '@/lib/api/guests';
import { RoleGate } from '@/components/shared/RoleGate';

const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  passport: 'דרכון',
  id_card: 'תעודת זהות',
  drivers_license: 'רישיון נהיגה',
  other: 'אחר',
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('he-IL');
}

export default function GuestDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [guest, setGuest] = useState<Guest | null>(null);
  const [documents, setDocuments] = useState<GuestDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getGuest(params.id), getGuestDocuments(params.id)])
      .then(([g, docs]) => {
        setGuest(g);
        setDocuments(docs);
      })
      .catch(() => setError('שגיאה בטעינת פרטי אורח'))
      .finally(() => setLoading(false));
  }, [params.id]);

  if (loading) return <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>טוען...</p>;
  if (error || !guest) return (
    <p className="text-sm" style={{ color: '#DC2626' }}>{error || 'אורח לא נמצא'}</p>
  );

  return (
    <div className="max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push('/guests')}
          className="text-sm"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          ← חזרה
        </button>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          {guest.fullName}
        </h2>
        <RoleGate roles={['chain_admin', 'hotel_manager', 'receptionist']}>
          <Link
            href={`/guests/${guest.id}/edit`}
            className="text-xs px-3 py-1 rounded border"
            style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}
          >
            עריכה
          </Link>
        </RoleGate>
      </div>

      {/* Guest info card */}
      <div
        className="p-4 rounded-lg border mb-6"
        style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
          פרטים אישיים
        </h3>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div>
            <dt className="text-xs mb-0.5" style={{ color: 'var(--color-text-secondary)' }}>טלפון</dt>
            <dd dir="ltr" style={{ color: 'var(--color-text-primary)' }}>{guest.phone}</dd>
          </div>
          <div>
            <dt className="text-xs mb-0.5" style={{ color: 'var(--color-text-secondary)' }}>אימייל</dt>
            <dd style={{ color: 'var(--color-text-primary)' }}>{guest.email ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs mb-0.5" style={{ color: 'var(--color-text-secondary)' }}>ת.ז / דרכון</dt>
            <dd dir="ltr" style={{ color: 'var(--color-text-primary)' }}>{guest.passportId ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs mb-0.5" style={{ color: 'var(--color-text-secondary)' }}>לאום</dt>
            <dd style={{ color: 'var(--color-text-primary)' }}>{guest.nationality ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs mb-0.5" style={{ color: 'var(--color-text-secondary)' }}>תאריך לידה</dt>
            <dd style={{ color: 'var(--color-text-primary)' }}>{formatDate(guest.dateOfBirth)}</dd>
          </div>
          <div>
            <dt className="text-xs mb-0.5" style={{ color: 'var(--color-text-secondary)' }}>נוסף ב</dt>
            <dd style={{ color: 'var(--color-text-primary)' }}>{formatDate(guest.createdAt)}</dd>
          </div>
          {guest.notes && (
            <div className="col-span-2">
              <dt className="text-xs mb-0.5" style={{ color: 'var(--color-text-secondary)' }}>הערות</dt>
              <dd style={{ color: 'var(--color-text-primary)' }}>{guest.notes}</dd>
            </div>
          )}
        </dl>
      </div>

      {/* Documents */}
      <div
        className="p-4 rounded-lg border mb-6"
        style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
      >
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--color-text-primary)' }}>
          מסמכים מוקלטים
        </h3>
        {documents.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>אין מסמכים מוקלטים</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['סוג', 'מספר', 'מדינה מנפיקה', 'תוקף'].map((h) => (
                  <th key={h} className="text-right font-medium pb-2 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id}>
                  <td className="py-1" style={{ color: 'var(--color-text-primary)' }}>
                    {DOCUMENT_TYPE_LABELS[doc.documentType] ?? doc.documentType}
                  </td>
                  <td className="py-1" dir="ltr" style={{ color: 'var(--color-text-secondary)' }}>{doc.documentNumber}</td>
                  <td className="py-1" style={{ color: 'var(--color-text-secondary)' }}>{doc.issuingCountry}</td>
                  <td className="py-1" style={{ color: 'var(--color-text-secondary)' }}>{formatDate(doc.expiryDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Reservation history placeholder */}
      <div
        className="p-4 rounded-lg border"
        style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
      >
        <h3 className="text-sm font-semibold mb-2" style={{ color: 'var(--color-text-primary)' }}>
          היסטוריית הזמנות
        </h3>
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          יהיה זמין בפאזה 4 — מערכת הזמנות.
        </p>
      </div>
    </div>
  );
}
