'use client';

import { HousekeepingPriority } from '@/lib/api/housekeeping';

interface Props {
  priority: HousekeepingPriority;
}

const labels: Record<HousekeepingPriority, string> = {
  urgent: 'דחוף',
  normal: 'רגיל',
};

const styles: Record<HousekeepingPriority, string> = {
  urgent: 'bg-red-100 text-red-700 border border-red-200',
  normal: 'bg-gray-100 text-gray-600 border border-gray-200',
};

export function PriorityBadge({ priority }: Props) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[priority]}`}>
      {labels[priority]}
    </span>
  );
}
