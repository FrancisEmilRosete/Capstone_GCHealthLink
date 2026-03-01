/**
 * ROLES CONSTANT
 * ──────────────────────────────────────────────────────────────
 * Defines the available user roles shown on the login screen.
 *
 * ✅ To add a new role: just add a new object to the ROLES array below.
 *    The RoleSelector component will automatically render it.
 */

import { UserRole } from '@/types/auth';

export interface RoleOption {
  id: UserRole;
  label: string;
}

export const ROLES: RoleOption[] = [
  { id: 'staff',   label: 'Staff'   },
  { id: 'student', label: 'Student' },
  { id: 'admin',   label: 'Admin'   },
];

/**
 * Demo user accounts for quick testing during development.
 *
 * ✅ To add a new demo user: add a new object here.
 * ⚠️  Remove or disable these in production.
 *
 * Each entry maps to a role, and has preset email + password
 * so testers can log in with one click.
 */
export interface DemoUser {
  label:    string;   // button label shown on screen
  role:     UserRole; // which role this demo user belongs to
  email:    string;   // pre-filled email
  password: string;   // pre-filled password
}

export const DEMO_USERS: DemoUser[] = [
  { label: 'Doctor',  role: 'staff',   email: 'doctor@gchealthlink.com',  password: 'demo1234' },
  { label: 'Student', role: 'student', email: 'student@gchealthlink.com', password: 'demo1234' },
  { label: 'Admin',   role: 'admin',   email: 'admin@gchealthlink.com',   password: 'demo1234' },
];
