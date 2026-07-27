'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import {
  HousekeepingTask,
  HousekeepingTaskStatus,
  HousekeepingPriority,
  housekeepingApi,
  CreateTaskPayload,
} from '@/lib/api/housekeeping';
import { getUsers, User } from '@/lib/api/users';
import { getRooms, Room } from '@/lib/api/rooms';
import { useBranchStore } from '@/lib/store/branch.store';
import { useAuth } from '@/hooks/useAuth';
import { PriorityBadge } from '@/components/shared/PriorityBadge';

const statusLabels: Record<HousekeepingTaskStatus, string> = {
  pending: 'ממתין',
  in_progress: 'בביצוע',
  completed: 'הושלם',
  skipped: 'דולג',
};

const priorityLabels: Record<HousekeepingPriority, string> = { urgent: 'דחוף', normal: 'רגיל' };

export default function HousekeepingManagePage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'chain_admin';
  const { selectedBranchId } = useBranchStore();

  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [housekeepers, setHousekeepers] = useState<User[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState<HousekeepingTaskStatus | ''>('');
  const [filterPriority, setFilterPriority] = useState<HousekeepingPriority | ''>('');
  const [filterAssigned, setFilterAssigned] = useState('');
  const [filterDate, setFilterDate] = useState('');

  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState<Partial<CreateTaskPayload>>({
    scheduledFor: new Date().toISOString().split('T')[0],
    priority: 'normal',
  });
  const [creating, setCreating] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  const branchId = isAdmin ? selectedBranchId || undefined : undefined;

  const loadTasks = useCallback(async () => {
    if (isAdmin && !selectedBranchId) { setLoading(false); return; }
    setLoading(true);
    try {
      const data = await housekeepingApi.getTasks({
        status: filterStatus || undefined,
        priority: filterPriority || undefined,
        assignedTo: filterAssigned || undefined,
        scheduledFor: filterDate || undefined,
        branchId,
      });
      setTasks(data);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'שגיאה');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterPriority, filterAssigned, filterDate, branchId, isAdmin, selectedBranchId]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void loadTasks(); }, [loadTasks]);

  useEffect(() => {
    if (isAdmin && !selectedBranchId) return;
    getUsers()
      .then((users) => setHousekeepers(users.filter((u) => u.role === 'housekeeping' && u.isActive)))
      .catch(() => {});
    getRooms(branchId ? { branchId } : {})
      .then(setRooms)
      .catch(() => {});
  }, [isAdmin, selectedBranchId, branchId]);

  async function handleAssign(taskId: string, userId: string) {
    if (!userId) return;
    try {
      const updated = await housekeepingApi.assignTask(taskId, userId);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'שגיאה');
    }
  }

  async function handleSkip(taskId: string) {
    const reason = prompt('סיבת דילוג:');
    if (!reason) return;
    try {
      const updated = await housekeepingApi.skipTask(taskId, reason);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'שגיאה');
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!createForm.roomId || !createForm.scheduledFor) return;
    setCreating(true);
    try {
      const task = await housekeepingApi.createTask(createForm as CreateTaskPayload);
      setTasks((prev) => [task, ...prev]);
      setShowCreate(false);
      setCreateForm({ scheduledFor: today, priority: 'normal' });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'שגיאה');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text-primary)' }}>{isAdmin ? 'ניהול ניקוי — כל הרשת' : 'ניהול ניקוי'}</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreate(!showCreate)}
            disabled={isAdmin && !selectedBranchId}
            className="text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-40"
            style={{ backgroundColor: 'var(--color-accent)' }}
          >
            + צור משימה
          </button>
        </div>
      </div>

      {isAdmin && !selectedBranchId ? (
        <div className="text-center py-16" style={{ color: 'var(--color-text-secondary)' }}>
          <div className="text-4xl mb-3">🏨</div>
          <p>בחר סניף כדי לצפות במשימות ניקוי</p>
        </div>
      ) : (
        <>
          {showCreate && (
            <form
              onSubmit={(e) => void handleCreate(e)}
              className="rounded-lg border p-4 mb-6 grid grid-cols-2 gap-3"
              style={{ borderColor: 'var(--color-border-default)', backgroundColor: 'var(--color-bg-surface)' }}
            >
              <div className="col-span-2 font-medium text-sm" style={{ color: 'var(--color-text-primary)' }}>משימה חדשה</div>
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--color-text-secondary)' }}>חדר</label>
                <select
                  className="w-full border rounded px-2 py-1.5 text-sm bg-white"
                  style={{ borderColor: 'var(--color-border-default)' }}
                  value={createForm.roomId ?? ''}
                  onChange={(e) => setCreateForm((f) => ({ ...f, roomId: e.target.value }))}
                  required
                >
                  <option value="">— בחר חדר —</option>
                  {rooms
                    .filter((r) => r.isActive)
                    .sort((a, b) => a.number.localeCompare(b.number, undefined, { numeric: true }))
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        חדר {r.number}{r.floor != null ? ` · קומה ${r.floor}` : ''}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--color-text-secondary)' }}>תאריך מתוכנן</label>
                <input
                  type="date"
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  style={{ borderColor: 'var(--color-border-default)' }}
                  value={createForm.scheduledFor ?? today}
                  onChange={(e) => setCreateForm((f) => ({ ...f, scheduledFor: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--color-text-secondary)' }}>עדיפות</label>
                <select
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  style={{ borderColor: 'var(--color-border-default)' }}
                  value={createForm.priority ?? 'normal'}
                  onChange={(e) =>
                    setCreateForm((f) => ({
                      ...f,
                      priority: e.target.value as HousekeepingPriority,
                    }))
                  }
                >
                  <option value="normal">רגיל</option>
                  <option value="urgent">דחוף</option>
                </select>
              </div>
              <div>
                <label className="text-xs block mb-1" style={{ color: 'var(--color-text-secondary)' }}>שייך ל</label>
                <select
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  style={{ borderColor: 'var(--color-border-default)' }}
                  value={createForm.assignedTo ?? ''}
                  onChange={(e) => setCreateForm((f) => ({ ...f, assignedTo: e.target.value || undefined }))}
                >
                  <option value="">— ללא שיוך —</option>
                  {housekeepers.map((h) => (
                    <option key={h.id} value={h.id}>{h.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs block mb-1" style={{ color: 'var(--color-text-secondary)' }}>הערות</label>
                <input
                  className="w-full border rounded px-2 py-1.5 text-sm"
                  style={{ borderColor: 'var(--color-border-default)' }}
                  value={createForm.notes ?? ''}
                  onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div className="col-span-2 flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="border px-3 py-1.5 rounded text-sm"
                  style={{ borderColor: 'var(--color-border-default)', color: 'var(--color-text-secondary)' }}
                >
                  ביטול
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="text-white px-4 py-1.5 rounded text-sm disabled:opacity-50"
                  style={{ backgroundColor: 'var(--color-primary)' }}
                >
                  {creating ? 'יוצר...' : 'צור'}
                </button>
              </div>
            </form>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <select
              className="border rounded px-2 py-1.5 text-sm bg-white"
              style={{ borderColor: 'var(--color-border-default)' }}
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as HousekeepingTaskStatus | '')}
            >
              <option value="">כל הסטטוסים</option>
              {(Object.keys(statusLabels) as HousekeepingTaskStatus[]).map((s) => (
                <option key={s} value={s}>{statusLabels[s]}</option>
              ))}
            </select>
            <select
              className="border rounded px-2 py-1.5 text-sm bg-white"
              style={{ borderColor: 'var(--color-border-default)' }}
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value as HousekeepingPriority | '')}
            >
              <option value="">כל העדיפויות</option>
              {(Object.keys(priorityLabels) as HousekeepingPriority[]).map((p) => (
                <option key={p} value={p}>{priorityLabels[p]}</option>
              ))}
            </select>
            <select
              className="border rounded px-2 py-1.5 text-sm bg-white"
              style={{ borderColor: 'var(--color-border-default)' }}
              value={filterAssigned}
              onChange={(e) => setFilterAssigned(e.target.value)}
            >
              <option value="">כל הצוות</option>
              {housekeepers.map((h) => (
                <option key={h.id} value={h.id}>{h.name}</option>
              ))}
            </select>
            <input
              type="date"
              className="border rounded px-2 py-1.5 text-sm bg-white"
              style={{ borderColor: 'var(--color-border-default)' }}
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>

          {loading && <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>טוען...</p>}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {!loading && !error && (
            <div className="rounded-lg border overflow-hidden" style={{ borderColor: 'var(--color-border-default)' }}>
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: 'var(--color-bg-base)', borderBottom: '1px solid var(--color-border-default)' }}>
                  <tr>
                    <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-text-secondary)' }}>חדר</th>
                    <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-text-secondary)' }}>עדיפות</th>
                    <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-text-secondary)' }}>סטטוס</th>
                    <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-text-secondary)' }}>תאריך</th>
                    <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-text-secondary)' }}>מטפל</th>
                    <th className="text-right px-4 py-3 font-medium" style={{ color: 'var(--color-text-secondary)' }}>פעולות</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-8" style={{ color: 'var(--color-text-secondary)' }}>אין משימות</td>
                    </tr>
                  )}
                  {tasks.map((task) => (
                    <tr key={task.id} className="border-b last:border-0 hover:bg-[var(--color-bg-base)]" style={{ borderColor: 'var(--color-border-default)' }}>
                      <td className="px-4 py-3">
                        <span className="font-medium" style={{ color: 'var(--color-text-primary)' }}>חדר {task.room.number}</span>
                        {task.room.floor != null && (
                          <span className="text-xs mr-1" style={{ color: 'var(--color-text-secondary)' }}>קומה {task.room.floor}</span>
                        )}
                        {task.createdBy === null && (
                          <span className="mr-1 text-xs" title="נוצר אוטומטית">🧹</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={task.priority} />
                      </td>
                      <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>{statusLabels[task.status]}</td>
                      <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>
                        {new Date(task.scheduledFor).toLocaleDateString('he-IL')}
                      </td>
                      <td className="px-4 py-3">
                        {task.status === 'pending' || task.status === 'in_progress' ? (
                          <select
                            className="border rounded px-1.5 py-1 text-xs bg-white"
                            style={{ borderColor: 'var(--color-border-default)' }}
                            value={task.assignedTo ?? ''}
                            onChange={(e) => void handleAssign(task.id, e.target.value)}
                          >
                            <option value="">— שייך ל —</option>
                            {housekeepers.map((h) => (
                              <option key={h.id} value={h.id}>{h.name}</option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{task.assignee?.name ?? '—'}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {(task.status === 'pending' || task.status === 'in_progress') && (
                          <button
                            onClick={() => void handleSkip(task.id)}
                            className="text-xs text-red-600 hover:underline"
                          >
                            דלג
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
