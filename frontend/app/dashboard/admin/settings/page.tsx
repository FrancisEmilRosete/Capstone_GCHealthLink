'use client';

/**
 * ADMIN SETTINGS
 * Route: /dashboard/admin/settings
 * Clinic configuration, account settings, notification preferences, data export.
 */

import { useState } from 'react';

// ── Types ─────────────────────────────────────────────────────

interface ClinicInfo {
  clinicName:    string;
  schoolYear:    string;
  contactNumber: string;
  email:         string;
  address:       string;
  operatingHours: string;
}

interface NotifPrefs {
  lowInventory:     boolean;
  highVisitVolume:  boolean;
  pendingAccounts:  boolean;
  diseaseAlert:     boolean;
  loginActivity:    boolean;
  exportActivity:   boolean;
}

// ── Sub-components ────────────────────────────────────────────

function SectionCard({ title, description, children }: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
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

function TextInput({ value, onChange, placeholder, disabled }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <input
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:bg-gray-100 disabled:text-gray-400"
    />
  );
}

function Toggle({ checked, onChange, label, description }: {
  checked: boolean;
  onChange: (v: boolean) => void;
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
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${checked ? 'bg-teal-500' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
      </button>
    </div>
  );
}

function DownloadRow({ label, description, filename }: {
  label: string;
  description: string;
  filename: string;
}) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = () => {
    setDownloading(true);
    setTimeout(() => {
      const csv  = `# GC HealthLink — ${label}\nGenerated: ${new Date().toLocaleString()}\n`;
      const blob = new Blob([csv], { type: 'text/csv' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setDownloading(false);
    }, 800);
  };

  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-700">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{description}</p>
      </div>
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="flex items-center gap-2 border border-teal-300 text-teal-600 text-xs font-semibold px-3 py-1.5 rounded-xl hover:bg-teal-50 transition-colors disabled:opacity-50"
      >
        {downloading ? (
          <>
            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Exporting…
          </>
        ) : (
          <>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </>
        )}
      </button>
    </div>
  );
}

// ── Saved toast ───────────────────────────────────────────────

function SavedToast({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div className="fixed bottom-6 right-6 bg-teal-600 text-white text-sm font-medium px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 z-50">
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
      Changes saved successfully
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function AdminSettings() {
  const [saved,        setSaved]        = useState(false);
  const [pwChanged,    setPwChanged]    = useState(false);
  const [currentPw,    setCurrentPw]    = useState('');
  const [newPw,        setNewPw]        = useState('');
  const [confirmPw,    setConfirmPw]    = useState('');
  const [pwError,      setPwError]      = useState('');

  const [clinic, setClinic] = useState<ClinicInfo>({
    clinicName:     'GC HealthLink — Clinic Management System',
    schoolYear:     '2025–2026',
    contactNumber:  '+63 47 224 2000',
    email:          'clinic@gordoncollege.edu.ph',
    address:        '36 Tapinac, Olongapo City, Zambales 2200',
    operatingHours: 'Monday – Friday, 8:00 AM – 5:00 PM',
  });

  const [notifs, setNotifs] = useState<NotifPrefs>({
    lowInventory:    true,
    highVisitVolume: true,
    pendingAccounts: true,
    diseaseAlert:    true,
    loginActivity:   false,
    exportActivity:  false,
  });

  function setNotif(key: keyof NotifPrefs, value: boolean) {
    setNotifs(prev => ({ ...prev, [key]: value }));
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  function handleChangePassword() {
    setPwError('');
    if (!currentPw) { setPwError('Enter your current password.'); return; }
    if (newPw.length < 8) { setPwError('New password must be at least 8 characters.'); return; }
    if (newPw !== confirmPw) { setPwError('Passwords do not match.'); return; }
    setPwChanged(true);
    setCurrentPw(''); setNewPw(''); setConfirmPw('');
    setTimeout(() => setPwChanged(false), 2500);
  }

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">

      <SavedToast visible={saved || pwChanged} />

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Clinic configuration and admin preferences</p>
      </div>

      {/* ── 1. Clinic Information ── */}
      <SectionCard title="Clinic Information" description="General information about the GC HealthLink clinic.">
        <div className="space-y-3">
          <FieldRow label="Clinic / System Name">
            <TextInput value={clinic.clinicName} onChange={v => setClinic(p => ({ ...p, clinicName: v }))} />
          </FieldRow>
          <FieldRow label="School Year">
            <TextInput value={clinic.schoolYear} onChange={v => setClinic(p => ({ ...p, schoolYear: v }))} placeholder="e.g. 2025–2026" />
          </FieldRow>
          <FieldRow label="Contact Number">
            <TextInput value={clinic.contactNumber} onChange={v => setClinic(p => ({ ...p, contactNumber: v }))} />
          </FieldRow>
          <FieldRow label="Email Address">
            <TextInput value={clinic.email} onChange={v => setClinic(p => ({ ...p, email: v }))} />
          </FieldRow>
          <FieldRow label="Address">
            <TextInput value={clinic.address} onChange={v => setClinic(p => ({ ...p, address: v }))} />
          </FieldRow>
          <FieldRow label="Operating Hours">
            <TextInput value={clinic.operatingHours} onChange={v => setClinic(p => ({ ...p, operatingHours: v }))} />
          </FieldRow>
        </div>
        <div className="flex justify-end pt-2">
          <button onClick={handleSave} className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
            Save Changes
          </button>
        </div>
      </SectionCard>

      {/* ── 2. Admin Account ── */}
      <SectionCard title="Admin Account" description="Manage your personal admin profile.">
        {/* Profile read-only */}
        <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-teal-500 text-white font-bold text-base flex items-center justify-center shrink-0">CL</div>
          <div>
            <p className="text-sm font-bold text-gray-800">Dr. Clara Lim</p>
            <p className="text-xs text-gray-500">clim@gchealthlink.com</p>
            <span className="mt-1 inline-block text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">Admin</span>
          </div>
        </div>

        {/* Change Password */}
        <div className="space-y-3">
          <p className="text-sm font-semibold text-gray-700">Change Password</p>
          {pwError && <p className="text-xs text-red-500">{pwError}</p>}
          {pwChanged && <p className="text-xs text-teal-600 font-medium">Password updated successfully.</p>}
          <FieldRow label="Current Password">
            <input
              type="password"
              value={currentPw}
              onChange={e => setCurrentPw(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="••••••••"
            />
          </FieldRow>
          <FieldRow label="New Password">
            <input
              type="password"
              value={newPw}
              onChange={e => setNewPw(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="Min. 8 characters"
            />
          </FieldRow>
          <FieldRow label="Confirm Password">
            <input
              type="password"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              placeholder="Re-enter new password"
            />
          </FieldRow>
        </div>
        <div className="flex justify-end pt-2">
          <button onClick={handleChangePassword} className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
            Update Password
          </button>
        </div>
      </SectionCard>

      {/* ── 3. Notification Preferences ── */}
      <SectionCard title="Notification Preferences" description="Choose which system alerts are active.">
        <div className="space-y-4">
          <Toggle
            checked={notifs.lowInventory}
            onChange={v => setNotif('lowInventory', v)}
            label="Low Inventory Alerts"
            description="Notify when a medication falls below minimum stock level."
          />
          <Toggle
            checked={notifs.highVisitVolume}
            onChange={v => setNotif('highVisitVolume', v)}
            label="High Visit Volume Alerts"
            description="Notify when daily visits significantly exceed the average."
          />
          <Toggle
            checked={notifs.pendingAccounts}
            onChange={v => setNotif('pendingAccounts', v)}
            label="Pending Account Reviews"
            description="Notify when new student registrations require approval."
          />
          <Toggle
            checked={notifs.diseaseAlert}
            onChange={v => setNotif('diseaseAlert', v)}
            label="Disease Trend Alerts"
            description="Notify when unusual illness patterns are detected."
          />
          <Toggle
            checked={notifs.loginActivity}
            onChange={v => setNotif('loginActivity', v)}
            label="Login Activity Alerts"
            description="Notify on suspicious or unrecognised login attempts."
          />
          <Toggle
            checked={notifs.exportActivity}
            onChange={v => setNotif('exportActivity', v)}
            label="Data Export Notifications"
            description="Notify whenever a data export is performed."
          />
        </div>
        <div className="flex justify-end pt-2">
          <button onClick={handleSave} className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
            Save Preferences
          </button>
        </div>
      </SectionCard>

      {/* ── 4. Data Export ── */}
      <SectionCard title="Data Export" description="Download full datasets from the clinic system.">
        <div>
          <DownloadRow
            label="All Student Records"
            description="Complete health profiles and registration data for all students."
            filename="all_student_records.csv"
          />
          <DownloadRow
            label="Consultation Records"
            description="All clinic visits and consultation entries across all patients."
            filename="consultation_records.csv"
          />
          <DownloadRow
            label="Medical Certificates"
            description="Log of all medical certificates and clearances issued."
            filename="medical_certificates.csv"
          />
          <DownloadRow
            label="Physical Exam Records"
            description="Annual PE results and medical history for enrolled students."
            filename="physical_exam_records.csv"
          />
          <DownloadRow
            label="Inventory History"
            description="Complete medication inventory and transaction history."
            filename="inventory_history.csv"
          />
          <DownloadRow
            label="Audit Log"
            description="Full audit trail of all system actions and user activity."
            filename="audit_log.csv"
          />
        </div>
      </SectionCard>

      {/* ── 5. Danger Zone ── */}
      <SectionCard title="System" description="Advanced system operations.">
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => alert('Cache cleared.')}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm px-4 py-2.5 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Clear System Cache
          </button>
          <button
            onClick={() => alert('Backup initiated.')}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 hover:bg-gray-50 text-sm px-4 py-2.5 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Backup Database
          </button>
        </div>
        <p className="text-xs text-gray-400">These operations affect system-wide data. Use with caution.</p>
      </SectionCard>

    </div>
  );
}
