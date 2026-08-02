'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { DENTAL_NAV_GROUPS } from '@/constants/dentalNavigation';
import { getNormalizedUserRole, getToken } from '@/lib/auth';
import MessengerWidget from '@/components/messaging/MessengerWidget';

interface DentalLayoutProps {
  children: React.ReactNode;
}

export default function DentalLayout({ children }: DentalLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    const role = getNormalizedUserRole();

    // Allow DENTAL and ADMIN only
    if (!token || (role !== 'DENTAL' && role !== 'ADMIN')) {
      router.replace('/login');
      return;
    }

    setAuthorized(true);
  }, [router]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
        <p className="text-sm text-[hsl(var(--muted))]">Verifying access...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen dashboard-record-theme">
      <Sidebar
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
        onClose={() => setSidebarOpen(false)}
        userName="Dental Team"
        userRole="dental"
        brandSubtitle="Dental Clinic"
        navGroups={DENTAL_NAV_GROUPS}
      />

      <div className="flex flex-col flex-1 min-w-0 bg-[hsl(var(--background))]">
        <TopBar
          onMenuOpen={() => setSidebarOpen(true)}
        />
        <main className="flex-1 overflow-auto dashboard-uniform-width">
          {children}
        </main>
      </div>

      {/* Floating Messenger Widget */}
      <MessengerWidget />
    </div>
  );
}
