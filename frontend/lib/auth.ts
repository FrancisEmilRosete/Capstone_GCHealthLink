/**
 * AUTH HELPERS
 * ──────────────────────────────────────────────────────────────
 * Centralizes token storage and login/logout for backend auth.
 */

import { api } from '@/lib/api';

const TOKEN_KEY = 'token';
const ROLE_KEY = 'userRole';
const USER_ID_KEY = 'userId';

function readSessionValue(key: string): string | null {
  if (typeof window === 'undefined') return null;

  const fromSession = window.sessionStorage.getItem(key);
  if (fromSession) return fromSession;

  // Backward-compatible fallback for older logins saved in localStorage.
  const fromLocal = window.localStorage.getItem(key);
  if (fromLocal) {
    window.sessionStorage.setItem(key, fromLocal);
    return fromLocal;
  }

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

  const token = readSessionValue(TOKEN_KEY);
  if (!token) return null;

  if (isTokenExpired(token)) {
    clearSession();
    return null;
  }

  return token;
}

export function getUserRole(): string | null {
  if (typeof window === 'undefined') return null;
  return readSessionValue(ROLE_KEY);
}

export function getUserId(): string | null {
  if (typeof window === 'undefined') return null;
  return readSessionValue(USER_ID_KEY);
}

function saveSession(token: string, user: AuthUser): void {
  writeSessionValue(TOKEN_KEY, token);
  writeSessionValue(ROLE_KEY, user.role);
  writeSessionValue(USER_ID_KEY, user.id);
}

/**
 * Override the stored role after login.
 * Used when the frontend selected role (doctor/dental) differs from
 * the backend role (CLINIC_STAFF) — all clinic staff share one backend role.
 */
export function setUserRole(role: string): void {
  if (typeof window !== 'undefined') {
    writeSessionValue(ROLE_KEY, role);
  }
}

function clearSession(): void {
  clearSessionValue(TOKEN_KEY);
  clearSessionValue(ROLE_KEY);
  clearSessionValue(USER_ID_KEY);

  // Backward-compatible cleanup for previously used keys.
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem('gchl_token');
    window.sessionStorage.removeItem('gchl_user');
    window.localStorage.removeItem('gchl_token');
    window.localStorage.removeItem('gchl_user');
  }
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
