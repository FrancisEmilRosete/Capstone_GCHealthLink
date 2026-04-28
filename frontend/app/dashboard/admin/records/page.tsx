'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface StudentRecord {
  studentProfileId: string;
  studentNumber: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  courseDept: string;
  email: string;
  visitCount: number;
  examCount: number;
}

interface RecordsResponse {
  success: boolean;
  data: {
    students: StudentRecord[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
}

export default function AdminRecordsPage() {
  const [students,   setStudents]   = useState<StudentRecord[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [search,     setSearch]     = useState('');
  const [dept,       setDept]       = useState('');
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total,      setTotal]      = useState(0);
  const LIMIT = 50;

  const loadStudents = useCallback(async (p: number) => {
    const token = getToken();
    if (!token) { setError('Not authenticated.'); setLoading(false); return; }
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (search.trim()) params.set('search', search.trim());
      if (dept.trim())   params.set('dept',   dept.trim());
      const res = await api.get<RecordsResponse>(`/admin/records?${params.toString()}`, token);
      setStudents(res.data.students);
      setTotalPages(res.data.pagination.totalPages);
      setTotal(res.data.pagination.total);
      setPage(p);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load records.');
    } finally {
      setLoading(false);
    }
  }, [search, dept]);

  useEffect(() => { void loadStudents(1); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    void loadStudents(1);
  }

  function fullName(s: StudentRecord) {
    const mi = s.middleName ? ` ${s.middleName.charAt(0)}.` : '';
    return `${s.lastName}, ${s.firstName}${mi}`;
  }

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Health Records</h1>
        <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} student profiles</p>
      </div>

      <form onSubmit={handleSearch} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or student number..."
          className="flex-1 min-w-[220px] border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
        <input
          value={dept}
          onChange={(e) => setDept(e.target.value)}
          placeholder="Department (e.g. CAHS)"
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
        <button type="submit" className="px-4 py-2 text-sm font-semibold rounded-xl bg-teal-500 text-white hover:bg-teal-600">
          Search
        </button>
      </form>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Student No.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Department</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Clinic Visits</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Exams</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">Loading...</td></tr>
              ) : students.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">No records found.</td></tr>
              ) : students.map((s) => (
                <tr key={s.studentProfileId} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-800 font-medium">{fullName(s)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{s.studentNumber}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{s.courseDept}</td>
                  <td className="px-4 py-3 text-gray-700">{s.visitCount}</td>
                  <td className="px-4 py-3 text-gray-700">{s.examCount}</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/dashboard/admin/records/${s.studentProfileId}`}
                      className="text-xs font-semibold text-teal-600 hover:text-teal-800 hover:underline"
                    >
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button onClick={() => void loadStudents(page - 1)} disabled={page <= 1}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                ← Prev
              </button>
              <button onClick={() => void loadStudents(page + 1)} disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
