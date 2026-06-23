import { apiFetch } from './client';
import type { Room } from './rooms';

export interface OccupancySummary {
  total: number;
  occupied: number;
  available: number;
  dirty: number;
  maintenance: number;
}

export interface AvailabilityFilter {
  branchId: string;
  checkIn: string;
  checkOut: string;
  roomTypeId?: string;
  floor?: number;
  maxOccupancy?: number;
}

export async function getAvailableRooms(filter: AvailabilityFilter): Promise<Room[]> {
  const params = new URLSearchParams();
  Object.entries(filter).forEach(([k, v]) => {
    if (v !== undefined && v !== '') params.set(k, String(v));
  });
  return apiFetch<Room[]>(`/v1/availability?${params.toString()}`);
}

export async function getOccupancySummary(
  branchId: string,
  date: string,
): Promise<OccupancySummary> {
  return apiFetch<OccupancySummary>(
    `/v1/availability/summary?branchId=${branchId}&date=${date}`,
  );
}
