'use client';

import { useState } from 'react';
import { addCharge, type ChargeType } from '@/lib/api/billing';

const CHARGE_TYPE_LABELS: Record<ChargeType, string> = {
  room_service: 'שירות חדרים',
  minibar: 'מיניבר',
  laundry: 'כביסה',
  telephone: 'טלפון',
  parking: 'חניה',
  other: 'אחר',
};

interface Props {
  invoiceId: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function AddChargeModal({ invoiceId, onSuccess, onClose }: Props) {
  const [chargeType, setChargeType] = useState<ChargeType>('room_service');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await addCharge(invoiceId, chargeType, description, Number(amount));
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
        <h2 className="mb-4 text-lg font-bold text-text-primary">הוספת חיוב</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              סוג חיוב
            </label>
            <select
              value={chargeType}
              onChange={(e) => setChargeType(e.target.value as ChargeType)}
              className="w-full rounded border border-border-default p-2 text-sm"
            >
              {(Object.keys(CHARGE_TYPE_LABELS) as ChargeType[]).map((t) => (
                <option key={t} value={t}>
                  {CHARGE_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              תיאור
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              minLength={2}
              className="w-full rounded border border-border-default p-2 text-sm"
              placeholder="פרטי החיוב"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1">
              סכום (₪)
            </label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="0.01"
              step="0.01"
              className="w-full rounded border border-border-default p-2 text-sm"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded bg-primary py-2 text-sm font-medium text-white hover:bg-primary-light disabled:opacity-50"
            >
              {loading ? 'שומר...' : 'הוסף חיוב'}
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
