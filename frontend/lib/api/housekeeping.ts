import { apiFetch } from './client';

export type HousekeepingTaskStatus = 'pending' | 'in_progress' | 'completed' | 'skipped';
export type HousekeepingPriority = 'normal' | 'urgent';

export interface HousekeepingTask {
  id: string;
  branchId: string;
  roomId: string;
  reservationId: string | null;
  assignedTo: string | null;
  status: HousekeepingTaskStatus;
  priority: HousekeepingPriority;
  notes: string | null;
  scheduledFor: string;
  startedAt: string | null;
  completedAt: string | null;
  createdBy: string | null;
  createdAt: string;
  room: { id: string; number: string; floor: number | null; cleaningStatus: string };
  assignee: { id: string; name: string; email: string } | null;
  creator: { id: string; name: string } | null;
  reservation: { id: string; checkInDate: string; checkOutDate: string } | null;
}

export interface FilterTasksParams {
  status?: HousekeepingTaskStatus;
  priority?: HousekeepingPriority;
  assignedTo?: string;
  scheduledFor?: string;
  roomId?: string;
  branchId?: string;
}

export interface CreateTaskPayload {
  roomId: string;
  reservationId?: string;
  assignedTo?: string;
  priority?: HousekeepingPriority;
  scheduledFor: string;
  notes?: string;
}

function buildQuery(params?: Record<string, string | undefined>): string {
  if (!params) return '';
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined) q.set(k, v);
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const housekeepingApi = {
  getTasks: (params?: FilterTasksParams) =>
    apiFetch<HousekeepingTask[]>(
      `/v1/housekeeping/tasks${buildQuery(params as Record<string, string | undefined>)}`,
    ),

  createTask: (data: CreateTaskPayload) =>
    apiFetch<HousekeepingTask>('/v1/housekeeping/tasks', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  assignTask: (id: string, assignedTo: string) =>
    apiFetch<HousekeepingTask>(`/v1/housekeeping/tasks/${id}/assign`, {
      method: 'PATCH',
      body: JSON.stringify({ assignedTo }),
    }),

  startTask: (id: string) =>
    apiFetch<HousekeepingTask>(`/v1/housekeeping/tasks/${id}/start`, { method: 'PATCH' }),

  completeTask: (id: string) =>
    apiFetch<HousekeepingTask>(`/v1/housekeeping/tasks/${id}/complete`, { method: 'PATCH' }),

  skipTask: (id: string, reason: string) =>
    apiFetch<HousekeepingTask>(`/v1/housekeeping/tasks/${id}/skip`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
    }),
};
