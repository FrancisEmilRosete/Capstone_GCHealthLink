/**
 * STUDENT HEALTH RECORD PAGE
 * ─────────────────────────────────────────────────────────────
 * Route: /dashboard/staff/record/[studentId]
 *
 * Displays the full health profile of a student after their QR
 * code is scanned (via the "View Record" button on the scanner).
 *
 * Sections:
 *   1. Personal Information
 *   2. Emergency Contact
 *   3. Medical Profile  (blood type, allergies, conditions, immunizations)
 *   4. Recent Physical Exam
 *
 * TODO: Replace MOCK_RECORDS with a real API call:
 *   GET /api/students/:id/record  →  { student: {...} }
 */

'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PhysicalExamModal from '@/components/modals/PhysicalExamModal';

// ── Extended student record interface ─────────────────────────
interface StudentRecord {
  firstName:   string;
  lastName:    string;
  studentId:   string;
  course:      string;
  college:     string;
  birthday:    string; // ISO date string e.g. "2003-05-15"
  contact:     string;
  address:     string;

  emergency: {
    name:     string;
    relation: string;
    contact:  string;
  };

  medical: {
    bloodType:   string;
    allergies:   string[];
    conditions:  string[];          // e.g. ["Asthma"]
    immunizations: string[];        // e.g. ["Hepatitis B", "Measles"]
  };

  lastExam: {
    bp:         string;   // e.g. "110/70"
    temp:       string;   // e.g. "36.5"
    weight:     string;   // e.g. "60kg"
    bmi:        string;   // e.g. "22.5"
    examinedBy: string;
    date:       string;   // ISO date string
  } | null;
}

// ── Mock records ──────────────────────────────────────────────
// TODO: Replace with GET /api/students/:id/record
const MOCK_RECORDS: Record<string, StudentRecord> = {
  '2023-0001': {
    firstName:  'Juan',
    lastName:   'Dela Cruz',
    studentId:  '2023-0001',
    course:     'BS Civil Engineering',
    college:    'College of Engineering',
    birthday:   '2003-05-15',
    contact:    '09173234087',
    address:    '123 Sampaguita St, Quezon City',
    emergency: {
      name:     'Maria Dela Cruz',
      relation: 'Mother',
      contact:  '09170054321',
    },
    medical: {
      bloodType:     'O+',
      allergies:     ['Peanuts', 'Penicillin'],
      conditions:    ['Asthma'],
      immunizations: ['Hepatitis B', 'Measles', 'COVID-19'],
    },
    lastExam: {
      bp:         '110/70',
      temp:       '36.5',
      weight:     '60kg',
      bmi:        '22.5',
      examinedBy: 'Dr. Maria Santos',
      date:       '2023-08-10',
    },
  },
  '2023-0002': {
    firstName:  'Maria',
    lastName:   'Santos',
    studentId:  '2023-0002',
    course:     'BS Nursing',
    college:    'College of Health Sciences',
    birthday:   '2002-11-20',
    contact:    '09181234567',
    address:    '45 Rizal Ave, Davao City',
    emergency: {
      name:     'Jose Santos',
      relation: 'Father',
      contact:  '09189876543',
    },
    medical: {
      bloodType:     'A+',
      allergies:     ['Aspirin'],
      conditions:    [],
      immunizations: ['Hepatitis B', 'COVID-19'],
    },
    lastExam: {
      bp:         '120/80',
      temp:       '36.8',
      weight:     '55kg',
      bmi:        '21.0',
      examinedBy: 'Dr. Maria Santos',
      date:       '2024-01-15',
    },
  },
  '2024-0010': {
    firstName:  'Carlos',
    lastName:   'Reyes',
    studentId:  '2024-0010',
    course:     'BS Education',
    college:    'College of Education',
    birthday:   '2004-03-08',
    contact:    '09209876543',
    address:    '78 Mabini St, Cebu City',
    emergency: {
      name:     'Ana Reyes',
      relation: 'Mother',
      contact:  '09205554321',
    },
    medical: {
      bloodType:     'B+',
      allergies:     [],
      conditions:    [],
      immunizations: ['Hepatitis B', 'Measles', 'Varicella', 'COVID-19'],
    },
    lastExam: null,
  },
};

// ── Helpers ───────────────────────────────────────────────────
function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
}

function calcAge(iso: string) {
  const birth = new Date(iso);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

// Reusable label + value pair
function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-teal-500 font-medium mb-0.5">{label}</p>
      <p className="text-sm text-gray-800">{value}</p>
    </div>
  );
}

// Section card wrapper
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6">
      <h2 className="text-sm font-bold text-gray-900 mb-4">{title}</h2>
      {children}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function StudentRecordPage() {
  const params    = useParams();
  const router    = useRouter();
  const studentId = typeof params.studentId === 'string' ? params.studentId : '';
  const record    = MOCK_RECORDS[studentId];
  const [showExamModal, setShowExamModal] = useState(false);

  // ── Not found ──────────────────────────────────────────────
  if (!record) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <svg className="w-14 h-14 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-gray-500 font-medium">Student record not found</p>
        <p className="text-xs text-gray-400 mt-1">ID: {studentId}</p>
        <button
          onClick={() => router.back()}
          className="mt-5 text-sm text-teal-500 hover:underline"
        >
          ← Go back
        </button>
      </div>
    );
  }

  const { emergency, medical, lastExam } = record;

  // ── Layout ─────────────────────────────────────────────────
  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">

      {/* Physical Exam Modal */}
      {showExamModal && record && (
        <PhysicalExamModal
          studentName={`${record.firstName} ${record.lastName}`}
          onClose={() => setShowExamModal(false)}
          onSave={(data) => {
            // TODO: POST /api/students/:id/physical-exams
            console.log('Saving physical exam:', data);
            setShowExamModal(false);
          }}
        />
      )}

      {/* ── Page header ──────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-5">

        {/* Back + Name row */}
        <div className="flex items-start gap-3">
          {/* Back button */}
          <button
            onClick={() => router.back()}
            aria-label="Go back"
            className="mt-0.5 p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-teal-500 transition-colors shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Name + meta */}
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 leading-tight truncate">
              {record.lastName}
              <span className="font-normal text-gray-400">,</span>{' '}
              {record.firstName}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              <span className="text-teal-500 font-semibold">{record.studentId}</span>
              <span className="mx-1.5 text-gray-300">•</span>
              {record.course}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 mt-4">
          {/* Add Physical Exam */}
          <button
            onClick={() => setShowExamModal(true)}
            className="flex items-center gap-1.5 text-xs font-semibold
            border border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-600
            px-3 py-2 rounded-xl transition-colors bg-white">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Physical Exam
          </button>

          {/* History */}
          <button
            onClick={() => router.push(`/dashboard/staff/record/${studentId}/history`)}
            className="flex items-center gap-1.5 text-xs font-semibold
            border border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-600
            px-3 py-2 rounded-xl transition-colors bg-white">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            History
          </button>

          {/* Edit Record */}
          <button className="flex items-center gap-1.5 text-xs font-semibold
            bg-teal-500 hover:bg-teal-600 text-white
            px-3 py-2 rounded-xl transition-colors">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5
                   m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Record
          </button>
        </div>
      </div>

      {/* ── Personal Information ──────────────────────────────── */}
      <Section title="Personal Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow label="Department" value={record.college} />
          <InfoRow
            label="Birthday"
            value={`${formatDate(record.birthday)} (${calcAge(record.birthday)} yrs)`}
          />
          <InfoRow label="Contact" value={record.contact} />
          <InfoRow label="Address"  value={record.address} />
        </div>
      </Section>

      {/* ── Emergency Contact ─────────────────────────────────── */}
      <Section title="Emergency Contact">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <InfoRow label="Name"     value={emergency.name} />
          <InfoRow label="Relation" value={emergency.relation} />
          <InfoRow label="Contact"  value={emergency.contact} />
        </div>
      </Section>

      {/* ── Medical Profile ───────────────────────────────────── */}
      <Section title="Medical Profile">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          {/* Blood Type */}
          <div>
            <p className="text-xs text-teal-500 font-medium mb-1.5">Blood Type</p>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full
              text-xs font-semibold bg-blue-50 text-blue-600 border border-blue-100">
              {medical.bloodType}
            </span>
          </div>

          {/* Allergies */}
          <div>
            <p className="text-xs text-teal-500 font-medium mb-1.5">Allergies</p>
            {medical.allergies.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {medical.allergies.map((a) => (
                  <span key={a} className="inline-flex items-center px-2.5 py-0.5 rounded-full
                    text-xs font-medium bg-rose-50 text-rose-500 border border-rose-100">
                    {a}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-gray-400 italic">No known allergies</span>
            )}
          </div>

          {/* Existing Conditions */}
          <div>
            <p className="text-xs text-teal-500 font-medium mb-1.5">Existing Conditions</p>
            {medical.conditions.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {medical.conditions.map((c) => (
                  <span key={c} className="inline-flex items-center px-2.5 py-0.5 rounded-full
                    text-xs font-medium bg-amber-50 text-amber-600 border border-amber-100">
                    {c}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-xs text-gray-400 italic">None on record</span>
            )}
          </div>

          {/* Immunizations */}
          <div>
            <p className="text-xs text-teal-500 font-medium mb-1.5">Immunizations</p>
            {medical.immunizations.length > 0 ? (
              <ul className="space-y-1">
                {medical.immunizations.map((i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-teal-400 shrink-0" />
                    {i}
                  </li>
                ))}
              </ul>
            ) : (
              <span className="text-xs text-gray-400 italic">No records</span>
            )}
          </div>
        </div>
      </Section>

      {/* ── Recent Physical Exam ──────────────────────────────── */}
      <Section title="Recent Physical Exam">
        {lastExam ? (
          <>
            {/* Vitals grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {/* BP */}
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-teal-500 font-medium mb-1">BP</p>
                <p className="text-base font-bold text-gray-900">{lastExam.bp}</p>
              </div>
              {/* Temp */}
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-teal-500 font-medium mb-1">Temp</p>
                <p className="text-base font-bold text-gray-900">
                  {lastExam.temp}
                  <span className="text-xs font-normal text-gray-400">°C</span>
                </p>
              </div>
              {/* Weight */}
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-teal-500 font-medium mb-1">Weight</p>
                <p className="text-base font-bold text-gray-900">{lastExam.weight}</p>
              </div>
              {/* BMI */}
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-teal-500 font-medium mb-1">BMI</p>
                <p className="text-base font-bold text-gray-900">{lastExam.bmi}</p>
              </div>
            </div>

            {/* Examiner */}
            <p className="text-xs text-gray-400 mt-3">
              Examined by{' '}
              <span className="font-medium text-gray-600">{lastExam.examinedBy}</span>
              {' '}on {formatDate(lastExam.date)}
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-400 italic">No physical exam on record yet.</p>
        )}
      </Section>

    </div>
  );
}
