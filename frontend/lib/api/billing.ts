import { apiFetch } from './client';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'cancelled'
  | 'refunded';

export type PaymentMethod = 'credit_card' | 'cash' | 'bank_transfer' | 'pos_terminal';
export type PaymentProvider = 'stripe' | 'tranzila' | 'manual';
export type ChargeType =
  | 'room_service'
  | 'minibar'
  | 'laundry'
  | 'telephone'
  | 'parking'
  | 'other';
export type RefundStatus = 'pending' | 'succeeded' | 'failed';
export type InvoiceStatus = 'draft' | 'finalized' | 'paid' | 'void';

export interface PaymentAttempt {
  id: string;
  paymentId: string;
  attemptNumber: number;
  status: PaymentStatus;
  errorCode: string | null;
  errorMessage: string | null;
  attemptedAt: string;
}

export interface Refund {
  id: string;
  branchId: string;
  paymentId: string;
  amount: string;
  reason: string;
  status: RefundStatus;
  providerRefundId: string | null;
  approvedBy: string;
  createdAt: string;
}

export interface Payment {
  id: string;
  branchId: string;
  invoiceId: string;
  reservationId: string;
  amount: string;
  currency: string;
  status: PaymentStatus;
  paymentMethod: PaymentMethod;
  provider: PaymentProvider;
  providerPaymentId: string | null;
  idempotencyKey: string;
  paidAt: string | null;
  createdBy: string;
  createdAt: string;
  attempts?: PaymentAttempt[];
  refunds?: Refund[];
}

export interface Charge {
  id: string;
  branchId: string;
  invoiceId: string;
  description: string;
  amount: string;
  chargeType: ChargeType;
  addedBy: string;
  createdAt: string;
}

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: string;
  total: string;
  itemType: string;
}

export interface Invoice {
  id: string;
  reservationId: string;
  branchId: string;
  guestId: string;
  status: InvoiceStatus;
  subtotal: string;
  tax: string;
  total: string;
  issuedAt: string | null;
  createdAt: string;
  lineItems?: InvoiceLineItem[];
  charges?: Charge[];
  payments?: Payment[];
}

export interface ReconciliationReport {
  startDate: string;
  endDate: string;
  totalInvoiced: number;
  totalCollected: number;
  totalRefunded: number;
  netCollected: number;
  invoiceCount: number;
  paymentCount: number;
  invoices: Invoice[];
  payments: Payment[];
}

export interface PosSession {
  sessionId: string;
  status: string;
  invoiceId: string;
  amount: string;
}

// ── Payments ─────────────────────────────────────────────────────────────────

export function initiatePayment(
  invoiceId: string,
  paymentMethod: PaymentMethod,
  provider: PaymentProvider,
  token?: string,
  amount?: number,
): Promise<Payment> {
  return apiFetch('/v1/payments', {
    method: 'POST',
    body: JSON.stringify({ invoiceId, paymentMethod, provider, token, amount }),
  });
}

export function getPayment(paymentId: string): Promise<Payment> {
  return apiFetch(`/v1/payments/${paymentId}`);
}

export function getInvoiceById(invoiceId: string): Promise<Invoice> {
  return apiFetch(`/v1/invoices/${invoiceId}`);
}

export function sendInvoiceByEmail(invoiceId: string): Promise<{ sent: boolean; to: string }> {
  return apiFetch(`/v1/invoices/${invoiceId}/send-email`, { method: 'POST' });
}

export function getInvoicePayments(invoiceId: string): Promise<Payment[]> {
  return apiFetch(`/v1/invoices/${invoiceId}/payments`);
}

export function initiatePrePayment(
  reservationId: string,
  amount: number,
  paymentMethod: PaymentMethod,
  provider: PaymentProvider,
  token?: string,
): Promise<Payment> {
  return apiFetch(`/v1/reservations/${reservationId}/pre-payment`, {
    method: 'POST',
    body: JSON.stringify({ amount, paymentMethod, provider, token }),
  });
}

export function initiatePosPayment(invoiceId: string): Promise<PosSession> {
  return apiFetch('/v1/payments/pos', {
    method: 'POST',
    body: JSON.stringify({ invoiceId }),
  });
}

export function getPosStatus(sessionId: string): Promise<{ sessionId: string; status: string }> {
  return apiFetch(`/v1/payments/pos/${sessionId}/status`);
}

// ── Charges ───────────────────────────────────────────────────────────────────

export function addCharge(
  invoiceId: string,
  chargeType: ChargeType,
  description: string,
  amount: number,
): Promise<{ charge: Charge; invoice: Invoice }> {
  return apiFetch('/v1/charges', {
    method: 'POST',
    body: JSON.stringify({ invoiceId, chargeType, description, amount }),
  });
}

// ── Refunds ───────────────────────────────────────────────────────────────────

export function initiateRefund(
  paymentId: string,
  amount: number,
  reason: string,
): Promise<Refund> {
  return apiFetch('/v1/refunds', {
    method: 'POST',
    body: JSON.stringify({ paymentId, amount, reason }),
  });
}

export function getRefund(refundId: string): Promise<Refund> {
  return apiFetch(`/v1/refunds/${refundId}`);
}

// ── Reports ───────────────────────────────────────────────────────────────────

export function getReconciliation(
  startDate: string,
  endDate: string,
  branchId?: string,
): Promise<ReconciliationReport> {
  const params = new URLSearchParams({ startDate, endDate });
  if (branchId) params.set('branchId', branchId);
  return apiFetch(`/v1/reports/payment-reconciliation?${params.toString()}`);
}

// ── PDF download (non-apiFetch, returns raw blob) ─────────────────────────────

export async function downloadInvoicePdf(invoiceId: string): Promise<Blob> {
  const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';
  const token =
    typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;

  const res = await fetch(`${API_BASE}/v1/invoices/${invoiceId}/pdf`, {
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) throw new Error('PDF_DOWNLOAD_FAILED');
  return res.blob();
}
