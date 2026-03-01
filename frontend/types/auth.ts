/**
 * AUTH TYPES
 * ──────────────────────────────────────────────────────────────
 * All TypeScript types related to authentication live here.
 * When you add a new role or form field, update this file first.
 */

/** The three user roles in the GC HealthLink system */
export type UserRole = 'staff' | 'student' | 'admin';

/** Shape of the login form data */
export interface LoginFormData {
  role: UserRole;
  email: string;
  password: string;
  rememberMe: boolean;
}
