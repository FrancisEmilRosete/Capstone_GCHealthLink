'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { DOCTOR_NAV_GROUPS } from '@/constants/doctorNavigation';
import { getNormalizedUserRole, getToken } from '@/lib/auth';

interface DoctorLayoutProps {
  children: React.ReactNode;
}

export default function DoctorLayout({ children }: DoctorLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    const role = getNormalizedUserRole();

    // Side switch: allow CLINIC_STAFF (nurse) and ADMIN on this dashboard side.
    if (!token || (role !== 'CLINIC_STAFF' && role !== 'ADMIN')) {
      router.replace('/login');
      return;
    }

    setAuthorized(true);
  }, [router]);

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-sm text-gray-500">Verifying access...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userName="Nurse"
        userRole="nurse"
        brandSubtitle="Nurse Portal"
        navGroups={DOCTOR_NAV_GROUPS}
      />

      <div className="flex flex-col flex-1 min-w-0 bg-gray-50">
        <TopBar
          onMenuOpen={() => setSidebarOpen(true)}
          userName="Nurse"
        />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
