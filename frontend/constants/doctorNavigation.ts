/**
 * DOCTOR NAVIGATION ITEMS
 * ──────────────────────────────────────────────────────────────
 * Sidebar links for the doctor dashboard.
 */

import React from 'react';
import { CertificatesIcon, ConsultationsIcon, DashboardIcon, NotificationsIcon } from '@/components/icons/NavIcons';

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
    groupLabel: 'MAIN',
    items: [
      {
        id:    'dashboard',
        label: 'Dashboard',
        href:  '/dashboard/doctor',
        icon:  DashboardIcon,
      },
      {
        id:    'consultations',
        label: 'Consultations',
        href:  '/dashboard/doctor/consultations',
        icon:  ConsultationsIcon,
      },
      {
        id:    'records',
        label: 'Medical Records',
        href:  '/dashboard/doctor/records',
        icon:  CertificatesIcon,
      },
      {
        id:    'patients',
        label: 'Patient Directory',
        href:  '/dashboard/doctor/patients',
        icon:  ConsultationsIcon, // Using ConsultationsIcon as a placeholder
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
