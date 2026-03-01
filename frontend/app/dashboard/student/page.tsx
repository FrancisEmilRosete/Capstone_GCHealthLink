'use client';

/**
 * STUDENT DASHBOARD
 * Route: /dashboard/student
 * Shows: welcome banner, quick stats, recent visits, QR code, reminders.
 */

import Link from 'next/link';

// â”€â”€ Mock data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const STUDENT = {
  firstName:  'Juan',
  lastName:   'Dela Cruz',
  id:         '2023-0001',
  course:     'BS Civil Engineering',
  department: 'College of Engineering',
  bloodType:  'O+',
  bmi:        '22.5',
};

const RECENT_VISITS = [
  {
    id:        1,
    date:      '3/10/2024',
    diagnosis: 'Tension Headache',
    treatment: 'Rest, stress management',
    type:      'Enquiry',
    typeColor: 'bg-yellow-100 text-yellow-700',
    dot:       'bg-yellow-400',
  },
  {
    id:        2,
    date:      '2/20/2024',
    diagnosis: 'Gastritis',
    treatment: 'Kremil-S, dietary modification',
    type:      'Treated',
    typeColor: 'bg-teal-100 text-teal-700',
    dot:       'bg-teal-400',
  },
  {
    id:        3,
    date:      '11/8/2023',
    diagnosis: 'Common Cold',
    treatment: 'Includes Flu meds, rest',
    type:      'Released',
    typeColor: 'bg-blue-100 text-blue-700',
    dot:       'bg-blue-400',
  },
];

// â”€â”€ QR Code placeholder â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function QRPlaceholder() {
  const cells = [
    [1,1,1,1,1,1,1,0,1,0,0,1,0,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,1,0,0,1,0,1,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,0,1,0,0,0,1,0,1,1,1,1],
    [1,0,1,1,1,0,1,0,0,1,1,0,1,0,1,0,1,1,1,1],
    [1,0,1,1,1,0,1,0,1,0,0,1,0,0,1,0,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,0,1,1,0,0,1,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,1,0,1,0,1,0,1,1,1,1,1,1],
    [0,0,0,0,0,0,0,0,1,1,0,1,1,0,0,0,0,0,0,0],
    [1,1,0,1,1,0,1,1,0,0,1,0,0,1,1,0,1,0,1,1],
    [0,1,0,0,1,0,0,1,1,0,0,1,0,0,0,1,0,0,1,0],
    [1,0,1,1,0,1,0,0,0,1,1,0,1,0,1,0,1,1,0,1],
    [0,0,0,1,0,0,0,1,0,1,0,0,1,0,0,1,0,0,0,0],
    [1,1,1,0,1,1,1,0,1,0,0,1,0,0,1,1,1,0,1,1],
    [0,0,0,0,0,0,0,0,1,1,1,0,1,0,0,0,0,0,0,0],
    [1,1,1,1,1,1,1,0,0,1,0,1,0,0,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,1,0,1,0,1,0,1,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,0,1,0,0,0,0,1,0,1,1,1,1],
    [1,0,1,1,1,0,1,0,1,0,1,0,1,0,1,0,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,1,0,1,0,0,1,0,0,0,0,1],
    [1,1,1,1,1,1,1,0,1,0,0,0,1,0,1,1,1,1,1,1],
  ];
  const size  = 5;
  const total = cells.length * size;
  return (
    <svg width={total} height={total} viewBox={`0 0 ${total} ${total}`}>
      {cells.map((row, r) =>
        row.map((cell, c) =>
          cell ? (
            <rect key={`${r}-${c}`} x={c * size} y={r * size} width={size} height={size} fill="#1a2e40" />
          ) : null
        )
      )}
    </svg>
  );
}



// â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export default function StudentDashboard() {
  return (
    <div className="p-5 space-y-5 max-w-3xl mx-auto">

      {/* â”€â”€ Welcome Banner â”€â”€ */}
      <div className="relative rounded-2xl overflow-hidden px-6 py-7"
        style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 60%, #134e4a 100%)' }}>
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 right-16 w-24 h-24 rounded-full bg-white/5" />
        <div className="relative z-10">
          <h1 className="text-xl font-bold text-white">
            Welcome back, <span className="text-teal-200">{STUDENT.firstName}</span>!
          </h1>
          <p className="text-teal-100 text-sm mt-1.5 max-w-sm">
            Stay on top of your health. Don&apos;t forget to submit your daily health declaration before entering the campus.
          </p>
          <div className="flex gap-3 mt-4">
            <Link href="/dashboard/student/registration"
              className="px-4 py-2 border border-white/50 text-white text-sm font-semibold rounded-xl hover:bg-white/10 transition-colors">
              Register
            </Link>
            <Link href="/dashboard/student/my-record"
              className="px-4 py-2 bg-white text-teal-700 text-sm font-semibold rounded-xl hover:bg-teal-50 transition-colors">
              View My Record
            </Link>
          </div>
        </div>
      </div>

      {/* â”€â”€ Quick Stats â”€â”€ */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2">
          <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">BMI</p>
          <p className="text-2xl font-bold text-gray-800 leading-none">{STUDENT.bmi}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2">
          <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-red-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C8 8 5 12.5 5 15a7 7 0 0014 0c0-2.5-3-7-7-13z" />
            </svg>
          </div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Blood Type</p>
          <p className="text-2xl font-bold text-gray-800 leading-none">{STUDENT.bloodType}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2">
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Certificates</p>
          <p className="text-2xl font-bold text-gray-800 leading-none">1</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2">
          <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Last Visit</p>
          <p className="text-2xl font-bold text-gray-800 leading-none">Mar&nbsp;10</p>
        </div>
      </div>

      {/* â”€â”€ Recent Clinic Visits â”€â”€ */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
        <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 mb-4">Recent Clinic Visits</h2>
        <div className="space-y-3">
          {RECENT_VISITS.map(visit => (
            <div key={visit.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
              <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${visit.dot}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{visit.diagnosis}</p>
                  <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{visit.date}</span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{visit.treatment}</p>
                <span className={`inline-block mt-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full ${visit.typeColor}`}>
                  {visit.type}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-700">
          <Link href="/dashboard/student/my-record"
            className="text-sm text-teal-600 font-semibold hover:text-teal-700 flex items-center gap-1">
            View Full History
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>
      </div>

      {/* â”€â”€ QR Code â”€â”€ */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 flex flex-col items-center gap-3">
        <div className="p-4 bg-white dark:bg-gray-700 border-2 border-gray-100 dark:border-gray-600 rounded-xl shadow-inner">
          <QRPlaceholder />
        </div>
        <div className="text-center">
          <p className="text-sm font-bold text-gray-800 dark:text-gray-100">{STUDENT.firstName} {STUDENT.lastName}</p>
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{STUDENT.id} &bull; {STUDENT.department}</p>
        </div>
      </div>

    </div>
  );
}

