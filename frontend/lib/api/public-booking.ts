import { toast } from 'sonner';
import { translateError } from './error-messages';

const BASE = '/api/public/branches';

export interface PublicBranchSummary {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  description: string | null;
  coverPhoto: string | null;
  amenities: string[];
  minPrice: number | null;
}

export interface PublicBranch {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
  description: string | null;
  coverPhoto: string | null;
  amenities: string[];
  cancellationPolicy: string | null;
}

export interface PublicRoomType {
  id: string;
  name: string;
  basePrice: number;
  maxOccupancy: number;
  description: string | null;
  photos: string[];
  amenities: string[];
  bedType: string | null;
  roomSize: number | null;
  maxAdults: number | null;
  maxChildren: number | null;
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
  consentGiven: boolean;
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
  let res: Response;
  try {
    res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  } catch {
    const msg = 'אין חיבור לאינטרנט או שהשרת אינו מגיב';
    if (typeof window !== 'undefined') toast.error(msg);
    throw new Error(msg);
  }
  if (!res.ok && res.headers.get('content-type')?.includes('text/html')) {
    const msg = 'השרת אינו זמין, נסה שוב בעוד מספר שניות';
    if (typeof window !== 'undefined') toast.error(msg);
    throw new Error(msg);
  }
  const body = await res.json();
  if (!res.ok) {
    // Throw the raw error code so callers can branch on it (e.g. EMAIL_ALREADY_REGISTERED).
    // Show the translated string only in the toast.
    const raw = (body as { message?: string }).message ?? '';
    if (typeof window !== 'undefined') toast.error(translateError(raw));
    throw new Error(raw);
  }
  return ((body as { data?: T }).data ?? body) as T;
}

export const publicBookingApi = {
  listBranches: () =>
    publicFetch<PublicBranchSummary[]>(BASE),

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
