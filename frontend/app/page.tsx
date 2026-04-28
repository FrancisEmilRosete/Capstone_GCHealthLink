/**
 * LANDING PAGE
 * ──────────────────────────────────────────────────────────────
 * Route: /
 *
 * Public entry point that introduces GC HealthLink and
 * guides users to the login experience.
 */

import Link from 'next/link';
import HeartbeatIcon from '@/components/icons/HeartbeatIcon';

export default function RootPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      {/* Background atmosphere */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-[420px] w-[420px] rounded-full bg-teal-300/30 blur-[120px]" />
      <div className="pointer-events-none absolute top-32 -right-32 h-[460px] w-[460px] rounded-full bg-amber-200/40 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-0 left-1/2 h-[360px] w-[360px] -translate-x-1/2 rounded-full bg-emerald-200/40 blur-[140px]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
        {/* Top bar */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-teal-600 shadow-lg shadow-teal-200">
              <HeartbeatIcon />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold tracking-wide text-teal-700">GC HealthLink</p>
              <p className="text-xs text-slate-500">Campus Clinic Management System</p>
            </div>
          </div>
          <Link
            href="/login"
            className="rounded-full border border-teal-200 bg-white px-4 py-2 text-sm font-semibold text-teal-700 shadow-sm transition hover:border-teal-300 hover:text-teal-800"
          >
            Sign In
          </Link>
        </header>

        {/* Hero */}
        <section className="mt-16 grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-teal-600">AI-assisted campus care</p>
            <h1 className="mt-4 text-4xl font-semibold leading-tight text-slate-900 sm:text-5xl">
              A smarter clinic workflow for faster, safer student care.
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-600">
              GC HealthLink centralizes triage, records, and clinic operations with intelligent routing
              and real-time decision support, so every student visit feels coordinated and personal.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link
                href="/login"
                className="rounded-full bg-teal-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-200 transition hover:bg-teal-700"
              >
                Get Started
              </Link>
              <div className="text-sm text-slate-500">
                Built for admins, clinic staff, doctors, dental teams, and students.
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="absolute right-6 top-6 h-16 w-16 rounded-full border border-teal-200/80 bg-white/70 shadow-md shadow-teal-100 animate-pulse" />
            <div className="rounded-3xl border border-white/70 bg-white/80 p-6 shadow-xl shadow-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Live status</p>
                  <p className="text-lg font-semibold text-slate-800">Clinic Operations</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Online</span>
              </div>
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Smart queueing</p>
                  <p className="text-sm font-medium text-slate-700">Auto-triage requests, priority routing</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Unified records</p>
                  <p className="text-sm font-medium text-slate-700">One profile across visits and services</p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Analytics ready</p>
                  <p className="text-sm font-medium text-slate-700">Actionable insights for campus leaders</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="mt-16 grid gap-8 rounded-3xl border border-slate-100 bg-white/80 p-8 shadow-lg shadow-slate-100 lg:grid-cols-[0.4fr_0.6fr]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">About</p>
            <h2 className="mt-3 text-2xl font-semibold text-slate-900">Designed for modern campus clinics.</h2>
          </div>
          <div className="space-y-4 text-sm leading-relaxed text-slate-600">
            <p>
              GC HealthLink helps clinics coordinate appointments, consultations, and follow-ups while
              maintaining secure student records. The platform blends automation with clear human oversight
              so staff can stay focused on care quality.
            </p>
            <p>
              From queue management to audit-ready reporting, the system supports daily operations
              while adapting to changing campus needs.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
