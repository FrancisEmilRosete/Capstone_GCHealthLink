'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface PhysicalExamRow {
  id: string;
  studentProfileId: string;
  studentNumber: string;
  studentName: string;
  courseDept: string;
  yearLevel: string;
  examDate: string;
  bmi: string;
  bp: string;
  examinedBy: string;
}

interface PhysicalExamResponse {
  success: boolean;
  message?: string;
  data: PhysicalExamRow[];
}

type SortKey = 'studentNumber' | 'studentName' | 'courseDept' | 'yearLevel';
type SortDir = 'asc' | 'desc';

const YEAR_LEVEL_COLORS: Record<string, string> = {
  '1st Year': 'bg-blue-50 text-blue-600',
  '2nd Year': 'bg-emerald-50 text-emerald-600',
  '3rd Year': 'bg-violet-50 text-violet-600',
  '4th Year': 'bg-amber-50 text-amber-600',
};

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function downloadCSV(rows: PhysicalExamRow[]): void {
  const header = ['Student ID', 'Name', 'Course/Department', 'Year Level', 'Exam Date', 'BMI', 'BP', 'Examined By'];
  const lines = rows.map((row) =>
    [
      row.studentNumber,
      row.studentName,
      row.courseDept,
      row.yearLevel,
      formatDate(row.examDate),
      row.bmi || 'N/A',
      row.bp || 'N/A',
      row.examinedBy || 'N/A',
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(',')
  );

  const csv = [header.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'physical_exam_records.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-medium text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <svg
      className={`w-3 h-3 ml-1 inline-block transition-colors ${active ? 'text-teal-500' : 'text-gray-300'}`}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d={active && dir === 'asc' ? 'M5 15l7-7 7 7' : 'M19 9l-7 7-7-7'} />
    </svg>
  );
}

export default function PhysicalExaminationPage() {
  const router = useRouter();

  const [records, setRecords] = useState<PhysicalExamRow[]>([]);
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('studentNumber');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadRecords() {
      const token = getToken();
      if (!token) {
        setError('You are not logged in. Please sign in again.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        const response = await api.get<PhysicalExamResponse>('/physical-exams?limit=500', token);
        setRecords(response.data || []);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load physical examination records.');
        }
      } finally {
        setLoading(false);
      }
    }

    void loadRecords();
  }, []);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortKey(key);
    setSortDir('asc');
  }

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();

    return [...records]
      .filter((record) => {
        if (!query) return true;

        return (
          record.studentName.toLowerCase().includes(query) ||
          record.studentNumber.toLowerCase().includes(query) ||
          record.courseDept.toLowerCase().includes(query)
        );
      })
      .sort((a, b) => {
        const left = a[sortKey]?.toLowerCase() ?? '';
        const right = b[sortKey]?.toLowerCase() ?? '';

        if (sortDir === 'asc') {
          return left.localeCompare(right);
        }

        return right.localeCompare(left);
      });
  }, [records, search, sortKey, sortDir]);

  const currentYear = String(new Date().getFullYear());
  const total = records.length;
  const freshmen = records.filter((record) => record.yearLevel === '1st Year').length;
  const overweight = records.filter((record) => Number.parseFloat(record.bmi) >= 25).length;
  const thisYear = records.filter((record) => record.examDate.startsWith(currentYear)).length;

  return (
    <div className="p-4 sm:p-6 space-y-5 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Physical Examination</h1>
          <p className="text-sm text-gray-400 mt-0.5">Manage and view student health information</p>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap">
          <Link
            href="/dashboard/staff/scanner"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border border-gray-200 text-gray-600 bg-white rounded-xl hover:border-teal-300 hover:text-teal-600 transition-colors"
          >
            Scan QR Code
          </Link>
          <button
            onClick={() => downloadCSV(filtered)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold bg-teal-500 hover:bg-teal-600 text-white rounded-xl transition-colors"
          >
            Download Records
          </button>
        </div>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="Total Records" value={total} sub="all-time" color="text-teal-600" />
        <StatCard label="Examined This Year" value={thisYear} sub={currentYear} color="text-blue-600" />
        <StatCard label="1st Year" value={freshmen} sub="incoming students" color="text-violet-600" />
        <StatCard label="BMI >= 25" value={overweight} sub="overweight / obese" color="text-amber-600" />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 pt-5 pb-3">
          <input
            type="text"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by name, ID, or course..."
            className="w-full pl-3 pr-4 py-2.5 text-sm border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 transition placeholder:text-gray-300"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-y border-gray-100 bg-gray-50/50">
                {([
                  ['studentNumber', 'Student ID'],
                  ['studentName', 'Name'],
                  ['courseDept', 'Course / Department'],
                  ['yearLevel', 'Year Level'],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <th
                    key={key}
                    onClick={() => toggleSort(key)}
                    className="px-5 py-3 text-left text-xs font-medium text-gray-400 cursor-pointer select-none hover:text-teal-500 transition-colors whitespace-nowrap"
                  >
                    {label}
                    <SortIcon active={sortKey === key} dir={sortDir} />
                  </th>
                ))}
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 whitespace-nowrap">Exam Date</th>
                <th className="px-5 py-3 text-left text-xs font-medium text-gray-400 whitespace-nowrap">Vitals</th>
                <th className="px-5 py-3 text-right text-xs font-medium text-gray-400 whitespace-nowrap">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400 text-sm">
                    Loading physical examination records...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-gray-400 text-sm">
                    No records match your search.
                  </td>
                </tr>
              ) : (
                filtered.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-5 py-4 text-gray-500 font-mono text-xs whitespace-nowrap">{record.studentNumber}</td>
                    <td className="px-5 py-4 font-semibold text-gray-800 whitespace-nowrap">{record.studentName}</td>
                    <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{record.courseDept || 'N/A'}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${YEAR_LEVEL_COLORS[record.yearLevel] || 'bg-gray-100 text-gray-600'}`}>
                        {record.yearLevel}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-gray-600 whitespace-nowrap">{formatDate(record.examDate)}</td>
                    <td className="px-5 py-4 text-gray-500 whitespace-nowrap">
                      BP: {record.bp || 'N/A'} | BMI: {record.bmi || 'N/A'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => router.push(`/dashboard/staff/record/${record.studentNumber}`)}
                        className="p-2 rounded-lg text-gray-400 hover:text-teal-500 hover:bg-teal-50 transition-colors"
                        aria-label="View record"
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

        <div className="px-5 py-3 border-t border-gray-50 text-xs text-gray-400">Showing {filtered.length} of {total} records</div>
      </div>
    </div>
  );
}
