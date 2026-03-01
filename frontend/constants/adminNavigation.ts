/**
 * ADMIN NAVIGATION ITEMS
 * ──────────────────────────────────────────────────────────────
 * Sidebar links for the admin dashboard.
 */

import React from 'react';
import {
  DashboardIcon,
  ReportsIcon,
  NotificationsIcon,
  UsersIcon,
  AuditIcon,
  SettingsIcon,
} from '@/components/icons/NavIcons';

export interface AdminNavItem {
  id:     string;
  label:  string;
  href:   string;
  badge?: number;
  icon:   React.ComponentType<{ className?: string }>;
}

export interface AdminNavGroup {
  groupLabel?: string;
  items: AdminNavItem[];
}

export const ADMIN_NAV_GROUPS: AdminNavGroup[] = [
  {
    groupLabel: 'Main',
    items: [
      {
        id:    'dashboard',
        label: 'Dashboard',
        href:  '/dashboard/admin',
        icon:  DashboardIcon,
      },
      {
        id:    'reports',
        label: 'Reports',
        href:  '/dashboard/admin/reports',
        icon:  ReportsIcon,
      },
      {
        id:    'notifications',
        label: 'Notifications',
        href:  '/dashboard/admin/notifications',
        icon:  NotificationsIcon,
      },
    ],
  },
  {
    groupLabel: 'Management',
    items: [
      {
        id:    'users',
        label: 'User Management',
        href:  '/dashboard/admin/users',
        icon:  UsersIcon,
      },
      {
        id:    'audit',
        label: 'Audit Log',
        href:  '/dashboard/admin/audit',
        icon:  AuditIcon,
      },
    ],
  },
];
