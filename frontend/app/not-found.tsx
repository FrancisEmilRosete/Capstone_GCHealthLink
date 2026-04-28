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
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">

      {/* ── Logo ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3 mb-10">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-white border border-teal-100 shadow-sm">
          <AppLogo className="h-8 w-8 object-contain" />
        </div>
        <span className="text-xl font-bold text-gray-800 tracking-tight">
          GC HealthLink
        </span>
      </div>

      {/* ── Card ──────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10
                      max-w-md w-full text-center">

        {/* Big 404 */}
        <p className="text-8xl font-extrabold"
           style={{ color: 'var(--primary)' }}>
          404
        </p>

        <h1 className="mt-3 text-2xl font-bold text-gray-800">
          Page Not Found
        </h1>

        <p className="mt-3 text-gray-500 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
          Double-check the URL, or head back to a familiar place.
        </p>

        {/* ── Actions ─────────────────────────────────────── */}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/login"
            className="inline-flex items-center justify-center px-6 py-2.5
                       rounded-lg text-sm font-semibold text-white
                       opacity-100 hover:opacity-90 active:opacity-80
                       transition-opacity duration-150"
            style={{ background: 'var(--primary)' }}
          >
            Go to Login
          </Link>

          <BackButton />
        </div>
      </div>

      {/* ── Footer note ───────────────────────────────────── */}
      <p className="mt-8 text-xs text-gray-400">
        GC HealthLink &mdash; Campus Clinic Management System
      </p>
    </div>
  );
}
