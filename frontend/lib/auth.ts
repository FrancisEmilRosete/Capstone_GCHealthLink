/**
 * AUTH HELPERS
 * ──────────────────────────────────────────────────────────────
 * Centralizes token storage and login/logout for backend auth.
 */

import { api } from '@/lib/api';

const TOKEN_KEY = 'token';
const ROLE_KEY = 'userRole';
const USER_ID_KEY = 'userId';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export type BackendUserRole = 'ADMIN' | 'CLINIC_STAFF' | 'STUDENT';

interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  user: AuthUser;
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const decoded = atob(padded);
    const parsed = JSON.parse(decoded);
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token);
  const exp = Number(payload?.exp);

  if (!Number.isFinite(exp) || exp <= 0) {
    return false;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  return exp <= nowSeconds;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;

  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return null;

  if (isTokenExpired(token)) {
    clearSession();
    return null;
  }

  return token;
}

export function getUserRole(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ROLE_KEY);
}

export function getUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(USER_ID_KEY);
}

function saveSession(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(ROLE_KEY, user.role);
  localStorage.setItem(USER_ID_KEY, user.id);
}

function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.removeItem(USER_ID_KEY);

  // Backward-compatible cleanup for previously used keys.
  localStorage.removeItem('gchl_token');
  localStorage.removeItem('gchl_user');
}

export async function authLogin(credentials: {
  email: string;
  password: string;
}): Promise<{ token: string; user: AuthUser }> {
  const data = await api.post<LoginResponse>('/auth/login', credentials);

  if (!data.success || !data.token || !data.user?.id || !data.user?.role) {
    throw new Error('Invalid login response from server.');
  }

  saveSession(data.token, data.user);
  return { token: data.token, user: data.user };
}

export function authLogout(): void {
  clearSession();
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

function normalizeRole(role: string | null): BackendUserRole | null {
  if (!role) return null;

  const normalized = role.trim().toUpperCase();
  if (normalized === 'ADMIN') return 'ADMIN';
  if (normalized === 'CLINIC_STAFF' || normalized === 'STAFF') return 'CLINIC_STAFF';
  if (normalized === 'STUDENT') return 'STUDENT';
  return null;
}

export function getNormalizedUserRole(): BackendUserRole | null {
  return normalizeRole(getUserRole());
}

export function getDashboardRouteForRole(role: string | null | undefined): string {
  const normalized = normalizeRole(role || null);

  if (normalized === 'ADMIN') return '/dashboard/admin';
  if (normalized === 'CLINIC_STAFF') return '/dashboard/staff';
  if (normalized === 'STUDENT') return '/dashboard/student';
  return '/login';
}
