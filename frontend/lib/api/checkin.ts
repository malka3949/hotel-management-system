import { apiFetch } from './client';

export interface CheckInRecord {
  id: string;
  reservationId: string;
  actualCheckInAt: string;
  checkedInBy: string;
  notes: string | null;
}

export interface CheckOutRecord {
  id: string;
  reservationId: string;
  actualCheckOutAt: string;
  checkedOutBy: string;
  notes: string | null;
}

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
  itemType: 'room_charge' | 'tax' | 'discount' | 'other';
}

export interface Invoice {
  id: string;
  reservationId: string;
  status: 'draft' | 'finalized' | 'void';
  subtotal: string;
  tax: string;
  total: string;
  issuedAt: string | null;
  lineItems: InvoiceLineItem[];
}

export interface FrontDeskGuest {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
}

export interface FrontDeskRoom {
  id: string;
  number: string;
  floor: number | null;
  roomType: { name: string };
}

export interface FrontDeskReservation {
  id: string;
  branchId: string;
  guestId: string;
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  totalPrice: string;
  adults: number;
  children: number;
  guest: FrontDeskGuest;
  room: FrontDeskRoom;
  checkIn?: CheckInRecord;
  invoice?: Invoice;
}

export async function checkIn(reservationId: string, notes?: string): Promise<FrontDeskReservation> {
  return apiFetch<FrontDeskReservation>(`/v1/reservations/${reservationId}/check-in`, {
    method: 'POST',
    body: JSON.stringify({ notes }),
  });
}

export async function checkOut(
  reservationId: string,
  notes?: string,
): Promise<{ reservation: FrontDeskReservation; invoice: Invoice | null }> {
  return apiFetch<{ reservation: FrontDeskReservation; invoice: Invoice | null }>(
    `/v1/reservations/${reservationId}/check-out`,
    { method: 'POST', body: JSON.stringify({ notes }) },
  );
}

export async function getInvoice(reservationId: string): Promise<Invoice> {
  return apiFetch<Invoice>(`/v1/reservations/${reservationId}/invoice`);
}

export async function getActiveGuests(branchId?: string): Promise<FrontDeskReservation[]> {
  const params = branchId ? `?branchId=${branchId}` : '';
  return apiFetch<FrontDeskReservation[]>(`/v1/front-desk/active-guests${params}`);
}

export async function getArrivals(date: string, branchId?: string): Promise<FrontDeskReservation[]> {
  const params = new URLSearchParams({ date });
  if (branchId) params.set('branchId', branchId);
  return apiFetch<FrontDeskReservation[]>(`/v1/front-desk/arrivals?${params}`);
}

export async function getDepartures(date: string, branchId?: string): Promise<FrontDeskReservation[]> {
  const params = new URLSearchParams({ date });
  if (branchId) params.set('branchId', branchId);
  return apiFetch<FrontDeskReservation[]>(`/v1/front-desk/departures?${params}`);
}
