'use client';

import { useEffect, useState } from 'react';
import { HousekeepingTask, HousekeepingTaskStatus, housekeepingApi } from '@/lib/api/housekeeping';
import { HousekeepingTaskCard } from '@/components/shared/HousekeepingTaskCard';
import { useAuth } from '@/hooks/useAuth';

type Filter = 'today' | 'pending';

export default function HousekeepingPage() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<HousekeepingTask[]>([]);
  const [filter, setFilter] = useState<Filter>('today');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    const params: { scheduledFor?: string; status?: HousekeepingTaskStatus } =
      filter === 'today'
        ? { scheduledFor: today }
        : { status: 'pending' };

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await housekeepingApi.getTasks(params);
        setTasks(data);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'שגיאה');
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [filter, today]);

  function handleTaskUpdate(updated: HousekeepingTask) {
    setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
  }

  const greeting = `שלום, ${user?.name ?? ''}. יש לך ${tasks.filter((t) => t.status === 'pending' || t.status === 'in_progress').length} משימות פעילות.`;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-[#0F172A] mb-1">ניקיון</h1>
      <p className="text-sm text-[#475569] mb-4">{greeting}</p>

      <div className="flex gap-2 mb-4">
        {(['today', 'pending'] as Filter[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
            style={
              filter === f
                ? { backgroundColor: 'var(--color-primary)', color: '#fff' }
                : { backgroundColor: 'var(--color-bg-surface)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border-default)' }
            }
          >
            {f === 'today' ? 'היום' : 'כל הממתינות'}
          </button>
        ))}
      </div>

      {loading && <p className="text-sm text-[#475569]">טוען...</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && tasks.length === 0 && (
        <p className="text-sm text-[#475569] text-center py-8">אין משימות</p>
      )}

      <div className="flex flex-col gap-3">
        {tasks.map((task) => (
          <HousekeepingTaskCard key={task.id} task={task} onUpdate={handleTaskUpdate} />
        ))}
      </div>
    </div>
  );
}
