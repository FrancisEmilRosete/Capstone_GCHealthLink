/**
 * ROOT PAGE
 * ──────────────────────────────────────────────────────────────
 * Route: /
 *
 * This file just redirects users to the login page.
 * All actual login UI is in: app/(auth)/login/page.tsx
 */

import { redirect } from 'next/navigation';

export default function RootPage() {
  redirect('/login');
}
