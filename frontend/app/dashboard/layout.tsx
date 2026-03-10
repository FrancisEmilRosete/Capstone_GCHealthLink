/**
 * DASHBOARD LAYOUT
 * ─────────────────────────────────────────────────────────────
 * Route: /dashboard/* (wraps ALL dashboard pages automatically)
 *
 * Structure:
 *   Desktop (>=lg):
 *     [Sidebar 220px] | [TopBar sticky] + [Page content]
 *
 *   Mobile (<lg):
 *     [TopBar sticky (with hamburger)] + [Page content]
 *     [Sidebar slides in as a drawer when hamburger is tapped]
 *
 * The sidebar open/close state lives here and is passed down
 * as props to both Sidebar and TopBar.
 *
 * TODO: Pass real user data from auth context once auth is ready.
 */

'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import TopBar  from '@/components/layout/TopBar';
import { getDashboardRouteForRole, getNormalizedUserRole, getToken } from '@/lib/auth';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  // Controls the mobile sidebar drawer
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const token = getToken();
  const role = getNormalizedUserRole();

  const hasDedicatedRoleLayout = (
    pathname?.startsWith('/dashboard/student') || pathname?.startsWith('/dashboard/admin')
  );

  useEffect(() => {
    if (hasDedicatedRoleLayout) {
      return;
    }

    if (!token || !role) {
      router.replace('/login');
      return;
    }

    if (role !== 'CLINIC_STAFF') {
      router.replace(getDashboardRouteForRole(role));
    }
  }, [hasDedicatedRoleLayout, role, router, token]);

  const isAuthorized = !!token && role === 'CLINIC_STAFF';

  // Student and admin pages use their own self-contained layouts
  if (hasDedicatedRoleLayout) {
    return <>{children}</>;
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Checking session...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">

      {/* Sidebar — desktop column + mobile slide-in drawer */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Right side: TopBar + page content */}
      <div className="flex flex-col flex-1 min-w-0 bg-gray-50">

        {/* Sticky top header — hamburger opens sidebar on mobile */}
        <TopBar
          onMenuOpen={() => setSidebarOpen(true)}
        />

        {/* Scrollable page content */}
        <main className="flex-1 overflow-auto">
          {children}
        </main>

      </div>
    </div>
  );
}


