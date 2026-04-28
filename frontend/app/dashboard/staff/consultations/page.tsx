'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { parseConsultationDisplay } from '@/lib/complaint';

interface VisitRecord {
  id: string;
  visitDate: string;
  visitTime: string | null;
  chiefComplaintEnc: string | null;
  studentProfile: {
    studentNumber: string;
    firstName: string;
    lastName: string;
    courseDept: string;
  };
  handledBy: {
    email: string;
  } | null;
  dispensedMedicines: Array<{
    quantity: number;
    inventory: {
      itemName: string;
      unit: string;
    };
  }>;
}

interface VisitResponse {
  success: boolean;
  data: VisitRecord[];
  message?: string;
}

interface ConsultRow {
  id: string;
  dateIso: string;
  visitTime: string;
  studentId: string;
  student: string;
  complaint: string;
  diagnosis: string;
  treatment: string;
  staff: string;
  medicines: string[];
  department: string;
  status: 'WITH_MEDS' | 'CONSULT_ONLY';
}

type SortKey = 'date' | 'student';

function parseConsultationPayload(raw?: string | null) {
  return parseConsultationDisplay(raw);
}

function mapVisitToRow(visit: VisitRecord): ConsultRow {
  const parsed = parseConsultationPayload(visit.chiefComplaintEnc);
  const medicines = visit.dispensedMedicines.map((med) => `${med.inventory.itemName} x${med.quantity}`);

  const treatment = parsed.treatment
    || (medicines.length > 0 ? 'Medicine dispensed during consultation.' : 'No medicine dispensed.');

  return {
    id: visit.id,
    dateIso: visit.visitDate,
    visitTime: visit.visitTime || '',
    studentId: visit.studentProfile.studentNumber,
    student: `${visit.studentProfile.firstName} ${visit.studentProfile.lastName}`,
    complaint: parsed.complaint,
    diagnosis: parsed.diagnosis,
    treatment,
    staff: visit.handledBy?.email || 'Clinic Staff',
    medicines,
    department: visit.studentProfile.courseDept || 'N/A',
    status: medicines.length > 0 ? 'WITH_MEDS' : 'CONSULT_ONLY',
  };
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'numeric', day: 'numeric', year: 'numeric',
  });
}

function fmtTime(row: ConsultRow) {
  if (row.visitTime) return row.visitTime;
  return new Date(row.dateIso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function thisMonth(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}

function downloadCSV(rows: ConsultRow[]) {
  const headers = ['Date', 'Time', 'Student ID', 'Student', 'Chief Complaint', 'Diagnosis', 'Treatment', 'Attending Staff', 'Medicines'];
  const lines = rows.map((row) => [
    fmtDate(row.dateIso),
    fmtTime(row),
    row.studentId,
    row.student,
    row.complaint,
    row.diagnosis,
    row.treatment,
    row.staff,
    row.medicines.join(' | '),
  ].map((value) => `"${value.replace(/"/g, '""')}"`).join(','));

  const csv = [headers.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = 'consultation_records.csv';
  link.click();

  URL.revokeObjectURL(url);
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
    </div>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  return (
    <svg className={`w-3 h-3 inline ml-1 ${active ? 'text-teal-500' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={active && dir === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
    </svg>
  );
}

function DetailModal({ row, onClose }: { row: ConsultRow; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="text-base font-bold text-gray-900">Consultation Details</h2>
            <p className="text-xs text-teal-500 font-semibold mt-0.5">
              {fmtDate(row.dateIso)} - {fmtTime(row)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div className="bg-teal-50 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {row.student.split(' ').map((part) => part[0]).slice(0, 2).join('')}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{row.student}</p>
              <p className="text-xs text-teal-600 font-medium">{row.studentId}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {[
              ['Chief Complaint', row.complaint],
              ['Diagnosis', row.diagnosis],
              ['Treatment / Management', row.treatment],
              ['Attending Staff', row.staff],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-[10px] font-semibold text-teal-500 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-sm text-gray-800">{value}</p>
              </div>
            ))}
          </div>

          {row.medicines.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-teal-500 uppercase tracking-wider mb-2">Medicine Dispensed</p>
              <div className="flex flex-wrap gap-2">
                {row.medicines.map((medicine, index) => (
                  <span key={`${medicine}-${index}`} className="text-xs bg-teal-50 text-teal-700 font-medium border border-teal-100 px-3 py-1 rounded-full">
                    {medicine}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ConsultationsPage() {
  const [records, setRecords] = useState<ConsultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<ConsultRow | null>(null);
  const [dateFilter, setDateFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'WITH_MEDS' | 'CONSULT_ONLY'>('ALL');

  async function loadConsultations() {
    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      setLoading(false);
      return;
    }

    try {
      setError('');
      const response = await api.get<VisitResponse>('/clinic/visits?limit=1000', token);
      setRecords((response.data || []).map(mapVisitToRow));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load consultation records.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadConsultations();
  }, []);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDir('desc');
  }

  const q = search.toLowerCase().trim();
  const filtered = useMemo(() => {
    const rows = q
      ? records.filter((record) =>
          record.student.toLowerCase().includes(q) ||
          record.diagnosis.toLowerCase().includes(q) ||
          record.studentId.toLowerCase().includes(q) ||
          record.staff.toLowerCase().includes(q),
        )
      : [...records];

    const narrowed = rows.filter((row) => {
      const matchesDate = !dateFilter || row.dateIso.slice(0, 10) === dateFilter;
      const matchesDepartment = departmentFilter === 'ALL' || row.department === departmentFilter;
      const matchesStatus = statusFilter === 'ALL' || row.status === statusFilter;
      return matchesDate && matchesDepartment && matchesStatus;
    });

    narrowed.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date') cmp = a.dateIso.localeCompare(b.dateIso);
      if (sortKey === 'student') cmp = a.student.localeCompare(b.student);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return narrowed;
  }, [records, q, sortKey, sortDir, dateFilter, departmentFilter, statusFilter]);

  const departmentOptions = useMemo(() => {
    return Array.from(new Set(records.map((item) => item.department).filter(Boolean))).sort();
  }, [records]);

  const total = records.length;
  const monthly = records.filter((record) => thisMonth(record.dateIso)).length;
  const uniqueStudents = new Set(records.map((record) => record.studentId)).size;
  const topDiagnosis = (() => {
    const freq: Record<string, number> = {};
    records.forEach((record) => {
      freq[record.diagnosis] = (freq[record.diagnosis] || 0) + 1;
    });
    return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] || '-';
  })();

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {selected && <DetailModal row={selected} onClose={() => setSelected(null)} />}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Consultations</h1>
          <p className="text-xs text-gray-400 mt-0.5">Live records from clinic visits</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard/staff/scanner"
            className="flex items-center gap-1.5 text-xs font-semibold border border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-600 px-3 py-2 rounded-xl transition-colors bg-white"
          >
            Scan QR Code
          </Link>
          <button
            onClick={() => downloadCSV(filtered)}
            className="flex items-center gap-1.5 text-xs font-semibold bg-teal-500 hover:bg-teal-600 text-white px-3 py-2 rounded-xl transition-colors"
          >
            Download Records
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Records" value={total} color="text-teal-500" sub="All time" />
        <StatCard label="This Month" value={monthly} color="text-blue-500" sub="Current month" />
        <StatCard label="Unique Students" value={uniqueStudents} color="text-purple-500" sub="Distinct patients" />
        <StatCard label="Top Diagnosis" value={topDiagnosis} color="text-orange-500" sub="Most frequent" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-50">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <div className="relative md:col-span-2">
            <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by student, diagnosis, or staff..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-300 placeholder-gray-300"
            />
            </div>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
            <div className="flex gap-2">
              <select
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-300"
              >
                <option value="ALL">All Departments</option>
                {departmentOptions.map((department) => (
                  <option key={department} value={department}>{department}</option>
                ))}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ALL' | 'WITH_MEDS' | 'CONSULT_ONLY')}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-300"
              >
                <option value="ALL">All Status</option>
                <option value="WITH_MEDS">With Medication</option>
                <option value="CONSULT_ONLY">Consult Only</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400">
                <th className="text-left px-4 py-3 font-semibold cursor-pointer select-none whitespace-nowrap hover:text-teal-500 transition-colors" onClick={() => toggleSort('date')}>
                  Date
                  <SortIcon active={sortKey === 'date'} dir={sortDir} />
                </th>
                <th className="text-left px-4 py-3 font-semibold cursor-pointer select-none whitespace-nowrap hover:text-teal-500 transition-colors" onClick={() => toggleSort('student')}>
                  Student
                  <SortIcon active={sortKey === 'student'} dir={sortDir} />
                </th>
                <th className="text-left px-4 py-3 font-semibold">Diagnosis</th>
                <th className="text-left px-4 py-3 font-semibold">Attending Staff</th>
                <th className="text-left px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-400">Loading consultation records...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-300">No records match your search.</td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-gray-700">{fmtDate(row.dateIso)}</span>
                      <span className="text-gray-400 ml-1.5">{fmtTime(row)}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-800">{row.student}</td>
                    <td className="px-4 py-3 text-gray-600">{row.diagnosis}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{row.staff}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelected(row)}
                        className="text-teal-500 font-semibold hover:text-teal-700 hover:underline transition-colors"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-4 py-3 border-t border-gray-50 text-[11px] text-gray-400">
          Showing {filtered.length} of {total} records
        </div>
      </div>
    </div>
  );
}
