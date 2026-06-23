import type { UserRole } from './auth';
import { apiFetch } from './client';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branchId: string | null;
  isActive: boolean;
  createdAt: string;
}

export interface CreateUserPayload {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  branchId?: string;
}

export const getUsers = () => apiFetch<User[]>('/v1/users');

export const createUser = (data: CreateUserPayload) =>
  apiFetch<User>('/v1/users', { method: 'POST', body: JSON.stringify(data) });

export const updateUser = (id: string, data: Partial<User>) =>
  apiFetch<User>(`/v1/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
