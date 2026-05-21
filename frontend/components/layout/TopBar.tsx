/**
 * TOP BAR COMPONENT
 * ─────────────────────────────────────────────────────────────
 * The horizontal bar at the top of every dashboard page.
 *
 * RESPONSIVE BEHAVIOUR:
 *   Mobile  (<lg) - shows hamburger button (left) to open the
 *                   mobile sidebar drawer; search collapses to
 *                   an icon toggle to save horizontal space.
 *   Desktop (>=lg) - hamburger hidden; full search input shown.
 *
 * Props:
 *   title      -> page heading shown on the left
 *   onMenuOpen -> called when the hamburger is tapped (mobile)
 *   userName   -> logged-in user's name for the avatar
 *   userAvatar -> optional photo URL; falls back to initials
 *
 * Usage:
 *   <TopBar title="Dashboard" onMenuOpen={() => setSidebarOpen(true)} />
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppLogo from '@/components/branding/AppLogo';

interface TopBarProps {
  onMenuOpen?: () => void;
  userName?:   string;
  userAvatar?: string;
  notificationsHref?: string;
}

// SearchIcon removed

function BellIcon({ hasUnread }: { hasUnread?: boolean }) {
  return (
    <div className="relative">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
        className="w-[18px] h-[18px] text-[hsl(var(--muted-foreground))]" aria-hidden="true">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {/* Red dot indicator for unread notifications */}
      {hasUnread && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[hsl(var(--danger))] rounded-full animate-pulse" />
      )}
    </div>
  );
}

export default function TopBar({
  onMenuOpen,
  userName   = 'Clinic Staff',
  userAvatar,
  notificationsHref,
}: TopBarProps) {
  const pathname = usePathname();

  // Auto-derive notifications path from current route if not explicitly provided
  const resolvedNotifHref = notificationsHref ?? (() => {
    if (!pathname) return null;
    if (pathname.startsWith('/dashboard/doctor'))  return '/dashboard/doctor/notifications';
    if (pathname.startsWith('/dashboard/dental'))  return '/dashboard/dental/notifications';
    if (pathname.startsWith('/dashboard/staff'))   return '/dashboard/staff/notifications';
    if (pathname.startsWith('/dashboard/admin'))   return '/dashboard/admin/notifications';
    return null;
  })();

  // e.g. "Dr. Maria Santos" -> "MS"
  const initials = userName
    .replace(/^Dr\.\s*/i, '')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-[hsl(var(--surface)_/_0.95)] backdrop-blur-sm border-b border-[hsl(var(--border))] sticky top-0 z-10 print:hidden">

      {/* Left: Hamburger (mobile) + Page title */}
      <div className="flex items-center gap-3 min-w-0">

        {/* Hamburger — only visible on mobile/tablet */}
        <button
          onClick={onMenuOpen}
          className="lg:hidden shrink-0 p-1.5 rounded-[var(--radius-md)] text-[hsl(var(--muted))] hover:bg-[hsl(var(--primary-soft))] hover:text-[hsl(var(--primary))] transition-colors"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* GC HealthLink brand — replaces per-page title */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-[hsl(var(--surface))] rounded-[var(--radius-md)] border border-[hsl(var(--border))] flex items-center justify-center shrink-0 shadow-[var(--shadow-sm)]">
            <AppLogo className="h-5 w-5 object-contain" />
          </div>
          <span className="text-base font-bold text-[hsl(var(--foreground))] tracking-tight">GC HealthLink</span>
        </div>
      </div>

      {/* Right: Bell + Avatar */}
      <div className="flex items-center gap-1 sm:gap-3 shrink-0">

        {/* Notification Bell — links to the role-specific notifications page */}
        {resolvedNotifHref ? (
          <Link
            href={resolvedNotifHref}
            className="p-2 rounded-[var(--radius-md)] hover:bg-[hsl(var(--primary-soft))] hover:text-[hsl(var(--primary))] transition-colors"
            aria-label="Notifications"
          >
            <BellIcon hasUnread />
          </Link>
        ) : (
          <button className="p-2 rounded-[var(--radius-md)] hover:bg-[hsl(var(--primary-soft))] hover:text-[hsl(var(--primary))] transition-colors" aria-label="Notifications">
            <BellIcon hasUnread />
          </button>
        )}

        {/* User Avatar + name */}
        <div className="flex items-center gap-2">
          {userAvatar ? (
            <img src={userAvatar} alt={userName}
              className="w-8 h-8 rounded-full object-cover shrink-0 border border-[hsl(var(--border))]" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-[hsl(var(--primary))] flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
          )}
          {/* Name — hidden on small screens */}
          <p className="hidden md:block text-sm font-semibold text-[hsl(var(--foreground))] truncate max-w-[120px]">
            {userName}
          </p>
        </div>

      </div>

      {/* Mobile search overlay removed */}

    </header>
  );
}
