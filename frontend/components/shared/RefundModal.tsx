'use client';

import { useState } from 'react';
import { initiateRefund, type Payment } from '@/lib/api/billing';

interface Props {
  payment: Payment;
  onSuccess: () => void;
  onClose: () => void;
}

export function RefundModal({ payment, onSuccess, onClose }: Props) {
  const [amount, setAmount] = useState(payment.amount);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await initiateRefund(payment.id, Number(amount), reason);
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" dir="rtl">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-bold text-text-primary">בקשת זיכוי</h2>
        <p className="mb-4 text-sm text-text-secondary">
          סכום ששולם: ₪{Number(payment.amount).toFixed(2)}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              סכום לזיכוי (₪)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="0.01"
              max={payment.amount}
              step="0.01"
              className="w-full rounded border border-border-default p-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              סיבה לזיכוי
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={10}
              rows={3}
              className="w-full rounded border border-border-default p-2 text-sm"
              placeholder="פרטי הסיבה לזיכוי..."
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded bg-red-600 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              {loading ? 'מעבד...' : 'אשר זיכוי'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded border border-border-default py-2 text-sm font-medium text-text-secondary hover:bg-gray-50"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
