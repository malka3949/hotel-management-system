'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { listInvoices, type Invoice, type InvoiceStatus } from '@/lib/api/billing';
import { useBranchStore } from '@/lib/store/branch.store';
import { useAuth } from '@/hooks/useAuth';

const STATUS_LABELS: Record<InvoiceStatus, string> = {
  draft: 'טיוטא',
  finalized: 'מסוכם',
  paid: 'שולם',
  void: 'בוטל',
};

const STATUS_COLORS: Record<InvoiceStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  finalized: 'bg-yellow-100 text-yellow-700',
  paid: 'bg-green-100 text-green-700',
  void: 'bg-red-100 text-red-700',
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function InvoicesListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'chain_admin';
  const { selectedBranchId } = useBranchStore();

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const limit = 20;

  useEffect(() => {
    if (isAdmin && !selectedBranchId) { setLoading(false); return; }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    listInvoices({
      status: statusFilter || undefined,
      branchId: isAdmin ? selectedBranchId : undefined,
      page,
      limit,
    })
      .then((res) => { setInvoices(res.items); setTotal(res.total); })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [statusFilter, page, isAdmin, selectedBranchId]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="max-w-5xl" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold" style={{ color: 'var(--color-text-primary)' }}>
          חשבוניות
        </h2>
        <div className="flex items-center gap-3">
          {!isAdmin && (
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{total} סה&quot;כ</span>
          )}
          {isAdmin && selectedBranchId && (
            <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{total} סה&quot;כ</span>
          )}
        </div>
      </div>

      {isAdmin && !selectedBranchId ? (
        <div className="text-center py-16" style={{ color: 'var(--color-text-secondary)' }}>
          <div className="text-4xl mb-3">🏨</div>
          <p>בחר סניף כדי לצפות חשבוניות</p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex gap-3 mb-4">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--color-border-default)' }}
            >
              <option value="">כל הסטטוסים</option>
              {(Object.keys(STATUS_LABELS) as InvoiceStatus[]).map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border-default)' }}>
            <table className="w-full text-sm">
              <thead style={{ backgroundColor: 'var(--color-bg-surface)' }}>
                <tr>
                  {['חשבונית', 'אורח', 'כניסה', 'יציאה', 'סה"כ', 'סטטוס', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-right font-medium" style={{ color: 'var(--color-text-secondary)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center" style={{ color: 'var(--color-text-secondary)' }}>טוען...</td></tr>
                ) : invoices.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center" style={{ color: 'var(--color-text-secondary)' }}>אין חשבוניות</td></tr>
                ) : invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-t cursor-pointer hover:bg-gray-50 transition-colors"
                    style={{ borderColor: 'var(--color-border-default)' }}
                    onClick={() => router.push(`/invoices/${inv.id}`)}
                  >
                    <td className="px-4 py-3 font-mono text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      {inv.id.slice(0, 8).toUpperCase()}
                    </td>
                    <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text-primary)' }}>
                      {inv.reservation?.guest?.fullName ?? '—'}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                      {inv.reservation?.checkInDate ? formatDate(inv.reservation.checkInDate) : '—'}
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                      {inv.reservation?.checkOutDate ? formatDate(inv.reservation.checkOutDate) : '—'}
                    </td>
                    <td className="px-4 py-3 font-semibold" style={{ color: 'var(--color-primary)' }}>
                      ₪{Number(inv.total).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[inv.status]}`}>
                        {STATUS_LABELS[inv.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {(inv.status === 'finalized' || inv.status === 'draft') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); router.push(`/payments/checkout?invoiceId=${inv.id}&reservationId=${inv.reservationId}`); }}
                          className="px-3 py-1 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: 'var(--color-accent)' }}
                        >
                          לתשלום
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex gap-2 mt-4 justify-center">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="px-3 py-1 rounded border text-sm disabled:opacity-40"
                style={{ borderColor: 'var(--color-border-default)' }}>הקודם</button>
              <span className="px-3 py-1 text-sm" style={{ color: 'var(--color-text-secondary)' }}>{page} / {totalPages}</span>
              <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                className="px-3 py-1 rounded border text-sm disabled:opacity-40"
                style={{ borderColor: 'var(--color-border-default)' }}>הבא</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
