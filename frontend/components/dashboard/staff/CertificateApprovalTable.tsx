'use client';

import { useEffect, useMemo, useState } from 'react';

export type CertificateStatus = 'pending' | 'pending_doctor' | 'doctor_approved' | 'denied';

export interface PendingCertificateRequest {
  id: string;
  studentName: string;
  studentNumber: string;
  courseDept: string;
  department?: string;
  course?: string;
  yearLevel?: string;
  reason: string;
  requestedDateIso: string;
  proofFileName?: string;
  status: CertificateStatus;
  doctorName?: string;
}

interface CertificateApprovalTableProps {
  initialRequests: PendingCertificateRequest[];
  className?: string;
}

const STORAGE_KEY = 'gchl_cert_requests';

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/** Load persisted requests from localStorage, falling back to initial data. */
function loadFromStorage(initial: PendingCertificateRequest[]): PendingCertificateRequest[] {
  if (typeof window === 'undefined') return initial;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initial;
    const parsed: PendingCertificateRequest[] = JSON.parse(raw);
    // Merge: use stored status for existing ids, keep initial for new ones
    const storedMap = new Map(parsed.map((r) => [r.id, r]));
    return initial.map((r) => storedMap.get(r.id) ?? r);
  } catch {
    return initial;
  }
}

function saveToStorage(rows: PendingCertificateRequest[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
  } catch { /* ignore */ }
}

const KNOWN_DEPARTMENT_CODES = new Set([
  'CAHS',
  'CBA',
  'CCS',
  'CEAS',
  'CHTM',
]);

function getAcademicMeta(row: PendingCertificateRequest) {
  const source = (row.courseDept || '').trim();
  const extractedYear = source.match(/\b([1-6])(?:st|nd|rd|th)?(?:\s*-\s*[A-Za-z])?\b/i)?.[1] || '';

  const isDepartmentCode = KNOWN_DEPARTMENT_CODES.has(source.toUpperCase());
  const department = (row.department || (isDepartmentCode ? source : '')).trim();
  const yearLevel = (row.yearLevel || extractedYear).trim();

  let course = (row.course || '').trim();
  if (!course && !isDepartmentCode) {
    const withoutYear = source.replace(/\b([1-6])(?:st|nd|rd|th)?(?:\s*-\s*[A-Za-z])?\b.*$/i, '').trim();
    course = withoutYear || source;
  }

  return {
    department: department || 'Unspecified',
    course: course || 'Unspecified',
    yearLevel: yearLevel || 'Unspecified',
  };
}

const STATUS_FILTER_OPTIONS = ['pending', 'pending_doctor', 'doctor_approved', 'denied', 'all'] as const;
type StatusFilter = (typeof STATUS_FILTER_OPTIONS)[number];

const STATUS_LABELS: Record<CertificateStatus, string> = {
  pending: 'Pending',
  pending_doctor: 'Awaiting Doctor',
  doctor_approved: 'Doctor Approved',
  denied: 'Denied',
};

const STATUS_COLORS: Record<CertificateStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  pending_doctor: 'bg-blue-100 text-blue-700',
  doctor_approved: 'bg-emerald-100 text-emerald-700',
  denied: 'bg-red-100 text-red-700',
};

export default function CertificateApprovalTable({
  initialRequests,
  className,
}: CertificateApprovalTableProps) {
  const [rows, setRows] = useState<PendingCertificateRequest[]>(() =>
    loadFromStorage(initialRequests)
  );
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>('pending');
  const [query, setQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState('all');
  const [selectedYearLevel, setSelectedYearLevel] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Sync from localStorage whenever we come back (doctor may have approved)
  useEffect(() => {
    const synced = loadFromStorage(initialRequests);
    setRows(synced);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleBulkRequestDoctorApproval() {
    if (selectedIds.length === 0) return;
    setRows((current) => {
      const updated = current.map((row) => (
        selectedIds.includes(row.id) && row.status === 'pending'
          ? { ...row, status: 'pending_doctor' as const }
          : row
      ));
      saveToStorage(updated);
      return updated;
    });
    setSelectedIds([]);
  }

  const departmentOptions = useMemo(() => (
    Array.from(new Set(rows.map((row) => getAcademicMeta(row).department))).sort((a, b) => a.localeCompare(b))
  ), [rows]);

  const courseOptions = useMemo(() => (
    Array.from(new Set(rows.map((row) => getAcademicMeta(row).course))).sort((a, b) => a.localeCompare(b))
  ), [rows]);

  const yearLevelOptions = useMemo(() => (
    Array.from(new Set(rows.map((row) => getAcademicMeta(row).yearLevel))).sort((a, b) => a.localeCompare(b))
  ), [rows]);

  const visibleRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((row) => (selectedStatus === 'all' ? true : row.status === selectedStatus))
      .filter((row) => {
        const rowDate = new Date(row.requestedDateIso);
        if (Number.isNaN(rowDate.getTime())) return false;

        if (dateFrom) {
          const fromDate = new Date(`${dateFrom}T00:00:00`);
          if (rowDate < fromDate) return false;
        }

        if (dateTo) {
          const toDate = new Date(`${dateTo}T23:59:59`);
          if (rowDate > toDate) return false;
        }

        return true;
      })
      .filter((row) => {
        const meta = getAcademicMeta(row);
        const departmentMatch = selectedDepartment === 'all' || meta.department === selectedDepartment;
        const courseMatch = selectedCourse === 'all' || meta.course === selectedCourse;
        const yearLevelMatch = selectedYearLevel === 'all' || meta.yearLevel === selectedYearLevel;
        return departmentMatch && courseMatch && yearLevelMatch;
      })
      .filter((row) => {
        if (!q) return true;
        return (
          row.studentName.toLowerCase().includes(q) ||
          row.studentNumber.toLowerCase().includes(q) ||
          row.reason.toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.requestedDateIso).getTime() - new Date(a.requestedDateIso).getTime());
  }, [rows, query, selectedStatus, dateFrom, dateTo, selectedDepartment, selectedCourse, selectedYearLevel]);

  const pendingCount = rows.filter((r) => r.status === 'pending').length;
  const awaitingCount = rows.filter((r) => r.status === 'pending_doctor').length;
  const readyCount = rows.filter((r) => r.status === 'doctor_approved').length;
  const visiblePendingIds = visibleRows.filter((row) => row.status === 'pending').map((row) => row.id);
  const selectedVisibleCount = visiblePendingIds.filter((id) => selectedIds.includes(id)).length;
  const allVisiblePendingSelected = visiblePendingIds.length > 0 && selectedVisibleCount === visiblePendingIds.length;

  useEffect(() => {
    setSelectedIds((current) => current.filter((id) => rows.some((row) => row.id === id && row.status === 'pending')));
  }, [rows]);

  return (
    <section className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ${className ?? ''}`.trim()}>

      {/* Info Banner */}
      <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs text-blue-700 flex items-start gap-2">
        <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>
          <strong>Workflow:</strong> Staff submits requests for doctor approval in bulk, then tracks request status updates.
        </span>
      </div>

      {/* Stats Row */}
      <div className="mb-4 grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-center">
          <p className="text-lg font-bold text-amber-600">{pendingCount}</p>
          <p className="text-xs text-amber-500 mt-0.5">Pending Requests</p>
        </div>
        <div className="rounded-xl border border-blue-100 bg-blue-50 p-3 text-center">
          <p className="text-lg font-bold text-blue-600">{awaitingCount}</p>
          <p className="text-xs text-blue-500 mt-0.5">Awaiting Doctor</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-center">
          <p className="text-lg font-bold text-emerald-600">{readyCount}</p>
          <p className="text-xs text-emerald-500 mt-0.5">Doctor Approved</p>
        </div>
      </div>

      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Medical Certificate Requests</h2>
          <p className="mt-1 text-xs text-gray-500">Review student requests, verify reason/proof, and route pending requests for doctor approval.</p>
        </div>

        <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1 flex-wrap gap-0.5">
          {STATUS_FILTER_OPTIONS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setSelectedStatus(status)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition ${
                selectedStatus === status
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-600 hover:bg-white hover:text-teal-700'
              }`}
            >
              {status === 'pending_doctor' ? 'Awaiting' : status === 'doctor_approved' ? 'Approved' : status}
            </button>
          ))}
        </div>
      </header>

      <div className="mb-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-gray-500">{selectedIds.length} request(s) selected</p>
          <button
            type="button"
            onClick={handleBulkRequestDoctorApproval}
            disabled={selectedIds.length === 0}
            className="rounded-lg bg-blue-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-600 disabled:opacity-60"
          >
            Send Selected to Doctor Approval
          </button>
        </div>

        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by student name, student number, or request reason..."
          className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
        />

        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
          />
        </div>

        <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select
            value={selectedDepartment}
            onChange={(event) => setSelectedDepartment(event.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
          >
            <option value="all">All Departments</option>
            {departmentOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>

          <select
            value={selectedCourse}
            onChange={(event) => setSelectedCourse(event.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
          >
            <option value="all">All Courses</option>
            {courseOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>

          <select
            value={selectedYearLevel}
            onChange={(event) => setSelectedYearLevel(event.target.value)}
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-300"
          >
            <option value="all">All Year Levels</option>
            {yearLevelOptions.map((option) => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-gray-500">
              <th className="px-3 py-2 font-semibold">
                <input
                  type="checkbox"
                  checked={allVisiblePendingSelected}
                  onChange={(event) => {
                    if (event.target.checked) {
                      setSelectedIds((current) => Array.from(new Set([...current, ...visiblePendingIds])));
                    } else {
                      setSelectedIds((current) => current.filter((id) => !visiblePendingIds.includes(id)));
                    }
                  }}
                  disabled={visiblePendingIds.length === 0}
                />
              </th>
              <th className="px-3 py-2 font-semibold">Student Details</th>
              <th className="px-3 py-2 font-semibold">Request Reason</th>
              <th className="px-3 py-2 font-semibold">Date Requested</th>
              <th className="px-3 py-2 font-semibold">Supporting Proof</th>
              <th className="px-3 py-2 font-semibold">Approval Status</th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-10 text-center text-sm text-gray-400">
                  No certificate requests match the current filters.
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => (
                <tr key={row.id} className="border-b border-gray-50 hover:bg-gray-50/60 transition-colors">
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(row.id)}
                      onChange={(event) => {
                        if (event.target.checked) {
                          setSelectedIds((current) => Array.from(new Set([...current, row.id])));
                        } else {
                          setSelectedIds((current) => current.filter((id) => id !== row.id));
                        }
                      }}
                      disabled={row.status !== 'pending'}
                    />
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-semibold text-gray-800">{row.studentName}</p>
                    <p className="text-xs text-teal-600">{row.studentNumber} • {row.courseDept}</p>
                  </td>
                  <td className="px-3 py-3 text-gray-700">{row.reason}</td>
                  <td className="px-3 py-3 text-gray-600 whitespace-nowrap">{formatDate(row.requestedDateIso)}</td>
                  <td className="px-3 py-3 text-gray-600">{row.proofFileName || 'No attachment'}</td>
                  <td className="px-3 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[row.status]}`}>
                      {STATUS_LABELS[row.status]}
                    </span>
                    {row.status === 'doctor_approved' && row.doctorName && (
                      <p className="text-xs text-gray-400 mt-0.5">by {row.doctorName}</p>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
