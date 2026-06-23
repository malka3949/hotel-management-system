import { apiFetch } from './client';

export type RoomStatus = 'available' | 'occupied' | 'maintenance' | 'out_of_order';
export type CleaningStatus = 'clean' | 'dirty' | 'in_progress';

export interface RoomType {
  id: string;
  branchId: string;
  name: string;
  basePrice: string;
  maxOccupancy: number;
  description: string | null;
  createdAt: string;
}

export interface Room {
  id: string;
  branchId: string;
  roomTypeId: string;
  number: string;
  floor: number | null;
  status: RoomStatus;
  cleaningStatus: CleaningStatus;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  roomType: Pick<RoomType, 'id' | 'name' | 'basePrice' | 'maxOccupancy'>;
}

export interface CreateRoomPayload {
  branchId?: string;
  roomTypeId: string;
  number: string;
  floor?: number;
  notes?: string;
}

export interface UpdateRoomPayload {
  roomTypeId?: string;
  number?: string;
  floor?: number;
  notes?: string;
  isActive?: boolean;
}

export interface CreateRoomTypePayload {
  branchId?: string;
  name: string;
  basePrice: number;
  maxOccupancy: number;
  description?: string;
}

export interface UpdateRoomTypePayload {
  name?: string;
  basePrice?: number;
  maxOccupancy?: number;
  description?: string;
}

export interface RoomsFilter {
  status?: RoomStatus;
  cleaningStatus?: CleaningStatus;
  roomTypeId?: string;
  floor?: number;
  search?: string;
  branchId?: string;
}

export async function getRooms(filters?: RoomsFilter): Promise<Room[]> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.set(k, String(v));
    });
  }
  const qs = params.toString();
  return apiFetch<Room[]>(`/v1/rooms${qs ? `?${qs}` : ''}`);
}

export async function getRoom(id: string): Promise<Room> {
  return apiFetch<Room>(`/v1/rooms/${id}`);
}

export async function createRoom(payload: CreateRoomPayload): Promise<Room> {
  return apiFetch<Room>('/v1/rooms', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateRoom(id: string, payload: UpdateRoomPayload): Promise<Room> {
  return apiFetch<Room>(`/v1/rooms/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function updateRoomStatus(id: string, status: RoomStatus): Promise<Room> {
  return apiFetch<Room>(`/v1/rooms/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function updateCleaningStatus(
  id: string,
  cleaningStatus: CleaningStatus,
): Promise<Room> {
  return apiFetch<Room>(`/v1/rooms/${id}/cleaning-status`, {
    method: 'PATCH',
    body: JSON.stringify({ cleaningStatus }),
  });
}

export async function deleteRoom(id: string): Promise<Room> {
  return apiFetch<Room>(`/v1/rooms/${id}`, { method: 'DELETE' });
}

export async function getRoomTypes(branchId?: string): Promise<RoomType[]> {
  const qs = branchId ? `?branchId=${branchId}` : '';
  return apiFetch<RoomType[]>(`/v1/room-types${qs}`);
}

export async function createRoomType(payload: CreateRoomTypePayload): Promise<RoomType> {
  return apiFetch<RoomType>('/v1/room-types', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateRoomType(id: string, payload: UpdateRoomTypePayload): Promise<RoomType> {
  return apiFetch<RoomType>(`/v1/room-types/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteRoomType(id: string): Promise<RoomType> {
  return apiFetch<RoomType>(`/v1/room-types/${id}`, { method: 'DELETE' });
}
