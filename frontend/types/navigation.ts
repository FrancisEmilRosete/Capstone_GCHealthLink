/**
 * NAVIGATION TYPES
 * ──────────────────────────────────────────────────────────────
 * TypeScript types for the sidebar navigation system.
 *
 * NavItem  → a single link in the sidebar
 * NavGroup → a labeled section containing multiple NavItems
 *            e.g. "Main" or "Inventory & Reports"
 */

export interface NavItem {
  id:     string;  // unique key for React lists
  label:  string;  // text shown in the sidebar
  href:   string;  // URL this item links to
  badge?: number;  // optional notification count (shows teal circle)
}

export interface NavGroup {
  groupLabel?: string;    // section heading (e.g. "Main") — omit for no label
  items: NavItem[];       // nav items belonging to this group
}
