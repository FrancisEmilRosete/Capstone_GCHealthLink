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
  PhysicalExamIcon,
  ConsultationsIcon,
  ScannerIcon,
  InventoryIcon,
  CertificatesIcon,
  ReportsIcon,
  NotificationsIcon,
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
    groupLabel: 'Main',
    items: [
      {
        id:    'dashboard',
        label: 'Dashboard',
        href:  '/dashboard/staff',
        icon:  DashboardIcon,
      },
      {
        id:    'physical-examination',
        label: 'Physical Examination',
        href:  '/dashboard/staff/physical-examination',
        icon:  PhysicalExamIcon,
      },
      {
        id:    'consultations',
        label: 'Consultations',
        href:  '/dashboard/staff/consultations',
        icon:  ConsultationsIcon,
        // badge: 3  ← uncomment and set a real number when backend is ready
      },
      {
        id:    'scanner',
        label: 'QR Scanner',
        href:  '/dashboard/staff/scanner',
        icon:  ScannerIcon,
      },
    ],
  },
  {
    groupLabel: 'Inventory & Reports',
    items: [
      {
        id:    'inventory',
        label: 'Medicine Inventory',
        href:  '/dashboard/staff/inventory',
        icon:  InventoryIcon,
        // badge: 1  ← uncomment when low-stock alerts are connected
      },
      {
        id:    'certificates',
        label: 'Certificates',
        href:  '/dashboard/staff/certificates',
        icon:  CertificatesIcon,
      },
      {
        id:    'reports',
        label: 'Reports',
        href:  '/dashboard/staff/reports',
        icon:  ReportsIcon,
      },
      {
        id:    'notifications',
        label: 'Notifications',
        href:  '/dashboard/staff/notifications',
        icon:  NotificationsIcon,
        // badge: 4  ← uncomment and set real count from API
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
