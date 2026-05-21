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
const API_BASE_CACHE_KEY = 'gchl_api_base';
const LOCAL_FALLBACK_ATTEMPT_TIMEOUT_MS = Number(process.env.NEXT_PUBLIC_API_FALLBACK_ATTEMPT_TIMEOUT_MS || 500);

function normalizeBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

const configuredBase = normalizeBaseUrl(
  process.env.NEXT_PUBLIC_BACKEND_URL
  ?? process.env.NEXT_PUBLIC_API_URL
  ?? ''
);

function stripApiPrefix(base: string): string {
  return base.toLowerCase().endsWith(API_PREFIX)
    ? base.slice(0, -API_PREFIX.length)
    : base;
}

const defaultDevBases = Array.from(
  { length: 11 },
  (_, index) => {
    const port = 5000 + index;
    return [`http://127.0.0.1:${port}`, `http://localhost:${port}`];
  },
).flat();

function readCachedApiBase(): string {
  if (typeof window === 'undefined') return '';
  return normalizeBaseUrl(window.localStorage.getItem(API_BASE_CACHE_KEY) || '');
}

function writeCachedApiBase(base: string): void {
  if (typeof window === 'undefined' || !base) return;
  window.localStorage.setItem(API_BASE_CACHE_KEY, base);
}

function uniqueBases(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = normalizeBaseUrl(value);
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

const configuredApiBase = configuredBase ? stripApiPrefix(configuredBase) : '';
const cachedApiBase = readCachedApiBase();
export const API_BASE = configuredApiBase || cachedApiBase || defaultDevBases[0] || '';

let preferredApiBase = API_BASE;

function orderedCandidateBases(): string[] {
  if (configuredApiBase) {
    if (process.env.NODE_ENV === 'production') {
      return [configuredApiBase];
    }

    const latestCachedBase = readCachedApiBase();
    return uniqueBases([configuredApiBase, latestCachedBase, ...defaultDevBases]);
  }

  if (process.env.NODE_ENV === 'production') {
    return [''];
  }

  const latestCachedBase = readCachedApiBase();
  return uniqueBases([preferredApiBase, latestCachedBase, ...defaultDevBases]);
}

function rememberWorkingBase(base: string): void {
  if (!base || preferredApiBase === base) return;
  preferredApiBase = base;
  writeCachedApiBase(base);
}

function buildApiUrl(base: string, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${API_PREFIX}${normalizedPath}`;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs?: number,
): Promise<Response> {
  if (!timeoutMs || timeoutMs <= 0) {
    return fetch(url, init);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const forwardAbort = () => controller.abort();
  init.signal?.addEventListener('abort', forwardAbort, { once: true });

  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
    init.signal?.removeEventListener('abort', forwardAbort);
  }
}

function hasJsonContentType(response: Response): boolean {
  const contentType = response.headers.get('content-type');
  if (!contentType) return false;

  return contentType.toLowerCase().includes('application/json');
}

async function fetchWithFallback(
  path: string,
  init: RequestInit,
  options?: { expectsJson?: boolean },
): Promise<Response> {
  let lastError: unknown = null;
  const candidates = orderedCandidateBases();
  const expectsJson = options?.expectsJson === true;

  for (const [index, base] of candidates.entries()) {
    try {
      const timeoutMs = index === 0 ? undefined : LOCAL_FALLBACK_ATTEMPT_TIMEOUT_MS;
      const res = await fetchWithTimeout(buildApiUrl(base, path), init, timeoutMs);

      if (expectsJson && !hasJsonContentType(res)) {
        lastError = new Error(`Received non-JSON response from ${base}.`);
        continue;
      }

      rememberWorkingBase(base);
      return res;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }

  throw new Error('Unable to contact backend API.');
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

  const res = await fetchWithFallback(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }, { expectsJson: true });

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

  const res = await fetchWithFallback(path, {
    method,
    headers,
    body: formData,
  }, { expectsJson: true });

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

  const res = await fetchWithFallback(path, {
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
