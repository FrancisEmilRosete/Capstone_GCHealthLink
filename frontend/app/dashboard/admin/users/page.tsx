'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface UserEntry {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  clinicStaffType?: string | null;
  studentProfile?: {
    firstName: string;
    middleName?: string | null;
    lastName: string;
    studentNumber: string;
    courseDept: string;
  } | null;
}

interface UsersResponse {
  success: boolean;
  data: { users: UserEntry[] };
}

const ROLE_BADGE: Record<string, string> = {
  ADMIN:        'bg-purple-100 text-purple-700',
  CLINIC_STAFF: 'bg-blue-100 text-blue-700',
  STUDENT:      'bg-green-100 text-green-700',
};

export default function AdminUsersPage() {
  const [users,    setUsers]   = useState<UserEntry[]>([]);
  const [filtered, setFiltered] = useState<UserEntry[]>([]);
  const [loading,  setLoading] = useState(true);
  const [error,    setError]   = useState('');
  const [search,   setSearch]  = useState('');
  const [role,     setRole]    = useState('ALL');

  const loadUsers = useCallback(async () => {
    const token = getToken();
    if (!token) { setError('Not authenticated.'); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await api.get<UsersResponse>('/admin/users', token);
      setUsers(res.data.users);
      setFiltered(res.data.users);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  useEffect(() => {
    let list = users;
    if (role !== 'ALL') list = list.filter((u) => u.role === role);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((u) => {
        const name = u.studentProfile
          ? `${u.studentProfile.firstName} ${u.studentProfile.lastName}`.toLowerCase()
          : '';
        return u.email.toLowerCase().includes(q) || name.includes(q) ||
          (u.studentProfile?.studentNumber ?? '').toLowerCase().includes(q);
      });
    }
    setFiltered(list);
  }, [search, role, users]);

  function fullName(u: UserEntry) {
    if (!u.studentProfile) return '—';
    const { firstName, middleName, lastName } = u.studentProfile;
    return [lastName, [firstName, middleName].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  }

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900">User Accounts</h1>
        <p className="text-sm text-gray-500 mt-0.5">{users.length} registered accounts</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or student number..."
          className="flex-1 min-w-[220px] border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
        >
          <option value="ALL">All Roles</option>
          <option value="STUDENT">Student</option>
          <option value="CLINIC_STAFF">Clinic Staff</option>
          <option value="ADMIN">Admin</option>
        </select>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Dept / Staff Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Student No.</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">No users found.</td></tr>
              ) : filtered.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-800 font-medium">{u.email}</td>
                  <td className="px-4 py-3 text-gray-700">{fullName(u)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${ROLE_BADGE[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                      {u.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {u.studentProfile?.courseDept ?? u.clinicStaffType ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {u.studentProfile?.studentNumber ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(u.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
