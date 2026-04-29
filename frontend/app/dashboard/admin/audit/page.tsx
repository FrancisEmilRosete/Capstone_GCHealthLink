'use client';

import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface AuditLogEntry {
  id: string;
  action: string;
  targetId: string | null;
  ipAddress: string | null;
  metadata: Record<string, unknown> | null;
  timestamp: string;
  user: { email: string; role: string } | null;
}

interface AuditLogsResponse {
  success: boolean;
  data: {
    logs: AuditLogEntry[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  };
}

const ROLE_OPTIONS = ['ALL', 'STUDENT', 'CLINIC_STAFF', 'ADMIN'];

const ACTION_BADGE: Record<string, string> = {
  LOGIN_SUCCESS:    'bg-green-100 text-green-700',
  LOGIN_FAILED:     'bg-red-100 text-red-700',
  LOGOUT:           'bg-gray-100 text-gray-600',
  DEFAULT:          'bg-blue-100 text-blue-700',
};

function actionBadgeClass(action: string) {
  return ACTION_BADGE[action] ?? ACTION_BADGE.DEFAULT;
}

function formatTs(ts: string) {
  return new Date(ts).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function AdminAuditPage() {
  const [logs, setLogs]       = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  // Filters
  const [search,   setSearch]   = useState('');
  const [role,     setRole]     = useState('ALL');
  const [action,   setAction]   = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  // Pagination
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total,      setTotal]      = useState(0);
  const LIMIT = 50;

  const loadLogs = useCallback(async (p: number) => {
    const token = getToken();
    if (!token) { setError('Not authenticated.'); setLoading(false); return; }

    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (search.trim())  params.set('search',   search.trim());
      if (role !== 'ALL') params.set('role',     role);
      if (action.trim())  params.set('action',   action.trim());
      if (dateFrom)       params.set('dateFrom', dateFrom);
      if (dateTo)         params.set('dateTo',   dateTo);

      const res = await api.get<AuditLogsResponse>(`/admin/audit-logs?${params.toString()}`, token);
      setLogs(res.data.logs);
      setTotalPages(res.data.pagination.totalPages);
      setTotal(res.data.pagination.total);
      setPage(p);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load audit logs.');
    } finally {
      setLoading(false);
    }
  }, [search, role, action, dateFrom, dateTo]);

  useEffect(() => { void loadLogs(1); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    void loadLogs(1);
  }

  function handleClear() {
    setSearch(''); setRole('ALL'); setAction(''); setDateFrom(''); setDateTo('');
    setTimeout(() => void loadLogs(1), 0);
  }

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Activity Logs</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Comprehensive audit trail of all user actions — {total.toLocaleString()} entries
        </p>
        <p className="text-xs text-gray-400 mt-0.5">Tracks sign-ins, system actions, and affected entities for accountability and review.</p>
      </div>

      {/* Filter bar */}
      <form onSubmit={handleSearch} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user email..."
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r === 'ALL' ? 'All Roles' : r.replace('_', ' ')}</option>)}
          </select>
          <input
            value={action}
            onChange={(e) => setAction(e.target.value)}
            placeholder="Filter by action code (e.g. LOGIN_SUCCESS)..."
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400" />
        </div>
        <div className="flex gap-2 mt-3">
          <button type="submit" className="px-4 py-2 text-sm font-semibold rounded-xl bg-teal-500 text-white hover:bg-teal-600">
            Apply Filters
          </button>
          <button type="button" onClick={handleClear} className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50">
            Clear
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date & Time</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action Code</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Target Record ID</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Source IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">Loading audit log entries...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">No audit entries found for the selected filters.</td></tr>
              ) : logs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{formatTs(log.timestamp)}</td>
                  <td className="px-4 py-3 text-gray-800 font-medium max-w-[180px] truncate">
                    {log.user?.email ?? <span className="text-gray-400 italic">System</span>}
                  </td>
                  <td className="px-4 py-3">
                    {log.user?.role ? (
                      <span className="inline-block px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold">
                        {log.user.role.replace('_', ' ')}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${actionBadgeClass(log.action)}`}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[120px]">
                    {log.targetId ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{log.ipAddress ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages} &nbsp;·&nbsp; {total.toLocaleString()} total entries
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => void loadLogs(page - 1)}
                disabled={page <= 1}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <button
                onClick={() => void loadLogs(page + 1)}
                disabled={page >= totalPages}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
