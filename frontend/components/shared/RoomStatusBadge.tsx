import type { RoomStatus } from '@/lib/api/rooms';

const CONFIG: Record<RoomStatus, { label: string; bg: string; color: string }> = {
  available:    { label: 'פנוי',        bg: '#DCFCE7', color: '#15803D' },
  occupied:     { label: 'תפוס',        bg: '#DBEAFE', color: '#1D4ED8' },
  maintenance:  { label: 'תחזוקה',      bg: '#FEF9C3', color: '#A16207' },
  out_of_order: { label: 'מושבת',       bg: '#FEE2E2', color: '#DC2626' },
};

export function RoomStatusBadge({ status }: { status: RoomStatus }) {
  const { label, bg, color } = CONFIG[status];
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ backgroundColor: bg, color }}
    >
      {label}
    </span>
  );
}
