'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
// TODO (backend): uncomment these two lines when the API is live
// import { api, ApiError } from '@/lib/api';
// import { getToken }      from '@/lib/auth';

// ── Constants ──────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Personal Info' },
  { id: 2, label: 'Emergency Contact' },
  { id: 3, label: 'Medical History' },
  { id: 4, label: 'Surgical History' },
  { id: 5, label: 'Data Privacy' },
  { id: 6, label: 'E-Signature' },
];

const COURSES = [
  'BS Civil Engineering', 'BS Computer Engineering', 'BS Electrical Engineering',
  'BS Nursing', 'BS Education', 'BS Business Administration',
  'BS Information Technology', 'BS Computer Science',
];

const DEPARTMENTS = [
  'College of Engineering', 'College of Education', 'College of Business',
  'College of Nursing', 'College of Arts and Sciences',
  'College of Computing and Information Sciences',
];

const RELATIONSHIPS = [
  'Mother', 'Father', 'Sibling', 'Spouse', 'Guardian', 'Relative', 'Friend',
];

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const CONDITIONS_LIST = [
  ['Allergy',       'Asthma'],
  ['Chickenpox',    'Diabetes'],
  ['Cysticercosis', 'Epilepsy'],
  ['Heart Disorder','Hepatitis'],
  ['Hypertension',  'Measles'],
  ['Mumps',         'Anxiety Disorder'],
  ['Panic Attack',  'Pneumonia'],
  ['PTB (Pulmonary Tuberculosis)', 'Typhoid Fever'],
  ['COVID-19',      'UTI'],
];

// ── Helpers ────────────────────────────────────────────────────────────────────

const inputCls = 'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent placeholder:text-gray-400 dark:placeholder:text-gray-500 transition';
const selectCls = `${inputCls} appearance-none`;
const labelCls  = 'block text-xs text-gray-500 dark:text-gray-400 mb-1';

function Field({ label, children, className = '' }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
}

// ── Stepper ────────────────────────────────────────────────────────────────────

function Stepper({ current }: { current: number }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm px-6 py-5 mb-5">
      <ol className="flex items-start justify-between gap-0">
        {STEPS.map((s, idx) => {
          const done    = current > s.id;
          const active  = current === s.id;
          const future  = current < s.id;

          return (
            <li key={s.id} className="flex flex-col items-center flex-1 relative">
              {/* Line before this step */}
              {idx > 0 && (
                <div className={`absolute top-4 right-1/2 left-0 h-0.5 -translate-y-1/2 ${done || active ? 'bg-teal-400' : 'bg-gray-200'}`}
                  style={{ left: '-50%', right: '50%', position: 'absolute', top: '16px' }} />
              )}
              {/* Line after (for all but last) */}
              {idx < STEPS.length - 1 && (
                <div className={`absolute h-0.5 ${done ? 'bg-teal-400' : 'bg-gray-200'}`}
                  style={{ left: '50%', right: '-50%', top: '16px' }} />
              )}

              {/* Circle */}
              <div className="relative z-10">
                {done ? (
                  <div className="w-8 h-8 rounded-full border-2 border-teal-400 bg-white dark:bg-gray-800 flex items-center justify-center">
                    <svg className="w-4 h-4 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                ) : active ? (
                  <div className="w-8 h-8 rounded-full bg-teal-600 flex items-center justify-center text-sm font-bold text-white shadow-md">
                    {s.id}
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full border-2 border-gray-200 bg-white dark:bg-gray-700 flex items-center justify-center text-sm font-semibold text-gray-300">
                    {s.id}
                  </div>
                )}
              </div>

              {/* Label */}
              <span className={`mt-2 text-[11px] text-center leading-tight ${active ? 'text-teal-600 font-semibold' : done ? 'text-gray-500' : 'text-gray-300'}`}>
                {s.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ── Step 1: Personal Info ──────────────────────────────────────────────────────

interface PersonalData {
  studentId: string; firstName: string; lastName: string;
  middleInitial: string; course: string; department: string;
  age: string; sex: string; birthday: string;
  civilStatus: string; contact: string; email: string; address: string;
}

function StepPersonalInfo({ data, set }: { data: PersonalData; set: (k: keyof PersonalData, v: string) => void }) {
  return (
    <div>
      <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-5">Personal Information</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-4">
          <Field label="Student ID">
            <input className={inputCls} placeholder="e.g. 2023-0001" value={data.studentId} onChange={e => set('studentId', e.target.value)} />
          </Field>
          <Field label="First Name">
            <input className={inputCls} placeholder="" value={data.firstName} onChange={e => set('firstName', e.target.value)} />
          </Field>
          <Field label="Last Name">
            <input className={inputCls} placeholder="" value={data.lastName} onChange={e => set('lastName', e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Field label="Middle Initial">
            <input className={inputCls} placeholder="" value={data.middleInitial} onChange={e => set('middleInitial', e.target.value)} />
          </Field>
          <Field label="Course">
            <select className={selectCls} value={data.course} onChange={e => set('course', e.target.value)}>
              <option value="">Select Course</option>
              {COURSES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Department">
            <select className={selectCls} value={data.department} onChange={e => set('department', e.target.value)}>
              <option value="">Select Department</option>
              {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className={labelCls}>Age</label>
            <input className={inputCls} placeholder="" value={data.age} onChange={e => set('age', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Sex</label>
            <div className="flex items-center gap-5 h-[38px]">
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input type="radio" name="sex" value="Male"   checked={data.sex === 'Male'}   onChange={() => set('sex', 'Male')}   className="accent-teal-500" /> Male
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input type="radio" name="sex" value="Female" checked={data.sex === 'Female'} onChange={() => set('sex', 'Female')} className="accent-teal-500" /> Female
              </label>
            </div>
          </div>
          <Field label="Birthday">
            <input type="date" className={inputCls} placeholder="mm/dd/yyyy" value={data.birthday} onChange={e => set('birthday', e.target.value)} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Civil Status">
            <select className={selectCls} value={data.civilStatus} onChange={e => set('civilStatus', e.target.value)}>
              <option value="">Select Status</option>
              <option>Single</option><option>Married</option><option>Widowed</option>
            </select>
          </Field>
          <Field label="Contact Number">
            <input className={inputCls} placeholder="(XXX)-XXXX-XXXX" value={data.contact} onChange={e => set('contact', e.target.value)} />
          </Field>
        </div>

        <Field label="Email Address">
          <input type="email" className={inputCls} placeholder="student@gchealth.edu" value={data.email} onChange={e => set('email', e.target.value)} />
        </Field>
        <Field label="Home Address">
          <input className={inputCls} placeholder="" value={data.address} onChange={e => set('address', e.target.value)} />
        </Field>
      </div>
    </div>
  );
}

// ── Step 2: Emergency Contact ─────────────────────────────────────────────────

interface EmergencyData {
  name: string; relationship: string; contact: string; address: string;
}

function StepEmergency({ data, set }: { data: EmergencyData; set: (k: keyof EmergencyData, v: string) => void }) {
  return (
    <div>
      <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-5">Emergency Contact</h2>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Contact Person Name">
            <input className={inputCls} placeholder="" value={data.name} onChange={e => set('name', e.target.value)} />
          </Field>
          <Field label="Relationship">
            <select className={selectCls} value={data.relationship} onChange={e => set('relationship', e.target.value)}>
              <option value="">Select Relationship</option>
              {RELATIONSHIPS.map(r => <option key={r}>{r}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Contact Number">
          <input className={inputCls} placeholder="" value={data.contact} onChange={e => set('contact', e.target.value)} />
        </Field>
        <Field label="Complete Address">
          <input className={inputCls} placeholder="" value={data.address} onChange={e => set('address', e.target.value)} />
        </Field>
      </div>
    </div>
  );
}

// ── Step 3: Medical History ───────────────────────────────────────────────────

interface MedicalData {
  conditions: string[]; others: string; bloodType: string;
  allergies: string; existingConditions: string;
}

function StepMedicalHistory({ data, setData }: { data: MedicalData; setData: (d: MedicalData) => void }) {
  function toggle(cond: string) {
    const next = data.conditions.includes(cond)
      ? data.conditions.filter(c => c !== cond)
      : [...data.conditions, cond];
    setData({ ...data, conditions: next });
  }
  return (
    <div>
      <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4">Medical History</h2>
      <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm rounded-lg px-4 py-3 mb-4">
        Please check all conditions that apply to you, past or present.
      </div>
      <div className="space-y-2 mb-5">
        {CONDITIONS_LIST.map(([left, right], i) => (
          <div key={i} className="grid grid-cols-2 gap-4">
            {[left, right].map(cond => (
              <label key={cond} className="flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 accent-teal-500"
                  checked={data.conditions.includes(cond)}
                  onChange={() => toggle(cond)} />
                <span className="text-sm text-gray-700 dark:text-gray-300">{cond}</span>
              </label>
            ))}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
        <Field label="Others (please specify)">
          <input className={inputCls} placeholder="" value={data.others} onChange={e => setData({ ...data, others: e.target.value })} />
        </Field>
        <Field label="Blood Type">
          <select className={selectCls} value={data.bloodType} onChange={e => setData({ ...data, bloodType: e.target.value })}>
            <option value="">Select Blood Type</option>
            {BLOOD_TYPES.map(b => <option key={b}>{b}</option>)}
          </select>
        </Field>
        <Field label="Allergies (comma separated)">
          <input className={inputCls} placeholder="e.g. Penicillin, Peanuts" value={data.allergies} onChange={e => setData({ ...data, allergies: e.target.value })} />
        </Field>
        <Field label="Existing Conditions (comma separated)">
          <input className={inputCls} placeholder="e.g. Asthma, Hypertension" value={data.existingConditions} onChange={e => setData({ ...data, existingConditions: e.target.value })} />
        </Field>
      </div>
    </div>
  );
}

// ── Step 4: Surgical History ──────────────────────────────────────────────────

interface SurgicalEntry { operation: string; year: string; }
interface SurgicalData  { hasSurgery: boolean | null; entries: SurgicalEntry[]; }

function StepSurgicalHistory({ data, setData }: { data: SurgicalData; setData: (d: SurgicalData) => void }) {
  function addEntry() {
    setData({ ...data, entries: [...data.entries, { operation: '', year: '' }] });
  }
  function updateEntry(idx: number, field: keyof SurgicalEntry, val: string) {
    const entries = data.entries.map((e, i) => i === idx ? { ...e, [field]: val } : e);
    setData({ ...data, entries });
  }

  return (
    <div>
      <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-4">Surgical History</h2>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Have you had any operation/surgery in the past?</p>

      <div className="grid grid-cols-2 gap-3 mb-4">
        {[true, false].map(val => (
          <button key={String(val)}
            onClick={() => setData({ ...data, hasSurgery: val, entries: val && data.entries.length === 0 ? [{ operation: '', year: '' }] : data.entries })}
            className={`py-4 rounded-xl border-2 text-sm font-semibold tracking-wider transition
              ${data.hasSurgery === val
                ? 'border-teal-500 bg-teal-50 dark:bg-teal-900/30 text-teal-700'
                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'}`}>
            {val ? 'YES' : 'NO'}
          </button>
        ))}
      </div>

      {data.hasSurgery === true && (
        <div className="space-y-3">
          {data.entries.map((entry, idx) => (
            <div key={idx} className="grid grid-cols-2 gap-3">
              <Field label="Operation / Surgery">
                <input className={inputCls} placeholder="e.g. Appendectomy" value={entry.operation} onChange={e => updateEntry(idx, 'operation', e.target.value)} />
              </Field>
              <Field label="Year">
                <input className={inputCls} placeholder="e.g. 2020" value={entry.year} onChange={e => updateEntry(idx, 'year', e.target.value)} />
              </Field>
            </div>
          ))}
          <button onClick={addEntry}
            className="w-full py-2.5 border border-gray-200 dark:border-gray-600 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition">
            + Add Another Operation
          </button>
        </div>
      )}

      {data.hasSurgery === false && (
        <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-100 dark:border-teal-800 rounded-xl py-6 flex flex-col items-center gap-2">
          <svg className="w-8 h-8 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-teal-600">No surgical history recorded.</p>
        </div>
      )}
    </div>
  );
}

// ── Step 5: Data Privacy ──────────────────────────────────────────────────────

function StepDataPrivacy({ agreed, setAgreed }: { agreed: boolean; setAgreed: (v: boolean) => void }) {
  const today = new Date().toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  return (
    <div>
      <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1">Data Privacy Consent and Waiver</h2>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">Republic Act No. 10173 — Data Privacy Act of 2012</p>
      <div className="text-sm text-gray-700 dark:text-gray-300 space-y-3 mb-5 leading-relaxed">
        <p>
          By signing this waiver, I, the undersigned student, voluntarily and willingly consent to the collection,
          processing, and storage of my personal and sensitive personal information by GC HealthLink / Gordon College
          Clinic for the purpose of maintaining my health records, providing medical services, and ensuring campus
          health and safety.
        </p>
        <p className="font-semibold text-gray-800 dark:text-gray-100">I understand and acknowledge that:</p>
        <ul className="list-disc pl-5 space-y-1.5 text-gray-600 dark:text-gray-400">
          <li>I have the right to access my personal data. Requests for access shall be processed within five (5) working days from the date of request.</li>
          <li>The clinic shall respect my privacy and is accountable for protecting my personal information in accordance with the Data Privacy Act of 2012.</li>
          <li>My personal information shall only be used for legitimate health-related purposes and shall not be disclosed to unauthorized third parties without my explicit consent.</li>
          <li>I may withdraw my consent at any time by submitting a written request to the clinic. However, I may withdraw my consent at any time by submitting a written request to the clinic.</li>
        </ul>
        <p className="text-gray-600 dark:text-gray-400">
          I have read and understood the above terms and conditions regarding the collection and use of my personal information.
        </p>
      </div>
      <label className="flex items-start gap-3 cursor-pointer mb-4">
        <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)}
          className="w-4 h-4 mt-0.5 accent-teal-500 shrink-0" />
        <span className="text-sm text-gray-700 dark:text-gray-300">I have read, understood, and agree to the Data Privacy Consent and Waiver above.</span>
      </label>
      <p className="text-xs text-gray-400">Date Signed: {today}</p>
    </div>
  );
}

// ── Step 6: E-Signature ───────────────────────────────────────────────────────

function StepESignature({ sigFile, setSigFile }: { sigFile: File | null; setSigFile: (f: File | null) => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing   = useRef(false);
  const [hasDraw, setHasDraw] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.strokeStyle = '#1f2937';
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
  }, []);

  function getPos(e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) {
    const rect = canvasRef.current!.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: (e as React.MouseEvent).clientX - rect.left, y: (e as React.MouseEvent).clientY - rect.top };
  }

  function startDraw(e: React.MouseEvent<HTMLCanvasElement>) {
    drawing.current = true;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = getPos(e);
    ctx.beginPath(); ctx.moveTo(x, y);
  }

  function draw(e: React.MouseEvent<HTMLCanvasElement>) {
    if (!drawing.current) return;
    const ctx = canvasRef.current!.getContext('2d')!;
    const { x, y } = getPos(e);
    ctx.lineTo(x, y); ctx.stroke();
    setHasDraw(true);
  }

  function stopDraw() { drawing.current = false; }

  function clearCanvas() {
    const canvas = canvasRef.current!;
    canvas.getContext('2d')!.clearRect(0, 0, canvas.width, canvas.height);
    setHasDraw(false);
  }

  return (
    <div>
      <h2 className="text-base font-bold text-gray-800 dark:text-gray-100 mb-1">Upload Your Electronic Signature</h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">Please upload a clear image of your signature. This will be used for verification purposes.</p>

      {/* Upload area */}
      <label className="block border-2 border-dashed border-gray-200 dark:border-gray-600 rounded-xl p-8 text-center cursor-pointer hover:border-teal-300 hover:bg-teal-50/30 dark:hover:bg-teal-900/10 transition mb-5">
        <input type="file" accept=".png,.jpg,.jpeg" className="hidden"
          onChange={e => setSigFile(e.target.files?.[0] ?? null)} />
        <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        {sigFile ? (
          <p className="text-sm text-teal-600 font-medium">{sigFile.name}</p>
        ) : (
          <>
            <p className="text-sm text-gray-500 dark:text-gray-400"><span className="font-medium text-gray-700 dark:text-gray-300">Click to upload</span> or drag and drop</p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG up to 5MB</p>
          </>
        )}
      </label>

      {/* Draw area */}
      <div className="mb-1">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">Or draw your signature below</p>
          {hasDraw && (
            <button onClick={clearCanvas} className="text-xs text-gray-400 hover:text-red-500 transition">Clear</button>
          )}
        </div>
        <div className="border border-gray-200 dark:border-gray-600 rounded-xl overflow-hidden relative bg-white dark:bg-gray-900">
          {!hasDraw && (
            <p className="absolute inset-0 flex items-center justify-center text-3xl text-gray-200 font-light pointer-events-none select-none">
              Sign Here
            </p>
          )}
          <canvas ref={canvasRef} width={700} height={140} className="w-full block cursor-crosshair"
            onMouseDown={startDraw} onMouseMove={draw} onMouseUp={stopDraw} onMouseLeave={stopDraw} />
        </div>
      </div>
      <p className="text-xs text-gray-400 text-center mt-3">Your e-signature serves as your digital consent to this registration.</p>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RegistrationPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);

  // Persist submission across page navigations / refreshes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('gchl_reg_submitted');
      if (saved === 'true') setSubmitted(true);
    }
  }, []);

  /**
   * TODO (backend): replace this function body with:
   *
   *   setSubmitError('');
   *   setSubmitLoading(true);
   *   try {
   *     await api.post('/registration', { personal, emergency, medical, surgical }, getToken() ?? undefined);
   *     localStorage.setItem('gchl_reg_submitted', 'true');
   *     setSubmitted(true);
   *   } catch (err) {
   *     setSubmitError(err instanceof ApiError ? err.message : 'Submission failed. Please try again.');
   *   } finally {
   *     setSubmitLoading(false);
   *   }
   */
  function handleSubmit() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('gchl_reg_submitted', 'true');
    }
    setSubmitted(true);
  }

  const [personal, setPersonal]   = useState<Parameters<typeof StepPersonalInfo>[0]['data']>({
    studentId: '', firstName: '', lastName: '', middleInitial: '',
    course: '', department: '', age: '', sex: '', birthday: '',
    civilStatus: '', contact: '', email: '', address: '',
  });
  const [emergency, setEmergency] = useState<Parameters<typeof StepEmergency>[0]['data']>({
    name: '', relationship: '', contact: '', address: '',
  });
  const [medical, setMedical]     = useState<Parameters<typeof StepMedicalHistory>[0]['data']>({
    conditions: [], others: '', bloodType: '', allergies: '', existingConditions: '',
  });
  const [surgical, setSurgical]   = useState<SurgicalData>({ hasSurgery: null, entries: [] });
  const [privacyAgreed, setPrivacyAgreed] = useState(false);
  const [sigFile, setSigFile]     = useState<File | null>(null);

  if (submitted) {
    return (
      <div className="p-5 max-w-lg mx-auto mt-10">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-10 text-center">
          <div className="w-16 h-16 bg-teal-100 dark:bg-teal-900/40 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-2">Registration Submitted!</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Your health registration has been received.</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">The clinic staff will review and verify your record. You will be notified once it is approved.</p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700 rounded-xl mb-6">
            <svg className="w-4 h-4 text-yellow-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400">Pending clinic verification</span>
          </div>
          <br />
          <button onClick={() => router.push('/dashboard/student')}
            className="px-6 py-2.5 bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold rounded-xl transition">
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-5 max-w-3xl mx-auto">

      {/* Page title */}
      <div className="text-center mb-5">
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Student Health Registration</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Please complete your health record information accurately.</p>
      </div>

      {/* Stepper */}
      <Stepper current={step} />

      {/* Form card */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6 min-h-[320px]">
        {step === 1 && <StepPersonalInfo  data={personal}  set={(k, v) => setPersonal(p  => ({ ...p,  [k]: v }))} />}
        {step === 2 && <StepEmergency    data={emergency} set={(k, v) => setEmergency(p => ({ ...p,  [k]: v }))} />}
        {step === 3 && <StepMedicalHistory data={medical}  setData={setMedical} />}
        {step === 4 && <StepSurgicalHistory data={surgical} setData={setSurgical} />}
        {step === 5 && <StepDataPrivacy  agreed={privacyAgreed} setAgreed={setPrivacyAgreed} />}
        {step === 6 && <StepESignature   sigFile={sigFile} setSigFile={setSigFile} />}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center mt-5 pb-4">
        <button onClick={() => setStep(s => s - 1)} disabled={step === 1}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Previous
        </button>

        {step < STEPS.length ? (
          <button onClick={() => setStep(s => s + 1)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition">
            Next Step
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        ) : (
          <div className="flex flex-col items-end gap-2">
            {/* TODO (backend): render submitError here when API is live */}
            <button onClick={handleSubmit}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold transition">
              Submit Registration
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
