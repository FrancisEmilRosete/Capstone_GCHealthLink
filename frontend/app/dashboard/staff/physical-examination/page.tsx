/**
 * PHYSICAL EXAMINATION PAGE
 * ─────────────────────────────────────────────────────────────
 * Route: /dashboard/staff/physical-examination
 *
 * Shows analytics summary cards + a searchable/sortable table
 * of all students who have physical exam records.
 *
 * Actions:
 *   • Scan QR Code      → navigates to the QR scanner
 *   • Download Records  → exports the filtered table as CSV
 *   • Eye icon          → navigates to the student's full record
 *
 * TODO: Replace MOCK_EXAMS with GET /api/physical-exams
 */

'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

// ── Mock data ─────────────────────────────────────────────────
interface ExamRow {
  studentId:  string;
  name:       string;
  course:     string;
  department: string;
  status:     'Regular' | 'Freshman' | 'Transferee' | 'Irregular';
  lastExam:   string;
  bmi:        string;
  bp:         string;
}

const MOCK_EXAMS: ExamRow[] = [
  { studentId: '2023-0001', name: 'Dela Cruz , Juan',   course: 'BS Civil Engineering', department: 'College of Engineering',     status: 'Regular',    lastExam: '2023-08-10', bmi: '22.5', bp: '110/70' },
  { studentId: '2023-0045', name: 'Santos , Ana',       course: 'BS Nursing',           department: 'College of Nursing',         status: 'Freshman',   lastExam: '2024-01-15', bmi: '21.0', bp: '120/80' },
  { studentId: '2024-0010', name: 'Reyes , Carlos',     course: 'BS Education',         department: 'College of Education',       status: 'Regular',    lastExam: '2024-06-20', bmi: '23.1', bp: '118/76' },
  { studentId: '2022-0088', name: 'Villanueva , Liza',  course: 'BS Accountancy',       department: 'College of Business',        status: 'Irregular',  lastExam: '2022-09-05', bmi: '19.8', bp: '105/65' },
  { studentId: '2024-0203', name: 'Cruz , Mark',        course: 'BS Computer Science',  department: 'College of IT',              status: 'Freshman',   lastExam: '2024-08-01', bmi: '24.3', bp: '122/82' },
  { studentId: '2023-0130', name: 'Garcia , Sofia',     course: 'BS Psychology',        department: 'College of Social Sciences', status: 'Regular',    lastExam: '2023-10-11', bmi: '20.5', bp: '112/72' },
  { studentId: '2021-0055', name: 'Torres , Ramon',     course: 'BS Architecture',      department: 'College of Engineering',     status: 'Transferee', lastExam: '2021-07-30', bmi: '25.1', bp: '130/85' },
];

const STATUS_COLORS: Record<ExamRow['status'], string> = {
  Regular:    'bg-gray-100  text-gray-600',
  Freshman:   'bg-blue-50   text-blue-600',
  Transferee: 'bg-purple-50 text-purple-600',
  Irregular:  'bg-amber-50  text-amber-600',
};

type SortKey = 'studentId' | 'name' | 'course' | 'department';
type SortDir = 'asc' | 'desc';

// ── CSV download ──────────────────────────────────────────────
function downloadCSV(rows: ExamRow[]) {
  const header = ['Student ID', 'Name', 'Course', 'Department', 'Status', 'Last Exam', 'BMI', 'BP'];
  const lines  = rows.map((r) =>
    [r.studentId, r.name, r.course, r.department, r.status, r.lastExam, r.bmi, r.bp].join(',')
  );
  const csv  = [header.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'physical_exam_records.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-medium text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ── Sort chevron icon ─────────────────────────────────────────
function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg
      className={`w-3 h-3 ml-1 inline-block transition-colors ${active ? 'text-teal-500' : 'text-gray-300'}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
        d={active && dir === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function PhysicalExaminationPage() {
  const router = useRouter();
  const [search,  setSearch]  = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('studentId');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('asc'); }
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return MOCK_EXAMS
      .filter((r) =>
        r.name.toLowerCase().includes(q) ||
        r.studentId.toLowerCase().includes(q) ||
        r.course.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        const av = a[sortKey], bv = b[sortKey];
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      });
  }, [search, sortKey, sortDir]);

  // Analytics
  const total      = MOCK_EXAMS.length;
  const freshmen   = MOCK_EXAMS.filter((r) => r.status === 'Freshman').length;
  const overweight = MOCK_EXAMS.filter((r) => parseFloat(r.bmi) >= 25).length;
  const thisYear   = MOCK_EXAMS.filter((r) => r.lastExam.startsWith('2024')).length;

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">

      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Physical Examination</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage and view student health information</p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          {/* Scan QR Code */}
          <Link
            href="/dashboard/staff/scanner"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold
              border border-gray-200 text-gray-600 bg-white rounded-xl
              hover:border-teal-300 hover:text-teal-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 7V5a2 2 0 012-2h2M17 3h2a2 2 0 012 2v2M21 17v2a2 2 0 01-2 2h-2M7 21H5a2 2 0 01-2-2v-2" />
              <rect x="7" y="7" width="4" height="4" rx="0.5" strokeWidth={2} />
              <rect x="13" y="7" width="4" height="4" rx="0.5" strokeWidth={2} />
              <rect x="7" y="13" width="4" height="4" rx="0.5" strokeWidth={2} />
              <rect x="14" y="14" width="1.5" height="1.5" rx="0.2" fill="currentColor" stroke="none" />
              <rect x="16.5" y="14" width="1.5" height="1.5" rx="0.2" fill="currentColor" stroke="none" />
              <rect x="14" y="16.5" width="1.5" height="1.5" rx="0.2" fill="currentColor" stroke="none" />
              <rect x="16.5" y="16.5" width="1.5" height="1.5" rx="0.2" fill="currentColor" stroke="none" />
            </svg>
            Scan QR Code
          </Link>

          {/* Download Records */}
          <button
            onClick={() => downloadCSV(filtered)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold
              bg-teal-500 hover:bg-teal-600 text-white rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
            </svg>
            Download Records
          </button>
        </div>
      </div>

      {/* ── Analytics cards ──────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Records"      value={total}      sub="all-time"          color="text-teal-600"   />
        <StatCard label="Examined This Year" value={thisYear}   sub="AY 2024"           color="text-blue-600"   />
        <StatCard label="Freshmen"           value={freshmen}   sub="incoming students" color="text-purple-600" />
        <StatCard label="BMI ≥ 25"           value={overweight} sub="overweight / obese" color="text-amber-600" />
      </div>

      {/* ── Table card ───────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Search */}
        <div className="px-5 pt-5 pb-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35M17 11A6 6 0 105 11a6 6 0 0012 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, ID, or course..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-100 rounded-xl
                focus:outline-none focus:ring-2 focus:ring-teal-400 transition placeholder:text-gray-300"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-gray-100 bg-gray-50/50">
                {([ ['studentId','Student ID'], ['name','Name'], ['course','Course'], ['department','Department'] ] as [SortKey, string][]).map(([key, label]) => (
                  <th
                    key={key}
                    onClick={() => toggleSort(key)}
                    className="px-5 py-3 text-left text-xs font-medium text-gray-400
                      cursor-pointer select-none hover:text-teal-500 transition-colors whitespace-nowrap"
                  >
                    {label}
                    <SortIcon active={sortKey === key} dir={sortDir} />
                  </th>
                ))}
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 whitespace-nowrap">Status</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-400 whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-gray-400 text-sm">
                    No records match your search.
                  </td>
                </tr>
              ) : filtered.map((row) => (
                <tr key={row.studentId} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-5 py-4 text-gray-500 font-mono text-xs whitespace-nowrap">{row.studentId}</td>
                  <td className="px-5 py-4 font-semibold text-gray-800 whitespace-nowrap">{row.name}</td>
                  <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{row.course}</td>
                  <td className="px-5 py-4 text-gray-500 whitespace-nowrap">{row.department}</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[row.status]}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => router.push(`/dashboard/staff/record/${row.studentId}`)}
                      aria-label="View record"
                      className="p-2 rounded-lg text-gray-400 hover:text-teal-500 hover:bg-teal-50 transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7
                             -1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer row count */}
        <div className="px-5 py-3 border-t border-gray-50 text-xs text-gray-400">
          Showing {filtered.length} of {total} records
        </div>
      </div>
    </div>
  );
}
