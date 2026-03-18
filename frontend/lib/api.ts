/**
 * API CLIENT
 * ──────────────────────────────────────────────────────────────
 * Typed fetch wrapper for all backend requests.
 *
 * Usage:
 *   import { api } from '@/lib/api';
 *
 *   const data = await api.post('/auth/login', { email, password });
 *   const data = await api.get('/registration');
 *
 * All methods throw an ApiError on non-2xx responses so callers
 * can catch and display the backend's error message.
 */

export const API_PREFIX = '/api/v1';

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

const configuredBase = normalizeBaseUrl(process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000');
const effectiveBase = configuredBase || 'http://localhost:5000';
const alreadyIncludesPrefix = effectiveBase.toLowerCase().endsWith(API_PREFIX);

export const API_BASE = alreadyIncludesPrefix
  ? effectiveBase.slice(0, -API_PREFIX.length)
  : effectiveBase;

function buildApiUrl(path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${API_PREFIX}${normalizedPath}`;
}

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

  const res = await fetch(buildApiUrl(path), {
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

async function requestForm<T = unknown>(
  method: string,
  path: string,
  formData: FormData,
  token?: string,
): Promise<T> {
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(buildApiUrl(path), {
    method,
    headers,
    body: formData,
  });

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

function parseDownloadFileName(headerValue: string | null): string | null {
  if (!headerValue) return null;

  const utfMatch = /filename\*=UTF-8''([^;]+)/i.exec(headerValue);
  if (utfMatch?.[1]) {
    try {
      return decodeURIComponent(utfMatch[1]);
    } catch {
      return utfMatch[1];
    }
  }

  const basicMatch = /filename="?([^";]+)"?/i.exec(headerValue);
  if (basicMatch?.[1]) {
    return basicMatch[1];
  }

  return null;
}

async function requestBlob(
  path: string,
  token?: string,
): Promise<{ blob: Blob; fileName: string | null }> {
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(buildApiUrl(path), {
    method: 'GET',
    headers,
  });

  if (!res.ok) {
    let message = 'Something went wrong.';
    try {
      const json = await res.json();
      message = json?.message ?? message;
    } catch {
      // Ignore JSON parsing errors and keep fallback message.
    }
    throw new ApiError(message, res.status);
  }

  const fileName = parseDownloadFileName(res.headers.get('content-disposition'));
  const blob = await res.blob();
  return { blob, fileName };
}

// ── Public API object ───────────────────────────────────────────

export const api = {
  get:   <T = unknown>(path: string, token?: string)              => request<T>('GET',    path, undefined, token),
  post:  <T = unknown>(path: string, body: unknown, token?: string) => request<T>('POST',   path, body,      token),
  put:   <T = unknown>(path: string, body: unknown, token?: string) => request<T>('PUT',    path, body,      token),
  patch: <T = unknown>(path: string, body: unknown, token?: string) => request<T>('PATCH',  path, body,      token),
  del:   <T = unknown>(path: string, token?: string)              => request<T>('DELETE', path, undefined, token),
  postForm: <T = unknown>(path: string, formData: FormData, token?: string) => requestForm<T>('POST', path, formData, token),
  getBlob: (path: string, token?: string) => requestBlob(path, token),
};
