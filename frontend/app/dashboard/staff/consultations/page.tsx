/**
 * CONSULTATIONS PAGE
 * ──────────────────────────────────────────────────────────────
 * Route: /dashboard/staff/consultations
 *
 * Analytics + searchable / sortable consultation table.
 * "Scan QR Code" → scanner page   |   "Download Records" → CSV
 * "View" action → opens ConsultationDetailModal
 *
 * TODO: Replace MOCK_CONSULTATIONS with GET /api/consultations
 */

'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';

// ── Types ─────────────────────────────────────────────────────
interface ConsultRow {
  id:          string;
  dateIso:     string;          // ISO full datetime e.g. "2023-10-15T09:30:00"
  studentId:   string;
  student:     string;
  complaint:   string;
  diagnosis:   string;
  treatment:   string;
  staff:       string;
  medicines:   string[];        // e.g. ["Paracetamol 500mg x2", "ORS"]
}

type SortKey = 'date' | 'student';

// ── Mock data ─────────────────────────────────────────────────
const MOCK_CONSULTATIONS: ConsultRow[] = [
  { id: 'c01', dateIso: '2023-10-15T09:30:00', studentId: '2023-0001', student: 'Juan Dela Cruz',  complaint: 'Fever and body aches',            diagnosis: 'Viral Flu',                         treatment: 'Rest, hydration, antipyretics',        staff: 'Dr. Maria Santos',  medicines: ['Paracetamol 500mg x6', 'ORS sachet x2'] },
  { id: 'c02', dateIso: '2023-10-16T14:15:00', studentId: '2023-0045', student: 'Ana Santos',      complaint: 'Stomach pain after eating',        diagnosis: 'Hyperacidity',                      treatment: 'Antacid, bland diet',                 staff: 'Nurse John Reyes',  medicines: ['Antacid tablet x4'] },
  { id: 'c03', dateIso: '2023-09-01T10:00:00', studentId: '2023-0001', student: 'Juan Dela Cruz',  complaint: 'Cough, runny nose, sore throat',   diagnosis: 'Upper Respiratory Tract Infection', treatment: 'Symptomatic relief, steam inhalation', staff: 'Dr. Maria Santos',  medicines: ['Cetirizine 10mg x6', 'Zinc tablet x10'] },
  { id: 'c04', dateIso: '2023-11-05T11:00:00', studentId: '2023-0001', student: 'Juan Dela Cruz',  complaint: 'Fatigue, pale skin, shortness of breath', diagnosis: 'Anemia',                  treatment: 'Iron supplementation, dietary advice', staff: 'Dr. Maria Santos',  medicines: ['Ferrous sulfate x30'] },
  { id: 'c05', dateIso: '2023-12-01T15:30:00', studentId: '2023-0001', student: 'Juan Dela Cruz',  complaint: 'Pain and swelling in left ankle',  diagnosis: 'Ankle Sprain (Grade 1)',             treatment: 'RICE method, pain management',         staff: 'Nurse John Reyes',  medicines: ['Ibuprofen 400mg x6'] },
  { id: 'c06', dateIso: '2024-01-15T08:45:00', studentId: '2023-0001', student: 'Juan Dela Cruz',  complaint: 'Runny nose and mild cough',        diagnosis: 'Common Cold',                       treatment: 'Rest, increase fluid intake',          staff: 'Dr. Maria Santos',  medicines: ['Vitamin C 500mg x10'] },
  { id: 'c07', dateIso: '2024-02-20T13:20:00', studentId: '2023-0001', student: 'Juan Dela Cruz',  complaint: 'Stomach pain and nausea',          diagnosis: 'Gastritis',                         treatment: 'Omeprazole, small frequent meals',     staff: 'Nurse John Reyes',  medicines: ['Omeprazole 20mg x14', 'Antacid x6'] },
  { id: 'c08', dateIso: '2024-03-10T10:15:00', studentId: '2023-0001', student: 'Juan Dela Cruz',  complaint: 'Persistent headache and tight neck', diagnosis: 'Tension Headache',               treatment: 'Paracetamol, stress management',       staff: 'Dr. Maria Santos',  medicines: ['Paracetamol 500mg x4'] },
  { id: 'c09', dateIso: '2024-06-10T11:00:00', studentId: '2023-0045', student: 'Ana Santos',      complaint: 'Skin rash and itching',            diagnosis: 'Allergic Reaction',                 treatment: 'Antihistamine, avoid triggers',        staff: 'Dr. Maria Santos',  medicines: ['Cetirizine 10mg x10'] },
  { id: 'c10', dateIso: '2024-08-22T09:00:00', studentId: '2024-0010', student: 'Carlos Reyes',    complaint: 'Dizziness and blurred vision',     diagnosis: 'Hypertensive Episode',              treatment: 'Blood pressure monitoring, rest',      staff: 'Dr. Maria Santos',  medicines: ['Amlodipine 5mg x7'] },
];

// ── Helpers ───────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'numeric', day: 'numeric', year: 'numeric',
  });
}
function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}
function thisMonth(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
}

function downloadCSV(rows: ConsultRow[]) {
  const headers = ['Date', 'Time', 'Student ID', 'Student', 'Chief Complaint', 'Diagnosis', 'Treatment', 'Attending Staff', 'Medicines'];
  const lines = rows.map((r) => [
    fmtDate(r.dateIso), fmtTime(r.dateIso), r.studentId, r.student,
    r.complaint, r.diagnosis, r.treatment, r.staff, r.medicines.join(' | '),
  ].map((v) => `"${v}"`).join(','));
  const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'consultation_records.csv';
  a.click();
}

// ── Stat card ─────────────────────────────────────────────────
function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1">
      <p className="text-xs text-gray-400 font-medium">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-gray-400">{sub}</p>}
    </div>
  );
}

// ── Sort icon ─────────────────────────────────────────────────
function SortIcon({ active, dir }: { active: boolean; dir: 'asc' | 'desc' }) {
  return (
    <svg className={`w-3 h-3 inline ml-1 ${active ? 'text-teal-500' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
        d={active && dir === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
    </svg>
  );
}

// ── Detail modal ──────────────────────────────────────────────
function DetailModal({ row, onClose }: { row: ConsultRow; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <div>
            <h2 className="text-base font-bold text-gray-900">Consultation Details</h2>
            <p className="text-xs text-teal-500 font-semibold mt-0.5">
              {fmtDate(row.dateIso)} — {fmtTime(row.dateIso)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-5">

          {/* Patient */}
          <div className="bg-teal-50 rounded-xl p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold text-sm shrink-0">
              {row.student.split(' ').map((n) => n[0]).slice(0, 2).join('')}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{row.student}</p>
              <p className="text-xs text-teal-600 font-medium">{row.studentId}</p>
            </div>
          </div>

          {/* Details grid */}
          <div className="grid grid-cols-1 gap-3">
            {[
              ['Chief Complaint', row.complaint],
              ['Diagnosis',       row.diagnosis],
              ['Treatment / Management', row.treatment],
              ['Attending Staff', row.staff],
            ].map(([label, val]) => (
              <div key={label} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <p className="text-[10px] font-semibold text-teal-500 uppercase tracking-wider mb-1">{label}</p>
                <p className="text-sm text-gray-800">{val}</p>
              </div>
            ))}
          </div>

          {/* Medicines */}
          {row.medicines.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-teal-500 uppercase tracking-wider mb-2">Medicine Dispensed</p>
              <div className="flex flex-wrap gap-2">
                {row.medicines.map((m, i) => (
                  <span key={i} className="text-xs bg-teal-50 text-teal-700 font-medium border border-teal-100 px-3 py-1 rounded-full">
                    {m}
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

// ── Page ──────────────────────────────────────────────────────
export default function ConsultationsPage() {
  const [search,    setSearch]    = useState('');
  const [sortKey,   setSortKey]   = useState<SortKey>('date');
  const [sortDir,   setSortDir]   = useState<'asc' | 'desc'>('desc');
  const [selected,  setSelected]  = useState<ConsultRow | null>(null);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(key); setSortDir('desc'); }
  }

  const q = search.toLowerCase();
  const filtered = useMemo(() => {
    const rows = q
      ? MOCK_CONSULTATIONS.filter(
          (r) =>
            r.student.toLowerCase().includes(q) ||
            r.diagnosis.toLowerCase().includes(q) ||
            r.studentId.toLowerCase().includes(q) ||
            r.staff.toLowerCase().includes(q)
        )
      : [...MOCK_CONSULTATIONS];

    rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'date')    cmp = a.dateIso.localeCompare(b.dateIso);
      if (sortKey === 'student') cmp = a.student.localeCompare(b.student);
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return rows;
  }, [q, sortKey, sortDir]);

  // ── Analytics ────────────────────────────────────────────────
  const total    = MOCK_CONSULTATIONS.length;
  const monthly  = MOCK_CONSULTATIONS.filter((r) => thisMonth(r.dateIso)).length;
  const unique   = new Set(MOCK_CONSULTATIONS.map((r) => r.studentId)).size;
  const topDx    = (() => {
    const freq: Record<string, number> = {};
    MOCK_CONSULTATIONS.forEach((r) => { freq[r.diagnosis] = (freq[r.diagnosis] ?? 0) + 1; });
    return Object.entries(freq).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '—';
  })();

  return (
    <div className="p-4 sm:p-6 space-y-5">

      {/* Detail modal */}
      {selected && <DetailModal row={selected} onClose={() => setSelected(null)} />}

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Consultations</h1>
          <p className="text-xs text-gray-400 mt-0.5">Manage clinic visits and patient records</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link
            href="/dashboard/staff/scanner"
            className="flex items-center gap-1.5 text-xs font-semibold border border-gray-200
              text-gray-600 hover:border-teal-300 hover:text-teal-600 px-3 py-2 rounded-xl
              transition-colors bg-white"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 4c-1.5 0-3 .6-4.1 1.6M4 8H3m1 8H3m18-8h-1m1 8h-1M8 3v1m8-1v1
                   M4.2 4.2l.7.7M19.1 4.9l-.7.7M12 20v1
                   M5 9H3M5 15H3M21 9h-2M21 15h-2" />
            </svg>
            Scan QR Code
          </Link>
          <button
            onClick={() => downloadCSV(filtered)}
            className="flex items-center gap-1.5 text-xs font-semibold
              bg-teal-500 hover:bg-teal-600 text-white px-3 py-2 rounded-xl transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download Records
          </button>
        </div>
      </div>

      {/* Analytics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Records"   value={total}    color="text-teal-500"  sub="All time" />
        <StatCard label="This Month"      value={monthly}  color="text-blue-500"  sub="Current month" />
        <StatCard label="Unique Students" value={unique}   color="text-purple-500" sub="Distinct patients" />
        <StatCard label="Top Diagnosis"   value={topDx}    color="text-orange-500" sub="Most frequent" />
      </div>

      {/* Table card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">

        {/* Search bar */}
        <div className="p-4 border-b border-gray-50">
          <div className="relative max-w-xs">
            <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by student, diagnosis..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl
                focus:outline-none focus:ring-2 focus:ring-teal-300 placeholder-gray-300"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400">
                <th
                  className="text-left px-4 py-3 font-semibold cursor-pointer select-none whitespace-nowrap hover:text-teal-500 transition-colors"
                  onClick={() => toggleSort('date')}
                >
                  Date <SortIcon active={sortKey === 'date'} dir={sortDir} />
                </th>
                <th
                  className="text-left px-4 py-3 font-semibold cursor-pointer select-none whitespace-nowrap hover:text-teal-500 transition-colors"
                  onClick={() => toggleSort('student')}
                >
                  Student <SortIcon active={sortKey === 'student'} dir={sortDir} />
                </th>
                <th className="text-left px-4 py-3 font-semibold">Diagnosis</th>
                <th className="text-left px-4 py-3 font-semibold">Attending Staff</th>
                <th className="text-left px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-gray-300">
                    No records match your search.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-gray-700">{fmtDate(row.dateIso)}</span>
                      <span className="text-gray-400 ml-1.5">{fmtTime(row.dateIso)}</span>
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

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-50 text-[11px] text-gray-400">
          Showing {filtered.length} of {total} records
        </div>
      </div>
    </div>
  );
}
