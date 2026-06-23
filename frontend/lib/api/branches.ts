import { apiFetch } from './client';

export interface Branch {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  email: string | null;
  contactPerson: string | null;
  timezone: string;
  isActive: boolean;
  createdAt: string;
}

export const getBranches = () => apiFetch<Branch[]>('/v1/branches');

export const createBranch = (data: Partial<Branch>) =>
  apiFetch<Branch>('/v1/branches', { method: 'POST', body: JSON.stringify(data) });

export const updateBranch = (id: string, data: Partial<Branch>) =>
  apiFetch<Branch>(`/v1/branches/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
