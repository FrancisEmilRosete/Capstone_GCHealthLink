/**
 * QR CODE SCANNER PAGE
 * â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
 * Route: /dashboard/staff/scanner
 *
 * Allows clinic staff to look up a student's health record by
 * either scanning their QR code or typing their Student ID.
 *
 * States:
 *   idle      â†’ QR frame + manual search input
 *   found     â†’ Student result card with info pills + action btns
 *   not-found â†’ Scanner + inline error + red toast
 *
 * TODO: Replace mock lookup with a real API call:
 *   GET /api/students/:id  â†’  { found: true, student: {...} }
 *
 * TODO: Hook up the actual camera using a library such as
 *   `html5-qrcode` or `react-qr-reader` once available.
 */

'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import PhysicalExamModal from '@/components/modals/PhysicalExamModal';
import ConsultationModal from '@/components/modals/ConsultationModal';

// QrCameraScanner uses html5-qrcode which is browser-only — must skip SSR
const QrCameraScanner = dynamic(
  () => import('@/components/scanner/QrCameraScanner'),
  { ssr: false },
);

// â”€â”€ Mock Student Database â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// TODO: Replace with API call â€” add real fields from your DB schema

interface Student {
  firstName:  string;
  lastName:   string;
  course:     string;
  college:    string;
  bloodType:  string;
  allergies:  string[];
}

const MOCK_STUDENTS: Record<string, Student> = {
  '2023-0001': {
    firstName:  'Juan',
    lastName:   'Dela Cruz',
    course:     'BS Civil Engineering',
    college:    'College of Engineering',
    bloodType:  'O+',
    allergies:  ['Peanuts', 'Penicillin'],
  },
  '2023-0002': {
    firstName:  'Maria',
    lastName:   'Santos',
    course:     'BS Nursing',
    college:    'College of Health Sciences',
    bloodType:  'A+',
    allergies:  ['Aspirin'],
  },
  '2024-0010': {
    firstName:  'Carlos',
    lastName:   'Reyes',
    course:     'BS Education',
    college:    'College of Education',
    bloodType:  'B+',
    allergies:  [],
  },
};

type SearchStatus = 'idle' | 'found' | 'not-found';

// â”€â”€ Allergy pill colour helper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Blood type gets a blue pill; allergens get a red/rose pill.
function BloodTypePill({ type }: { type: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
      bg-blue-50 text-blue-600 border border-blue-100">
      Type {type}
    </span>
  );
}
function AllergyPill({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
      bg-rose-50 text-rose-500 border border-rose-100">
      {name}
    </span>
  );
}

// â”€â”€ Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function ScannerPage() {
  const router = useRouter();
  const [studentId,    setStudentId]    = useState('');
  const [status,       setStatus]       = useState<SearchStatus>('idle');
  const [foundStudent, setFoundStudent] = useState<Student | null>(null);
  const [foundId,      setFoundId]      = useState('');
  const [toastType,    setToastType]    = useState<'found' | 'not-found' | null>(null);
  // true = camera is scanning; false = camera paused (after a scan or manual search)
  const [cameraActive, setCameraActive] = useState(true);
  const [showExamModal,    setShowExamModal]    = useState(false);
  const [showConsultModal, setShowConsultModal] = useState(false);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-dismiss toast after 3 s
  useEffect(() => {
    if (toastType) {
      toastTimer.current = setTimeout(() => setToastType(null), 3000);
    }
    return () => { if (toastTimer.current) clearTimeout(toastTimer.current); };
  }, [toastType]);

  // Called automatically when the camera decodes a QR code
  function handleQrScan(text: string) {
    const trimmed = text.trim();
    setCameraActive(false); // pause camera — one scan at a time
    setStudentId(trimmed);
    const student = MOCK_STUDENTS[trimmed];
    if (student) {
      setFoundStudent(student);
      setFoundId(trimmed);
      setStatus('found');
      setToastType('found');
    } else {
      setFoundStudent(null);
      setStatus('not-found');
      setToastType('not-found');
    }
  }

  // Called when the user types a student ID and presses Search / Enter
  function handleSearch() {
    const trimmed = studentId.trim();
    if (!trimmed) return;
    setCameraActive(false); // pause camera while showing result
    const student = MOCK_STUDENTS[trimmed];
    if (student) {
      setFoundStudent(student);
      setFoundId(trimmed);
      setStatus('found');
      setToastType('found');
    } else {
      setFoundStudent(null);
      setStatus('not-found');
      setToastType('not-found');
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSearch();
  }

  function handleReset() {
    setStudentId('');
    setStatus('idle');
    setFoundStudent(null);
    setFoundId('');
    setToastType(null);
    setCameraActive(true); // restart the camera for the next scan
  }

  // Initials from first + last name  e.g. "Juan Dela Cruz" â†’ "JD"
  const initials = foundStudent
    ? `${foundStudent.firstName[0]}${foundStudent.lastName[0]}`.toUpperCase()
    : '';

  return (
    <div className="relative p-4 sm:p-6 max-w-2xl mx-auto">

      {/* Consultation Modal */}
      {showConsultModal && foundStudent && (
        <ConsultationModal
          patient={{
            name:       `${foundStudent.firstName} ${foundStudent.lastName}`,
            age:        '',
            department: foundStudent.college,
            course:     foundStudent.course,
            sex:        '',
          }}
          onClose={() => setShowConsultModal(false)}
          onSave={(data, medicines) => {
            // TODO: POST /api/consultations
            console.log('Saving consultation:', data, medicines);
            setShowConsultModal(false);
          }}
        />
      )}

      {/* Physical Exam Modal */}
      {showExamModal && foundStudent && (
        <PhysicalExamModal
          studentName={`${foundStudent.firstName} ${foundStudent.lastName}`}
          onClose={() => setShowExamModal(false)}
          onSave={(data) => {
            // TODO: POST /api/students/:id/physical-exams
            console.log('Saving physical exam:', data);
            setShowExamModal(false);
          }}
        />
      )}

      {/* â”€â”€ Toast â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {/* Green for found, red for not-found â€” auto-dismisses */}
      <div
        aria-live="polite"
        className={`
          fixed top-4 right-4 z-50 flex items-center gap-2.5
          text-sm font-bold px-4 py-3 rounded-xl shadow-lg
          transition-all duration-300
          ${toastType === 'found'
            ? 'bg-white border border-green-200 text-green-600 shadow-green-100'
            : 'bg-red-500 text-white shadow-red-200'
          }
          ${toastType
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-2 pointer-events-none'
          }
        `}
      >
        {toastType === 'found' ? (
          /* Checkmark circle */
          <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 12l3 3 5-5" />
          </svg>
        ) : (
          /* Exclamation circle */
          <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="10" strokeWidth="2" />
            <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2.5" strokeLinecap="round" />
            <circle cx="12" cy="16" r="0.5" fill="currentColor" strokeWidth="2" />
          </svg>
        )}
        {toastType === 'found' ? 'Student Found!' : 'Student Not Found!'}
      </div>

      {/* â”€â”€ Page header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">QR Code Scanner</h1>
        <p className="text-sm text-gray-500 mt-1">
          Scan a student&apos;s QR code to quickly access their health record
        </p>
      </div>

      {/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          FOUND STATE â€” student result card
          â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */}
      {status === 'found' && foundStudent ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">

          {/* Student info row */}
          <div className="flex items-center gap-4">
            {/* Avatar circle */}
            <div className="w-14 h-14 rounded-full bg-teal-500 flex items-center justify-center shrink-0 shadow-md shadow-teal-100">
              <span className="text-white text-lg font-bold tracking-wide">{initials}</span>
            </div>

            <div>
              {/* Last name, First name */}
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                {foundStudent.lastName}
                <span className="font-normal text-gray-400">,</span>{' '}
                {foundStudent.firstName}
              </h2>
              {/* Student ID in teal */}
              <p className="text-sm font-semibold text-teal-500 mt-0.5">{foundId}</p>
              {/* Course + College */}
              <p className="text-xs text-gray-500 mt-0.5">
                {foundStudent.course}
                <span className="mx-1.5 text-gray-300">â€¢</span>
                {foundStudent.college}
              </p>
            </div>
          </div>

          {/* Blood type + allergy pills */}
          <div className="flex flex-wrap gap-1.5 mt-4">
            <BloodTypePill type={foundStudent.bloodType} />
            {foundStudent.allergies.map((a) => (
              <AllergyPill key={a} name={a} />
            ))}
            {foundStudent.allergies.length === 0 && (
              <span className="text-xs text-gray-400 italic">No known allergies</span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              onClick={() => setShowConsultModal(true)}
              className="flex-1 flex items-center justify-center gap-2
              bg-teal-500 hover:bg-teal-600 text-white font-semibold text-sm
              px-5 py-3 rounded-xl transition-colors">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-3 3-3-3z" />
              </svg>
              Consult
            </button>
            <button
              onClick={() => setShowExamModal(true)}
              className="flex-1 flex items-center justify-center gap-2
              border-2 border-teal-500 text-teal-600 hover:bg-teal-50
              font-semibold text-sm px-5 py-3 rounded-xl transition-colors bg-white">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              Physical Exam
            </button>
            <button
              onClick={() => router.push(`/dashboard/staff/record/${foundId}`)}
              className="flex-1 flex items-center justify-center gap-2
              border border-gray-200 text-gray-500 hover:border-teal-300 hover:text-teal-600
              font-semibold text-sm px-5 py-3 rounded-xl transition-colors bg-white">
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              View Record
            </button>
          </div>

          {/* Scan another */}
          <div className="text-center mt-5">
            <button
              onClick={handleReset}
              className="text-xs text-gray-400 hover:text-teal-500 transition-colors"
            >
              Scan another student
            </button>
          </div>
        </div>

      ) : (
        /* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
           IDLE / NOT-FOUND STATE â€” scanner frame + search
           â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">

          {/* Live camera feed — or tap-to-restart placeholder when paused */}
          <div className="mb-5">
            {cameraActive ? (
              <QrCameraScanner active={true} onScan={handleQrScan} />
            ) : (
              <div className="max-w-xs mx-auto">
                <button
                  type="button"
                  onClick={() => { setCameraActive(true); setStatus('idle'); setToastType(null); }}
                  className="w-full flex flex-col items-center justify-center
                    h-52 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200
                    text-gray-400 hover:text-teal-500 hover:border-teal-300 transition-colors"
                >
                  {/* Camera icon */}
                  <svg className="w-10 h-10 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-sm font-medium">Tap to scan again</span>
                </button>
              </div>
            )}
          </div>

          <p className="text-center text-sm text-gray-500 mb-6">
            {cameraActive
              ? 'Hold the QR code steady within the camera frame'
              : 'Camera paused - tap above to restart, or search below'}
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 border-t border-gray-100" />
            <span className="text-xs text-gray-400 font-medium">Or search manually</span>
            <div className="flex-1 border-t border-gray-100" />
          </div>

          {/* Manual search input */}
          <div className="flex gap-2">
            <input
              type="text"
              value={studentId}
              onChange={(e) => {
                setStudentId(e.target.value);
                if (status !== 'idle') setStatus('idle');
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter Student ID (e.g. 2023-0001)"
              className={`
                flex-1 border rounded-xl px-4 py-2.5 text-sm
                focus:outline-none focus:ring-2 focus:ring-teal-400 transition
                ${status === 'not-found'
                  ? 'border-red-300 bg-red-50 text-red-800 placeholder:text-red-300'
                  : 'border-gray-200 bg-white text-gray-800 placeholder:text-gray-400'
                }
              `}
            />
            <button
              onClick={handleSearch}
              className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold
                px-5 py-2.5 rounded-xl transition-colors shrink-0"
            >
              Search
            </button>
          </div>

          {/* Inline error */}
          {status === 'not-found' && (
            <div className="mt-3 flex items-center gap-2 bg-red-50 border border-red-100 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" strokeWidth="2" />
                <line x1="12" y1="8" x2="12" y2="12" strokeWidth="2.5" strokeLinecap="round" />
                <circle cx="12" cy="16" r="0.5" fill="currentColor" strokeWidth="2" />
              </svg>
              <p className="text-sm text-red-600">
                Student not found. Please check the ID and try again.
              </p>
            </div>
          )}
        </div>
      )}

      {/* â”€â”€ Hint â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
      {status !== 'found' && (
        <p className="text-center text-[11px] text-gray-400 mt-4">
          Try demo IDs: <span className="font-mono">2023-0001</span> Â· <span className="font-mono">2023-0002</span> Â· <span className="font-mono">2024-0010</span>
        </p>
      )}

    </div>
  );
}
