import { apiFetch } from './client';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';

function getAccessToken(): string | null {
  if (typeof localStorage !== 'undefined') return localStorage.getItem('auth_token');
  return null;
}

export interface OccupancySummary {
  total: number;
  occupied: number;
  available: number;
  maintenance: number;
  occupancyPct: number;
}

export interface RevenueSummary {
  today: number;
  thisMonth: number;
  prevMonth: number;
}

export interface ArrivalsDepartures {
  arrivalsToday: number;
  arrivalsTomorrow: number;
  departuresToday: number;
  departuresTomorrow: number;
}

export interface PipelinePoint {
  date: string;
  count: number;
}

export interface TrendPoint {
  date: string;
  occupiedCount: number;
  totalRooms: number;
  occupancyPct: number;
}

export interface CancellationItem {
  id: string;
  cancelledAt: string;
  cancellationReason: string | null;
  totalPrice: number;
  checkInDate: string;
  checkOutDate: string;
  guest: { fullName: string; email: string | null; phone: string };
  room: { number: string };
}

export interface CancellationsReport {
  cancellationRate: number;
  totalCancelled: number;
  totalInRange: number;
  items: CancellationItem[];
}

export interface FutureReservationItem {
  id: string;
  checkInDate: string;
  checkOutDate: string;
  status: string;
  totalPrice: number;
  adults: number;
  children: number;
  source: string | null;
  guest: { fullName: string; email: string | null; phone: string };
  room: { number: string };
}

export interface CrossBranchItem {
  branchId: string;
  branchName: string;
  totalRooms: number;
  occupiedRooms: number;
  occupancyPct: number;
  revenueThisMonth: number;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const q = Object.entries(params)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${encodeURIComponent(v!)}`)
    .join('&');
  return q ? `?${q}` : '';
}

export function getOccupancySummary(branchId?: string): Promise<OccupancySummary> {
  return apiFetch(`/v1/reports/occupancy-summary${buildQuery({ branchId })}`);
}

export function getRevenueSummary(branchId?: string): Promise<RevenueSummary> {
  return apiFetch(`/v1/reports/revenue-summary${buildQuery({ branchId })}`);
}

export function getArrivalsDepartures(branchId?: string): Promise<ArrivalsDepartures> {
  return apiFetch(`/v1/reports/arrivals-departures${buildQuery({ branchId })}`);
}

export function getReservationPipeline(branchId?: string): Promise<PipelinePoint[]> {
  return apiFetch(`/v1/reports/reservation-pipeline${buildQuery({ branchId })}`);
}

export function getOccupancyTrend(branchId?: string): Promise<TrendPoint[]> {
  return apiFetch(`/v1/reports/occupancy-trend${buildQuery({ branchId })}`);
}

export function getCancellations(
  params: { from?: string; to?: string; branchId?: string } = {},
): Promise<CancellationsReport> {
  return apiFetch(`/v1/reports/cancellations${buildQuery(params)}`);
}

export function getFutureReservations(
  params: { from?: string; to?: string; branchId?: string } = {},
): Promise<FutureReservationItem[]> {
  return apiFetch(`/v1/reports/future-reservations${buildQuery(params)}`);
}

export function getCrossBranch(): Promise<CrossBranchItem[]> {
  return apiFetch(`/v1/reports/cross-branch`);
}

function triggerXlsxDownload(url: string, filename: string, token: string | null): void {
  void fetch(url, {
    headers: { Authorization: `Bearer ${token ?? ''}` },
    credentials: 'include',
  })
    .then((r) => r.arrayBuffer())
    .then((buf) => {
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(blobUrl);
    });
}

export function downloadReservationsCsv(params: { from?: string; to?: string; branchId?: string } = {}): void {
  const token = getAccessToken();
  const url = `${API_BASE}/v1/reports/export/reservations${buildQuery(params)}`;
  triggerXlsxDownload(url, 'reservations.xlsx', token);
}

export function downloadRevenueCsv(params: { from?: string; to?: string; branchId?: string } = {}): void {
  const token = getAccessToken();
  const url = `${API_BASE}/v1/reports/export/revenue${buildQuery(params)}`;
  triggerXlsxDownload(url, 'revenue.xlsx', token);
}
