/** API client: gọi backend với Bearer token, xử lý lỗi tập trung. */
const BASE = '/api';

let token: string | null = localStorage.getItem('tnt_token');

export function setToken(t: string | null) {
  token = t;
  if (t) localStorage.setItem('tnt_token', t);
  else localStorage.removeItem('tnt_token');
}

export function getToken() {
  return token;
}

async function request<T>(method: string, path: string, body?: any): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(BASE + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || 'Lỗi máy chủ') as any;
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data as T;
}

export const api = {
  get: <T>(p: string) => request<T>('GET', p),
  post: <T>(p: string, b?: any) => request<T>('POST', p, b),
  put: <T>(p: string, b?: any) => request<T>('PUT', p, b),
  patch: <T>(p: string, b?: any) => request<T>('PATCH', p, b),
  del: <T>(p: string) => request<T>('DELETE', p),
};

/** Public API (không cần token) cho website công khai. */
export const publicApi = {
  get: <T>(p: string) => fetch(BASE + p).then((r) => r.json() as Promise<T>),
  post: <T>(p: string, b?: any) =>
    fetch(BASE + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d?.error || 'Lỗi');
        return d as T;
      }),
};
