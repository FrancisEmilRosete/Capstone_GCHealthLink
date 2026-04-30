/**
 * DENTAL NAVIGATION ITEMS
 * ──────────────────────────────────────────────────────────────
 * Sidebar links for the dental dashboard.
 */

import React from 'react';
import { CertificatesIcon, DashboardIcon, NotificationsIcon, ScannerIcon, UsersIcon } from '@/components/icons/NavIcons';

export interface DentalNavItem {
  id:     string;
  label:  string;
  href:   string;
  badge?: number;
  icon:   React.ComponentType<{ className?: string }>;
}

export interface DentalNavGroup {
  groupLabel?: string;
  items: DentalNavItem[];
}

export const DENTAL_NAV_GROUPS: DentalNavGroup[] = [
  {
    groupLabel: 'MAIN',
    items: [
      {
        id:    'dashboard',
        label: 'Dashboard',
        href:  '/dashboard/dental',
        icon:  DashboardIcon,
      },
      {
        id:    'scanner',
        label: 'QR Scanner',
        href:  '/dashboard/dental/scanner',
        icon:  ScannerIcon,
      },
      {
        id:    'students',
        label: 'Students',
        href:  '/dashboard/dental/students',
        icon:  UsersIcon,
      },
      {
        id:    'logs',
        label: 'Logs',
        href:  '/dashboard/dental/logs',
        icon:  CertificatesIcon,
      },
      {
        id:    'notifications',
        label: 'Notifications',
        href:  '/dashboard/dental/notifications',
        icon:  NotificationsIcon,
      },
    ],
  },
];
