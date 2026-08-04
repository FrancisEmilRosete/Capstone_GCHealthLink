'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import UseQrLookupModal, { type QrResolvedStudent } from '@/components/scanner/UseQrLookupModal';
import PaginationControls from '@/components/ui/PaginationControls';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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
        ? `/clinic/students?limit=200&q=${encodeURIComponent(trimmed)}`
        : '/clinic/students?limit=200';
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

  useEffect(() => {
    setCurrentPage(1);
  }, [departmentFilter, courseFilter, yearLevelFilter]);

  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onSearch(value: string) {
    setQuery(value);
    setCurrentPage(1);
    if (!value.trim()) {
      setQrMessage('');
    }
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      void loadStudents(value);
    }, 300);
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

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredStudents.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredStudents, currentPage]);

  return (
    <div className="p-4 sm:p-6 space-y-5">

      <div className="flex flex-wrap xl:flex-nowrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search student number, name..."
            className="w-full rounded-xl border border-gray-200 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>
        <button
          type="button"
          onClick={() => setQrModalOpen(true)}
          className="text-sm font-semibold border border-teal-200 text-teal-700 hover:bg-teal-50 px-4 py-2.5 rounded-xl transition-colors whitespace-nowrap flex-none"
        >
          Use QR
        </button>

        <select
          value={departmentFilter}
          onChange={(event) => setDepartmentFilter(event.target.value)}
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 flex-1 min-w-[130px] xl:flex-none xl:w-[170px]"
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
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 flex-1 min-w-[130px] xl:flex-none xl:w-[150px]"
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
          className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 flex-1 min-w-[130px] xl:flex-none xl:w-[150px]"
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
              ) : paginatedStudents.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400">No students found.</td></tr>
              ) : paginatedStudents.map((student) => (
                <tr key={student.id} className="border-b border-gray-50 hover:bg-gray-50/70">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">{student.studentNumber}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{student.lastName}, {student.firstName}</td>
                  <td className="px-4 py-3 text-gray-700">{student.courseDept || 'N/A'}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/staff/students/${encodeURIComponent(student.studentNumber)}?returnTo=${encodeURIComponent('/dashboard/staff/students')}`}
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

        {/* Pagination Controls */}
        {!loading && filteredStudents.length > 0 && (
          <PaginationControls
            page={currentPage}
            totalPages={totalPages}
            totalItems={filteredStudents.length}
            pageSize={itemsPerPage}
            pageSizeOptions={[10, 20, 30, 50]}
            itemLabel="students"
            onPageChange={setCurrentPage}
            onPageSizeChange={(next) => {
              setItemsPerPage(next);
              setCurrentPage(1);
            }}
          />
        )}
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
