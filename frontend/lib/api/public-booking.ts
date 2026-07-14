const BASE = '/api/public/branches';

export interface PublicBranch {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
  description: string | null;
  coverPhoto: string | null;
}

export interface PublicRoomType {
  id: string;
  name: string;
  basePrice: number;
  maxOccupancy: number;
  description: string | null;
  photos: string[];
  amenities: string[];
}

export interface CreatePublicReservationPayload {
  guestName: string;
  guestEmail: string;
  guestPhone: string;
  roomTypeId: string;
  checkInDate: string;
  checkOutDate: string;
  adults?: number;
  children?: number;
  notes?: string;
}

export interface PublicReservationResult {
  reservationId: string;
  branchName: string;
  roomType: string;
  roomNumber: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  totalPrice: number;
  portalUrl: string;
  message: string;
}

async function publicFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message ?? `HTTP ${res.status}`);
  return (body.data ?? body) as T;
}

export const publicBookingApi = {
  getBranch: (branchId: string) =>
    publicFetch<PublicBranch>(`${BASE}/${branchId}`),

  getRoomTypes: (branchId: string) =>
    publicFetch<PublicRoomType[]>(`${BASE}/${branchId}/room-types`),

  getAvailability: (branchId: string, checkIn: string, checkOut: string, roomTypeId?: string) => {
    const params = new URLSearchParams({ checkIn, checkOut });
    if (roomTypeId) params.set('roomTypeId', roomTypeId);
    return publicFetch<{ id: string; roomType: { id: string; name: string; basePrice: number } }[]>(
      `${BASE}/${branchId}/availability?${params}`,
    );
  },

  createReservation: (branchId: string, payload: CreatePublicReservationPayload) =>
    publicFetch<PublicReservationResult>(`${BASE}/${branchId}/reservations`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
