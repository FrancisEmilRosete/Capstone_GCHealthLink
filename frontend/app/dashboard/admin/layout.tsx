'use client';

/**
 * ADMIN DASHBOARD LAYOUT
 * Route: /dashboard/admin/* 
 * Provides the admin sidebar + topbar wrapper for all admin pages.
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { authLogout, getDashboardRouteForRole, getNormalizedUserRole, getToken } from '@/lib/auth';
import { SignOutIcon, SettingsIcon, ShieldIcon } from '@/components/icons/NavIcons';
import { ADMIN_NAV_GROUPS } from '@/constants/adminNavigation';

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface AdminSessionResponse {
  success: boolean;
  data: {
    id: string;
    email: string;
    role: string;
    displayName: string;
  };
}

// ── Admin Sidebar ────────────────────────────────────────────

function AdminSidebar({
  isOpen,
  displayName,
  roleLabel,
  onClose,
}: {
  isOpen: boolean;
  displayName: string;
  roleLabel: string;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const router   = useRouter();
  const adminInitial = (displayName.trim()[0] || 'A').toUpperCase();

  useEffect(() => { onClose(); }, [pathname]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    document.body.style.overflow = isOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  function isActive(href: string) {
    return href === '/dashboard/admin'
      ? pathname === href
      : pathname.startsWith(href);
  }

  const panel = (
    <aside className="flex flex-col w-[220px] h-full bg-[#0d1b2a] text-white">

      {/* Logo row */}
      <div className="flex items-center justify-between px-5 pt-6 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-indigo-600 rounded-xl flex items-center justify-center shrink-0">
            <ShieldIcon className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-bold tracking-tight">GC HealthLink</p>
            <p className="text-[10px] text-slate-400">Admin Panel</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="lg:hidden p-1 text-slate-400 hover:text-white transition-colors"
          aria-label="Close menu"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Nav groups */}
      <nav className="flex flex-col gap-5 px-3 flex-1 overflow-y-auto">
        {ADMIN_NAV_GROUPS.map(({ groupLabel, items }) => (
          <div key={groupLabel ?? 'unlabeled'}>
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
                    className={`relative flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                      ${active ? 'bg-slate-700/50 text-white' : 'text-slate-400 hover:bg-slate-700/30 hover:text-white'}`}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-teal-400 rounded-full" />
                    )}
                    <div className="flex items-center gap-3">
                      <Icon className="w-[18px] h-[18px] shrink-0" />
                      {label}
                    </div>
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

      {/* Bottom: Settings + profile + Sign out */}
      <div className="px-3 pb-6 mt-4 shrink-0">
        <div className="border-t border-slate-700/50 mb-3" />

        <Link
          href="/dashboard/admin/settings"
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all mb-0.5
            ${pathname.startsWith('/dashboard/admin/settings') ? 'bg-slate-700/50 text-white' : 'text-slate-400 hover:bg-slate-700/30 hover:text-white'}`}
        >
          <SettingsIcon className="w-[18px] h-[18px] shrink-0" />
          Settings
        </Link>

        {/* Admin profile */}
        <div className="flex items-center gap-3 px-3 py-2.5 mt-1">
          <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {adminInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate">{displayName}</p>
            <p className="text-[10px] text-slate-400 capitalize">{roleLabel}</p>
          </div>
        </div>

        <button
          onClick={() => { authLogout(); router.push('/login'); }}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:bg-slate-700/30 hover:text-white transition-all cursor-pointer"
        >
          <SignOutIcon className="w-[18px] h-[18px] shrink-0" />
          Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop */}
      <div className="hidden lg:flex shrink-0 h-screen sticky top-0">
        {panel}
      </div>

      {/* Mobile backdrop */}
      <div
        onClick={onClose}
        aria-hidden="true"
        className={`lg:hidden fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
      />

      {/* Mobile drawer */}
      <div className={`lg:hidden fixed inset-y-0 left-0 z-50 transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {panel}
      </div>
    </>
  );
}

// ── Admin TopBar ─────────────────────────────────────────────

function AdminTopBar({ onMenuOpen, isDark, onToggleDark }: { onMenuOpen: () => void; isDark: boolean; onToggleDark: () => void }) {
  const now     = new Date();
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 px-5 py-3">
      {/* Hamburger (mobile only) */}
      <button
        onClick={onMenuOpen}
        className="lg:hidden p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
        aria-label="Open menu"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* Search */}
      <div className="flex-1 max-w-xs">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search anything..."
            className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-800 dark:text-gray-200 dark:placeholder-gray-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 text-gray-600 placeholder-gray-400"
          />
        </div>
      </div>

      {/* Right: dark mode toggle + date + notification */}
      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500 dark:text-gray-400 hidden md:block">{dateStr}</span>

        {/* Dark / Light toggle */}
        <button
          onClick={onToggleDark}
          aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors"
        >
          {isDark ? (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        <button aria-label="Notifications" className="relative p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
        </button>
      </div>
    </header>
  );
}

// ── Layout ────────────────────────────────────────────────────

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark,      setIsDark]      = useState(false);
  const [displayName, setDisplayName] = useState('Admin User');
  const [roleLabel, setRoleLabel] = useState('Admin');
  const router = useRouter();
  const token = getToken();
  const role = getNormalizedUserRole();
  const isAuthorized = !!token && role === 'ADMIN';

  useEffect(() => {
    let mounted = true;

    if (!token || !role) {
      router.replace('/login');
      return;
    }

    if (role !== 'ADMIN') {
      router.replace(getDashboardRouteForRole(role));
      return;
    }

    const authToken = token;

    async function loadAdminSessionProfile() {
      try {
        const response = await api.get<AdminSessionResponse>('/admin/me', authToken);
        if (!mounted) return;

        const resolvedName = response.data?.displayName?.trim() || response.data?.email || 'Admin User';
        const resolvedRole = response.data?.role?.toLowerCase().replace('_', ' ') || 'admin';
        setDisplayName(resolvedName);
        setRoleLabel(resolvedRole);
      } catch (error) {
        if (!mounted) return;

        if (error instanceof ApiError && error.status === 401) {
          authLogout();
          router.replace('/login');
          return;
        }

        setDisplayName('Admin User');
        setRoleLabel('admin');
      }
    }

    void loadAdminSessionProfile();

    return () => {
      mounted = false;
    };
  }, [role, router, token]);

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
        <p className="text-sm text-gray-500 dark:text-gray-400">Checking session...</p>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen${isDark ? ' dark' : ''}`}>
      <AdminSidebar
        isOpen={sidebarOpen}
        displayName={displayName}
        roleLabel={roleLabel}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex flex-col flex-1 min-w-0 bg-gray-50 dark:bg-gray-950">
        <AdminTopBar
          onMenuOpen={() => setSidebarOpen(true)}
          isDark={isDark}
          onToggleDark={() => setIsDark(d => !d)}
        />
        <main className="flex-1 overflow-auto dark:bg-gray-950">
          {children}
        </main>
      </div>
    </div>
  );
}
