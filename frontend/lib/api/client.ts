const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

let refreshPromise: Promise<boolean> | null = null;

function getAccessToken(): string | null {
  if (typeof localStorage !== 'undefined') {
    const t = localStorage.getItem('auth_token');
    if (t) return t;
  }
  if (typeof document !== 'undefined') {
    const m = /(?:^|; )access_token=([^;]*)/.exec(document.cookie);
    if (m) return decodeURIComponent(m[1]);
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

  let res = await doRequest();

  if (res.status === 401) {
    const refreshed = await doRefresh();
    if (refreshed) {
      res = await doRequest();
    }
    if (res.status === 401 && typeof window !== 'undefined') {
      window.location.href = '/login';
      throw new Error('SESSION_EXPIRED');
    }
  }

  if (!res.ok && res.headers.get('content-type')?.includes('text/html')) {
    throw new Error('השרת אינו זמין');
  }

  const body = (await res.json()) as {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
  };

  if (!res.ok || !body.success) {
    throw new Error(body.message ?? body.error ?? 'Request failed');
  }

  return body.data as T;
}
