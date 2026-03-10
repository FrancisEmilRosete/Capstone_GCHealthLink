'use client';

import { useEffect, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface ClinicInfo {
  clinicName: string;
  schoolYear: string;
  contactNumber: string;
  email: string;
  address: string;
  operatingHours: string;
}

interface NotifPrefs {
  lowInventory: boolean;
  highVisitVolume: boolean;
  pendingAccounts: boolean;
  diseaseAlert: boolean;
  loginActivity: boolean;
  exportActivity: boolean;
}

interface AdminSettingsResponse {
  success: boolean;
  message?: string;
  data: {
    clinic: ClinicInfo;
    notifications: NotifPrefs;
  };
}

function SectionCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
      <div>
        <h2 className="text-base font-bold text-gray-800">{title}</h2>
        {description && <p className="text-sm text-gray-500 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col sm:flex-row gap-1.5 sm:items-center">
      <label className="text-sm font-medium text-gray-700 w-48 shrink-0">{label}</label>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:bg-gray-100 disabled:text-gray-400"
    />
  );
}

function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  description?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-teal-500' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}

function SavedToast({ visible, message }: { visible: boolean; message: string }) {
  if (!visible) return null;

  return (
    <div className="fixed bottom-6 right-6 bg-teal-600 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      {message}
    </div>
  );
}

const DEFAULT_CLINIC: ClinicInfo = {
  clinicName: 'GC HealthLink - Clinic Management System',
  schoolYear: '2025-2026',
  contactNumber: '+63 47 224 2000',
  email: 'clinic@gordoncollege.edu.ph',
  address: 'Gordon College, Olongapo City',
  operatingHours: 'Monday - Friday, 8:00 AM - 5:00 PM',
};

const DEFAULT_NOTIFS: NotifPrefs = {
  lowInventory: true,
  highVisitVolume: true,
  pendingAccounts: true,
  diseaseAlert: true,
  loginActivity: false,
  exportActivity: false,
};

export default function AdminSettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [error, setError] = useState('');

  const [toastMessage, setToastMessage] = useState('');
  const [toastVisible, setToastVisible] = useState(false);

  const [clinic, setClinic] = useState<ClinicInfo>(DEFAULT_CLINIC);
  const [notifs, setNotifs] = useState<NotifPrefs>(DEFAULT_NOTIFS);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');

  useEffect(() => {
    async function loadSettings() {
      const token = getToken();
      if (!token) {
        setError('You are not logged in. Please sign in again.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError('');

        const response = await api.get<AdminSettingsResponse>('/settings/admin', token);
        setClinic(response.data?.clinic || DEFAULT_CLINIC);
        setNotifs(response.data?.notifications || DEFAULT_NOTIFS);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load admin settings.');
        }
      } finally {
        setLoading(false);
      }
    }

    void loadSettings();
  }, []);

  function setNotif(key: keyof NotifPrefs, value: boolean) {
    setNotifs((prev) => ({ ...prev, [key]: value }));
  }

  function showToast(message: string) {
    setToastMessage(message);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2200);
  }

  async function handleSave() {
    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      return;
    }

    try {
      setSaving(true);
      setError('');

      await api.put(
        '/settings/admin',
        {
          clinic,
          notifications: notifs,
        },
        token,
      );

      showToast('Changes saved successfully');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to save settings.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    setPwError('');

    if (!currentPw) {
      setPwError('Enter your current password.');
      return;
    }

    if (newPw.length < 8) {
      setPwError('New password must be at least 8 characters.');
      return;
    }

    if (newPw !== confirmPw) {
      setPwError('Passwords do not match.');
      return;
    }

    const token = getToken();
    if (!token) {
      setPwError('You are not logged in. Please sign in again.');
      return;
    }

    try {
      await api.post(
        '/settings/change-password',
        {
          currentPassword: currentPw,
          newPassword: newPw,
        },
        token,
      );

      setCurrentPw('');
      setNewPw('');
      setConfirmPw('');
      showToast('Password updated successfully');
    } catch (err) {
      if (err instanceof ApiError) {
        setPwError(err.message);
      } else {
        setPwError('Failed to update password.');
      }
    }
  }

  async function handleDownloadMonthlyPdf() {
    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      return;
    }

    try {
      setDownloadingPdf(true);
      setError('');

      const { blob, fileName } = await api.getBlob('/admin/reports/monthly-pdf', token);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = fileName || `gc-healthlink-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
      showToast('Monthly PDF report exported successfully');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to export monthly PDF report.');
      }
    } finally {
      setDownloadingPdf(false);
    }
  }

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      <SavedToast visible={toastVisible} message={toastMessage} />

      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Clinic configuration and admin preferences</p>
      </div>

      {loading && <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">Loading settings...</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <SectionCard title="Clinic Information" description="General information about the GC HealthLink clinic.">
        <div className="space-y-3">
          <FieldRow label="Clinic / System Name">
            <TextInput value={clinic.clinicName} onChange={(value) => setClinic((prev) => ({ ...prev, clinicName: value }))} disabled={saving || loading} />
          </FieldRow>
          <FieldRow label="School Year">
            <TextInput value={clinic.schoolYear} onChange={(value) => setClinic((prev) => ({ ...prev, schoolYear: value }))} disabled={saving || loading} />
          </FieldRow>
          <FieldRow label="Contact Number">
            <TextInput value={clinic.contactNumber} onChange={(value) => setClinic((prev) => ({ ...prev, contactNumber: value }))} disabled={saving || loading} />
          </FieldRow>
          <FieldRow label="Email Address">
            <TextInput value={clinic.email} onChange={(value) => setClinic((prev) => ({ ...prev, email: value }))} disabled={saving || loading} />
          </FieldRow>
          <FieldRow label="Address">
            <TextInput value={clinic.address} onChange={(value) => setClinic((prev) => ({ ...prev, address: value }))} disabled={saving || loading} />
          </FieldRow>
          <FieldRow label="Operating Hours">
            <TextInput value={clinic.operatingHours} onChange={(value) => setClinic((prev) => ({ ...prev, operatingHours: value }))} disabled={saving || loading} />
          </FieldRow>
        </div>
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => {
              void handleSave();
            }}
            disabled={saving || loading}
            className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Admin Account" description="Manage your administrator credentials.">
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-teal-500 text-white font-bold text-base flex items-center justify-center shrink-0">AD</div>
          <div>
            <p className="text-sm font-bold text-gray-800">Administrator</p>
            <p className="text-xs text-gray-500">admin@gordoncollege.edu.ph</p>
            <span className="mt-1 inline-block text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">Admin</span>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700">Change Password</p>
          {pwError && <p className="text-xs text-red-500">{pwError}</p>}

          <FieldRow label="Current Password">
            <input
              type="password"
              value={currentPw}
              onChange={(event) => setCurrentPw(event.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="Current password"
            />
          </FieldRow>
          <FieldRow label="New Password">
            <input
              type="password"
              value={newPw}
              onChange={(event) => setNewPw(event.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="Min. 8 characters"
            />
          </FieldRow>
          <FieldRow label="Confirm Password">
            <input
              type="password"
              value={confirmPw}
              onChange={(event) => setConfirmPw(event.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="Re-enter new password"
            />
          </FieldRow>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => {
              void handleChangePassword();
            }}
            className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
          >
            Update Password
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Notification Preferences" description="Choose which system alerts are active.">
        <div className="space-y-4">
          <Toggle
            checked={notifs.lowInventory}
            onChange={(value) => setNotif('lowInventory', value)}
            label="Low Inventory Alerts"
            description="Notify when a medication falls below minimum stock level."
          />
          <Toggle
            checked={notifs.highVisitVolume}
            onChange={(value) => setNotif('highVisitVolume', value)}
            label="High Visit Volume Alerts"
            description="Notify when daily visits significantly exceed the average."
          />
          <Toggle
            checked={notifs.pendingAccounts}
            onChange={(value) => setNotif('pendingAccounts', value)}
            label="Pending Account Reviews"
            description="Notify when new student registrations require approval."
          />
          <Toggle
            checked={notifs.diseaseAlert}
            onChange={(value) => setNotif('diseaseAlert', value)}
            label="Disease Trend Alerts"
            description="Notify when unusual illness patterns are detected."
          />
          <Toggle
            checked={notifs.loginActivity}
            onChange={(value) => setNotif('loginActivity', value)}
            label="Login Activity Alerts"
            description="Notify on suspicious or unrecognized login attempts."
          />
          <Toggle
            checked={notifs.exportActivity}
            onChange={(value) => setNotif('exportActivity', value)}
            label="Data Export Notifications"
            description="Notify whenever a data export is performed."
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={() => {
              void handleSave();
            }}
            disabled={saving || loading}
            className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors disabled:opacity-60"
          >
            {saving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </SectionCard>

      <SectionCard title="Monthly Health Report" description="One-click PDF export for monthly analytics (MVP requirement).">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-gray-700">Export Monthly Report (PDF)</p>
            <p className="text-xs text-gray-400 mt-0.5">Includes visit totals, trends, outbreak watch, and department heatmap.</p>
          </div>
          <button
            type="button"
            onClick={() => {
              void handleDownloadMonthlyPdf();
            }}
            disabled={downloadingPdf}
            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors disabled:opacity-60"
          >
            {downloadingPdf ? 'Preparing PDF...' : 'Download PDF'}
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
