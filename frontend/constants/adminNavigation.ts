/**
 * ADMIN NAVIGATION ITEMS
 */

import React from 'react';
import {
  DashboardIcon,
  ReportsIcon,
  NotificationsIcon,
  UsersIcon,
  AuditIcon,
  CertificatesIcon,
  StethoscopeIcon,
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
        label: 'User Accounts',
        href:  '/dashboard/admin/users',
        icon:  UsersIcon,
      },
      {
        id:    'records',
        label: 'Health Records',
        href:  '/dashboard/admin/records',
        icon:  StethoscopeIcon,
      },
      {
        id:    'certificates',
        label: 'Certificates',
        href:  '/dashboard/admin/certificates',
        icon:  CertificatesIcon,
      },
    ],
  },
  {
    groupLabel: 'Security',
    items: [
      {
        id:    'audit',
        label: 'Activity Logs',
        href:  '/dashboard/admin/audit',
        icon:  AuditIcon,
      },
    ],
  },
];
