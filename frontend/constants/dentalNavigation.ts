/**
 * DENTAL NAVIGATION ITEMS
 * ──────────────────────────────────────────────────────────────
 * Sidebar links for the dental dashboard.
 */

import React from 'react';
import { CertificatesIcon, DashboardIcon, NotificationsIcon, ScannerIcon, ToothIcon } from '@/components/icons/NavIcons';

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
        id:    'queue',
        label: 'Dental Queue',
        href:  '/dashboard/dental/queue',
        icon:  ToothIcon,
      },
      {
        id:    'scanner',
        label: 'QR Scanner',
        href:  '/dashboard/dental/scanner',
        icon:  ScannerIcon,
      },
      {
        id:    'records',
        label: 'Records',
        href:  '/dashboard/dental/records',
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
