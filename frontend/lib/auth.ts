/**
 * AUTH HELPERS
 * ──────────────────────────────────────────────────────────────
 * Centralizes token storage and login/logout for backend auth.
 */

import { api } from '@/lib/api';
import toast from 'react-hot-toast';

const TOKEN_KEY = 'token';
const ROLE_KEY = 'userRole';
const USER_ID_KEY = 'userId';
const EXPIRES_AT_KEY = 'gchl_expires_at';

function readSessionValue(key: string): string | null {
  if (typeof window === 'undefined') return null;

  const fromSession = window.sessionStorage.getItem(key);
  if (fromSession) return fromSession;

  const fromLocal = window.localStorage.getItem(key);
  if (fromLocal) return fromLocal;

  return null;
}

function writeSessionValue(key: string, value: string): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(key, value);
}

function clearSessionValue(key: string): void {
  if (typeof window === 'undefined') return;
  window.sessionStorage.removeItem(key);
  window.localStorage.removeItem(key);
}

export interface AuthUser {
  id: string;
  email: string;
  role: string;
  clinicStaffType?: string | null;
}

export type BackendUserRole = 'ADMIN' | 'CLINIC_STAFF' | 'STUDENT' | 'DOCTOR' | 'DENTAL';

interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
  access_token?: string;
  token_type?: string;
  expires_at?: string;
  expires_in?: number;
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

export function isTokenExpired(token: string): boolean {
  // If token is JWT, inspect payload exp
  const payload = decodeJwtPayload(token);
  const exp = Number(payload?.exp);

  if (Number.isFinite(exp) && exp > 0) {
    const nowSeconds = Math.floor(Date.now() / 1000);
    return exp <= nowSeconds;
  }

  // Otherwise check stored expires_at timestamp if present
  if (typeof window !== 'undefined') {
    const expiresAt = window.sessionStorage.getItem(EXPIRES_AT_KEY)
      || window.localStorage.getItem(EXPIRES_AT_KEY);
    if (expiresAt) {
      const expiryMs = new Date(expiresAt).getTime();
      if (!isNaN(expiryMs) && expiryMs > 0) {
        return Date.now() >= expiryMs;
      }
    }
  }

  return false;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;

  const sessionToken = window.sessionStorage.getItem(TOKEN_KEY)
    || window.sessionStorage.getItem('gchl_token');
  if (sessionToken && sessionToken !== 'cookie-auth') {
    return sessionToken;
  }

  const localToken = window.localStorage.getItem(TOKEN_KEY)
    || window.localStorage.getItem('gchl_token');
  if (localToken && localToken !== 'cookie-auth') {
    return localToken;
  }

  // Fallback indicator if authenticated via HttpOnly cookie
  return isLoggedIn() ? 'cookie-auth' : null;
}

export function getUserRole(): string | null {
  if (typeof window === 'undefined') return null;
  return readSessionValue(ROLE_KEY);
}

export function getUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return readSessionValue(USER_ID_KEY);
}

function saveSession(user: AuthUser, token?: string | null, rememberMe?: boolean, expiresAt?: string | null): void {
  writeSessionValue(ROLE_KEY, user.role);
  writeSessionValue(USER_ID_KEY, user.id);

  if (token && token !== 'cookie-auth') {
    writeSessionValue(TOKEN_KEY, token);
    writeSessionValue('gchl_token', token);
    if (rememberMe && typeof window !== 'undefined') {
      window.localStorage.setItem(TOKEN_KEY, token);
      window.localStorage.setItem('gchl_token', token);
    }
  }

  if (expiresAt) {
    writeSessionValue(EXPIRES_AT_KEY, expiresAt);
    if (rememberMe && typeof window !== 'undefined') {
      window.localStorage.setItem(EXPIRES_AT_KEY, expiresAt);
    }
  }

  if (rememberMe && typeof window !== 'undefined') {
    window.localStorage.setItem(ROLE_KEY, user.role);
    window.localStorage.setItem(USER_ID_KEY, user.id);
  }
}

/**
 * Override the stored role after login.
 * Used when the frontend selected role (doctor/dental) differs from
 * the backend role (CLINIC_STAFF) — all clinic staff share one backend role.
 */
export function setUserRole(role: string): void {
  if (typeof window !== 'undefined') {
    writeSessionValue(ROLE_KEY, role);
    if (window.localStorage.getItem(ROLE_KEY)) {
      window.localStorage.setItem(ROLE_KEY, role);
    }
  }
}

function clearSession(): void {
  clearSessionValue(ROLE_KEY);
  clearSessionValue(USER_ID_KEY);
  clearSessionValue(TOKEN_KEY);
  clearSessionValue(EXPIRES_AT_KEY);

  // Backward-compatible cleanup for previously used keys.
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem('gchl_token');
    window.sessionStorage.removeItem('gchl_user');
    window.sessionStorage.removeItem(EXPIRES_AT_KEY);
    window.sessionStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem('gchl_token');
    window.localStorage.removeItem('gchl_user');
    window.localStorage.removeItem(EXPIRES_AT_KEY);
    window.localStorage.removeItem(TOKEN_KEY);
  }
}

export async function authLogin(credentials: {
  email: string;
  password: string;
}, rememberMe: boolean = false): Promise<{ user: AuthUser }> {
  const data = await api.post<LoginResponse>('/auth/login', { ...credentials, remember: rememberMe });

  if (!data.success || !data.user?.id || !data.user?.role) {
    throw new Error('Invalid login response from server.');
  }

  const token = data.token || data.access_token || null;
  saveSession(data.user, token, rememberMe, data.expires_at || null);
  return { user: data.user };
}

export function authLogout(): void {
  clearSession();
}

export function handleSessionExpired(): void {
  clearSession();
  if (typeof window === 'undefined') return;

  if (window.location.pathname.startsWith('/login')) {
    return;
  }

  window.sessionStorage.setItem('gchl_session_expired', '1');

  try {
    toast.error('Your session has expired. Please log in again.', { id: 'session-expired' });
  } catch {
    // ignore
  }

  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
}

export function isLoggedIn(): boolean {
  return !!getUserRole();
}

function normalizeRole(role: string | null): BackendUserRole | null {
  if (!role) return null;

  const normalized = role.trim().toUpperCase();
  if (normalized === 'ADMIN') return 'ADMIN';
  if (normalized === 'CLINIC_STAFF' || normalized === 'STAFF') return 'CLINIC_STAFF';
  if (normalized === 'STUDENT') return 'STUDENT';
  if (normalized === 'DOCTOR' || normalized === 'CAMPUS_PHYSICIAN' || normalized === 'PHYSICIAN') return 'DOCTOR';
  if (normalized === 'DENTAL' || normalized === 'DENTIST' || normalized === 'DENTAL_STAFF') return 'DENTAL';
  return null;
}

export function getNormalizedUserRole(): BackendUserRole | null {
  return normalizeRole(getUserRole());
}

function normalizeClinicStaffType(value: string | null | undefined): BackendUserRole | null {
  if (!value) return null;

  const normalized = value.trim().toUpperCase();
  if (normalized === 'DOCTOR' || normalized === 'PHYSICIAN') return 'DOCTOR';
  if (normalized === 'DENTIST' || normalized === 'DENTAL') return 'DENTAL';
  if (normalized === 'NURSE' || normalized === 'STAFF') return 'CLINIC_STAFF';
  return null;
}

export function getSessionRoleFromUser(user: AuthUser): BackendUserRole | null {
  const normalizedRole = normalizeRole(user.role);
  if (!normalizedRole) return null;

  if (normalizedRole === 'CLINIC_STAFF') {
    return normalizeClinicStaffType(user.clinicStaffType) || 'CLINIC_STAFF';
  }

  return normalizedRole;
}

export function getDashboardRouteForUser(user: AuthUser): string {
  const sessionRole = getSessionRoleFromUser(user);
  return getDashboardRouteForRole(sessionRole);
}

export function getDashboardRouteForRole(role: string | null | undefined): string {
  const normalized = normalizeRole(role || null);

  if (normalized === 'ADMIN') return '/dashboard/admin';
  if (normalized === 'CLINIC_STAFF') return '/dashboard/staff';
  if (normalized === 'STUDENT') return '/dashboard/student';
  if (normalized === 'DOCTOR') return '/dashboard/doctor';
  if (normalized === 'DENTAL') return '/dashboard/dental';
  return '/login';
}
