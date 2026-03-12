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

interface TopBarProps {
  onMenuOpen?: () => void;
  userName?:   string;
  userAvatar?: string;
}

function SearchIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
      className="w-4 h-4 text-gray-400" aria-hidden="true">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function BellIcon({ hasUnread }: { hasUnread?: boolean }) {
  return (
    <div className="relative">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"
        className="w-5 h-5 text-gray-500" aria-hidden="true">
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.73 21a2 2 0 0 1-3.46 0" />
      </svg>
      {/* Red dot indicator for unread notifications */}
      {hasUnread && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full" />
      )}
    </div>
  );
}

export default function TopBar({
  onMenuOpen,
  userName   = 'Clinic Staff',
  userAvatar,
}: TopBarProps) {
  const [search,       setSearch      ] = useState('');
  // Controls whether the search box is expanded on mobile
  const [searchOpen,   setSearchOpen  ] = useState(false);

  // e.g. "Dr. Maria Santos" -> "MS"
  const initials = userName
    .replace(/^Dr\.\s*/i, '')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3.5 bg-white border-b border-gray-100 sticky top-0 z-10">

      {/* Left: Hamburger (mobile) + Page title */}
      <div className="flex items-center gap-3 min-w-0">

        {/* Hamburger — only visible on mobile/tablet */}
        <button
          onClick={onMenuOpen}
          className="lg:hidden shrink-0 p-1.5 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Open menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* GC HealthLink brand — replaces per-page title */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-teal-500 rounded-lg flex items-center justify-center shrink-0">
            {/* Heartbeat / pulse icon */}
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          </div>
          <span className="text-base font-bold text-gray-900 tracking-tight">GC HealthLink</span>
        </div>
      </div>

      {/* Center: Search — full width on desktop, icon-toggle on mobile */}
      <div className="flex-1 hidden lg:flex justify-center">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-64">
          <SearchIcon />
          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full"
          />
        </div>
      </div>

      {/* Right: Mobile search toggle + Bell + Avatar */}
      <div className="flex items-center gap-1 sm:gap-3 shrink-0">

        {/* Mobile: search icon that expands an overlay input */}
        <button
          onClick={() => setSearchOpen(true)}
          className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 transition-colors"
          aria-label="Search"
        >
          <SearchIcon />
        </button>

        {/* Notification Bell */}
        <button className="p-2 rounded-xl hover:bg-gray-100 transition-colors" aria-label="Notifications">
          <BellIcon hasUnread />
        </button>

        {/* User Avatar + name */}
        <div className="flex items-center gap-2">
          {userAvatar ? (
            <img src={userAvatar} alt={userName}
              className="w-8 h-8 rounded-full object-cover shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
          )}
          {/* Name — hidden on small screens */}
          <p className="hidden md:block text-sm font-semibold text-gray-800 truncate max-w-[120px]">
            {userName}
          </p>
        </div>

      </div>

      {/* Mobile search overlay — slides down from top when searchOpen */}
      {searchOpen && (
        <div className="lg:hidden absolute top-full left-0 right-0 bg-white border-b border-gray-200 px-4 py-3 shadow-md z-20">
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <SearchIcon />
            <input
              autoFocus
              type="text"
              placeholder="Search..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent text-sm text-gray-700 placeholder-gray-400 outline-none w-full"
            />
            <button
              onClick={() => setSearchOpen(false)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

    </header>
  );
}
