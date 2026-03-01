'use client';

/**
 * ADMIN AUDIT LOG
 * Route: /dashboard/admin/audit
 * Chronological log of all system actions.
 */

import { useState, useMemo } from 'react';

// ── Types ─────────────────────────────────────────────────────

type ActionType =
  | 'login'
  | 'logout'
  | 'record_view'
  | 'record_edit'
  | 'certificate_issued'
  | 'inventory_update'
  | 'account_created'
  | 'account_deactivated'
  | 'settings_changed'
  | 'export';

interface AuditEvent {
  id:         string;
  timestamp:  string;
  actor:      string;
  actorRole:  string;
  action:     ActionType;
  detail:     string;
  target?:    string;
  ip:         string;
}

// ── Mock Data ─────────────────────────────────────────────────

const EVENTS: AuditEvent[] = [
  { id: 'A001', timestamp: '2025-03-15 08:05:12', actor: 'Dr. Maria Santos', actorRole: 'Doctor',  action: 'login',               detail: 'Successful login',                              ip: '192.168.1.12' },
  { id: 'A002', timestamp: '2025-03-15 08:07:34', actor: 'Nurse John Reyes', actorRole: 'Nurse',   action: 'login',               detail: 'Successful login',                              ip: '192.168.1.18' },
  { id: 'A003', timestamp: '2025-03-15 08:30:05', actor: 'Dr. Maria Santos', actorRole: 'Doctor',  action: 'record_view',         detail: 'Viewed student health record',    target: 'Juan Dela Cruz (2023-0001)',         ip: '192.168.1.12' },
  { id: 'A004', timestamp: '2025-03-15 09:10:22', actor: 'Nurse John Reyes', actorRole: 'Nurse',   action: 'record_edit',         detail: 'Updated consultation notes',     target: 'Ana Gomez (2023-0002)',              ip: '192.168.1.18' },
  { id: 'A005', timestamp: '2025-03-15 09:44:50', actor: 'Dr. Maria Santos', actorRole: 'Doctor',  action: 'certificate_issued',  detail: 'Medical certificate issued',      target: 'Marco Reyes (2023-0045)',            ip: '192.168.1.12' },
  { id: 'A006', timestamp: '2025-03-15 10:02:11', actor: 'Nurse John Reyes', actorRole: 'Nurse',   action: 'inventory_update',    detail: 'Added 50 units of Paracetamol 500mg (Lot: BX-2025-04)', ip: '192.168.1.18' },
  { id: 'A007', timestamp: '2025-03-15 10:30:00', actor: 'Dr. Clara Lim',    actorRole: 'Admin',   action: 'account_created',     detail: 'Student account created',         target: 'Sofia Bautista (2024-0010)',         ip: '192.168.1.5' },
  { id: 'A008', timestamp: '2025-03-15 11:00:18', actor: 'Dr. Clara Lim',    actorRole: 'Admin',   action: 'account_deactivated', detail: 'Staff account deactivated',       target: 'Nurse Ana Ramos (STF-004)',          ip: '192.168.1.5' },
  { id: 'A009', timestamp: '2025-03-15 11:20:00', actor: 'Dr. Maria Santos', actorRole: 'Doctor',  action: 'record_edit',         detail: 'Updated medical history',         target: 'Sofia Bautista (2024-0010)',         ip: '192.168.1.12' },
  { id: 'A010', timestamp: '2025-03-15 12:00:00', actor: 'Dr. Maria Santos', actorRole: 'Doctor',  action: 'logout',              detail: 'User logged out',                               ip: '192.168.1.12' },
  { id: 'A011', timestamp: '2025-03-15 13:05:42', actor: 'Dr. Maria Santos', actorRole: 'Doctor',  action: 'login',               detail: 'Successful login',                              ip: '192.168.1.12' },
  { id: 'A012', timestamp: '2025-03-15 13:30:00', actor: 'Dr. Clara Lim',    actorRole: 'Admin',   action: 'export',              detail: 'Exported monthly health report (March 2025)',   ip: '192.168.1.5' },
  { id: 'A013', timestamp: '2025-03-15 14:00:55', actor: 'Nurse John Reyes', actorRole: 'Nurse',   action: 'inventory_update',    detail: 'Marked Amoxicillin 500mg as low-stock',         ip: '192.168.1.18' },
  { id: 'A014', timestamp: '2025-03-15 14:20:08', actor: 'Dr. Clara Lim',    actorRole: 'Admin',   action: 'settings_changed',    detail: 'Updated clinic contact number',                 ip: '192.168.1.5' },
  { id: 'A015', timestamp: '2025-03-16 08:00:01', actor: 'Nurse John Reyes', actorRole: 'Nurse',   action: 'login',               detail: 'Successful login',                              ip: '192.168.1.18' },
  { id: 'A016', timestamp: '2025-03-16 08:15:00', actor: 'Nurse John Reyes', actorRole: 'Nurse',   action: 'certificate_issued',  detail: 'PE clearance certificate issued', target: 'Kevin Santos (2025-0012)',           ip: '192.168.1.18' },
  { id: 'A017', timestamp: '2025-03-16 09:00:00', actor: 'Dr. Clara Lim',    actorRole: 'Admin',   action: 'account_created',     detail: 'Student account created',         target: 'Maria Santos (2026-0088)',           ip: '192.168.1.5' },
  { id: 'A018', timestamp: '2025-03-16 09:30:45', actor: 'Dr. Maria Santos', actorRole: 'Doctor',  action: 'record_view',         detail: 'Viewed student health record',    target: 'James Aquino (2024-0055)',           ip: '192.168.1.12' },
  { id: 'A019', timestamp: '2025-03-16 10:10:00', actor: 'Dr. Maria Santos', actorRole: 'Doctor',  action: 'record_edit',         detail: 'Added diagnosis entry',           target: 'James Aquino (2024-0055)',           ip: '192.168.1.12' },
  { id: 'A020', timestamp: '2025-03-16 11:00:00', actor: 'Dr. Clara Lim',    actorRole: 'Admin',   action: 'export',              detail: 'Exported all student health records (CSV)',     ip: '192.168.1.5' },
];

// ── Config ────────────────────────────────────────────────────

const ACTION_LABELS: Record<ActionType, string> = {
  login:               'Login',
  logout:              'Logout',
  record_view:         'Record View',
  record_edit:         'Record Edit',
  certificate_issued:  'Certificate Issued',
  inventory_update:    'Inventory Update',
  account_created:     'Account Created',
  account_deactivated: 'Account Deactivated',
  settings_changed:    'Settings Changed',
  export:              'Export',
};

const ACTION_STYLE: Record<ActionType, string> = {
  login:               'bg-green-100 text-green-700',
  logout:              'bg-gray-200  text-gray-600',
  record_view:         'bg-blue-100  text-blue-700',
  record_edit:         'bg-yellow-100 text-yellow-700',
  certificate_issued:  'bg-teal-100  text-teal-700',
  inventory_update:    'bg-purple-100 text-purple-700',
  account_created:     'bg-sky-100   text-sky-700',
  account_deactivated: 'bg-red-100   text-red-600',
  settings_changed:    'bg-orange-100 text-orange-700',
  export:              'bg-indigo-100 text-indigo-700',
};

const ROLE_STYLE: Record<string, string> = {
  Doctor: 'bg-blue-100  text-blue-700',
  Nurse:  'bg-purple-100 text-purple-700',
  Admin:  'bg-red-100   text-red-700',
};

const ALL_ACTIONS: ActionType[] = [
  'login', 'logout', 'record_view', 'record_edit', 'certificate_issued',
  'inventory_update', 'account_created', 'account_deactivated', 'settings_changed', 'export',
];

// ── Export helper ─────────────────────────────────────────────

function exportCsv(rows: AuditEvent[]) {
  const header = 'ID,Timestamp,Actor,Role,Action,Detail,Target,IP';
  const lines  = rows.map(r =>
    `${r.id},"${r.timestamp}","${r.actor}",${r.actorRole},${r.action},"${r.detail}","${r.target ?? ''}",${r.ip}`
  );
  const csv  = [header, ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'audit_log.csv';
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ── Page ──────────────────────────────────────────────────────

export default function AdminAudit() {
  const [search,       setSearch]       = useState('');
  const [actionFilter, setActionFilter] = useState('All');
  const [actorFilter,  setActorFilter]  = useState('All');

  const uniqueActors = useMemo(() => Array.from(new Set(EVENTS.map(e => e.actor))), []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return EVENTS.filter(e =>
      (actionFilter === 'All' || e.action === actionFilter) &&
      (actorFilter  === 'All' || e.actor  === actorFilter)  &&
      (
        e.actor.toLowerCase().includes(q) ||
        e.detail.toLowerCase().includes(q) ||
        (e.target ?? '').toLowerCase().includes(q)
      )
    );
  }, [search, actionFilter, actorFilter]);

  // Summary counts by action category
  const counts = useMemo(() => ({
    total:    EVENTS.length,
    logins:   EVENTS.filter(e => e.action === 'login').length,
    edits:    EVENTS.filter(e => e.action === 'record_edit').length,
    certs:    EVENTS.filter(e => e.action === 'certificate_issued').length,
    exports:  EVENTS.filter(e => e.action === 'export').length,
  }), []);

  return (
    <div className="p-6 space-y-5 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-0.5">Complete record of system actions and user activity</p>
        </div>
        <button
          onClick={() => exportCsv(filtered)}
          className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export CSV
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total Events',    value: counts.total,   color: 'text-gray-800' },
          { label: 'Login Sessions',  value: counts.logins,  color: 'text-green-600' },
          { label: 'Record Edits',    value: counts.edits,   color: 'text-yellow-600' },
          { label: 'Certs Issued',    value: counts.certs,   color: 'text-teal-600' },
          { label: 'Exports',         value: counts.exports, color: 'text-indigo-600' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 p-4">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by actor, detail or target…"
              className="w-full pl-9 pr-4 py-2 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <option value="All">All Actions</option>
            {ALL_ACTIONS.map(a => <option key={a} value={a}>{ACTION_LABELS[a]}</option>)}
          </select>
          <select
            value={actorFilter}
            onChange={e => setActorFilter(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <option value="All">All Users</option>
            {uniqueActors.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-gray-100 bg-gray-50">
                {['ID', 'Timestamp', 'Actor', 'Role', 'Action', 'Detail / Target', 'IP'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(e => (
                <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{e.id}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{e.timestamp}</td>
                  <td className="px-4 py-3 font-medium text-gray-800 text-xs whitespace-nowrap">{e.actor}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ROLE_STYLE[e.actorRole] ?? 'bg-gray-100 text-gray-500'}`}>
                      {e.actorRole}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${ACTION_STYLE[e.action]}`}>
                      {ACTION_LABELS[e.action]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-xs">
                    <p>{e.detail}</p>
                    {e.target && (
                      <p className="text-teal-600 font-medium mt-0.5">→ {e.target}</p>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-400">{e.ip}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-12">No events match your filters.</p>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
          <span>Showing {filtered.length} of {EVENTS.length} events</span>
          <span>Page 1 of 1</span>
        </div>
      </div>
    </div>
  );
}
