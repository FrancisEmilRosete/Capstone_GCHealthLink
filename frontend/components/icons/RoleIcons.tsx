/**
 * ROLE ICONS
 * ──────────────────────────────────────────────────────────────
 * SVG icons for each user role on the login screen.
 *
 * Each icon receives an `active` prop:
 *   - active = true  → teal color (role is selected)
 *   - active = false → gray color (role is not selected)
 *
 * Usage:
 *   <StaffIcon   active={true}  />
 *   <DoctorIcon  active={false} />
 *   <DentalIcon  active={false} />
 *   <StudentIcon active={false} />
 *   <AdminIcon   active={false} />
 */

interface RoleIconProps {
  /** Whether this role is currently selected */
  active: boolean;
}

/** Staff icon — stethoscope */
export function StaffIcon({ active }: RoleIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`w-6 h-6 ${active ? 'text-teal-600' : 'text-gray-400'}`}
      aria-hidden="true"
    >
      {/* Left earpiece — angles outward up-left */}
      <path d="M5 2.5L7.5 6.5" />
      {/* Right earpiece — angles outward up-right */}
      <path d="M19 2.5L16.5 6.5" />
      {/* Arch loop connecting the two earpieces */}
      <path d="M7.5 6.5Q7.5 13 12 13Q16.5 13 16.5 6.5" />
      {/* Tube down from arch to chest piece */}
      <line x1="12" y1="13" x2="12" y2="17" />
      {/* Chest piece / diaphragm */}
      <circle cx="12" cy="20" r="2.5" />
    </svg>
  );
}

/** Doctor icon — user with medical cross */
export function DoctorIcon({ active }: RoleIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`w-6 h-6 ${active ? 'text-teal-600' : 'text-gray-400'}`}
      aria-hidden="true"
    >
      <circle cx="12" cy="7" r="3.2" />
      <path d="M5 20c1.6-3.8 11.4-3.8 14 0" />
      <path d="M18 12v4" />
      <path d="M16 14h4" />
    </svg>
  );
}

/** Dental icon — tooth */
export function DentalIcon({ active }: RoleIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`w-6 h-6 ${active ? 'text-teal-600' : 'text-gray-400'}`}
      aria-hidden="true"
    >
      <path d="M7 3c1.8-1 4.2-1 5 0 0.8-1 3.2-1 5 0 2.2 1.3 2.5 4.2 1.2 6.6l-1.8 6.7c-.4 1.4-2.3 1.6-3 0l-1.4-3.1-1.4 3.1c-.7 1.6-2.6 1.4-3 0L5.8 9.6C4.5 7.2 4.8 4.3 7 3z" />
    </svg>
  );
}

/** Student icon — graduation cap */
export function StudentIcon({ active }: RoleIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`w-6 h-6 ${active ? 'text-teal-600' : 'text-gray-400'}`}
      aria-hidden="true"
    >
      {/* mortarboard top */}
      <path d="M22 10l-10-5L2 10l10 5 10-5z" />
      {/* brim sides */}
      <path d="M6 12v5c0 2 2.5 3 6 3s6-1 6-3v-5" />
      {/* tassel cord */}
      <line x1="22" y1="10" x2="22" y2="16" />
      <circle cx="22" cy="17" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Admin icon — shield with checkmark */
export function AdminIcon({ active }: RoleIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`w-6 h-6 ${active ? 'text-teal-600' : 'text-gray-400'}`}
      aria-hidden="true"
    >
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  );
}
