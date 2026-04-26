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
  { id: 'doctor',  label: 'Doctor'  },
  { id: 'dental',  label: 'Dental'  },
  { id: 'student', label: 'Student' },
  { id: 'admin',   label: 'Admin'   },
];
