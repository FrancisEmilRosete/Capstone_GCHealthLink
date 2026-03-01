/**
 * ROLE SELECTOR COMPONENT
 * ──────────────────────────────────────────────────────────────
 * Displays three role buttons: Staff, Student, Faculty.
 * The selected role gets a teal border and background.
 *
 * Props:
 *   selectedRole  → the currently active role
 *   onSelect      → called with the new role when a button is clicked
 *
 * Usage:
 *   <RoleSelector selectedRole={role} onSelect={setRole} />
 */

'use client';

import { UserRole } from '@/types/auth';
import { ROLES } from '@/constants/roles';
import { StaffIcon, StudentIcon, AdminIcon } from '@/components/icons/RoleIcons';

interface RoleSelectorProps {
  selectedRole: UserRole;
  onSelect: (role: UserRole) => void;
}

export default function RoleSelector({ selectedRole, onSelect }: RoleSelectorProps) {
  return (
    <div className="mb-5">
      <p className="text-sm font-semibold text-gray-700 mb-2">Select Role</p>

      <div className="grid grid-cols-3 gap-2">
        {ROLES.map(({ id, label }) => {
          const isActive = selectedRole === id;

          return (
            <button
              key={id}
              onClick={() => onSelect(id)}
              className={`
                flex flex-col items-center justify-center py-3
                rounded-xl border-2 transition-all cursor-pointer
                ${isActive
                  ? 'border-teal-600 bg-teal-50'
                  : 'border-gray-200 hover:border-gray-300 bg-white'
                }
              `}
            >
              {/* Render the matching icon for each role */}
              {id === 'staff'   && <StaffIcon   active={isActive} />}
              {id === 'student' && <StudentIcon active={isActive} />}
              {id === 'admin'   && <AdminIcon   active={isActive} />}

              <span className={`text-xs font-medium mt-1.5 ${
                isActive ? 'text-teal-600' : 'text-gray-500'
              }`}>
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
