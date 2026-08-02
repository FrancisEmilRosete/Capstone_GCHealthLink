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
import { ADMIN_NAV_GROUPS } from '@/constants/adminNavigation';
import AdminNotificationsBell from '@/components/dashboard/admin/AdminNotificationsBell';
import Sidebar from '@/components/layout/Sidebar';

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

// ── Admin TopBar ─────────────────────────────────────────────

function AdminTopBar({ onMenuOpen, isDark, onToggleDark }: { onMenuOpen: () => void; isDark: boolean; onToggleDark: () => void }) {
  const pathname = usePathname();

  function resolveAdminTitle(path: string) {
    const seg = path.replace(/\/$/, '');
    if (seg === '/dashboard/admin') return 'Admin Dashboard';
    if (seg.startsWith('/dashboard/admin/users')) return 'User Management';
    if (seg.startsWith('/dashboard/admin/students')) return 'Students';
    if (seg.startsWith('/dashboard/admin/records')) return 'Records';
    if (seg.startsWith('/dashboard/admin/inventory')) return 'Inventory';
    if (seg.startsWith('/dashboard/admin/certificates')) return 'Certificates';
    if (seg.startsWith('/dashboard/admin/reports')) return 'Reports';
    if (seg.startsWith('/dashboard/admin/notifications')) return 'Notifications';
    if (seg.startsWith('/dashboard/admin/audit')) return 'Audit Logs';
    if (seg.startsWith('/dashboard/admin/settings')) return 'Settings';
    if (seg.startsWith('/dashboard/admin/announcement')) return 'Announcements';
    return 'Admin Dashboard';
  }

  function resolveAdminSubtitle(path: string) {
    const seg = path.replace(/\/$/, '');
    if (seg === '/dashboard/admin') return 'System Operations Overview';
    if (seg.startsWith('/dashboard/admin/users')) return 'Manage System Users';
    if (seg.startsWith('/dashboard/admin/students')) return 'Manage Student Directory';
    if (seg.startsWith('/dashboard/admin/records')) return 'Review Health Records';
    if (seg.startsWith('/dashboard/admin/inventory')) return 'Track Clinic Inventory';
    if (seg.startsWith('/dashboard/admin/certificates')) return 'Review Issued Certificates';
    if (seg.startsWith('/dashboard/admin/reports')) return 'Generate Analytics Reports';
    if (seg.startsWith('/dashboard/admin/notifications')) return 'Monitor System Alerts';
    if (seg.startsWith('/dashboard/admin/audit')) return 'Inspect Audit Trails';
    if (seg.startsWith('/dashboard/admin/settings')) return 'Configure System Settings';
    if (seg.startsWith('/dashboard/admin/announcement')) return 'Publish Clinic Advisories';
    return 'System Operations Overview';
  }

  const currentPath = pathname || '/dashboard/admin';
  const title = resolveAdminTitle(currentPath);
  const subtitle = resolveAdminSubtitle(currentPath);

  return (
    <header className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-6 py-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onMenuOpen}
            className="lg:hidden shrink-0 p-2 -ml-1 rounded-lg text-slate-500 hover:bg-teal-50 hover:text-teal-700 transition-colors"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h1>
            <p className="text-[11px] font-semibold text-teal-600 uppercase tracking-widest mt-0.5">{subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleDark}
            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="p-2 rounded-lg text-slate-500 hover:bg-teal-50 hover:text-teal-700 transition-colors"
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

          <AdminNotificationsBell />
        </div>
      </div>
    </header>
  );
}

// ── Layout ────────────────────────────────────────────────────

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isDark,      setIsDark]      = useState(false);
  const [displayName, setDisplayName] = useState('Admin User');
  const [roleLabel, setRoleLabel] = useState('Admin');
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    let mounted = true;
    const token = getToken();
    const role = getNormalizedUserRole();

    if (!token || !role) {
      if (mounted) setIsAuthorized(false);
      router.replace('/login');
      return;
    }

    if (role !== 'ADMIN') {
      if (mounted) setIsAuthorized(false);
      router.replace(getDashboardRouteForRole(role));
      return;
    }

    if (mounted) setIsAuthorized(true);

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
  }, [router]);

  if (isAuthorized !== true) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
        <p className="text-sm text-[hsl(var(--muted))]">Checking session...</p>
      </div>
    );
  }

  return (
    <div className={`flex min-h-screen dashboard-record-theme${isDark ? ' dark' : ''}`}>
      <Sidebar
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        onClose={() => setSidebarOpen(false)}
        userName={displayName}
        userRole={roleLabel}
        brandSubtitle="Admin Panel"
        navGroups={ADMIN_NAV_GROUPS}
      />
      <div className="flex flex-col flex-1 min-w-0 bg-[hsl(var(--background))]">
        <AdminTopBar
          onMenuOpen={() => setSidebarOpen(true)}
          isDark={isDark}
          onToggleDark={() => setIsDark(d => !d)}
        />
        <main className="flex-1 overflow-auto dashboard-uniform-width">
          {children}
        </main>
      </div>
    </div>
  );
}
