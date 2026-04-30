'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import UseQrLookupModal, { type QrResolvedStudent } from '@/components/scanner/UseQrLookupModal';

interface SearchStudent {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  courseDept: string;
  course?: string | null;
  yearLevel?: string | null;
}

interface SearchResponse {
  success: boolean;
  data: SearchStudent[];
}

function formatYearLevel(value?: string | null) {
  if (!value) return 'N/A';
  switch (value) {
    case 'YR_1': return 'Yr. 1';
    case 'YR_2': return 'Yr. 2';
    case 'YR_3': return 'Yr. 3';
    case 'YR_4': return 'Yr. 4';
    default: return value;
  }
}

export default function StaffStudentsPage() {
  const [query, setQuery] = useState('');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrMessage, setQrMessage] = useState('');
  const [results, setResults] = useState<SearchStudent[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [yearLevelFilter, setYearLevelFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadStudents(value?: string) {
    setError('');

    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      return;
    }

    try {
      setLoading(true);
      const trimmed = (value || '').trim();
      const path = trimmed
        ? `/clinic/students?limit=1000&q=${encodeURIComponent(trimmed)}`
        : '/clinic/students?limit=1000';
      const response = await api.get<SearchResponse>(path, token);
      setResults(response.data || []);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Unable to load students right now.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStudents();
  }, []);

  function handleSearch(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setQrMessage('');
    }
    void loadStudents(value);
  }

  const rows = useMemo(() => results, [results]);
  const departmentOptions = useMemo(
    () => Array.from(new Set(rows.map((student) => student.courseDept).filter(Boolean))).sort(),
    [rows],
  );

  const courseOptions = useMemo(
    () => Array.from(new Set(rows.map((student) => student.course || 'N/A'))).sort(),
    [rows],
  );

  const yearLevelOptions = useMemo(
    () => Array.from(new Set(rows.map((student) => formatYearLevel(student.yearLevel)))).sort(),
    [rows],
  );

  const filteredRows = useMemo(
    () => rows.filter((student) => {
      const matchesDepartment = departmentFilter === 'all' || student.courseDept === departmentFilter;
      const matchesCourse = courseFilter === 'all' || (student.course || 'N/A') === courseFilter;
      const matchesYear = yearLevelFilter === 'all' || formatYearLevel(student.yearLevel) === yearLevelFilter;
      return matchesDepartment && matchesCourse && matchesYear;
    }),
    [rows, departmentFilter, courseFilter, yearLevelFilter],
  );

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Students</h1>
        <p className="text-sm text-gray-500 mt-1">Search and open student records without scanning a QR code.</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => { void handleSearch(event.target.value); }}
            placeholder="Search by student number, name, course, department, or year level"
            className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>
        <button
          type="button"
          onClick={() => setQrModalOpen(true)}
          className="text-xs font-semibold border border-teal-200 text-teal-700 hover:bg-teal-50 px-3 py-3 rounded-xl transition-colors"
        >
          Use QR
        </button>
      </div>

      {qrMessage && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-xs font-semibold text-teal-700">
          {qrMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select
          value={departmentFilter}
          onChange={(event) => setDepartmentFilter(event.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          aria-label="Filter by department"
        >
          <option value="all">All Departments</option>
          {departmentOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>

        <select
          value={courseFilter}
          onChange={(event) => setCourseFilter(event.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          aria-label="Filter by course"
        >
          <option value="all">All Courses</option>
          {courseOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>

        <select
          value={yearLevelFilter}
          onChange={(event) => setYearLevelFilter(event.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          aria-label="Filter by year level"
        >
          <option value="all">All Year Levels</option>
          {yearLevelOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                <th className="px-4 py-3 text-left font-semibold">Student ID</th>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Department</th>
                <th className="px-4 py-3 text-left font-semibold">Course</th>
                <th className="px-4 py-3 text-left font-semibold">Year Level</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">Searching students...</td></tr>
              ) : filteredRows.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400">No students found.</td></tr>
              ) : filteredRows.map((student) => (
                <tr key={student.id} className="border-b border-gray-50 hover:bg-gray-50/70">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{student.studentNumber}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{student.lastName}, {student.firstName}</td>
                  <td className="px-4 py-3 text-gray-700">{student.courseDept || 'N/A'}</td>
                  <td className="px-4 py-3 text-gray-700">{student.course || 'N/A'}</td>
                  <td className="px-4 py-3 text-gray-700">{formatYearLevel(student.yearLevel)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/staff/record/${encodeURIComponent(student.studentNumber)}?returnTo=${encodeURIComponent('/dashboard/staff/students')}`}
                      className="inline-flex rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-teal-300 hover:text-teal-700"
                    >
                      Open Record
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <UseQrLookupModal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        onResolved={(student: QrResolvedStudent) => {
          setQrMessage(`Found ${student.lastName}, ${student.firstName} (${student.studentNumber})`);
          void handleSearch(student.studentNumber);
        }}
        onNotFound={() => {
          setQrMessage('Student not found. Please try another QR.');
        }}
      />
    </div>
  );
}
