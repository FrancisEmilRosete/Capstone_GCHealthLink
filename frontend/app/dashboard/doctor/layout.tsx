'use client';

import type React from 'react';
import { useState } from 'react';

import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import { DOCTOR_NAV_GROUPS } from '@/constants/doctorNavigation';

interface DoctorLayoutProps {
  children: React.ReactNode;
}

export default function DoctorLayout({ children }: DoctorLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userName="Doctor"
        userRole="doctor"
        brandSubtitle="Doctor Portal"
        navGroups={DOCTOR_NAV_GROUPS}
      />

      <div className="flex flex-col flex-1 min-w-0 bg-gray-50">
        <TopBar
          onMenuOpen={() => setSidebarOpen(true)}
          userName="Doctor"
        />
        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
