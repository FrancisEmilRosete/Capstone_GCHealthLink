'use client';

/**
 * ADMIN USER MANAGEMENT
 * Route: /dashboard/admin/users
 * Staff accounts only. Admin can set and change staff passwords.
 */

import { useState, useMemo } from 'react';

// ── Types ─────────────────────────────────────────────────────

interface StaffUser {
  id:     string;
  name:   string;
  role:   'Doctor' | 'Nurse' | 'Student Nurse';
  email:  string;
  status: 'Active' | 'Inactive';
  joined: string;
}

// ── Mock data ─────────────────────────────────────────────────

const STAFF: StaffUser[] = [
  { id: 'STF-001', name: 'Dr. Maria Santos', role: 'Doctor',        email: 'dr.santos@gchealthlink.com', status: 'Active',   joined: '6/1/2022'  },
  { id: 'STF-002', name: 'Nurse John Reyes', role: 'Nurse',         email: 'jreyes@gchealthlink.com',    status: 'Active',   joined: '8/3/2022'  },
  { id: 'STF-003', name: 'Nurse Ana Ramos',  role: 'Student Nurse', email: 'aramos@gchealthlink.com',    status: 'Inactive', joined: '3/14/2023' },
];

// ── Style helpers ─────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  Active:   'bg-teal-100 text-teal-700',
  Inactive: 'bg-gray-200 text-gray-500',
};

const ROLE_STYLE: Record<string, string> = {
  Doctor:          'bg-blue-100 text-blue-700',
  Nurse:           'bg-purple-100 text-purple-700',
  'Student Nurse': 'bg-pink-100 text-pink-700',
};

// ── Password input with show/hide toggle ──────────────────────

function PasswordInput({ id, placeholder }: { id: string; placeholder?: string }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        placeholder={placeholder ?? ''}
        className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 pr-10 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400"
      />
      <button
        type="button"
        onClick={() => setShow(v => !v)}
        tabIndex={-1}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
      >
        {show ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        )}
      </button>
    </div>
  );
}

// ── Add Staff Modal ───────────────────────────────────────────

function AddStaffModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">

        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">Add Staff Account</h3>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Full Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
          <input
            className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400"
            placeholder="Dr. / Nurse Full Name"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email Address</label>
          <input
            type="email"
            className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-teal-400"
            placeholder="staff@gchealthlink.com"
          />
        </div>

        {/* Role — no Admin option */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Role</label>
          <select className="w-full border border-gray-300 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 dark:text-gray-100 appearance-none focus:outline-none focus:ring-2 focus:ring-teal-400">
            <option value="">Select Role</option>
            <option>Doctor</option>
            <option>Nurse</option>
            <option>Student Nurse</option>
          </select>
        </div>

        {/* Password — admin sets it */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Password
            <span className="ml-1.5 text-xs font-normal text-gray-400">(set by Admin)</span>
          </label>
          <PasswordInput id="add-pwd" placeholder="Set account password" />
        </div>

        {/* Confirm Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
          <PasswordInput id="add-confirm" placeholder="Repeat password" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose}
            className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            Cancel
          </button>
          <button onClick={onClose}
            className="px-4 py-2 bg-teal-500 text-white rounded-xl text-sm font-semibold hover:bg-teal-600">
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Change Password Modal ─────────────────────────────────────

function ChangePasswordModal({ staff, onClose }: { staff: StaffUser; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">

        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">Change Password</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{staff.name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Info note */}
        <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/30 border border-blue-100 dark:border-blue-800 rounded-xl px-4 py-3 text-xs text-blue-700 dark:text-blue-300">
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Only Admin can change staff account passwords.
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
          <PasswordInput id="chg-pwd" placeholder="Enter new password" />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm New Password</label>
          <PasswordInput id="chg-confirm" placeholder="Repeat new password" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose}
            className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700">
            Cancel
          </button>
          <button onClick={onClose}
            className="px-4 py-2 bg-teal-500 text-white rounded-xl text-sm font-semibold hover:bg-teal-600">
            Save Password
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function AdminUsers() {
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showAddStaff, setShowAddStaff] = useState(false);
  const [changePwdFor, setChangePwdFor] = useState<StaffUser | null>(null);

  const filteredStaff = useMemo(() => {
    const q = search.toLowerCase();
    return STAFF.filter(s =>
      (statusFilter === 'All' || s.status === statusFilter) &&
      (s.name.toLowerCase().includes(q) || s.role.toLowerCase().includes(q) || s.email.toLowerCase().includes(q))
    );
  }, [search, statusFilter]);

  const activeStaff   = STAFF.filter(s => s.status === 'Active').length;
  const inactiveStaff = STAFF.filter(s => s.status === 'Inactive').length;

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">

      {showAddStaff && <AddStaffModal onClose={() => setShowAddStaff(false)} />}
      {changePwdFor && <ChangePasswordModal staff={changePwdFor} onClose={() => setChangePwdFor(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">User Management</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage staff accounts</p>
        </div>
        <button
          onClick={() => setShowAddStaff(true)}
          className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Staff
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Staff',    value: STAFF.length,  color: 'text-teal-600' },
          { label: 'Active Staff',   value: activeStaff,   color: 'text-teal-600' },
          { label: 'Inactive Staff', value: inactiveStaff, color: 'text-gray-500' },
        ].map(c => (
          <div key={c.label} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
            <p className={`text-2xl font-bold ${c.color}`}>{c.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{c.label}</p>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-gray-100 dark:border-gray-700">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search staff by name, role or email..."
              className="w-full pl-9 pr-4 py-2 bg-gray-100 dark:bg-gray-700 dark:text-gray-200 dark:placeholder-gray-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2 text-sm bg-white dark:bg-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-400"
          >
            <option>All</option>
            <option>Active</option>
            <option>Inactive</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50">
                {['Staff ID', 'Full Name', 'Role', 'Email', 'Joined', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide px-4 py-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
              {filteredStaff.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600 dark:text-gray-400">{s.id}</td>
                  <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">{s.name}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${ROLE_STYLE[s.role]}`}>
                      {s.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{s.email}</td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">{s.joined}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLE[s.status]}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1 flex-wrap">
                      <button className="text-xs text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/30 px-2.5 py-1 rounded-lg font-medium transition-colors">
                        Edit
                      </button>
                      <button
                        onClick={() => setChangePwdFor(s)}
                        className="text-xs text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 px-2.5 py-1 rounded-lg font-medium transition-colors"
                      >
                        Change Password
                      </button>
                      <button className="text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 px-2.5 py-1 rounded-lg font-medium transition-colors">
                        {s.status === 'Active' ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredStaff.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-sm text-gray-400 dark:text-gray-500">
                    No staff found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
          <span>Showing {filteredStaff.length} of {STAFF.length} staff</span>
          <span>Page 1 of 1</span>
        </div>
      </div>
    </div>
  );
}
