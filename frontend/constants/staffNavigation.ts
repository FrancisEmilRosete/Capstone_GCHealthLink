/**
 * STAFF NAVIGATION ITEMS
 * ──────────────────────────────────────────────────────────────
 * Defines every link shown in the staff sidebar, organized into
 * named section groups (e.g. "Main", "Inventory & Reports").
 *
 * ✅ To add a new page:
 *   1. Create the page under app/dashboard/staff/your-page/page.tsx
 *   2. Import or add its icon in components/icons/NavIcons.tsx
 *   3. Add the item to the correct group below
 *
 * ✅ To add a badge (notification count) to an item:
 *   Add a `badge: number` property to the item object.
 *   The Sidebar will automatically render the teal count circle.
 *
 * ✅ To add a new section group:
 *   Add a new object to STAFF_NAV_GROUPS with a `groupLabel` and `items`.
 */

import React from 'react';
import { NavGroup } from '@/types/navigation';
import {
  DashboardIcon,
  ScannerIcon,
  InventoryIcon,
  CertificatesIcon,
  NotificationsIcon,
  UsersIcon,
} from '@/components/icons/NavIcons';

// Extend NavItem to attach an icon component to each nav entry
export interface StaffNavItem {
  id:     string;
  label:  string;
  href:   string;
  badge?: number;
  icon:   React.ComponentType<{ className?: string }>;
}

export interface StaffNavGroup {
  groupLabel?: string;
  items: StaffNavItem[];
}

export const STAFF_NAV_GROUPS: StaffNavGroup[] = [
  {
    items: [
      {
        id:    'dashboard',
        label: 'Dashboard',
        href:  '/dashboard/staff',
        icon:  DashboardIcon,
      },
      {
        id:    'students',
        label: 'Student',
        href:  '/dashboard/staff/students',
        icon:  UsersIcon,
      },
      {
        id:    'scanner',
        label: 'QR Scanner',
        href:  '/dashboard/staff/scanner',
        icon:  ScannerIcon,
      },
      {
        id:    'logs',
        label: 'Logs',
        href:  '/dashboard/staff/logs',
        icon:  CertificatesIcon,
      },
      {
        id:    'inventory',
        label: 'Medical Inventory',
        href:  '/dashboard/staff/inventory',
        icon:  InventoryIcon,
      },
      {
        id:    'certificates',
        label: 'Certificates',
        href:  '/dashboard/staff/certificates',
        icon:  CertificatesIcon,
      },
      {
        id:    'notifications',
        label: 'Notification',
        href:  '/dashboard/staff/notifications',
        icon:  NotificationsIcon,
      },
    ],
  },
];

// Export a flat NavGroup array (without icons) for generic use
export const STAFF_NAV_GROUPS_BASE: NavGroup[] = STAFF_NAV_GROUPS.map(
  ({ groupLabel, items }) => ({
    groupLabel,
    items: items.map(({ id, label, href, badge }) => ({ id, label, href, badge })),
  })
);
