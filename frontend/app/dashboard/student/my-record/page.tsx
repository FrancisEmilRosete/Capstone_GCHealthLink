'use client';

import { useState } from 'react';

// ── Mock Data ─────────────────────────────────────────────────

const STUDENT = {
  id:             '2023-0001',
  firstName:      'Juan',
  lastName:       'Dela Cruz',
  middleInitial:  'A',
  course:         'BS Civil Engineering',
  department:     'College of Engineering',
  age:             20,
  sex:            'M',
  birthday:       '5/15/2003',
  civilStatus:    'Single',
  contact:        '09171234567',
  email:          'student@gchealth.edu',
  address:        '123 Sampaguita St, Quezon City',
  bloodType:      'O+',
  allergies:      ['Peanuts', 'Penicillin'],
  conditions:     ['Asthma'],
  immunizations:  ['Hepatitis B', 'Measles', 'COVID-19'],
  emergency: {
    name:         'Maria Dela Cruz',
    relationship: 'Mother',
    contact:      '09177654321',
  },
};

const MEDICAL_CONDITIONS_ALL = [
  'allergy', 'asthma', 'chickenpox', 'diabetes', 'dysmanorrhea', 'epilepsy',
  'heart Disorder', 'hepatitis', 'hypertension', 'measles', 'mumps', 'anxiety Disorder',
  'panic Attack', 'pneumonia', 'ptb', 'typhoid Fever', 'covid19', 'uti',
];

const PHYSICAL_EXAMS = [
  {
    year: '1st Year', date: '8/10/2023', status: 'Completed',
    vitals: { bp: '110/70', hr: '75', rr: '18', temp: '36.5', weight: '65kg', height: '170cm', bmi: '22.5', vision: '20/20' },
    findings: [
      ['Skin', 'Normal', 'HEENT', 'Normal'],
      ['Chest/Lungs', 'Clear breath sounds', 'Heart', 'Normal rate and rhythm'],
      ['Abdomen', 'Soft, non-tender', 'Extremities', 'No edema'],
    ],
    examinedBy: 'Dr. Maria Santos',
  },
  {
    year: '2nd Year', date: '8/5/2024', status: 'Completed',
    vitals: { bp: '112/72', hr: '78', rr: '17', temp: '36.7', weight: '66kg', height: '170cm', bmi: '22.8', vision: '20/20' },
    findings: [
      ['Skin', 'Normal', 'HEENT', 'Normal'],
      ['Chest/Lungs', 'Clear breath sounds', 'Heart', 'Normal rate and rhythm'],
      ['Abdomen', 'Soft, non-tender', 'Extremities', 'No edema'],
    ],
    examinedBy: 'Dr. Maria Santos',
  },
  {
    year: '3rd Year', date: '', status: 'Pending',
    vitals: null, findings: null, examinedBy: '',
  },
];

const VISITS = [
  { id: 1, date: '3/10/2024',  time: '10:15 AM', diagnosis: 'Tension Headache',                 complaint: 'Headache',                             treatment: 'Rest, stress management',                    medicines: ['Biogesic (2)'],                bp: '130/80', temp: '36.6', weight: '65kg', attending: 'Dr. Maria Santos' },
  { id: 2, date: '2/20/2024',  time: '01:20 PM', diagnosis: 'Gastritis',                        complaint: 'Stomach pain after eating',             treatment: 'Kremil-S, dietary modification',             medicines: ['Kremil-S (3)'],                bp: '118/76', temp: '36.5', weight: '65kg', attending: 'Nurse John Reyes' },
  { id: 3, date: '11/8/2023',  time: '09:00 AM', diagnosis: 'Upper Respiratory Tract Infection', complaint: 'Sore throat, runny nose, slight fever', treatment: 'Amoxicillin 500mg, rest, increased fluids',  medicines: ['Amoxicillin (10)', 'Biogesic (6)', 'Neozep (6)'], bp: '115/75', temp: '37.8', weight: '64kg', attending: 'Dr. Maria Santos' },
  { id: 4, date: '9/14/2023',  time: '02:45 PM', diagnosis: 'Allergic Rhinitis',                complaint: 'Sneezing, itchy eyes',                 treatment: 'Cetirizine 10mg, avoid allergens',           medicines: ['Cetirizine (7)'],               bp: '110/70', temp: '36.4', weight: '65kg', attending: 'Nurse John Reyes' },
];

// ── Tab definitions ───────────────────────────────────────────

const TABS = [
  { id: 'personal', label: 'Personal Info',   d: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  { id: 'medical',  label: 'Medical Profile', d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'history',  label: 'Medical History', d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'exams',    label: 'Physical Exams',  d: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4' },
  { id: 'visits',   label: 'Visit History',   d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
];

// ── Download helper ───────────────────────────────────────────

function downloadRecord() {
  const rows = [
    ['Field', 'Value'],
    ['Student ID',  STUDENT.id],
    ['Name',        `${STUDENT.firstName} ${STUDENT.lastName}`],
    ['Course',      STUDENT.course],
    ['Blood Type',  STUDENT.bloodType],
    ['Allergies',   STUDENT.allergies.join(', ')],
    ['Conditions',  STUDENT.conditions.join(', ')],
  ];
  const csv  = rows.map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = `health_record_${STUDENT.id}.csv`; a.click();
  URL.revokeObjectURL(url);
}

// ── Pill badge ────────────────────────────────────────────────

function Pill({ text, color = 'gray' }: { text: string; color?: 'teal' | 'red' | 'yellow' | 'blue' | 'gray' }) {
  const cls: Record<string, string> = {
    teal:   'bg-teal-100 text-teal-700',
    red:    'bg-red-100 text-red-600',
    yellow: 'bg-yellow-100 text-yellow-700',
    blue:   'bg-blue-100 text-blue-700',
    gray:   'bg-gray-100 text-gray-600',
  };
  return <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${cls[color]}`}>{text}</span>;
}

// ── Tab: Personal Info ────────────────────────────────────────

function TabPersonalInfo() {
  const s = STUDENT;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

      {/* Basic Information */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-5">Basic Information</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-5">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Full Name</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{s.lastName} , {s.firstName} {s.middleInitial}.</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Student ID</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{s.id}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Department</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{s.department}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Course</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{s.course}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Age / Sex</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{s.age} / {s.sex}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Birthday</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{s.birthday}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Civil Status</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{s.civilStatus}</p>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-5">Contact Information</h3>
        <div className="space-y-4">
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Mobile Number</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{s.contact}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Email Address</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{s.email}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-0.5">Home Address</p>
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{s.address}</p>
          </div>

          <div className="pt-3 border-t border-gray-100 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-3">Emergency Contact</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Name</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{s.emergency.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400 mb-0.5">Relationship</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{s.emergency.relationship}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-400 mb-0.5">Contact Number</p>
                <p className="text-sm font-semibold text-gray-800 dark:text-gray-100">{s.emergency.contact}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}

// ── Tab: Medical Profile ──────────────────────────────────────

function TabMedicalProfile() {
  const s = STUDENT;
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

      {/* Medical Summary */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-5">Medical Summary</h3>
        <div className="space-y-5">
          <div>
            <p className="text-xs text-gray-400 mb-2">Blood Type</p>
            <Pill text={s.bloodType} color="blue" />
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-2">Allergies</p>
            <div className="flex flex-wrap gap-2">
              {s.allergies.length ? s.allergies.map(a => <Pill key={a} text={a} color="red" />) : <span className="text-sm text-gray-500">None</span>}
            </div>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-2">Existing Conditions</p>
            <div className="flex flex-wrap gap-2">
              {s.conditions.length ? s.conditions.map(c => <Pill key={c} text={c} color="yellow" />) : <span className="text-sm text-gray-500 dark:text-gray-400">None</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Immunization Records */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-5">Immunization Records</h3>
        <div className="space-y-2">
          {s.immunizations.map(imm => (
            <div key={imm} className="flex items-center gap-3 bg-teal-50 dark:bg-teal-900/30 border border-teal-100 dark:border-teal-800 rounded-xl px-4 py-3">
              <svg className="w-5 h-5 text-teal-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-medium text-gray-800 dark:text-gray-100">{imm}</span>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

// ── Tab: Medical History ──────────────────────────────────────

function TabMedicalHistory() {
  const checked = STUDENT.conditions.map(c => c.toLowerCase());
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-5">Medical History Checklist</h3>
      <div className="grid grid-cols-2 gap-2">
        {MEDICAL_CONDITIONS_ALL.map(cond => {
          const isChecked = checked.some(c => c === cond.toLowerCase());
          return (
            <div key={cond}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${isChecked ? 'bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-800' : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700'}`}>
              {isChecked ? (
                <svg className="w-4.5 h-4.5 text-teal-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-4.5 h-4.5 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className={`text-sm capitalize ${isChecked ? 'text-red-600 font-medium' : 'text-gray-500'}`}>{cond}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Tab: Physical Exams ───────────────────────────────────────

function TabPhysicalExams() {
  return (
    <div className="space-y-4">
      {PHYSICAL_EXAMS.map(exam => (
        <div key={exam.year} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-gray-800 dark:text-gray-100">{exam.year}&nbsp; Year Physical Exam</h3>
              {exam.date && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Date: {exam.date}</p>}
            </div>
            <span className={`text-xs font-semibold px-3 py-1 rounded-full ${exam.status === 'Completed' ? 'bg-teal-100 text-teal-700' : 'bg-amber-100 text-amber-700'}`}>
              {exam.status}
            </span>
          </div>

          {exam.vitals ? (
            <>
              <div className="grid grid-cols-4 gap-3 mb-5">
                {[
                  { label: 'Blood Pressure', value: exam.vitals.bp, unit: '' },
                  { label: 'Heart Rate',     value: exam.vitals.hr, unit: ' bpm' },
                  { label: 'Resp. Rate',     value: exam.vitals.rr, unit: ' cpm' },
                  { label: 'Temperature',    value: exam.vitals.temp, unit: '°C', sup: true },
                  { label: 'Weight',         value: exam.vitals.weight, unit: '' },
                  { label: 'Height',         value: exam.vitals.height, unit: '' },
                  { label: 'BMI',            value: exam.vitals.bmi, unit: '' },
                  { label: 'Vision',         value: exam.vitals.vision, unit: '' },
                ].map(({ label, value, unit, sup }) => (
                  <div key={label} className="border border-gray-100 dark:border-gray-700 rounded-xl p-3">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                    <p className="text-xl font-bold text-gray-800 dark:text-gray-100">
                      {value}
                      {sup ? <><sup className="text-xs">°</sup><span className="text-base">C</span></> : <span className="text-sm font-normal text-gray-500">{unit}</span>}
                    </p>
                  </div>
                ))}
              </div>

              {exam.findings && (
                <div className="border-t border-gray-100 dark:border-gray-700 pt-4 space-y-3">
                  {exam.findings.map((row, i) => (
                    <div key={i} className="grid grid-cols-2 gap-6">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm text-teal-600 min-w-[90px]">{row[0]}</span>
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{row[1]}</span>
                      </div>
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm text-teal-600 min-w-[90px]">{row[2]}</span>
                        <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{row[3]}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <p className="text-xs text-gray-400 text-right mt-4">
                Examined by: <span className="text-gray-600 font-semibold">{exam.examinedBy}</span>
              </p>
            </>
          ) : (
            <p className="text-sm text-gray-400 py-4 text-center">
              No exam data yet. Please schedule your physical examination at the clinic.
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Tab: Visit History ────────────────────────────────────────

function TabVisitHistory() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-100 mb-6">Clinic Visit History</h3>
      <div className="space-y-0">
        {VISITS.map((visit, idx) => (
          <div key={visit.id} className="flex gap-4">
            {/* Timeline spine */}
            <div className="flex flex-col items-center pt-1 shrink-0">
              <div className="w-3 h-3 rounded-full bg-teal-500 mt-1" />
              {idx < VISITS.length - 1 && <div className="w-0.5 flex-1 bg-gray-200 my-1" style={{ minHeight: '2rem' }} />}
            </div>

            {/* Card */}
            <div className="flex-1 border border-gray-100 dark:border-gray-700 rounded-2xl p-5 mb-4 dark:bg-gray-800/50">
              <div className="flex items-start justify-between gap-2 mb-3">
                <h4 className="text-base font-bold text-gray-900 dark:text-gray-100">{visit.diagnosis}</h4>
                <div className="flex gap-1.5 shrink-0">
                  <span className="text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1 font-medium">{visit.date}</span>
                  <span className="text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-2.5 py-1 font-medium">* {visit.time}</span>
                </div>
              </div>

              <div className="space-y-1.5 text-sm mb-3">
                <p><span className="font-semibold text-gray-700 dark:text-gray-300">Complaint: </span><span className="text-gray-600 dark:text-gray-400">{visit.complaint}</span></p>
                <p><span className="font-semibold text-gray-700 dark:text-gray-300">Treatment: </span><span className="text-gray-600 dark:text-gray-400">{visit.treatment}</span></p>
                {visit.medicines.length > 0 && (
                  <div>
                    <span className="font-semibold text-gray-700 dark:text-gray-300">Medicines: </span>
                    <span className="inline-flex flex-wrap gap-1.5 mt-1">
                      {visit.medicines.map(m => (
                        <span key={m} className="text-xs bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-700 px-2.5 py-0.5 rounded-full font-medium">{m}</span>
                      ))}
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-3 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex gap-4">
                  <span>BP: <strong className="text-gray-700 dark:text-gray-300">{visit.bp}</strong></span>
                  <span>Temp: <strong className="text-gray-700 dark:text-gray-300">{visit.temp}<sup>°</sup>C</strong></span>
                  <span>Weight: <strong className="text-gray-700 dark:text-gray-300">{visit.weight}</strong></span>
                </div>
                <span>Attending: <strong className="text-gray-700 dark:text-gray-300">{visit.attending}</strong></span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────

export default function MyRecordPage() {
  const [activeTab, setActiveTab] = useState('personal');

  return (
    <div className="p-5 space-y-4 max-w-5xl mx-auto">

      {/* Profile Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden shrink-0 flex items-center justify-center text-xl font-bold text-gray-600 dark:text-gray-300">
          {STUDENT.firstName[0]}{STUDENT.lastName[0]}
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">{STUDENT.firstName}&nbsp; {STUDENT.lastName}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{STUDENT.id} &bull; {STUDENT.course}</p>
        </div>
        <button onClick={downloadRecord}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Record
        </button>
      </div>

      {/* Tab Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-x-auto">
        <div className="flex min-w-max">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                ${activeTab === tab.id
                  ? 'border-teal-500 text-teal-600'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700'}`}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={tab.d} />
              </svg>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'personal' && <TabPersonalInfo />}
        {activeTab === 'medical'  && <TabMedicalProfile />}
        {activeTab === 'history'  && <TabMedicalHistory />}
        {activeTab === 'exams'    && <TabPhysicalExams />}
        {activeTab === 'visits'   && <TabVisitHistory />}
      </div>

    </div>
  );
}
