'use client';

/**
 * STUDENT LAYOUT
 * Wraps all /dashboard/student/* pages.
 * Provides: dark sidebar (Dashboard, My Record, Registration) + top bar.
 */

import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';

// ── Nav items ─────────────────────────────────────────────────

const NAV = [
  {
    href:  '/dashboard/student',
    label: 'Dashboard',
    exact: true,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
  {
    href:  '/dashboard/student/my-record',
    label: 'My Record',
    exact: false,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    href:  '/dashboard/student/registration',
    label: 'Registration',
    exact: false,
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
  },
];

// ── Sidebar ───────────────────────────────────────────────────

function StudentSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router   = useRouter();

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname?.startsWith(href);
  }

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`
          fixed top-0 left-0 h-full w-64 z-40
          bg-[#0d1b2a] flex flex-col
          transition-transform duration-300
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0 lg:static lg:z-auto lg:h-screen
        `}
      >
        {/* Logo row */}
        <div className="flex items-center justify-between px-5 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-teal-400 rounded-xl flex items-center justify-center shrink-0">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                  d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="leading-tight">
              <p className="text-white font-bold text-sm">GC HealthLink</p>
              <p className="text-gray-400 text-[10px]">Campus Clinic System</p>
            </div>
          </div>
          {/* X — mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 pt-4 space-y-1">
          {NAV.map(item => {
            const active = isActive(item.href, item.exact);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors
                  ${active
                    ? 'bg-teal-500 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom — profile + sign out */}
        <div className="px-3 pb-6 space-y-1 border-t border-white/10 pt-4">
          {/* Profile */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
              JD
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">Juan Dela Cruz</p>
              <p className="text-gray-400 text-xs">student</p>
            </div>
          </div>

          {/* Sign Out */}
          <button
            onClick={() => router.push('/login')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}

// ── QR Modal ─────────────────────────────────────────────────

function QRModal({ onClose }: { onClose: () => void }) {
  // Simple SVG QR-like pattern
  const cells: { x: number; y: number }[] = [];
  // Seed a deterministic pattern
  const seed = [1,0,1,1,0,1,0,1,1,0,0,1,1,0,1,1,1,0,1,0,0,1,0,1,1,0,1,1,0,1,
                 0,1,1,0,1,0,1,1,0,0,1,1,0,1,1,1,0,1,0,0,1,0,1,1,0,1,0,1,1,0,
                 1,1,0,1,0,1,1,0,0,1,1,0,1,1,1,0,1,0,0,1,0,1,1,0,1,0,1,1,0,1,
                 0,1,1,0,1,0,1,1,0,0,1,1,0,1,1,1,0,1,0,0,1,0,1,1,0,1,0,1,1,0,
                 1,1,0,1,0,1,1,0,0,1,1,0,1,1,1,0,1,0,0,1,0,1,1,0,1,0,1,1,0,1];
  const SIZE = 21;
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      // Finder patterns (corners)
      const inFinder =
        (r < 7 && c < 7) || (r < 7 && c >= SIZE - 7) || (r >= SIZE - 7 && c < 7);
      const onFinderBorder =
        (r === 0 || r === 6 || c === 0 || c === 6) && r < 7 && c < 7 ||
        (r === 0 || r === 6 || c === SIZE-7 || c === SIZE-1) && r < 7 && c >= SIZE-7 ||
        (r === SIZE-7 || r === SIZE-1 || c === 0 || c === 6) && r >= SIZE-7 && c < 7;
      if (inFinder) {
        const tr = r % 7; const tc = c % (c < 7 ? 7 : SIZE - c < 7 ? 7 : 7);
        if (onFinderBorder || (tr >= 2 && tr <= 4 && (c < 7 ? (c%7>=2&&c%7<=4) : (c>=SIZE-5&&c<=SIZE-3)) )) {
          cells.push({ x: c, y: r });
        }
        continue;
      }
      if (seed[(r * SIZE + c) % seed.length]) cells.push({ x: c, y: r });
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-80 p-6 flex flex-col items-center"
        onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="w-full flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900">My Student QR Code</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* QR Code SVG */}
        <div className="mb-4">
          <svg width="180" height="180" viewBox={`0 0 ${SIZE} ${SIZE}`} shapeRendering="crispEdges">
            <rect width={SIZE} height={SIZE} fill="white" />
            {cells.map((cell, i) => (
              <rect key={i} x={cell.x} y={cell.y} width={1} height={1} fill="#111" />
            ))}
            {/* Finder pattern outlines */}
            <rect x={0} y={0} width={7} height={7} fill="none" stroke="#111" strokeWidth={0.1} />
            <rect x={2} y={2} width={3} height={3} fill="#111" />
            <rect x={SIZE-7} y={0} width={7} height={7} fill="none" stroke="#111" strokeWidth={0.1} />
            <rect x={SIZE-5} y={2} width={3} height={3} fill="#111" />
            <rect x={0} y={SIZE-7} width={7} height={7} fill="none" stroke="#111" strokeWidth={0.1} />
            <rect x={2} y={SIZE-5} width={3} height={3} fill="#111" />
          </svg>
        </div>

        {/* Student info */}
        <p className="text-[11px] text-gray-400 tracking-widest mb-0.5">2023-0001</p>
        <p className="text-base font-bold text-gray-900">Juan&nbsp; Dela Cruz</p>
        <p className="text-sm text-gray-500 mb-3">BS Civil Engineering</p>
        <p className="text-xs text-teal-600 text-center mb-5">
          Scan this code at the clinic kiosk for<br />faster check-in.
        </p>

        {/* Close button */}
        <div className="w-full border-t border-gray-100 pt-4">
          <button onClick={onClose}
            className="w-full py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Top Bar ───────────────────────────────────────────────────

function StudentTopBar({ onMenuClick, isDark, onToggleDark }: { onMenuClick: () => void; isDark: boolean; onToggleDark: () => void }) {
  const [qrOpen, setQrOpen] = useState(false);
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <>
      {qrOpen && <QRModal onClose={() => setQrOpen(false)} />}
      <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 px-4 flex items-center gap-3 sticky top-0 z-20 shrink-0">
        {/* Hamburger */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            className="w-full bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500 rounded-xl pl-9 pr-4 py-2 text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-400"
            placeholder="Search…"
          />
        </div>

        {/* Date */}
        <span className="hidden md:block text-xs text-gray-400 dark:text-gray-500 ml-2 shrink-0">{dateStr}</span>

        <div className="ml-auto flex items-center gap-2">
          {/* Dark mode toggle */}
          <button
            onClick={onToggleDark}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
            {isDark ? (
              /* Sun icon */
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
              </svg>
            ) : (
              /* Moon icon */
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>

          {/* My QR */}
          <button
            onClick={() => setQrOpen(true)}
            className="flex items-center gap-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold px-3 py-2 rounded-xl transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3 3h7v7H3V3zm2 2v3h3V5H5zm8-2h7v7h-7V3zm2 2v3h3V5h-3zM3 13h7v7H3v-7zm2 2v3h3v-3H5zm11-2h2v2h-2v-2zm-2 2h2v2h-2v-2zm2 2h2v2h-2v-2zm2 0h2v2h-2v-2zm-4 2h2v2h-2v-2zm4 0h2v2h-2v-2z" />
            </svg>
            My QR
          </button>
        </div>
      </header>
    </>
  );
}

// ── Layout ────────────────────────────────────────────────────

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark,      setIsDark]      = useState(false);

  return (
    <div className={`flex h-screen overflow-hidden${isDark ? ' dark' : ''}`}>
      <StudentSidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-gray-50 dark:bg-gray-950">
        <StudentTopBar
          onMenuClick={() => setSidebarOpen(true)}
          isDark={isDark}
          onToggleDark={() => setIsDark(d => !d)}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
