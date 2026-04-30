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

const ACTION_LABELS: Record<string, string> = {
  LOGIN_SUCCESS: 'Signed in successfully',
  LOGIN_FAILED: 'Failed sign-in attempt',
  LOGOUT: 'Signed out',
  VIEWED_ADMIN_PROFILE: 'Viewed admin profile',
  VIEWED_HEALTH_ANALYTICS: 'Viewed health analytics dashboard',
  EXPORTED_MONTHLY_REPORT_PDF: 'Exported monthly report (PDF)',
  ADMIN_VIEWED_USERS: 'Viewed user accounts list',
  ADMIN_VIEWED_AUDIT_LOGS: 'Viewed activity logs',
  ADMIN_VIEWED_RECORDS_LIST: 'Viewed student health records list',
  ADMIN_VIEWED_STUDENT_DETAIL: 'Viewed student health record details',
  VIEWED_INVENTORY: 'Viewed medicine inventory',
  ADDED_INVENTORY_ITEM: 'Added inventory item',
  REMOVED_INVENTORY_ITEM: 'Removed inventory item',
  BOOKED_APPOINTMENT: 'Booked consultation appointment',
  UPDATED_APPOINTMENT_STATUS: 'Updated appointment status',
  RECORDED_CLINIC_VISIT: 'Recorded clinic consultation',
  RECORDED_PHYSICAL_EXAM: 'Recorded physical examination',
  SUBMITTED_HEALTH_REGISTRATION: 'Submitted student health registration',
  GENERATED_QR_CODE: 'Generated personal QR code',
  VIEWED_MEDICAL_RECORD: 'Viewed medical record',
  SENT_EMERGENCY_ALERT: 'Sent emergency clinic alert',
  SENT_EMERGENCY_SMS: 'Sent emergency SMS alert',
  UPDATED_NOTIFICATION_STATE: 'Updated notification read/dismiss status',
};

function toActionLabel(action: string) {
  if (ACTION_LABELS[action]) return ACTION_LABELS[action];
  return action
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
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

  const [search, setSearch] = useState('');

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
  }, [search]);

  useEffect(() => { void loadLogs(1); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    void loadLogs(1);
  }

  return (
    <div className="p-6 space-y-4 max-w-6xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Activity Logs</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Audit log monitoring view - {total.toLocaleString()} entries
        </p>
      </div>

      <form onSubmit={handleSearch} className="bg-white rounded-xl border border-gray-100 p-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user email"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
          <button type="submit" className="px-4 py-2 text-sm font-semibold rounded-lg bg-teal-500 text-white hover:bg-teal-600">
            Search
          </button>
          <button
            type="button"
            onClick={() => {
              setSearch('');
              void loadLogs(1);
            }}
            className="px-4 py-2 text-sm font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Reset
          </button>
        </div>
      </form>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date & Time</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User Email</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">User Role</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400 text-sm">Loading audit logs...</td></tr>
              ) : logs.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-10 text-center text-gray-400 text-sm">No audit entries found.</td></tr>
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
                  <td className="px-4 py-3 text-gray-700 text-sm">{toActionLabel(log.action)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

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
