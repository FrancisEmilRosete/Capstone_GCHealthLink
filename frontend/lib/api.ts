/**
 * API CLIENT
 * ──────────────────────────────────────────────────────────────
 * Typed fetch wrapper for all backend requests.
 *
 * Usage:
 *   import { api } from '@/lib/api';
 *
 *   const data = await api.post('/auth/login', { email, password, role });
 *   const data = await api.get('/registration');
 *
 * All methods throw an ApiError on non-2xx responses so callers
 * can catch and display the backend's error message.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000';

// ── Error class ─────────────────────────────────────────────────

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name  = 'ApiError';
    this.status = status;
  }
}

// ── Core fetch helper ───────────────────────────────────────────

async function request<T = unknown>(
  method: string,
  path: string,
  body?: unknown,
  token?: string,
): Promise<T> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Parse response body (backend always returns JSON)
  let data: { message?: string } & Record<string, unknown>;
  try {
    data = await res.json();
  } catch {
    throw new ApiError('Unexpected server response.', res.status);
  }

  if (!res.ok) {
    throw new ApiError(data?.message ?? 'Something went wrong.', res.status);
  }

  return data as T;
}

// ── Public API object ───────────────────────────────────────────

export const api = {
  get:   <T = unknown>(path: string, token?: string)              => request<T>('GET',    path, undefined, token),
  post:  <T = unknown>(path: string, body: unknown, token?: string) => request<T>('POST',   path, body,      token),
  patch: <T = unknown>(path: string, body: unknown, token?: string) => request<T>('PATCH',  path, body,      token),
  del:   <T = unknown>(path: string, token?: string)              => request<T>('DELETE', path, undefined, token),
};
