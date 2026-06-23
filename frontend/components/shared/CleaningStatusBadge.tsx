import type { CleaningStatus } from '@/lib/api/rooms';

const CONFIG: Record<CleaningStatus, { label: string; bg: string; color: string }> = {
  clean:       { label: 'נקי',      bg: '#DCFCE7', color: '#15803D' },
  dirty:       { label: 'מלוכלך',   bg: '#FEE2E2', color: '#DC2626' },
  in_progress: { label: 'בניקוי',   bg: '#FEF9C3', color: '#A16207' },
};

export function CleaningStatusBadge({ status }: { status: CleaningStatus }) {
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
