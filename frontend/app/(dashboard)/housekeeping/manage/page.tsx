'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  HousekeepingTask,
  HousekeepingTaskStatus,
  HousekeepingPriority,
  housekeepingApi,
  CreateTaskPayload,
} from '@/lib/api/housekeeping';
import { getUsers, User } from '@/lib/api/users';
import { PriorityBadge } from '@/components/shared/PriorityBadge';

const statusLabels: Record<HousekeepingTaskStatus, string> = {
  pending: 'ממתין',
  in_progress: 'בביצוע',
  completed: 'הושלם',
  skipped: 'דולג',
};

const priorityLabels: Record<HousekeepingPriority, string> = { urgent: 'דחוף', normal: 'רגיל' };

export default function HousekeepingManagePage() {
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [housekeepers, setHousekeepers] = useState<User[]>([]);
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

  const loadTasks = useCallback(() => {
    setLoading(true);
    housekeepingApi
      .getTasks({
        status: filterStatus || undefined,
        priority: filterPriority || undefined,
        assignedTo: filterAssigned || undefined,
        scheduledFor: filterDate || undefined,
      })
      .then(setTasks)
      .catch((e: unknown) => setError(e instanceof Error ? e.message : 'שגיאה'))
      .finally(() => setLoading(false));
  }, [filterStatus, filterPriority, filterAssigned, filterDate]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  useEffect(() => {
    getUsers()
      .then((users) => setHousekeepers(users.filter((u) => u.role === 'housekeeping' && u.isActive)))
      .catch(() => {});
  }, []);

  async function handleAssign(taskId: string, userId: string) {
    if (!userId) return;
    try {
      const updated = await housekeepingApi.assignTask(taskId, userId);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'שגיאה');
    }
  }

  async function handleSkip(taskId: string) {
    const reason = prompt('סיבת דילוג:');
    if (!reason) return;
    try {
      const updated = await housekeepingApi.skipTask(taskId, reason);
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'שגיאה');
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
      alert(err instanceof Error ? err.message : 'שגיאה');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#0F172A]">ניהול ניקיון</h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-[#CA8A04] text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + צור משימה
        </button>
      </div>

      {showCreate && (
        <form
          onSubmit={(e) => void handleCreate(e)}
          className="bg-white rounded-lg border border-[#E2E8F0] p-4 mb-6 grid grid-cols-2 gap-3"
        >
          <div className="col-span-2 font-medium text-[#0F172A] text-sm">משימה חדשה</div>
          <div>
            <label className="text-xs text-[#475569] block mb-1">מזהה חדר (UUID)</label>
            <input
              className="w-full border border-[#E2E8F0] rounded px-2 py-1.5 text-sm"
              placeholder="room id"
              value={createForm.roomId ?? ''}
              onChange={(e) => setCreateForm((f) => ({ ...f, roomId: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-xs text-[#475569] block mb-1">תאריך מתוכנן</label>
            <input
              type="date"
              className="w-full border border-[#E2E8F0] rounded px-2 py-1.5 text-sm"
              value={createForm.scheduledFor ?? today}
              onChange={(e) => setCreateForm((f) => ({ ...f, scheduledFor: e.target.value }))}
              required
            />
          </div>
          <div>
            <label className="text-xs text-[#475569] block mb-1">עדיפות</label>
            <select
              className="w-full border border-[#E2E8F0] rounded px-2 py-1.5 text-sm"
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
            <label className="text-xs text-[#475569] block mb-1">שייך ל</label>
            <select
              className="w-full border border-[#E2E8F0] rounded px-2 py-1.5 text-sm"
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
            <label className="text-xs text-[#475569] block mb-1">הערות</label>
            <input
              className="w-full border border-[#E2E8F0] rounded px-2 py-1.5 text-sm"
              value={createForm.notes ?? ''}
              onChange={(e) => setCreateForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
          <div className="col-span-2 flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="border border-[#E2E8F0] text-[#475569] px-3 py-1.5 rounded text-sm"
            >
              ביטול
            </button>
            <button
              type="submit"
              disabled={creating}
              className="bg-[#1E3A8A] text-white px-4 py-1.5 rounded text-sm disabled:opacity-50"
            >
              {creating ? 'יוצר...' : 'צור'}
            </button>
          </div>
        </form>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          className="border border-[#E2E8F0] rounded px-2 py-1.5 text-sm bg-white"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as HousekeepingTaskStatus | '')}
        >
          <option value="">כל הסטטוסים</option>
          {(Object.keys(statusLabels) as HousekeepingTaskStatus[]).map((s) => (
            <option key={s} value={s}>{statusLabels[s]}</option>
          ))}
        </select>
        <select
          className="border border-[#E2E8F0] rounded px-2 py-1.5 text-sm bg-white"
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as HousekeepingPriority | '')}
        >
          <option value="">כל העדיפויות</option>
          {(Object.keys(priorityLabels) as HousekeepingPriority[]).map((p) => (
            <option key={p} value={p}>{priorityLabels[p]}</option>
          ))}
        </select>
        <select
          className="border border-[#E2E8F0] rounded px-2 py-1.5 text-sm bg-white"
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
          className="border border-[#E2E8F0] rounded px-2 py-1.5 text-sm bg-white"
          value={filterDate}
          onChange={(e) => setFilterDate(e.target.value)}
        />
      </div>

      {loading && <p className="text-sm text-[#475569]">טוען...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && (
        <div className="bg-white rounded-lg border border-[#E2E8F0] overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
              <tr>
                <th className="text-right px-4 py-3 font-medium text-[#475569]">חדר</th>
                <th className="text-right px-4 py-3 font-medium text-[#475569]">עדיפות</th>
                <th className="text-right px-4 py-3 font-medium text-[#475569]">סטטוס</th>
                <th className="text-right px-4 py-3 font-medium text-[#475569]">תאריך</th>
                <th className="text-right px-4 py-3 font-medium text-[#475569]">מטפל</th>
                <th className="text-right px-4 py-3 font-medium text-[#475569]">פעולות</th>
              </tr>
            </thead>
            <tbody>
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-[#475569]">אין משימות</td>
                </tr>
              )}
              {tasks.map((task) => (
                <tr key={task.id} className="border-b border-[#E2E8F0] last:border-0 hover:bg-[#F8FAFC]">
                  <td className="px-4 py-3">
                    <span className="font-medium text-[#0F172A]">חדר {task.room.number}</span>
                    {task.room.floor != null && (
                      <span className="text-[#475569] text-xs mr-1">קומה {task.room.floor}</span>
                    )}
                    {task.createdBy === null && (
                      <span className="mr-1 text-xs" title="נוצר אוטומטית">🧹</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <PriorityBadge priority={task.priority} />
                  </td>
                  <td className="px-4 py-3 text-[#475569]">{statusLabels[task.status]}</td>
                  <td className="px-4 py-3 text-[#475569]">
                    {new Date(task.scheduledFor).toLocaleDateString('he-IL')}
                  </td>
                  <td className="px-4 py-3">
                    {task.status === 'pending' || task.status === 'in_progress' ? (
                      <select
                        className="border border-[#E2E8F0] rounded px-1.5 py-1 text-xs bg-white"
                        value={task.assignedTo ?? ''}
                        onChange={(e) => void handleAssign(task.id, e.target.value)}
                      >
                        <option value="">— שייך ל —</option>
                        {housekeepers.map((h) => (
                          <option key={h.id} value={h.id}>{h.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-[#475569] text-xs">{task.assignee?.name ?? '—'}</span>
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
    </div>
  );
}
