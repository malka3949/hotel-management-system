import { toast } from 'sonner';
import { translateError } from './error-messages';

const API = '/api';

export interface ReservationDetail {
  id: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  totalPrice: string;
  guest: { id: string; fullName: string; email: string | null; phone: string; passportId: string | null };
  room: { number: string; floor: number | null; roomType: { name: string } };
  checkIn: { id: string } | null;
  checkOut: { id: string } | null;
  invoice: {
    id: string;
    status: string;
    subtotal: string;
    tax: string;
    total: string;
    payments?: Array<{ id: string; amount: string; paidAt: string | null }>;
  } | null;
  onlineCheckIn: { id: string; fullName: string; completedAt: string } | null;
}

export interface InvoiceDetail {
  id: string;
  status: string;
  subtotal: string;
  tax: string;
  total: string;
  lineItems: Array<{ description: string; quantity: number; unitPrice: string; total: string; itemType: string }>;
  charges: Array<{ description: string; amount: string; chargeType: string }>;
  payments: Array<{ id: string; amount: string; status: string; paidAt: string | null }>;
  branch: { name: string; address: string };
}

export interface OnlineCheckInPayload {
  fullName: string;
  passportId: string;
  email?: string;
  phone?: string;
  estimatedArrivalTime?: string;
  specialRequests?: string;
}

export interface PaymentPayload {
  paymentMethod: string;
  provider: string;
  token?: string;
  amount?: number;
}

async function portalFetch<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API}/${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    });
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
  const json = (await res.json()) as { success: boolean; data?: T; error?: string; message?: string };
  if (!res.ok || !json.success) {
    const msg = translateError(json.error ?? json.message ?? '');
    if (typeof window !== 'undefined') toast.error(msg);
    throw new Error(msg);
  }
  return json.data as T;
}

export const portalApi = {
  getReservation: (token: string) =>
    portalFetch<ReservationDetail>(`v1/portal/reservation/${token}`),

  getInvoice: (token: string) =>
    portalFetch<InvoiceDetail>(`v1/portal/reservation/${token}/invoice`),

  getInvoicePdfUrl: (token: string) =>
    `${API}/v1/portal/reservation/${token}/invoice/pdf`,

  submitCheckIn: (token: string, payload: OnlineCheckInPayload) =>
    portalFetch(`v1/portal/reservation/${token}/check-in`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  processPayment: (token: string, payload: PaymentPayload) =>
    portalFetch(`v1/portal/reservation/${token}/payment`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
