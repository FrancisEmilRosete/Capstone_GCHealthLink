'use client';

/**
 * STUDENT HEALTH REGISTRATION
 * Route: /register
 *
 * 5-step health registration wizard:
 *   1 — Personal Info
 *   2 — Emergency Contact
 *   3 — Medical History
 *   4 — Surgical History
 *   5 — Data Privacy
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api, ApiError } from '@/lib/api';
import {
  DEPARTMENT_COURSE_MAP,
  getCoursesByDepartmentCode,
  isValidCourseForDepartment,
  isValidDepartmentCode,
} from '@/constants/departments';

// ── Constants ─────────────────────────────────────────────────

const STEPS = [
  'Personal Info',
  'Emergency Contact',
  'Medical History',
  'Surgical History',
  'Data Privacy',
];

const RELATIONSHIPS = ['Parent', 'Spouse', 'Sibling', 'Guardian', 'Relative', 'Friend'];
const CIVIL_STATUSES = ['Single', 'Married', 'Widowed', 'Separated'];
const BLOOD_TYPES    = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

const MEDICAL_CONDITIONS = [
  'Allergy',          'Asthma',
  'Chickenpox',       'Diabetes',
  'Cysticercosis',    'Epilepsy',
  'Heart Disorder',   'Hepatitis',
  'Hypertension',     'Measles',
  'Mumps',            'Anxiety Disorder',
  'Panic Attacks',    'Pneumonia',
  'PTB (Pulmonary Tuberculosis)', 'Typhoid Fever',
  'COVID-19',         'UTI',
];

// ── Types ─────────────────────────────────────────────────────

interface Operation {
  name: string;
  year: string;
}

// ── Helper Components ─────────────────────────────────────────

function Label({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition ${props.className ?? ''}`}
    />
  );
}

function Select({ children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { children: React.ReactNode }) {
  return (
    <select
      {...props}
      className={`w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent transition ${props.className ?? ''}`}
    >
      {children}
    </select>
  );
}

// ── Step Progressbar ──────────────────────────────────────────

function StepBar({ current }: { current: number }) {
  return (
    <div className="w-full flex items-center justify-center px-4 py-6">
      <div className="flex items-center gap-0 overflow-x-auto max-w-2xl w-full">
        {STEPS.map((label, i) => {
          const stepNum  = i + 1;
          const done     = stepNum < current;
          const active   = stepNum === current;

          return (
            <div key={label} className="flex items-center flex-1 min-w-0">
              {/* Step circle */}
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all
                    ${done   ? 'bg-teal-500 text-white' :
                      active ? 'bg-teal-500 text-white ring-4 ring-teal-100' :
                               'bg-gray-200 text-gray-400'}`}
                >
                  {done ? (
                    <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  ) : stepNum}
                </div>
                <span
                  className={`mt-1 text-[10px] text-center whitespace-nowrap font-medium
                    ${active ? 'text-teal-600' : done ? 'text-teal-500' : 'text-gray-400'}`}
                >
                  {label}
                </span>
              </div>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 ${done ? 'bg-teal-400' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Step 1: Personal Info ─────────────────────────────────────

function Step1({
  data, setData,
}: {
  data: Record<string, string>;
  setData: (d: Record<string, string>) => void;
}) {
  const selectedDepartment = data.department ?? '';
  const availableCourses = getCoursesByDepartmentCode(selectedDepartment);

  function set(key: string, val: string) {
    setData({ ...data, [key]: val });
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-800">Personal Information</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label required>Student ID</Label>
          <Input placeholder="e.g. 2023-0001" value={data.studentId ?? ''} onChange={e => set('studentId', e.target.value)} />
        </div>
        <div>
          <Label required>First Name</Label>
          <Input placeholder="First Name" value={data.firstName ?? ''} onChange={e => set('firstName', e.target.value)} />
        </div>
        <div>
          <Label required>Last Name</Label>
          <Input placeholder="Last Name" value={data.lastName ?? ''} onChange={e => set('lastName', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label>Middle Initial</Label>
          <Input placeholder="M.I." maxLength={3} value={data.middleInitial ?? ''} onChange={e => set('middleInitial', e.target.value)} />
        </div>
        <div>
          <Label required>College (Department)</Label>
          <Select
            value={selectedDepartment}
            onChange={e => {
              const nextDepartment = e.target.value;
              const nextCourses = getCoursesByDepartmentCode(nextDepartment);
              const currentCourse = data.course ?? '';

              setData({
                ...data,
                department: nextDepartment,
                course: nextCourses.includes(currentCourse) ? currentCourse : '',
              });
            }}
          >
            <option value="">Select College (Department)</option>
            {DEPARTMENT_COURSE_MAP.map((entry) => (
              <option key={entry.code} value={entry.code}>{`${entry.name} (${entry.code})`}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label required>Course</Label>
          <Select
            value={data.course ?? ''}
            onChange={e => set('course', e.target.value)}
            disabled={!selectedDepartment}
          >
            <option value="">{selectedDepartment ? 'Select Course' : 'Select College First'}</option>
            {availableCourses.map((course) => (
              <option key={course} value={course}>{course}</option>
            ))}
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <Label required>Age</Label>
          <Input type="number" placeholder="Age" min="16" max="60" value={data.age ?? ''} onChange={e => set('age', e.target.value)} />
        </div>
        <div>
          <Label required>Sex</Label>
          <div className="flex gap-6 mt-3">
            {['Male', 'Female'].map(s => (
              <label key={s} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                <input
                  type="radio" name="sex" value={s}
                  checked={data.sex === s}
                  onChange={() => set('sex', s)}
                  className="accent-teal-500"
                />
                {s}
              </label>
            ))}
          </div>
        </div>
        <div>
          <Label required>Birthday</Label>
          <Input type="date" value={data.birthday ?? ''} onChange={e => set('birthday', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Civil Status</Label>
          <Select value={data.civilStatus ?? ''} onChange={e => set('civilStatus', e.target.value)}>
            <option value="">Select Status</option>
            {CIVIL_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </Select>
        </div>
        <div>
          <Label required>Contact Number</Label>
          <Input placeholder="09XX-XXX-XXXX" value={data.contact ?? ''} onChange={e => set('contact', e.target.value)} />
        </div>
      </div>

      <div>
        <Label required>Email Address</Label>
        <Input type="email" placeholder="student@gchealth.edu" value={data.email ?? ''} onChange={e => set('email', e.target.value)} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label required>Password</Label>
          <Input
            type="password"
            placeholder="Minimum 8 characters"
            value={data.password ?? ''}
            onChange={e => set('password', e.target.value)}
          />
        </div>
        <div>
          <Label required>Confirm Password</Label>
          <Input
            type="password"
            placeholder="Re-enter password"
            value={data.confirmPassword ?? ''}
            onChange={e => set('confirmPassword', e.target.value)}
          />
        </div>
      </div>

      <div>
        <Label>Home Address</Label>
        <Input placeholder="Complete home address" value={data.address ?? ''} onChange={e => set('address', e.target.value)} />
      </div>
    </div>
  );
}

// ── Step 2: Emergency Contact ────────────────────────────────

function Step2({
  data, setData,
}: {
  data: Record<string, string>;
  setData: (d: Record<string, string>) => void;
}) {
  function set(key: string, val: string) {
    setData({ ...data, [key]: val });
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-800">Emergency Contact</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label required>Contact Person Name</Label>
          <Input placeholder="Full name" value={data.contactName ?? ''} onChange={e => set('contactName', e.target.value)} />
        </div>
        <div>
          <Label required>Relationship</Label>
          <Select value={data.relationship ?? ''} onChange={e => set('relationship', e.target.value)}>
            <option value="">Select Relationship</option>
            {RELATIONSHIPS.map(r => <option key={r} value={r}>{r}</option>)}
          </Select>
        </div>
      </div>

      <div>
        <Label required>Contact Number</Label>
        <Input placeholder="09XX-XXX-XXXX" value={data.emergencyContact ?? ''} onChange={e => set('emergencyContact', e.target.value)} />
      </div>

      <div>
        <Label>Complete Address</Label>
        <Input placeholder="Street, Barangay, City, Province" value={data.emergencyAddress ?? ''} onChange={e => set('emergencyAddress', e.target.value)} />
      </div>
    </div>
  );
}

// ── Step 3: Medical History ──────────────────────────────────

function Step3({
  conditions, setConditions,
  extras, setExtras,
}: {
  conditions: string[];
  setConditions: (c: string[]) => void;
  extras: Record<string, string>;
  setExtras: (e: Record<string, string>) => void;
}) {
  function toggle(cond: string) {
    setConditions(
      conditions.includes(cond)
        ? conditions.filter(c => c !== cond)
        : [...conditions, cond]
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-800">Medical History</h2>
      <p className="text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
        Please check all conditions that apply to you, past or present.
      </p>

      <div className="grid grid-cols-2 gap-3">
        {MEDICAL_CONDITIONS.map(cond => (
          <label key={cond} className="flex items-center gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50 transition">
            <input
              type="checkbox"
              checked={conditions.includes(cond)}
              onChange={() => toggle(cond)}
              className="w-4 h-4 accent-teal-500 shrink-0"
            />
            <span className="text-sm text-gray-700">{cond}</span>
          </label>
        ))}
      </div>

      {/* Others */}
      <div>
        <Label>Others (please specify)</Label>
        <Input placeholder="e.g. Migraine, Eczema" value={extras.others ?? ''} onChange={e => setExtras({ ...extras, others: e.target.value })} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label required>Blood Type</Label>
          <Select value={extras.bloodType ?? ''} onChange={e => setExtras({ ...extras, bloodType: e.target.value })}>
            <option value="">Select Blood Type</option>
            {BLOOD_TYPES.map(b => <option key={b} value={b}>{b}</option>)}
          </Select>
        </div>
        <div>
          <Label>Allergies (comma separated)</Label>
          <Input placeholder="e.g. Penicillin, Peanuts" value={extras.allergies ?? ''} onChange={e => setExtras({ ...extras, allergies: e.target.value })} />
        </div>
      </div>

      <div>
        <Label>Existing Conditions (comma separated)</Label>
        <Input placeholder="e.g. Asthma, Hypertension" value={extras.existingConditions ?? ''} onChange={e => setExtras({ ...extras, existingConditions: e.target.value })} />
      </div>
    </div>
  );
}

// ── Step 4: Surgical History ─────────────────────────────────

function Step4({
  hadSurgery, setHadSurgery,
  operations, setOperations,
}: {
  hadSurgery: boolean | null;
  setHadSurgery: (v: boolean) => void;
  operations: Operation[];
  setOperations: (ops: Operation[]) => void;
}) {
  function addOp() {
    setOperations([...operations, { name: '', year: '' }]);
  }

  function updateOp(idx: number, key: keyof Operation, val: string) {
    setOperations(operations.map((op, i) => i === idx ? { ...op, [key]: val } : op));
  }

  function removeOp(idx: number) {
    setOperations(operations.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-semibold text-gray-800">Surgical History</h2>
      <p className="text-sm text-gray-600">Have you had any operation/surgery in the past?</p>

      <div className="grid grid-cols-2 gap-4 max-w-sm">
        {[true, false].map(val => (
          <button
            key={String(val)}
            type="button"
            onClick={() => {
              setHadSurgery(val);
              if (!val) setOperations([]);
            }}
            className={`py-4 rounded-xl border-2 text-sm font-semibold uppercase transition-all
              ${hadSurgery === val
                ? 'border-teal-500 bg-teal-50 text-teal-700'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}
          >
            {val ? 'YES' : 'NO'}
          </button>
        ))}
      </div>

      {hadSurgery === false && (
        <div className="flex flex-col items-center gap-2 py-6 bg-teal-50 rounded-xl border border-teal-100">
          <svg className="w-8 h-8 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-teal-700 font-medium">No surgical history recorded.</p>
        </div>
      )}

      {hadSurgery === true && (
        <div className="space-y-3">
          {operations.map((op, i) => (
            <div key={i} className="flex gap-3 items-center bg-gray-50 border border-gray-200 rounded-xl p-3">
              <div className="flex-1">
                <Input
                  placeholder="Operation name"
                  value={op.name}
                  onChange={e => updateOp(i, 'name', e.target.value)}
                />
              </div>
              <div className="w-28">
                <Input
                  placeholder="Year"
                  type="number"
                  min="1950"
                  max={new Date().getFullYear()}
                  value={op.year}
                  onChange={e => updateOp(i, 'year', e.target.value)}
                />
              </div>
              <button
                type="button"
                onClick={() => removeOp(i)}
                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addOp}
            className="w-full py-2.5 border-2 border-dashed border-teal-300 rounded-xl text-sm text-teal-600 hover:border-teal-500 hover:bg-teal-50 transition-all font-medium"
          >
            + Add Another Operation
          </button>
        </div>
      )}
    </div>
  );
}

// ── Step 5: Data Privacy ─────────────────────────────────────

function Step5({ agreed, setAgreed }: { agreed: boolean; setAgreed: (v: boolean) => void }) {
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="space-y-5">
      <h2 className="text-xl font-bold text-gray-800 text-center">Data Privacy Consent and Waiver</h2>
      <p className="text-xs text-center text-gray-500">Republic Act No. 10173 — Data Privacy Act of 2012</p>

      <div className="bg-white border border-gray-200 rounded-xl p-5 text-sm text-gray-700 leading-relaxed space-y-4 max-h-64 overflow-y-auto">
        <p>
          By signing this waiver, I, the undersigned student, voluntarily and willingly consent to the collection,
          processing, and storage of my personal and sensitive personal information by GC HealthLink / Gordon College
          Clinic for the purpose of maintaining my health records, providing medical services, and ensuring campus
          health and safety.
        </p>
        <p className="font-medium">I understand and acknowledge that:</p>
        <ul className="list-disc pl-5 space-y-2 text-gray-600">
          <li>I have the right to access my personal data. Requests for access shall be processed within five (5) working days from the date of request.</li>
          <li>The clinic shall respect my privacy and is accountable for protecting my information in accordance with the Data Privacy Act of 2012.</li>
          <li>My personal information shall only be used for legitimate health-related purposes and shall not be disclosed to unauthorized third parties without my explicit consent.</li>
          <li>I may withdraw my consent at any time by submitting a written request to the clinic. However, I may withdraw my consent at any time by submitting a written request to the clinic.</li>
        </ul>
        <p>
          I have read and understood the above terms and conditions regarding the collection and use of my personal information.
        </p>
      </div>

      <label className="flex items-start gap-3 cursor-pointer p-4 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition">
        <input
          type="checkbox"
          checked={agreed}
          onChange={e => setAgreed(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-teal-500 shrink-0"
        />
        <span className="text-sm text-gray-700">
          I have read, understood, and agree to the Data Privacy Consent and Waiver above.
        </span>
      </label>

      <p className="text-xs text-gray-400 text-right">Date Signed: {today}</p>
    </div>
  );
}

// ── Main Registration Page ────────────────────────────────────

export default function RegisterPage() {
  const router = useRouter();

  // Step counter
  const [step, setStep] = useState(1);

  // Form state
  const [personal,   setPersonal]   = useState<Record<string, string>>({});
  const [emergency,  setEmergency]  = useState<Record<string, string>>({});
  const [conditions, setConditions] = useState<string[]>([]);
  const [medExtras,  setMedExtras]  = useState<Record<string, string>>({});
  const [hadSurgery, setHadSurgery] = useState<boolean | null>(null);
  const [operations, setOperations] = useState<Operation[]>([]);
  const [agreed,     setAgreed]     = useState(false);
  const [submitted,  setSubmitted]  = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  function handleNext() {
    if (step < STEPS.length) setStep(s => s + 1);
  }

  function handleBack() {
    if (step > 1) setStep(s => s - 1);
  }

  async function handleSubmit() {
    setSubmitError('');

    const department = (personal.department ?? '').trim();
    const course = (personal.course ?? '').trim();
    const password = (personal.password ?? '').trim();
    const confirmPassword = (personal.confirmPassword ?? '').trim();

    if (!isValidDepartmentCode(department)) {
      setSubmitError('Please select a valid college (department).');
      return;
    }

    if (!isValidCourseForDepartment(course, department)) {
      setSubmitError('Please select a valid course for the selected college.');
      return;
    }

    if (!password || password.length < 8) {
      setSubmitError('Password is required and must be at least 8 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setSubmitError('Password and confirm password do not match.');
      return;
    }

    if (!agreed) {
      setSubmitError('You must agree to the data privacy consent before submitting.');
      return;
    }

    const payload = {
      personal,
      emergency: {
        name: emergency.contactName ?? '',
        relationship: emergency.relationship ?? '',
        contact: emergency.emergencyContact ?? '',
        address: emergency.emergencyAddress ?? '',
      },
      medical: {
        conditions,
        others: medExtras.others ?? '',
        bloodType: medExtras.bloodType ?? '',
        allergies: medExtras.allergies ?? '',
        existingConditions: medExtras.existingConditions ?? '',
      },
      surgical: {
        hasSurgery: hadSurgery,
        entries: operations.map((operation) => ({
          operation: operation.name,
          year: operation.year,
        })),
      },
      consentAgreed: agreed,
      credentials: {
        password,
      },
    };

    try {
      setSubmitLoading(true);
      await api.post('/students/registration/public', payload);
      setSubmitted(true);
    } catch (error) {
      if (error instanceof ApiError) {
        setSubmitError(error.message);
      } else {
        setSubmitError('Failed to submit registration. Please try again.');
      }
    } finally {
      setSubmitLoading(false);
    }
  }

  // ── Success Screen ─────────────────────────────────────────
  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg p-10 max-w-md w-full text-center space-y-4">
          <div className="w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-800">Registration Submitted!</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            Your health registration has been successfully submitted. The clinic will review and process your
            records. You may now log in to view your health profile.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-teal-500 hover:bg-teal-600 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // ── Form ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">

      {/* Top bar */}
      <div className="bg-white border-b border-gray-100 py-4 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-teal-500 rounded-xl flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <span className="text-sm font-bold text-gray-800">GC HealthLink</span>
        </div>
        <Link href="/login" className="text-sm text-teal-600 hover:text-teal-700 font-medium">
          Back to Login
        </Link>
      </div>

      {/* Header */}
      <div className="text-center pt-6 pb-2">
        <h1 className="text-2xl font-bold text-gray-800">Student Health Registration</h1>
        <p className="text-sm text-gray-500 mt-1">Please complete your health record information accurately.</p>
      </div>

      {/* Step progress */}
      <StepBar current={step} />

      {/* Card */}
      <div className="max-w-2xl mx-auto px-4 pb-12">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sm:p-8">

          {/* Step content */}
          {step === 1 && <Step1 data={personal}  setData={setPersonal} />}
          {step === 2 && <Step2 data={emergency} setData={setEmergency} />}
          {step === 3 && (
            <Step3
              conditions={conditions} setConditions={setConditions}
              extras={medExtras} setExtras={setMedExtras}
            />
          )}
          {step === 4 && (
            <Step4
              hadSurgery={hadSurgery} setHadSurgery={setHadSurgery}
              operations={operations} setOperations={setOperations}
            />
          )}
          {step === 5 && <Step5 agreed={agreed} setAgreed={setAgreed} />}

          {submitError && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {submitError}
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={handleBack}
              disabled={step === 1}
              className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            {step < STEPS.length ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-600 text-white rounded-xl text-sm font-semibold transition"
              >
                Next Step
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!agreed || submitLoading}
                className="flex items-center gap-2 px-5 py-2.5 bg-teal-500 hover:bg-teal-600 disabled:bg-teal-300 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition"
              >
                {submitLoading ? 'Submitting…' : 'Submit Registration'}
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          Already registered?{' '}
          <Link href="/login" className="text-teal-600 hover:underline font-medium">Sign in here</Link>
        </p>
      </div>
    </div>
  );
}
