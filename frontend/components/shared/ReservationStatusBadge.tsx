import type { ReservationStatus } from '@/lib/api/reservations';
import { STATUS_LABELS } from '@/lib/api/reservations';

const COLORS: Record<ReservationStatus, { bg: string; text: string }> = {
  pending:    { bg: '#FEF3C7', text: '#92400E' },
  confirmed:  { bg: '#DBEAFE', text: '#1E40AF' },
  checked_in: { bg: '#D1FAE5', text: '#065F46' },
  checked_out:{ bg: '#F3F4F6', text: '#374151' },
  cancelled:  { bg: '#FEE2E2', text: '#991B1B' },
  no_show:    { bg: '#EDE9FE', text: '#5B21B6' },
};

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  const { bg, text } = COLORS[status];
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
      style={{ backgroundColor: bg, color: text }}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
