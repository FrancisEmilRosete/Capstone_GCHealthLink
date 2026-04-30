/**
 * ADMIN NAVIGATION ITEMS
 */

import React from 'react';
import {
  DashboardIcon,
  ReportsIcon,
  NotificationsIcon,
  UsersIcon,
  InventoryIcon,
  AuditIcon,
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
        id:    'students',
        label: 'Students',
        href:  '/dashboard/admin/students',
        icon:  UsersIcon,
      },
      {
        id:    'medicine-inventory',
        label: 'Medicine Inventory',
        href:  '/dashboard/admin/inventory',
        icon:  InventoryIcon,
      },
      {
        id:    'announcement',
        label: 'Announcement',
        href:  '/dashboard/admin/announcement',
        icon:  ReportsIcon,
      },
      {
        id:    'notifications',
        label: 'Notifications',
        href:  '/dashboard/admin/notifications',
        icon:  NotificationsIcon,
      },
      {
        id:    'activity-log',
        label: 'Activity Log',
        href:  '/dashboard/admin/audit',
        icon:  AuditIcon,
      },
    ],
  },
];
