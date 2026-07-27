import { toast } from 'sonner';
import { translateError } from './error-messages';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '/api';

let refreshPromise: Promise<boolean> | null = null;

function getAccessToken(): string | null {
  if (typeof localStorage !== 'undefined') {
    return localStorage.getItem('auth_token');
  }
  return null;
}

async function getCsrfToken(): Promise<string> {
  const res = await fetch(`${API_BASE}/v1/auth/csrf`, { credentials: 'include' });
  if (!res.ok) throw new Error('השרת אינו זמין');
  const body = (await res.json()) as { success: boolean; data?: { csrfToken: string } };
  if (!body.success || !body.data?.csrfToken) throw new Error('CSRF_FAILED');
  return body.data.csrfToken;
}

async function doRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const csrfToken = await getCsrfToken();
      const res = await fetch(`${API_BASE}/v1/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrfToken },
      });
      if (res.ok) {
        const body = (await res.json()) as { success: boolean; data?: { accessToken: string } };
        const newToken = body.data?.accessToken;
        if (newToken && typeof localStorage !== 'undefined') {
          localStorage.setItem('auth_token', newToken);
        }
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const doRequest = () => {
    const t = getAccessToken();
    return fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        ...(t ? { Authorization: `Bearer ${t}` } : {}),
        ...init?.headers,
      },
    });
  };

  let res: Response;
  try {
    res = await doRequest();
  } catch {
    const msg = 'אין חיבור לאינטרנט או שהשרת אינו מגיב';
    if (typeof window !== 'undefined') toast.error(msg);
    throw new Error(msg);
  }

  if (res.status === 401) {
    const refreshed = await doRefresh();
    if (refreshed) {
      try {
        res = await doRequest();
      } catch {
        const msg = 'אין חיבור לאינטרנט או שהשרת אינו מגיב';
        if (typeof window !== 'undefined') toast.error(msg);
        throw new Error(msg);
      }
    }
    if (res.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login';
      throw new Error('SESSION_EXPIRED');
    }
  }

  if (!res.ok && res.headers.get('content-type')?.includes('text/html')) {
    const msg = 'השרת אינו זמין';
    if (typeof window !== 'undefined') toast.error(msg);
    throw new Error(msg);
  }

  const body = (await res.json()) as {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
  };

  if (!res.ok || !body.success) {
    const msg = translateError(body.message ?? body.error ?? '');
    if (typeof window !== 'undefined') toast.error(msg);
    throw new Error(msg);
  }

  return body.data as T;
}
