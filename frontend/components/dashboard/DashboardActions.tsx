'use client';

/**
 * DASHBOARD ACTION BUTTONS (Staff)
 * ─────────────────────────────────────────────────────────────
 * Client-side island rendered inside the server-component
 * DashboardPage.  Handles:
 *
 *   • "New Consultation"  → opens ConsultationModal
 *   • "Register Student"  → navigates to the QR scanner so staff
 *                           can look up / identify the student first
 *   • "Scan Student"      → same scanner shortcut
 */

import { useState } from 'react';
import Link from 'next/link';
import ConsultationModal, { ConsultationPatient } from '@/components/modals/ConsultationModal';

const EMPTY_PATIENT: ConsultationPatient = {
  name:       '',
  department: '',
  course:     '',
};

export default function DashboardActions() {
  const [showConsult, setShowConsult] = useState(false);

  return (
    <>
      {/* ── Consultation Modal ─────────────────────────── */}
      {showConsult && (
        <ConsultationModal
          patient={EMPTY_PATIENT}
          inventoryOptions={[]}
          onClose={() => setShowConsult(false)}
          onSave={(data, medicines) => {
            // TODO: POST /api/consultations
            console.log('New consultation saved:', data, medicines);
            setShowConsult(false);
          }}
        />
      )}

      {/* ── Buttons ───────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-3">

        {/* New Consultation */}
        <button
          onClick={() => setShowConsult(true)}
          className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600
            text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          New Consultation
        </button>

        {/* Register Student → scanner */}
        <Link
          href="/dashboard/staff/scanner"
          className="flex items-center gap-2 border border-gray-200 text-gray-600
            hover:border-teal-400 hover:text-teal-600 text-sm font-semibold
            px-4 py-2 rounded-xl transition-colors bg-white"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Register Student
        </Link>

        {/* Scan Student → scanner */}
        <Link
          href="/dashboard/staff/scanner"
          className="flex items-center gap-2 border border-gray-200 text-gray-600
            hover:border-teal-400 hover:text-teal-600 text-sm font-semibold
            px-4 py-2 rounded-xl transition-colors bg-white"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"
            strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9V5a2 2 0 0 1 2-2h4" />
            <path d="M15 3h4a2 2 0 0 1 2 2v4" />
            <path d="M21 15v4a2 2 0 0 1-2 2h-4" />
            <path d="M9 21H5a2 2 0 0 1-2-2v-4" />
            <rect x="7" y="7" width="3" height="3" rx="0.5" />
            <rect x="14" y="7" width="3" height="3" rx="0.5" />
            <rect x="7" y="14" width="3" height="3" rx="0.5" />
          </svg>
          Scan Student
        </Link>

      </div>
    </>
  );
}
