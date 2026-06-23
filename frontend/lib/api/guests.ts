import { apiFetch } from './client';

export type DocumentType = 'passport' | 'id_card' | 'drivers_license' | 'other';

export interface Guest {
  id: string;
  branchId: string;
  fullName: string;
  email: string | null;
  phone: string;
  passportId: string | null;
  nationality: string | null;
  dateOfBirth: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GuestSearchResult {
  id: string;
  fullName: string;
  email: string | null;
  phone: string;
  passportId: string | null;
  nationality: string | null;
}

export interface GuestDocument {
  id: string;
  guestId: string;
  branchId: string;
  documentType: DocumentType;
  documentNumber: string;
  issuingCountry: string;
  expiryDate: string | null;
  recordedAt: string;
  recordedBy: string;
  createdAt: string;
}

export interface GuestsPage {
  items: Guest[];
  total: number;
  page: number;
  limit: number;
}

export interface GuestsFilter {
  search?: string;
  branchId?: string;
  page?: number;
  limit?: number;
}

export interface CreateGuestPayload {
  branchId?: string;
  fullName: string;
  email?: string;
  phone: string;
  passportId?: string;
  nationality?: string;
  dateOfBirth?: string;
  notes?: string;
}

export interface UpdateGuestPayload {
  fullName?: string;
  email?: string;
  phone?: string;
  passportId?: string;
  nationality?: string;
  dateOfBirth?: string;
  notes?: string;
}

export interface CreateGuestDocumentPayload {
  documentType: DocumentType;
  documentNumber: string;
  issuingCountry: string;
  expiryDate?: string;
  recordedAt: string;
}

export async function getGuests(filters?: GuestsFilter): Promise<GuestsPage> {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== '') params.set(k, String(v));
    });
  }
  const qs = params.toString();
  return apiFetch<GuestsPage>(`/v1/guests${qs ? `?${qs}` : ''}`);
}

export async function searchGuests(q: string, branchId?: string): Promise<GuestSearchResult[]> {
  const params = new URLSearchParams({ q });
  if (branchId) params.set('branchId', branchId);
  return apiFetch<GuestSearchResult[]>(`/v1/guests/search?${params.toString()}`);
}

export async function getGuest(id: string): Promise<Guest> {
  return apiFetch<Guest>(`/v1/guests/${id}`);
}

export async function createGuest(payload: CreateGuestPayload): Promise<Guest> {
  return apiFetch<Guest>('/v1/guests', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateGuest(id: string, payload: UpdateGuestPayload): Promise<Guest> {
  return apiFetch<Guest>(`/v1/guests/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function deleteGuest(id: string): Promise<Guest> {
  return apiFetch<Guest>(`/v1/guests/${id}`, { method: 'DELETE' });
}

export async function getGuestDocuments(guestId: string): Promise<GuestDocument[]> {
  return apiFetch<GuestDocument[]>(`/v1/guests/${guestId}/documents`);
}

export async function addGuestDocument(
  guestId: string,
  payload: CreateGuestDocumentPayload,
): Promise<GuestDocument> {
  return apiFetch<GuestDocument>(`/v1/guests/${guestId}/documents`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
