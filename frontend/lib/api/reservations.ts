import { apiFetch } from './client';

export type ReservationStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled'
  | 'no_show';

export type ReservationSource = 'walk_in' | 'phone' | 'website' | 'ota';

export interface ReservationGuest {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  passportId: string | null;
}

export interface ReservationRoom {
  id: string;
  number: string;
  floor: number | null;
  status: string;
  roomType: {
    id: string;
    name: string;
    basePrice: string;
    maxOccupancy: number;
  };
}

export interface Reservation {
  id: string;
  branchId: string;
  roomId: string;
  guestId: string;
  checkInDate: string;
  checkOutDate: string;
  status: ReservationStatus;
  totalPrice: string;
  source: ReservationSource | null;
  adults: number;
  children: number;
  notes: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  version: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  guest: ReservationGuest;
  room: ReservationRoom;
  createdByUser: { id: string; name: string };
}

export interface CalendarReservation {
  id: string;
  roomId: string;
  guestId: string;
  checkInDate: string;
  checkOutDate: string;
  status: ReservationStatus;
  totalPrice: string;
  guest: { fullName: string };
  room: { number: string };
}

export interface ReservationListResult {
  items: Reservation[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateReservationPayload {
  branchId?: string;
  roomId: string;
  guestId: string;
  checkInDate: string;
  checkOutDate: string;
  adults?: number;
  children?: number;
  source?: ReservationSource;
  notes?: string;
}

export interface UpdateReservationPayload {
  roomId?: string;
  guestId?: string;
  checkInDate?: string;
  checkOutDate?: string;
  adults?: number;
  children?: number;
  source?: ReservationSource;
  notes?: string;
}

export interface ReservationFilters {
  branchId?: string;
  status?: ReservationStatus;
  dateFrom?: string;
  dateTo?: string;
  roomTypeId?: string;
  roomId?: string;
  guestId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

function buildQs(filters: Record<string, string | number | boolean | undefined>): string {
  const p = new URLSearchParams();
  Object.entries(filters).forEach(([k, v]) => {
    if (v !== undefined && v !== '') p.set(k, String(v));
  });
  const s = p.toString();
  return s ? `?${s}` : '';
}

export async function getReservations(filters?: ReservationFilters): Promise<ReservationListResult> {
  return apiFetch<ReservationListResult>(`/v1/reservations${buildQs((filters ?? {}) as Record<string, string | number | boolean | undefined>)}`);
}

export async function getReservation(id: string): Promise<Reservation> {
  return apiFetch<Reservation>(`/v1/reservations/${id}`);
}

export async function getCalendarReservations(
  dateFrom: string,
  dateTo: string,
  branchId?: string,
): Promise<CalendarReservation[]> {
  return apiFetch<CalendarReservation[]>(
    `/v1/reservations/calendar${buildQs({ dateFrom, dateTo, branchId })}`,
  );
}

export async function createReservation(payload: CreateReservationPayload): Promise<Reservation> {
  return apiFetch<Reservation>('/v1/reservations', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateReservation(
  id: string,
  payload: UpdateReservationPayload,
): Promise<Reservation> {
  return apiFetch<Reservation>(`/v1/reservations/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function updateReservationStatus(
  id: string,
  status: ReservationStatus,
): Promise<Reservation> {
  return apiFetch<Reservation>(`/v1/reservations/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function cancelReservation(id: string, reason: string): Promise<Reservation> {
  return apiFetch<Reservation>(`/v1/reservations/${id}/cancel`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  });
}

export async function getRoomReservations(roomId: string): Promise<Reservation[]> {
  return apiFetch<Reservation[]>(`/v1/rooms/${roomId}/reservations`);
}

export async function getGuestReservations(guestId: string): Promise<Reservation[]> {
  return apiFetch<Reservation[]>(`/v1/guests/${guestId}/reservations`);
}

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  pending: 'ממתין',
  confirmed: 'מאושר',
  checked_in: 'שהייה',
  checked_out: 'עזב',
  cancelled: 'בוטל',
  no_show: 'לא הגיע',
};

export const SOURCE_LABELS: Record<ReservationSource, string> = {
  walk_in: 'הגעה ישירה',
  phone: 'טלפון',
  website: 'אתר',
  ota: 'OTA',
};
