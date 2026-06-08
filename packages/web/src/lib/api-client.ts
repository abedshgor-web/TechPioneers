const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001';

interface ApiOptions extends RequestInit {
  token?: string;
}

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { token, ...init } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_URL}/api${path}`, { ...init, headers });

  if (!res.ok) {
    const data = await res.json().catch(() => ({ message: res.statusText }));
    throw new ApiError(res.status, (data as { message?: string }).message ?? res.statusText, data);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  auth: {
    register: (body: {
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      companyName: string;
    }) =>
      apiFetch<{ accessToken: string; refreshToken: string; user: unknown; tenant: unknown }>(
        '/v1/auth/register',
        { method: 'POST', body: JSON.stringify(body) },
      ),

    login: (body: { email: string; password: string }) =>
      apiFetch<{ accessToken: string; refreshToken: string; user: unknown; tenant: unknown }>(
        '/v1/auth/login',
        { method: 'POST', body: JSON.stringify(body) },
      ),

    forgotPassword: (email: string) =>
      apiFetch('/v1/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      }),

    resetPassword: (token: string, password: string) =>
      apiFetch('/v1/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      }),

    verifyEmail: (token: string) =>
      apiFetch(`/v1/auth/verify-email?token=${encodeURIComponent(token)}`),
  },
};

export { ApiError };
