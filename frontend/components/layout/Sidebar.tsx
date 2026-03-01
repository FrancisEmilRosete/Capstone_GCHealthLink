/**
 * STAFF SIDEBAR COMPONENT
 * ─────────────────────────────────────────────────────────────
 * The dark left sidebar shown on all staff dashboard pages.
 *
 * RESPONSIVE BEHAVIOUR:
 *   Mobile  (<lg)  - hidden off-screen; slides in as a drawer
 *                    when `isOpen` is true. A backdrop overlay
 *                    covers the rest of the page.
 *   Desktop (>=lg) - always visible, 220px fixed column.
 *
 * Props:
 *   isOpen     -> controlled by the parent layout (drawer open?)
 *   onClose    -> called when user taps overlay or the X button
 *   userName   -> full name of the logged-in user
 *   userRole   -> role label (e.g. "staff")
 *   userAvatar -> optional photo URL
 *
 * To add a nav item or section: edit constants/staffNavigation.ts
 * This component will automatically pick up the changes.
 */

'use client';

import Link            from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect }   from 'react';
import { authLogout }  from '@/lib/auth';

import { SignOutIcon, SettingsIcon, StethoscopeIcon } from '@/components/icons/NavIcons';
import { STAFF_NAV_GROUPS }         from '@/constants/staffNavigation';

interface SidebarProps {
  isOpen?:     boolean;
  onClose?:    () => void;
  userName?:   string;
  userRole?:   string;
  userAvatar?: string;
}

export default function Sidebar({
  isOpen    = false,
  onClose   = () => {},
  userName  = 'Dr. Maria Santos',
  userRole  = 'staff',
  userAvatar,
}: SidebarProps) {

  const pathname = usePathname();

  // Close the mobile drawer whenever the user navigates to a new page
  useEffect(() => {
    onClose();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Prevent body scroll while the mobile drawer is open
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  // Returns true when this nav item matches the current URL
  function isActive(href: string): boolean {
    return href === '/dashboard/staff'
      ? pathname === href
      : pathname.startsWith(href);
  }

  // e.g. "Dr. Maria Santos" -> "MS"
  const initials = userName
    .replace(/^Dr\.\s*/i, '')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  // Shared panel rendered in both desktop column and mobile drawer
  const panel = (
    <aside className="flex flex-col w-[220px] h-full bg-[#0d1b2a] text-white">

      {/* Logo row + mobile close button */}
      <div className="flex items-center justify-between px-5 pt-6 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-teal-600 rounded-xl flex items-center justify-center shrink-0">
            <StethoscopeIcon className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-tight">GC HealthLink</p>
            <p className="text-[10px] text-slate-400">Clinic System</p>
          </div>
        </div>

        {/* X button — only visible inside the mobile drawer */}
        <button
          onClick={onClose}
          className="lg:hidden p-1 text-slate-400 hover:text-white transition-colors"
          aria-label="Close menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Navigation groups — scrollable if content overflows */}
      <nav className="flex flex-col gap-5 px-3 flex-1 overflow-y-auto">
        {STAFF_NAV_GROUPS.map(({ groupLabel, items }) => (
          <div key={groupLabel ?? 'unlabeled'}>

            {/* Section label e.g. "Main", "Inventory & Reports" */}
            {groupLabel && (
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-widest px-3 mb-1.5">
                {groupLabel}
              </p>
            )}

            <div className="flex flex-col gap-0.5">
              {items.map(({ id, label, href, badge, icon: Icon }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={id}
                    href={href}
                    className={`
                      relative flex items-center justify-between
                      px-3 py-2.5 rounded-xl text-sm font-medium
                      transition-all
                      ${active
                        ? 'bg-slate-700/50 text-white'
                        : 'text-slate-400 hover:bg-slate-700/30 hover:text-white'
                      }
                    `}
                  >
                    {/* Teal left accent bar on the active item */}
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-teal-400 rounded-full" />
                    )}

                    <div className="flex items-center gap-3">
                      <Icon className="w-[18px] h-[18px] shrink-0" />
                      {label}
                    </div>

                    {/* Badge count circle */}
                    {badge !== undefined && badge > 0 && (
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-teal-500 text-white text-[10px] font-bold shrink-0">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom: Settings + Sign Out */}
      <div className="px-3 pb-6 mt-4 shrink-0">
        <div className="border-t border-slate-700/50 mb-3" />

        <Link
          href="/dashboard/staff/settings"
          className={`
            flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium
            transition-all mb-0.5
            ${pathname.startsWith('/dashboard/staff/settings')
              ? 'bg-slate-700/50 text-white'
              : 'text-slate-400 hover:bg-slate-700/30 hover:text-white'
            }
          `}
        >
          <SettingsIcon className="w-[18px] h-[18px] shrink-0" />
          Settings
        </Link>

        <button
          onClick={() => { authLogout(); window.location.href = '/login'; }}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl
            text-sm font-medium text-slate-400
            hover:bg-slate-700/30 hover:text-white
            transition-all cursor-pointer"
        >
          <SignOutIcon className="w-[18px] h-[18px] shrink-0" />
          Sign Out
        </button>
      </div>

    </aside>
  );

  return (
    <>
      {/* Desktop: always-visible static column (lg and up) */}
      {/* h-screen + sticky top-0 keeps the sidebar exactly viewport-tall   */}
      {/* so the bottom buttons never scroll off screen.                      */}
      <div className="hidden lg:flex shrink-0 h-screen sticky top-0">
        {panel}
      </div>

      {/* Mobile: slide-in drawer + dark backdrop (below lg) */}

      {/* Backdrop — tapping it closes the drawer */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`
          lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm
          transition-opacity duration-300
          ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
      />

      {/* Drawer panel — slides in from the left */}
      <div
        className={`
          lg:hidden fixed inset-y-0 left-0 z-50
          transition-transform duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {panel}
      </div>
    </>
  );
}
