function getToken(): string | null {
  if (typeof localStorage !== 'undefined') return localStorage.getItem('auth_token');
  return null;
}

export async function uploadPhoto(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);

  const token = getToken();
  const res = await fetch('/api/admin/uploads/photo', {
    method: 'POST',
    credentials: 'include',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const body = await res.json() as { data?: { url: string }; url?: string; message?: string };
  if (!res.ok) throw new Error(body.message ?? `HTTP ${res.status}`);
  return (body.data?.url ?? body.url) as string;
}
