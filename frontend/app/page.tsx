/**
 * LANDING PAGE
 * ──────────────────────────────────────────────────────────────
 * Route: /
 *
 * Public entry point that introduces GC HealthLink and
 * guides users to the login experience.
 */

import Link from 'next/link';
import { ArrowRight, CheckCircle, Shield, Activity } from 'lucide-react';
import AppLogo from '@/components/branding/AppLogo';
import { Button } from '@/components/ui/Button';

export default function RootPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[hsl(var(--background))] text-[hsl(var(--foreground))]">
      {/* Subtle background accent - calm, not playful */}
      <div className="pointer-events-none absolute -top-64 -left-64 h-[800px] w-[800px] rounded-full bg-[hsl(var(--primary-soft))] opacity-30 blur-[200px]" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-8">
        {/* Top bar */}
        <header className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-lg)] bg-[hsl(var(--surface))] border border-[hsl(var(--border))] shadow-[var(--shadow-sm)]">
              <AppLogo className="h-7 w-7 object-contain" />
            </span>
            <div className="leading-tight">
              <p className="text-sm font-semibold text-[hsl(var(--foreground))]">GC HealthLink</p>
              <p className="text-xs text-[hsl(var(--muted))]">Campus Clinic Management System</p>
            </div>
          </div>
          <Link href="/login">
            <Button variant="secondary" size="sm">
              Sign In
            </Button>
          </Link>
        </header>

        {/* Hero */}
        <section className="mt-20 grid items-center gap-12 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-[var(--radius-full)] bg-[hsl(var(--primary-soft))] px-3 py-1 text-xs font-semibold text-[hsl(var(--primary))]">
              <div className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--primary))]"></div>
              System Status: Online
            </div>
            <h1 className="mt-6 text-display text-[hsl(var(--foreground))]">
              Modern clinic management for campus health
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[hsl(var(--muted))]">
              Centralized triage, records, and operations with intelligent routing and real-time decision support. 
              Every student visit is coordinated, secure, and trackable.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Link href="/login">
                <Button size="lg" className="gap-2">
                  Get Started
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <p className="text-sm text-[hsl(var(--muted))]">
                Built for admins, nurses, doctors, dental staff, and students
              </p>
            </div>
          </div>

          <div className="relative">
            <div className="card card-hover space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted))]">System Status</p>
                  <p className="text-lg font-semibold text-[hsl(var(--foreground))]">Clinic Operations</p>
                </div>
                <div className="rounded-[var(--radius-full)] bg-[hsl(var(--success-soft))] px-3 py-1 text-xs font-semibold text-[hsl(var(--success))]">
                  Live
                </div>
              </div>
              <div className="space-y-3 pt-2">
                <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5">
                  <CheckCircle className="h-5 w-5 text-[hsl(var(--primary))] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted))]">Smart Queueing</p>
                    <p className="text-sm text-[hsl(var(--foreground))]">Auto-triage, priority routing</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5">
                  <Shield className="h-5 w-5 text-[hsl(var(--primary))] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted))]">Unified Records</p>
                    <p className="text-sm text-[hsl(var(--foreground))]">One profile across all services</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--background))] px-3 py-2.5">
                  <Activity className="h-5 w-5 text-[hsl(var(--primary))] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-[hsl(var(--muted))]">Analytics Ready</p>
                    <p className="text-sm text-[hsl(var(--foreground))]">Actionable insights for leaders</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About */}
        <section className="mt-20 card space-y-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted))]">About the System</p>
            <h2 className="mt-3 text-h2 text-[hsl(var(--foreground))]">Designed for modern campus clinics</h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-2 text-sm leading-relaxed text-[hsl(var(--muted-foreground))]">
            <p>
              GC HealthLink coordinates appointments, consultations, and follow-ups while
              maintaining secure student records. The platform blends automation with clear human oversight
              so staff can stay focused on care quality.
            </p>
            <p>
              From queue management to audit-ready reporting, the system supports daily operations
              while adapting to changing campus needs.
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-auto pt-12 pb-8 text-center text-xs text-[hsl(var(--muted))]">
          <p>© {new Date().getFullYear()} GC HealthLink. Campus Clinic Management System.</p>
        </footer>
      </div>
    </main>
  );
}
