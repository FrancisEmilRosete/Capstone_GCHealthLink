'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import UseQrLookupModal, { type QrResolvedStudent } from '@/components/scanner/UseQrLookupModal';

interface StudentDirectoryItem {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  courseDept: string;
  course?: string | null;
  yearLevel?: string | null;
}

interface StudentDirectoryResponse {
  success: boolean;
  data: StudentDirectoryItem[];
}

export default function DoctorStudentsPage() {
  const [query, setQuery] = useState('');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrMessage, setQrMessage] = useState('');
  const [students, setStudents] = useState<StudentDirectoryItem[]>([]);
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [courseFilter, setCourseFilter] = useState('all');
  const [yearLevelFilter, setYearLevelFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function loadStudents(value?: string) {
    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const trimmed = (value || '').trim();
      const path = trimmed
        ? `/clinic/students?limit=1000&q=${encodeURIComponent(trimmed)}`
        : '/clinic/students?limit=1000';
      const response = await api.get<StudentDirectoryResponse>(path, token);
      setStudents(response.data || []);
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

  function onSearch(value: string) {
    setQuery(value);
    if (!value.trim()) {
      setQrMessage('');
    }
    void loadStudents(value);
  }

  const departmentOptions = useMemo(
    () => Array.from(new Set(students.map((student) => student.courseDept).filter(Boolean))).sort(),
    [students],
  );

  const courseOptions = useMemo(
    () => Array.from(new Set(students.map((student) => student.course || 'N/A'))).sort(),
    [students],
  );

  const yearLevelOptions = useMemo(
    () => Array.from(new Set(students.map((student) => student.yearLevel || 'N/A'))).sort(),
    [students],
  );

  const filteredStudents = useMemo(
    () => students.filter((student) => {
      const matchesDepartment = departmentFilter === 'all' || student.courseDept === departmentFilter;
      const matchesCourse = courseFilter === 'all' || (student.course || 'N/A') === courseFilter;
      const matchesYear = yearLevelFilter === 'all' || (student.yearLevel || 'N/A') === yearLevelFilter;
      return matchesDepartment && matchesCourse && matchesYear;
    }),
    [students, departmentFilter, courseFilter, yearLevelFilter],
  );

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Students</h1>
        <p className="text-sm text-gray-500 mt-1">Browse all registered students without using QR scan.</p>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search by student number, name, or department"
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

      {qrMessage && (
        <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-xs font-semibold text-teal-700">
          {qrMessage}
        </div>
      )}

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-gray-500">
                <th className="px-4 py-3 text-left font-semibold">Student ID</th>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Department</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">Loading students...</td></tr>
              ) : filteredStudents.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">No students found.</td></tr>
              ) : filteredStudents.map((student) => (
                <tr key={student.id} className="border-b border-gray-50 hover:bg-gray-50/70">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{student.studentNumber}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{student.lastName}, {student.firstName}</td>
                  <td className="px-4 py-3 text-gray-700">{student.courseDept || 'N/A'}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/doctor/students/${encodeURIComponent(student.studentNumber)}?returnTo=${encodeURIComponent('/dashboard/doctor/students')}`}
                      className="inline-flex rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:border-teal-300 hover:text-teal-700"
                    >
                      View Record
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
          onSearch(student.studentNumber);
        }}
        onNotFound={() => {
          setQrMessage('Student not found. Please try another QR.');
        }}
      />
    </div>
  );
}
