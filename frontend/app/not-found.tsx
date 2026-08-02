/**
 * 404 NOT FOUND PAGE
 * ──────────────────────────────────────────────────────────────
 * Rendered automatically by Next.js whenever a route is not matched.
 *
 * This replaces the default Next.js 404 screen with a branded
 * GC HealthLink page that keeps the look-and-feel consistent
 * with the rest of the application.
 */

import Link from 'next/link';
import AppLogo from '@/components/branding/AppLogo';
import BackButton from '@/components/ui/BackButton';

export const metadata = {
  title: 'Page Not Found | GC HealthLink',
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex flex-col items-center justify-center px-4">

      {/* ── Logo ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-[hsl(var(--card))] border border-[hsl(var(--border))] shadow-sm">
          <AppLogo className="h-8 w-8 object-contain" />
        </div>
        <span className="text-xl font-bold text-[hsl(var(--foreground))] tracking-tight">
          GC HealthLink
        </span>
      </div>

      {/* ── Card ──────────────────────────────────────────── */}
      <div className="bg-[hsl(var(--card))] rounded-[var(--radius-2xl)] shadow-[var(--shadow-md)] border border-[hsl(var(--border))] p-10 max-w-md w-full text-center">

        {/* Big 404 */}
        <p className="text-8xl font-extrabold text-[hsl(var(--primary))]">
          404
        </p>

        <h1 className="mt-3 text-2xl font-bold text-[hsl(var(--foreground))]">
          Page Not Found
        </h1>

        <p className="mt-3 text-[hsl(var(--muted))] leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Double-check the URL, or head back to a familiar place.
        </p>

        {/* ── Actions ─────────────────────────────────────── */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-2.5 rounded-[var(--radius-md)] text-sm font-semibold text-white gradient-primary hover:opacity-90 active:scale-[0.97] transition-all"
          >
            Go to Login
          </Link>

          <BackButton />
        </div>
      </div>

      {/* ── Footer note ───────────────────────────────────── */}
      <p className="mt-8 text-xs text-[hsl(var(--muted))]">
        GC HealthLink &mdash; Campus Clinic Management System
      </p>
    </div>
  );
}
