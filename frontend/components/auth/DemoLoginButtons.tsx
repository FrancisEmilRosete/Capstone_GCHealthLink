/**
 * DEMO LOGIN BUTTONS COMPONENT
 * ──────────────────────────────────────────────────────────────
 * Shows quick-access "demo login" buttons at the bottom of the
 * login card. These are for development and testing only.
 *
 * ⚠️  Remove or hide this component in production.
 *
 * When a button is clicked, it passes the full DemoUser object
 * back to the parent (login page), which auto-fills the form
 * and redirects to the correct dashboard.
 *
 * Props:
 *   onDemoLogin → called with the full DemoUser when a button is clicked
 *
 * Usage:
 *   <DemoLoginButtons onDemoLogin={handleDemoLogin} />
 */

import { DEMO_USERS, DemoUser } from '@/constants/roles';

interface DemoLoginButtonsProps {
  onDemoLogin: (user: DemoUser) => void;
}

export default function DemoLoginButtons({ onDemoLogin }: DemoLoginButtonsProps) {
  return (
    <div className="mt-6 text-center">
      <p className="text-xs text-gray-400 mb-2">Quick Demo Login</p>

      <div className="flex flex-wrap gap-2 justify-center">
        {DEMO_USERS.map((user) => (
          <button
            key={user.label}
            onClick={() => onDemoLogin(user)}
            className="px-4 py-1.5 text-xs border border-gray-200 rounded-lg
              text-gray-500 hover:border-teal-500 hover:text-teal-600
              transition-colors cursor-pointer"
          >
            {user.label}
          </button>
        ))}
      </div>
    </div>
  );
}
