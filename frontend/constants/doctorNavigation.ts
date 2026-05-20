/**
 * DOCTOR NAVIGATION ITEMS
 * ──────────────────────────────────────────────────────────────
 * Sidebar links for the doctor dashboard.
 */

import React from 'react';
import { CertificatesIcon, DashboardIcon, InventoryIcon, NotificationsIcon, ScannerIcon, UsersIcon } from '@/components/icons/NavIcons';

export interface DoctorNavItem {
  id:     string;
  label:  string;
  href:   string;
  badge?: number;
  icon:   React.ComponentType<{ className?: string }>;
}

export interface DoctorNavGroup {
  groupLabel?: string;
  items: DoctorNavItem[];
}

export const DOCTOR_NAV_GROUPS: DoctorNavGroup[] = [
  {
    items: [
      {
        id:    'dashboard',
        label: 'Dashboard',
        href:  '/dashboard/doctor',
        icon:  DashboardIcon,
      },
      {
        id:    'students',
        label: 'Students',
        href:  '/dashboard/doctor/students',
        icon:  UsersIcon,
      },
      {
        id:    'scanner',
        label: 'QR Scanner',
        href:  '/dashboard/doctor/scanner',
        icon:  ScannerIcon,
      },
      {
        id:    'records',
        label: 'Logs',
        href:  '/dashboard/doctor/records',
        icon:  CertificatesIcon,
      },
      {
        id:    'inventory',
        label: 'Medical Inventory',
        href:  '/dashboard/doctor/inventory',
        icon:  InventoryIcon,
      },
      {
        id:    'announcement',
        label: 'Announcements',
        href:  '/dashboard/doctor/announcement',
        icon:  NotificationsIcon,
      },
      {
        id:    'certificates',
        label: 'Certificates',
        href:  '/dashboard/doctor/certificates',
        icon:  CertificatesIcon,
      },
      {
        id:    'reports',
        label: 'Reports',
        href:  '/dashboard/doctor/reports',
        icon:  DashboardIcon,
      },
      {
        id:    'notifications',
        label: 'Notifications',
        href:  '/dashboard/doctor/notifications',
        icon:  NotificationsIcon,
      },
    ],
  },
];
