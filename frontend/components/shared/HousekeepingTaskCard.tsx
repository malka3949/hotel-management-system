'use client';

import { useState } from 'react';
import { HousekeepingTask, housekeepingApi } from '@/lib/api/housekeeping';
import { PriorityBadge } from './PriorityBadge';

interface Props {
  task: HousekeepingTask;
  onUpdate: (task: HousekeepingTask) => void;
}

const statusLabels: Record<string, string> = {
  pending: 'ממתין',
  in_progress: 'בביצוע',
  completed: 'הושלם',
  skipped: 'דולג',
};

export function HousekeepingTaskCard({ task, onUpdate }: Props) {
  const [loading, setLoading] = useState(false);
  const [confirmComplete, setConfirmComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setLoading(true);
    try {
      const updated = await housekeepingApi.startTask(task.id);
      onUpdate(updated);
    } finally {
      setLoading(false);
    }
  }

  async function handleComplete() {
    setLoading(true);
    setError(null);
    try {
      const updated = await housekeepingApi.completeTask(task.id);
      onUpdate(updated);
      setConfirmComplete(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בעדכון');
    } finally {
      setLoading(false);
    }
  }

  const isAutoCreated = task.createdBy === null;

  return (
    <div className="bg-white rounded-lg border border-[#E2E8F0] p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-[#0F172A]">חדר {task.room.number}</span>
          {task.room.floor != null && (
            <span className="text-sm text-[#475569]">קומה {task.room.floor}</span>
          )}
          {isAutoCreated ? (
            <span title="נוצר אוטומטית בעת צ'ק-אאוט" className="text-base">🧹</span>
          ) : (
            <span title="נוצר ידנית" className="text-base">✏️</span>
          )}
        </div>
        <PriorityBadge priority={task.priority} />
      </div>

      <div className="flex items-center gap-2 mb-3 text-sm text-[#475569]">
        <span>סטטוס: <strong>{statusLabels[task.status]}</strong></span>
        {task.assignee && <span>· {task.assignee.name}</span>}
      </div>

      {task.notes && (
        <p className="text-sm text-[#475569] mb-3 bg-[#F8FAFC] rounded p-2">{task.notes}</p>
      )}

      {error && (
        <p className="text-xs text-red-600 mb-2">{error}</p>
      )}

      {confirmComplete ? (
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => void handleComplete()}
            disabled={loading}
            className="flex-1 bg-green-600 text-white text-sm py-2 rounded-lg font-medium disabled:opacity-50"
          >
            {loading ? 'מעדכן...' : 'אשר סיום'}
          </button>
          <button
            onClick={() => setConfirmComplete(false)}
            className="flex-1 border border-[#E2E8F0] text-[#475569] text-sm py-2 rounded-lg"
          >
            ביטול
          </button>
        </div>
      ) : (
        <div className="flex gap-2 mt-2">
          {task.status === 'pending' && (
            <button
              onClick={() => void handleStart()}
              disabled={loading}
              className="flex-1 bg-[#1E3A8A] text-white text-sm py-2 rounded-lg font-medium disabled:opacity-50"
            >
              {loading ? 'מעדכן...' : 'התחל ניקיון'}
            </button>
          )}
          {task.status === 'in_progress' && (
            <button
              onClick={() => setConfirmComplete(true)}
              disabled={loading}
              className="flex-1 bg-green-600 text-white text-sm py-2 rounded-lg font-medium disabled:opacity-50"
            >
              סיים ניקיון
            </button>
          )}
          {(task.status === 'completed' || task.status === 'skipped') && (
            <span className="flex-1 text-center text-sm text-[#475569] py-2">
              {task.status === 'completed' ? '✓ הושלם' : '— דולג'}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
