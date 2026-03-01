/**
 * SETTINGS PAGE
 * ──────────────────────────────────────────────────────────────
 * Route: /dashboard/staff/settings
 *
 * - Download all records as CSV
 * - Light / dark appearance toggle (persisted per account in localStorage)
 * - Account profile display
 */

'use client';

import { useState, useEffect } from 'react';

// ── Mock current user ───────────────────────────────────────────
// TODO: Replace with actual auth context / session
const ACCOUNT_ID = 'staff_001';
const MOCK_USER = { name: 'Dr. Maria Santos', role: 'Clinic Physician', email: 'msantos@gordoncollege.edu.ph', initials: 'MS' };

// ── CSV helpers ───────────────────────────────────────────────
function makeCsv(headers: string[], rows: string[][]): Blob {
  const lines = [headers.join(','), ...rows.map((r) => r.map((v) => `"${v}"`).join(','))];
  return new Blob([lines.join('\n')], { type: 'text/csv' });
}

function triggerDownload(blob: Blob, name: string) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}

// ── Mock record snapshots (in a real app these come from API) ───────
const CONSULT_ROWS = [
  ['2023-10-15 09:30','2023-0001','Juan Dela Cruz','Viral Flu','Rest, hydration','Dr. Maria Santos'],
  ['2023-10-16 14:15','2023-0045','Ana Santos','Hyperacidity','Antacid, bland diet','Nurse John Reyes'],
  ['2024-03-10 10:15','2023-0001','Juan Dela Cruz','Tension Headache','Paracetamol','Dr. Maria Santos'],
];
const EXAM_ROWS = [
  ['2024-08-05','2023-0001','Juan Dela Cruz','112/72','36.4','61kg','22.8','Dr. Maria Santos'],
  ['2023-08-10','2023-0001','Juan Dela Cruz','110/70','36.5','60kg','22.5','Dr. Maria Santos'],
  ['2024-01-15','2023-0002','Pedro Santos','120/80','36.8','55kg','21.0','Dr. Maria Santos'],
];
const CERT_ROWS = [
  ['2024-10-15','2023-0001','Juan Dela Cruz','Illness (Fever)','Dr. Maria Santos'],
  ['2025-03-05','2024-0010','Carlos Reyes','Illness (Hypertension)','Dr. Maria Santos'],
];
const MONTHLY_CONSULT_ROWS: (string|number)[][] = [
  ['Mar',8],['Apr',12],['May',9],['Jun',15],['Jul',11],['Aug',20],
  ['Sep',18],['Oct',25],['Nov',22],['Dec',14],['Jan',17],['Feb',10],
];
const TOP_DX_ROWS: (string|number)[][] = [
  ['Viral Flu',18],['Tension Headache',14],['Gastritis',11],['URI',9],['Anemia',7],['Hyperacidity',6],['Ankle Sprain',4],
];
const BMI_ROWS: (string|number)[][] = [
  ['Underweight',8],['Normal',42],['Overweight',15],['Obese',5],
];
const BLOOD_ROWS: (string|number)[][] = [
  ['O+',28],['A+',18],['B+',12],['AB+',6],['O-',4],['A-',2],
];

// ── Section card wrapper ─────────────────────────────────────────
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

// ── Toggle switch ───────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${
        checked ? 'bg-teal-500' : 'bg-gray-200'
      }`}
    >
      <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
        checked ? 'translate-x-5' : 'translate-x-0'
      }`}/>
    </button>
  );
}

// ── Download row ───────────────────────────────────────────────
function DownloadRow({ label, sub, onClick }: { label: string; sub: string; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-semibold text-gray-800">{label}</p>
        <p className="text-xs text-gray-400">{sub}</p>
      </div>
      <button onClick={onClick}
        className="flex items-center gap-1.5 text-xs font-semibold border border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-600 px-3 py-1.5 rounded-xl transition-colors bg-white shrink-0">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
        Download CSV
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function SettingsPage() {
  const THEME_KEY = `theme_${ACCOUNT_ID}`;
  const [darkMode, setDarkMode] = useState(false);
  const [saved,    setSaved]    = useState(false);

  // Load saved theme on mount
  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, [THEME_KEY]);

  function handleThemeToggle(val: boolean) {
    setDarkMode(val);
    if (val) {
      document.documentElement.classList.add('dark');
      localStorage.setItem(THEME_KEY, 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem(THEME_KEY, 'light');
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function downloadAll() {
    triggerDownload(makeCsv(['Date','Student ID','Student','Diagnosis','Treatment','Staff'], CONSULT_ROWS), 'all_consultations.csv');
    setTimeout(() => triggerDownload(makeCsv(['Date','Student ID','Student','BP','Temp','Weight','BMI','Examiner'], EXAM_ROWS), 'all_physical_exams.csv'), 300);
    setTimeout(() => triggerDownload(makeCsv(['Date','Student ID','Student','Reason','Issued By'], CERT_ROWS), 'all_certificates.csv'), 600);
    setTimeout(() => triggerDownload(makeCsv(['Month','Consultations'], MONTHLY_CONSULT_ROWS), 'report_monthly_consultations.csv'), 900);
    setTimeout(() => triggerDownload(makeCsv(['Diagnosis','Count'], TOP_DX_ROWS), 'report_top_diagnoses.csv'), 1200);
    setTimeout(() => triggerDownload(makeCsv(['BMI Category','Count'], BMI_ROWS), 'report_bmi_distribution.csv'), 1500);
    setTimeout(() => triggerDownload(makeCsv(['Blood Type','Count'], BLOOD_ROWS), 'report_blood_types.csv'), 1800);
  }

  return (
    <div className="p-4 sm:p-6 max-w-xl mx-auto space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Settings</h1>
        <p className="text-xs text-gray-400 mt-0.5">Manage your preferences and data exports</p>
      </div>

      {/* Account info */}
      <Section title="Account" description="Your current account information">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
            {MOCK_USER.initials}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{MOCK_USER.name}</p>
            <p className="text-xs text-teal-500 font-medium">{MOCK_USER.role}</p>
            <p className="text-xs text-gray-400 mt-0.5">{MOCK_USER.email}</p>
          </div>
        </div>
      </Section>

      {/* Appearance */}
      <Section title="Appearance" description="Theme preference is saved per account">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gray-100">
              {darkMode ? (
                <svg className="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 24 24"><path d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"/></svg>
              ) : (
                <svg className="w-4 h-4 text-yellow-400" fill="currentColor" viewBox="0 0 24 24"><path d="M12 4.5a.75.75 0 01.75.75V7a.75.75 0 01-1.5 0V5.25A.75.75 0 0112 4.5zM18.364 6.05a.75.75 0 010 1.06l-1.25 1.25a.75.75 0 11-1.06-1.06l1.25-1.25a.75.75 0 011.06 0zM19.5 12a.75.75 0 01-.75.75H17a.75.75 0 010-1.5h1.75a.75.75 0 01.75.75zM17.114 17.114a.75.75 0 01-1.06 0l-1.25-1.25a.75.75 0 111.06-1.06l1.25 1.25a.75.75 0 010 1.06zM12 17a.75.75 0 01.75.75V19a.75.75 0 01-1.5 0v-1.25A.75.75 0 0112 17zM6.886 17.114a.75.75 0 010-1.06l1.25-1.25a.75.75 0 111.06 1.06l-1.25 1.25a.75.75 0 01-1.06 0zM5 12a.75.75 0 01.75-.75H7a.75.75 0 010 1.5H5.75A.75.75 0 015 12zM6.886 6.886a.75.75 0 011.06 0L9.196 8.136a.75.75 0 01-1.06 1.06L6.886 7.946a.75.75 0 010-1.06zM12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7z"/></svg>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{darkMode ? 'Dark Mode' : 'Light Mode'}</p>
              <p className="text-xs text-gray-400">{darkMode ? 'Dark background, light text' : 'Light background, dark text'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {saved && <span className="text-xs text-teal-500 font-medium">Saved</span>}
            <Toggle checked={darkMode} onChange={handleThemeToggle}/>
          </div>
        </div>
      </Section>

      {/* Data export */}
      <Section title="Data Export" description="Download records as CSV files">
        <div className="divide-y divide-gray-50">
          <DownloadRow
            label="Download All Records"
            sub="Exports consultations, physical exams, and certificates"
            onClick={downloadAll}
          />
          <DownloadRow
            label="Consultation Records"
            sub="All clinic visit logs with diagnosis and treatment"
            onClick={() => triggerDownload(makeCsv(['Date','Student ID','Student','Diagnosis','Treatment','Staff'], CONSULT_ROWS), 'consultations.csv')}
          />
          <DownloadRow
            label="Physical Exam Records"
            sub="Annual physical examination records with vitals"
            onClick={() => triggerDownload(makeCsv(['Date','Student ID','Student','BP','Temp','Weight','BMI','Examiner'], EXAM_ROWS), 'physical_exams.csv')}
          />
          <DownloadRow
            label="Medical Certificates"
            sub="All issued excuse letters and clearances"
            onClick={() => triggerDownload(makeCsv(['Date','Student ID','Student','Reason','Issued By'], CERT_ROWS), 'certificates.csv')}
          />
          <DownloadRow
            label="Monthly Consultation Report"
            sub="Monthly consultation counts for the academic year"
            onClick={() => triggerDownload(makeCsv(['Month','Consultations'], MONTHLY_CONSULT_ROWS), 'report_monthly_consultations.csv')}
          />
          <DownloadRow
            label="Top Diagnoses Report"
            sub="Most frequent diagnoses across all consultations"
            onClick={() => triggerDownload(makeCsv(['Diagnosis','Count'], TOP_DX_ROWS), 'report_top_diagnoses.csv')}
          />
          <DownloadRow
            label="BMI Distribution Report"
            sub="BMI category breakdown from physical examinations"
            onClick={() => triggerDownload(makeCsv(['BMI Category','Count'], BMI_ROWS), 'report_bmi_distribution.csv')}
          />
          <DownloadRow
            label="Blood Type Distribution Report"
            sub="Blood type frequency from physical examinations"
            onClick={() => triggerDownload(makeCsv(['Blood Type','Count'], BLOOD_ROWS), 'report_blood_types.csv')}
          />
        </div>
      </Section>

      {/* App info */}
      <Section title="About">
        <div className="space-y-1.5 text-xs text-gray-500">
          <div className="flex justify-between"><span>System</span><span className="font-medium text-gray-700">GC HealthLink</span></div>
          <div className="flex justify-between"><span>Version</span><span className="font-medium text-gray-700">1.0.0-beta</span></div>
          <div className="flex justify-between"><span>Institution</span><span className="font-medium text-gray-700">Gordon College</span></div>
        </div>
      </Section>
    </div>
  );
}
