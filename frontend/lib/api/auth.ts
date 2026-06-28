const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';

export type UserRole = 'chain_admin' | 'hotel_manager' | 'receptionist' | 'housekeeping';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  branchId: string | null;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  const body = (await res.json()) as { success: boolean; data?: T; error?: string; message?: string };

  if (!res.ok || !body.success) {
    throw new Error(body.message ?? body.error ?? 'Request failed');
  }

  return body.data as T;
}

async function fetchCsrfToken(): Promise<string> {
  const data = await apiFetch<{ csrfToken: string }>('/v1/auth/csrf');
  return data.csrfToken;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const csrfToken = await fetchCsrfToken();
  const data = await apiFetch<{ user: AuthUser; accessToken: string }>('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
    headers: { 'X-CSRF-Token': csrfToken },
  });
  if (data.accessToken && typeof localStorage !== 'undefined') {
    localStorage.setItem('auth_token', data.accessToken);
  }
  return data.user;
}

export async function logout(): Promise<void> {
  const csrfToken = await fetchCsrfToken();
  await apiFetch('/v1/auth/logout', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
  });
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('auth_token');
  }
}

export async function refreshToken(): Promise<void> {
  const csrfToken = await fetchCsrfToken();
  await apiFetch('/v1/auth/refresh', {
    method: 'POST',
    headers: { 'X-CSRF-Token': csrfToken },
  });
}

export async function getMe(): Promise<AuthUser> {
  return apiFetch<AuthUser>('/v1/users/me');
}
