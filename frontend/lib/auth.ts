/**
 * AUTH HELPERS
 * ──────────────────────────────────────────────────────────────
 * Centralises token storage and the login / logout flow.
 *
 * Usage:
 *   import { authLogin, authLogout, getToken, getUser } from '@/lib/auth';
 *
 *   // Log in
 *   const { user } = await authLogin({ email, password, role });
 *   router.push(`/dashboard/${user.role}`);
 *
 *   // Log out
 *   authLogout();
 *   router.push('/login');
 *
 *   // Get token for authenticated API calls
 *   const token = getToken();
 *   const data  = await api.get('/registration', token);
 */

import { api, ApiError } from '@/lib/api';
import type { UserRole } from '@/types/auth';

// Keys used in localStorage
const TOKEN_KEY = 'gchl_token';
const USER_KEY  = 'gchl_user';

// ── Types ───────────────────────────────────────────────────────

export interface AuthUser {
  id:    number;
  name:  string;
  email: string;
  role:  UserRole;
}

interface LoginResponse {
  message: string;
  token:   string;
  user:    AuthUser;
}

// ── Token helpers ───────────────────────────────────────────────

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getUser(): AuthUser | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try { return JSON.parse(raw) as AuthUser; }
  catch { return null; }
}

function saveSession(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// ── Auth actions ────────────────────────────────────────────────

/**
 * Call the backend login endpoint.
 * On success, saves the JWT + user info and returns them.
 * Throws ApiError on invalid credentials or server error.
 */
export async function authLogin(credentials: {
  email:    string;
  password: string;
  role:     UserRole;
}): Promise<{ token: string; user: AuthUser }> {
  const data = await api.post<LoginResponse>('/auth/login', credentials);
  saveSession(data.token, data.user);
  return { token: data.token, user: data.user };
}

/**
 * Clears the stored session. Call before redirecting to /login.
 */
export function authLogout(): void {
  clearSession();
}

/**
 * Returns true if a token exists in localStorage.
 * Does NOT verify the token's expiry — for a full check use /api/auth/me.
 */
export function isLoggedIn(): boolean {
  return !!getToken();
}
