'use client';

import type { Invoice } from '@/lib/api/checkin';

const ITEM_TYPE_LABELS: Record<string, string> = {
  room_charge: 'לינה',
  tax: 'מע"מ',
  discount: 'הנחה',
  other: 'אחר',
};

interface Props {
  invoice: Invoice;
}

export function InvoiceSummary({ invoice }: Props) {
  const isPaid = invoice.status === 'paid';

  const totalPaid = invoice.payments?.reduce((sum, p) => sum + Number(p.amount), 0) ?? 0;
  const remaining = Number(invoice.total) - totalPaid;
  const hasPartialPayment = !isPaid && totalPaid > 0 && remaining > 0.01;

  return (
    <div className="text-sm">
      {isPaid && (
        <div
          className="mb-3 flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium"
          style={{ backgroundColor: '#DCFCE7', color: '#15803D', border: '1px solid #86EFAC' }}
        >
          <span>✓</span>
          <span>החשבונית שולמה במלואה</span>
        </div>
      )}
      {hasPartialPayment && (
        <div
          className="mb-3 rounded-md px-3 py-2 text-sm space-y-1"
          style={{ backgroundColor: '#FEF9C3', border: '1px solid #FDE047' }}
        >
          <div className="flex justify-between font-medium" style={{ color: '#854D0E' }}>
            <span>שולם מקוון</span>
            <span>₪{totalPaid.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</span>
          </div>
          <div className="flex justify-between font-bold" style={{ color: '#B45309' }}>
            <span>יתרה לגבייה</span>
            <span>₪{remaining.toLocaleString('he-IL', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>
      )}
      <table className="w-full mb-4">
        <thead>
          <tr>
            <th
              className="text-right pb-2 font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              פירוט
            </th>
            <th
              className="text-center pb-2 font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              כמות
            </th>
            <th
              className="text-left pb-2 font-medium"
              style={{ color: 'var(--color-text-secondary)' }}
            >
              סכום
            </th>
          </tr>
        </thead>
        <tbody>
          {invoice.lineItems.map((item) => (
            <tr key={item.id} className="border-t" style={{ borderColor: 'var(--color-border-default)' }}>
              <td className="py-2" style={{ color: 'var(--color-text-primary)' }}>
                <span
                  className="text-xs px-1.5 py-0.5 rounded mr-2"
                  style={{ backgroundColor: 'var(--color-bg-base)', color: 'var(--color-text-secondary)' }}
                >
                  {ITEM_TYPE_LABELS[item.itemType] ?? item.itemType}
                </span>
                {item.description}
              </td>
              <td className="py-2 text-center" style={{ color: 'var(--color-text-secondary)' }}>
                {item.quantity}
              </td>
              <td className="py-2 text-left" style={{ color: 'var(--color-text-primary)' }}>
                ₪{Number(item.total).toLocaleString('he-IL', { minimumFractionDigits: 2 })}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div
        className="border-t pt-3 space-y-1"
        style={{ borderColor: 'var(--color-border-default)' }}
      >
        <div className="flex justify-between">
          <span style={{ color: 'var(--color-text-secondary)' }}>סכום ביניים</span>
          <span style={{ color: 'var(--color-text-primary)' }}>
            ₪{Number(invoice.subtotal).toLocaleString('he-IL', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: 'var(--color-text-secondary)' }}>{'מע"מ (17%)'}</span>
          <span style={{ color: 'var(--color-text-primary)' }}>
            ₪{Number(invoice.tax).toLocaleString('he-IL', { minimumFractionDigits: 2 })}
          </span>
        </div>
        <div
          className="flex justify-between font-semibold text-base pt-1 border-t"
          style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-primary)' }}
        >
          <span>{isPaid ? 'סה"כ שולם' : 'סה"כ לתשלום'}</span>
          <span>₪{Number(invoice.total).toLocaleString('he-IL', { minimumFractionDigits: 2 })}</span>
        </div>
      </div>

      {invoice.status === 'finalized' && invoice.issuedAt && (
        <p className="mt-3 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          חשבונית הופקה:{' '}
          {new Date(invoice.issuedAt).toLocaleString('he-IL', {
            dateStyle: 'short',
            timeStyle: 'short',
          })}
        </p>
      )}
    </div>
  );
}
