'use client';

import Link from 'next/link';

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-20">
      <div className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-wide text-teal-600">Offline Mode</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Connection lost</h1>
        <p className="mt-3 text-sm leading-relaxed text-slate-600">
          GC HealthLink is currently offline. You can continue using cached pages and sync queued actions once the connection returns.
        </p>
        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.location.reload();
              }
            }}
            className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Retry
          </button>
          <Link
            href="/"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-teal-300 hover:text-teal-700"
          >
            Go Home
          </Link>
        </div>
      </div>
    </main>
  );
}
