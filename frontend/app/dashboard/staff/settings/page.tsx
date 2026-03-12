'use client';

import { useEffect, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface StaffProfile {
  id: string;
  email: string;
  role: string;
  name: string;
}

interface StaffSettingsResponse {
  success: boolean;
  message?: string;
  data: {
    profile: StaffProfile;
    preference: {
      darkMode: boolean;
    };
  };
}

function makeCsv(headers: string[], rows: Array<Array<string | number>>): Blob {
  const lines = [headers.join(','), ...rows.map((row) => row.map((value) => `"${String(value)}"`).join(','))];
  return new Blob([lines.join('\n')], { type: 'text/csv' });
}

function triggerDownload(blob: Blob, filename: string): void {
  const anchor = document.createElement('a');
  anchor.href = URL.createObjectURL(blob);
  anchor.download = filename;
  anchor.click();
}

const CONSULT_ROWS = [
  ['2023-10-15 09:30', '2023-0001', 'Juan Dela Cruz', 'Viral Flu', 'Rest, hydration', 'Dr. Maria Santos'],
  ['2023-10-16 14:15', '2023-0045', 'Ana Santos', 'Hyperacidity', 'Antacid, bland diet', 'Nurse John Reyes'],
];

const EXAM_ROWS = [
  ['2024-08-05', '2023-0001', 'Juan Dela Cruz', '112/72', '36.4', '61kg', '22.8', 'Dr. Maria Santos'],
  ['2024-01-15', '2023-0002', 'Pedro Santos', '120/80', '36.8', '55kg', '21.0', 'Dr. Maria Santos'],
];

const CERT_ROWS = [
  ['2024-10-15', '2023-0001', 'Juan Dela Cruz', 'Illness (Fever)', 'Dr. Maria Santos'],
  ['2025-03-05', '2024-0010', 'Carlos Reyes', 'Illness (Hypertension)', 'Dr. Maria Santos'],
];

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
      <div>
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return (
    <button
      role="switch"
      type="button"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none disabled:opacity-60 ${
        checked ? 'bg-teal-500' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-5' : 'translate-x-0'
        }`}
      />
    </button>
  );
}

function DownloadRow({ label, sub, onClick }: { label: string; sub: string; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
      <button
        type="button"
        onClick={onClick}
        className="flex items-center gap-1.5 text-xs font-semibold border border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-600 px-3 py-1.5 rounded-xl transition-colors bg-white shrink-0"
      >
        Download CSV
      </button>
    </div>
  );
}

function roleLabel(role: string): string {
  if (role === 'CLINIC_STAFF') return 'Clinic Staff';
  if (role === 'ADMIN') return 'Administrator';
  return role;
}

function initialsFromName(name: string): string {
  const clean = name.trim();
  if (!clean) return 'NA';

  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);

  const [profile, setProfile] = useState<StaffProfile>({
    id: '',
    name: 'Clinic Staff',
    email: 'staff@gordoncollege.edu.ph',
    role: 'CLINIC_STAFF',
  });
  const [darkMode, setDarkMode] = useState(false);

  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSaved, setPwSaved] = useState(false);

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

        const response = await api.get<StaffSettingsResponse>('/settings/staff', token);
        setProfile(response.data.profile);
        setDarkMode(Boolean(response.data.preference?.darkMode));
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load settings.');
        }
      } finally {
        setLoading(false);
      }
    }

    void loadSettings();
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  async function handleThemeToggle(value: boolean) {
    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      return;
    }

    try {
      setSavingTheme(true);
      setError('');

      await api.put('/settings/staff', { darkMode: value }, token);
      setDarkMode(value);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to save appearance setting.');
      }
    } finally {
      setSavingTheme(false);
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
      setPwSaved(true);
      setTimeout(() => setPwSaved(false), 2000);
    } catch (err) {
      if (err instanceof ApiError) {
        setPwError(err.message);
      } else {
        setPwError('Failed to update password.');
      }
    }
  }

  const initials = initialsFromName(profile.name || profile.email);

  function downloadAll(): void {
    triggerDownload(makeCsv(['Date', 'Student ID', 'Student', 'Diagnosis', 'Treatment', 'Staff'], CONSULT_ROWS), 'all_consultations.csv');
    setTimeout(
      () => triggerDownload(makeCsv(['Date', 'Student ID', 'Student', 'BP', 'Temp', 'Weight', 'BMI', 'Examiner'], EXAM_ROWS), 'all_physical_exams.csv'),
      300,
    );
    setTimeout(() => triggerDownload(makeCsv(['Date', 'Student ID', 'Student', 'Reason', 'Issued By'], CERT_ROWS), 'all_certificates.csv'), 600);
  }

  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto space-y-5">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-xs text-gray-400 mt-0.5">Manage your preferences and data exports</p>
      </div>

      {loading && <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-500">Loading settings...</div>}
      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}

      <Section title="Account" description="Your current account information">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold text-lg shrink-0">{initials}</div>
          <div>
            <p className="text-sm font-bold text-gray-900">{profile.name || profile.email}</p>
            <p className="text-xs text-teal-500 font-medium">{roleLabel(profile.role)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{profile.email}</p>
          </div>
        </div>
      </Section>

      <Section title="Appearance" description="Theme preference is saved to your account">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-gray-800">{darkMode ? 'Dark Mode' : 'Light Mode'}</p>
            <p className="text-xs text-gray-400">{darkMode ? 'Dark background, light text' : 'Light background, dark text'}</p>
          </div>
          <div className="flex items-center gap-2">
            {(saved || savingTheme) && <span className="text-xs text-teal-500 font-medium">{savingTheme ? 'Saving...' : 'Saved'}</span>}
            <Toggle checked={darkMode} onChange={handleThemeToggle} disabled={savingTheme || loading} />
          </div>
        </div>
      </Section>

      <Section title="Change Password" description="Update your account password">
        <div className="space-y-2">
          {pwError && <p className="text-xs text-red-600">{pwError}</p>}
          {pwSaved && <p className="text-xs text-teal-600">Password updated successfully.</p>}
          <input
            type="password"
            value={currentPw}
            onChange={(event) => setCurrentPw(event.target.value)}
            placeholder="Current password"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
          />
          <input
            type="password"
            value={newPw}
            onChange={(event) => setNewPw(event.target.value)}
            placeholder="New password"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
          />
          <input
            type="password"
            value={confirmPw}
            onChange={(event) => setConfirmPw(event.target.value)}
            placeholder="Confirm new password"
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
          />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => {
              void handleChangePassword();
            }}
            className="px-4 py-2 text-sm font-semibold bg-teal-500 hover:bg-teal-600 text-white rounded-xl transition-colors"
          >
            Update Password
          </button>
        </div>
      </Section>

      <Section title="Data Export" description="Download records as CSV files">
        <div className="divide-y divide-gray-50">
          <DownloadRow label="Download All Records" sub="Exports consultations, physical exams, and certificates" onClick={downloadAll} />
          <DownloadRow
            label="Consultation Records"
            sub="All clinic visit logs with diagnosis and treatment"
            onClick={() => triggerDownload(makeCsv(['Date', 'Student ID', 'Student', 'Diagnosis', 'Treatment', 'Staff'], CONSULT_ROWS), 'consultations.csv')}
          />
          <DownloadRow
            label="Physical Exam Records"
            sub="Annual physical examination records with vitals"
            onClick={() => triggerDownload(makeCsv(['Date', 'Student ID', 'Student', 'BP', 'Temp', 'Weight', 'BMI', 'Examiner'], EXAM_ROWS), 'physical_exams.csv')}
          />
          <DownloadRow
            label="Medical Certificates"
            sub="All issued excuse letters and clearances"
            onClick={() => triggerDownload(makeCsv(['Date', 'Student ID', 'Student', 'Reason', 'Issued By'], CERT_ROWS), 'certificates.csv')}
          />
        </div>
      </Section>
    </div>
  );
}
