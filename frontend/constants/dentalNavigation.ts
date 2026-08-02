/**
 * DENTAL NAVIGATION ITEMS
 * ──────────────────────────────────────────────────────────────
 * Sidebar links for the dental dashboard.
 */

import React from 'react';
import { CalendarIcon, CertificatesIcon, DashboardIcon, NotificationsIcon, ReportsIcon, ScannerIcon, UsersIcon, InventoryIcon } from '@/components/icons/NavIcons';

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
        id:    'reports',
        label: 'Reports',
        href:  '/dashboard/dental/reports',
        icon:  ReportsIcon,
      },

      {
        id:    'calendar',
        label: 'Calendar',
        href:  '/dashboard/dental/calendar',
        icon:  CalendarIcon,
      },
      {
        id:    'logs',
        label: 'Logs',
        href:  '/dashboard/dental/logs',
        icon:  CertificatesIcon,
      },
      {
        id:    'inventory',
        label: 'Inventory',
        href:  '/dashboard/dental/inventory',
        icon:  InventoryIcon,
      },
    ],
  },
];
