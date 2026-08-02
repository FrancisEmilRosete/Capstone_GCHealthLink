/**
 * ROLE SIDEBAR COMPONENT
 * ─────────────────────────────────────────────────────────────
 * The left sidebar shown on dashboard pages (staff, doctor, dental).
 *
 * RESPONSIVE BEHAVIOUR:
 *   Mobile  (<lg)  - hidden off-screen; slides in as a drawer
 *                    when `isOpen` is true. A backdrop overlay
 *                    covers the rest of the page.
 *   Desktop (>=lg) - always visible, 224px fixed column.
 *
 * Props:
 *   isOpen     -> controlled by the parent layout (drawer open?)
 *   onClose    -> called when user taps overlay or the X button
 *   userName   -> full name of the logged-in user
 *   userRole   -> role label (e.g. "staff", "doctor")
 *   userAvatar -> optional photo URL
 *
 * To add a nav item or section: edit constants/staffNavigation.ts
 */

'use client';

import type React from 'react';
import Link            from 'next/link';
import Image           from 'next/image';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { authLogout }  from '@/lib/auth';
import AppLogo from '@/components/branding/AppLogo';

import { SignOutIcon } from '@/components/icons/NavIcons';
import ConfirmLogoutModal from '@/components/ui/ConfirmLogoutModal';
import { STAFF_NAV_GROUPS } from '@/constants/staffNavigation';

interface SidebarNavItem {
  id: string;
  label: string;
  href: string;
  badge?: number;
  icon: React.ComponentType<{ className?: string }>;
}

interface SidebarNavGroup {
  groupLabel?: string;
  items: SidebarNavItem[];
}

interface SidebarProps {
  isOpen?:        boolean;
  isCollapsed?:   boolean;
  onToggleCollapse?: () => void;
  onClose?:       () => void;
  userName?:      string;
  userRole?:      string;
  userAvatar?:    string;
  brandSubtitle?: string;
  navGroups?:     SidebarNavGroup[];
}

export default function Sidebar({
  isOpen        = false,
  isCollapsed   = false,
  onToggleCollapse = () => {},
  onClose       = () => {},
  userName      = 'Clinic Staff',
  userRole      = 'clinic staff',
  userAvatar,
  brandSubtitle = 'Clinic System',
  navGroups     = STAFF_NAV_GROUPS,
}: SidebarProps) {

  const pathname = usePathname();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const normalizedPath = pathname?.replace(/\/+$/, '') || '';

  useEffect(() => { onClose(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  function isBaseDashboardRoute(href: string): boolean {
    return /^\/dashboard\/[^/]+$/.test(href.replace(/\/+$/, ''));
  }

  function isActive(href: string): boolean {
    const normalizedHref = href.replace(/\/+$/, '');
    if (normalizedPath === normalizedHref) return true;
    if (isBaseDashboardRoute(normalizedHref)) return false;
    return normalizedPath.startsWith(normalizedHref);
  }

  /* e.g. "Dr. Maria Santos" -> "MS" */
  const initials = userName
    .replace(/^Dr\.\s*/i, '')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  /* Capitalise the role label for display */
  const roleDisplay = userRole
    ? userRole.charAt(0).toUpperCase() + userRole.slice(1).replace(/_/g, ' ')
    : 'Staff';

  const panel = (
    <aside
      className={[
        'flex flex-col h-full bg-[hsl(var(--sidebar-bg))] border-r border-[hsl(var(--sidebar-border))] text-[hsl(var(--foreground))] transition-[width] duration-200',
        isCollapsed ? 'w-[84px]' : 'w-[224px]',
      ].join(' ')}
      aria-label="Main navigation"
    >

      {/* ── Brand Header ─────────────────────────────────────── */}
      <div className={[
        'relative pt-5 pb-4 border-b border-[hsl(var(--sidebar-border))]',
        isCollapsed ? 'px-3' : 'px-5',
      ].join(' ')}>
        {/* Institution logos */}
        <div className={[
          'flex items-center mb-3',
          isCollapsed ? 'justify-center' : 'gap-2',
        ].join(' ')}>
          <div className="w-9 h-9 rounded-[10px] bg-white ring-1 ring-[hsl(var(--border))] flex items-center justify-center shadow-sm shrink-0">
            <AppLogo className="h-5 w-5 text-blue-600" />
          </div>
          {!isCollapsed && (
            <>
              <div className="w-9 h-9 rounded-full bg-white ring-1 ring-[hsl(var(--border))] flex items-center justify-center shadow-sm overflow-hidden shrink-0">
                <Image
                  src="/icons/gc-logo.png"
                  alt="Gordon College"
                  width={32}
                  height={32}
                  className="object-contain"
                  priority
                />
              </div>
              <div className="w-9 h-9 rounded-full bg-white ring-1 ring-[hsl(var(--border))] flex items-center justify-center shadow-sm overflow-hidden shrink-0">
                <Image
                  src="/icons/clinic-logo.png"
                  alt="Health Services Unit"
                  width={32}
                  height={32}
                  className="object-contain"
                  priority
                />
              </div>
            </>
          )}
          <button
            type="button"
            onClick={onToggleCollapse}
            className="hidden lg:inline-flex ml-auto p-1.5 rounded-[var(--radius-md)] text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))] transition-colors"
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              {isCollapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              )}
            </svg>
          </button>
          {/* Mobile close button */}
          <button
            onClick={onClose}
            className="lg:hidden ml-auto p-1.5 rounded-[var(--radius-md)] text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))] transition-colors"
            aria-label="Close menu"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Brand name */}
        {!isCollapsed && (
          <div>
            <p className="text-sm font-bold tracking-tight text-[hsl(var(--foreground))]">
              GC HealthLink
            </p>
            <p className="text-[11px] text-[hsl(var(--muted))] mt-0.5">{brandSubtitle}</p>
          </div>
        )}

        {/* Teal accent strip at bottom of header */}
        <div className="absolute bottom-0 left-5 right-5 h-[2px] rounded-full bg-gradient-to-r from-[hsl(var(--primary-gradient-from))] to-[hsl(var(--primary-gradient-to))] opacity-60" />
      </div>

      {/* ── Navigation ───────────────────────────────────────── */}
      <nav className={[
        'flex flex-col py-4 flex-1 overflow-y-auto',
        isCollapsed ? 'gap-3 px-2' : 'gap-5 px-3',
      ].join(' ')} aria-label="Sidebar navigation">
        {navGroups.map(({ groupLabel, items }) => (
          <div key={groupLabel ?? 'unlabeled'}>
            {groupLabel && !isCollapsed && (
              <p className="text-[10px] font-semibold text-[hsl(var(--muted))] uppercase tracking-[0.08em] px-3 mb-2">
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
                    title={label}
                    className={[
                      'relative flex items-center justify-between',
                      'px-3 py-2.5 rounded-[var(--radius-md)] text-sm font-medium',
                      'transition-all duration-[var(--transition-base)]',
                      isCollapsed ? 'justify-center px-2' : '',
                      active
                        ? 'bg-[hsl(var(--sidebar-active-bg))] text-[hsl(var(--sidebar-active-text))]'
                        : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--sidebar-hover-bg))] hover:text-[hsl(var(--foreground))]',
                    ].join(' ')}
                    aria-current={active ? 'page' : undefined}
                  >
                    {/* Left accent bar on active item */}
                    {active && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] bg-[hsl(var(--primary))] rounded-full"
                        aria-hidden="true"
                      />
                    )}

                    <div className="flex items-center gap-3 min-w-0">
                      <Icon className={[
                        'w-[17px] h-[17px] shrink-0',
                        active ? 'text-[hsl(var(--primary))]' : 'text-[hsl(var(--subtle))]',
                      ].join(' ')} />
                      {!isCollapsed && <span className="truncate">{label}</span>}
                    </div>

                    {/* Badge count */}
                    {!isCollapsed && badge !== undefined && badge > 0 && (
                      <span className="flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-[hsl(var(--primary))] text-white text-[10px] font-bold shrink-0">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* ── User Profile + Sign Out ───────────────────────────── */}
      <div className="px-3 pb-5 shrink-0">
        <div className="border-t border-[hsl(var(--sidebar-border))] mb-3" />

        {/* User profile card */}
        <div className={[
          'flex items-center px-2.5 py-2 rounded-[var(--radius-md)] bg-[hsl(var(--primary-soft))] mb-1',
          isCollapsed ? 'justify-center' : 'gap-2.5',
        ].join(' ')}>
          {userAvatar ? (
            <img
              src={userAvatar}
              alt={userName}
              className="w-8 h-8 rounded-full object-cover shrink-0 ring-1 ring-white"
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full shrink-0 flex items-center justify-center text-white text-[11px] font-bold ring-1 ring-white/30"
              style={{ background: 'linear-gradient(135deg, hsl(var(--primary-gradient-from)), hsl(var(--primary-gradient-to)))' }}
              aria-hidden="true"
            >
              {initials}
            </div>
          )}
          {!isCollapsed && (
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-[hsl(var(--foreground))] truncate leading-tight">{userName}</p>
              <p className="text-[10px] text-[hsl(var(--primary))] font-medium truncate">{roleDisplay}</p>
            </div>
          )}
        </div>

        {/* Sign out button */}
        <button
          onClick={() => setShowLogoutConfirm(true)}
          title="Sign Out"
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-[var(--radius-md)]
            text-sm font-medium text-[hsl(var(--muted-foreground))]
            hover:bg-[hsl(var(--danger-soft))] hover:text-[hsl(var(--danger))]
            transition-all duration-[var(--transition-base)] cursor-pointer"
        >
          <SignOutIcon className="w-[17px] h-[17px] shrink-0" />
          {!isCollapsed && 'Sign Out'}
        </button>
      </div>

    </aside>
  );

  return (
    <>
      <ConfirmLogoutModal
        open={showLogoutConfirm}
        onCancel={() => setShowLogoutConfirm(false)}
        onConfirm={() => {
          authLogout();
          setShowLogoutConfirm(false);
          window.location.href = '/login';
        }}
      />

      {/* Desktop: always-visible sticky column (lg and up) */}
      <div className="hidden lg:flex shrink-0 h-screen sticky top-0 print:hidden">
        {panel}
      </div>

      {/* Mobile: semi-transparent backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={[
          'lg:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]',
          'transition-opacity duration-300 print:hidden',
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        ].join(' ')}
      />

      {/* Mobile: slide-in drawer */}
      <div
        className={[
          'lg:hidden fixed inset-y-0 left-0 z-50',
          'transition-transform duration-300 ease-in-out print:hidden',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {panel}
      </div>
    </>
  );
}
