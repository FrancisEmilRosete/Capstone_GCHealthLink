'use client';

import { useEffect, useId, useRef, useState } from 'react';

type FormTab = 'medicalHistory' | 'physicalExamination' | 'labResults';
type YesNoChoice = 'YES' | 'NO';

type MedicalConditionKey =
  | 'asthma'
  | 'chickenPox'
  | 'diabetes'
  | 'dysmenorrhea'
  | 'epilepsySeizure'
  | 'heartDisorder'
  | 'hepatitis'
  | 'hypertension'
  | 'measles'
  | 'mumps'
  | 'anxietyDisorder'
  | 'panicAttackHyperventilation'
  | 'pneumonia'
  | 'ptbPrimaryComplex'
  | 'typhoidFever'
  | 'covid19'
  | 'urinaryTractInfection';

export interface PhysicalExamRecordFormData {
  // Tab 1: Medical History
  allergy: string;
  asthma: boolean;
  chickenPox: boolean;
  diabetes: boolean;
  dysmenorrhea: boolean;
  epilepsySeizure: boolean;
  heartDisorder: boolean;
  hepatitis: boolean;
  hypertension: boolean;
  measles: boolean;
  mumps: boolean;
  anxietyDisorder: boolean;
  panicAttackHyperventilation: boolean;
  pneumonia: boolean;
  ptbPrimaryComplex: boolean;
  typhoidFever: boolean;
  covid19: boolean;
  urinaryTractInfection: boolean;
  hasPastOperation: YesNoChoice;
  operationNatureAndDate: string;

  // Tab 2: Physical Examination
  yearLevel: string;
  examDate: string;
  bp: string;
  cr: string;
  rr: string;
  temp: string;
  weight: string;
  height: string;
  bmi: string;
  visualAcuity: string;
  skin: string;
  heent: string;
  chestLungs: string;
  heart: string;
  abdomen: string;
  extremities: string;
  others: string;
  examinedBy: string;

  // Tab 3: Lab Results
  cbcDate: string;
  hgb: string;
  hct: string;
  wbc: string;
  pltCt: string;
  bloodType: string;
  uaDate: string;
  glucoseSugar: string;
  protein: string;
  chestXrayDate: string;
  xrayResult: 'NORMAL' | 'ABNORMAL' | '';
  abnormalFindings: string;
  labOthers: string;
  dateReceived: string;
}

const TODAY = new Date().toISOString().slice(0, 10);

const INITIAL_FORM: PhysicalExamRecordFormData = {
  allergy: '',
  asthma: false,
  chickenPox: false,
  diabetes: false,
  dysmenorrhea: false,
  epilepsySeizure: false,
  heartDisorder: false,
  hepatitis: false,
  hypertension: false,
  measles: false,
  mumps: false,
  anxietyDisorder: false,
  panicAttackHyperventilation: false,
  pneumonia: false,
  ptbPrimaryComplex: false,
  typhoidFever: false,
  covid19: false,
  urinaryTractInfection: false,
  hasPastOperation: 'NO',
  operationNatureAndDate: '',
  yearLevel: 'Yr. 1',
  examDate: TODAY,
  bp: '',
  cr: '',
  rr: '',
  temp: '',
  weight: '',
  height: '',
  bmi: '',
  visualAcuity: '',
  skin: '',
  heent: '',
  chestLungs: '',
  heart: '',
  abdomen: '',
  extremities: '',
  others: '',
  examinedBy: '',
  cbcDate: TODAY,
  hgb: '',
  hct: '',
  wbc: '',
  pltCt: '',
  bloodType: '',
  uaDate: TODAY,
  glucoseSugar: '',
  protein: '',
  chestXrayDate: TODAY,
  xrayResult: '',
  abnormalFindings: '',
  labOthers: '',
  dateReceived: TODAY,
};

interface PhysicalExamModalProps {
  studentName: string;
  onClose: () => void;
  onSave: (data: PhysicalExamRecordFormData) => void;
}

const TABS: Array<{ id: FormTab; label: string }> = [
  { id: 'medicalHistory', label: 'Medical History' },
  { id: 'physicalExamination', label: 'Physical Examination' },
  { id: 'labResults', label: 'Lab Results' },
];

const MEDICAL_CONDITIONS: Array<{ key: MedicalConditionKey; label: string }> = [
  { key: 'asthma', label: 'Asthma' },
  { key: 'chickenPox', label: 'Chicken Pox' },
  { key: 'diabetes', label: 'Diabetes' },
  { key: 'dysmenorrhea', label: 'Dysmenorrhea' },
  { key: 'epilepsySeizure', label: 'Epilepsy/Seizure' },
  { key: 'heartDisorder', label: 'Heart disorder' },
  { key: 'hepatitis', label: 'Hepatitis' },
  { key: 'hypertension', label: 'Hypertension' },
  { key: 'measles', label: 'Measles' },
  { key: 'mumps', label: 'Mumps' },
  { key: 'anxietyDisorder', label: 'Anxiety disorder' },
  { key: 'panicAttackHyperventilation', label: 'Panic attack/Hyperventilation' },
  { key: 'pneumonia', label: 'Pneumonia' },
  { key: 'ptbPrimaryComplex', label: 'PTB/Primary Complex' },
  { key: 'typhoidFever', label: 'Typhoid Fever' },
  { key: 'covid19', label: 'COVID-19' },
  { key: 'urinaryTractInfection', label: 'Urinary Tract Infection' },
];

const INPUT_CLASS = 'w-full border border-gray-300 rounded p-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500';

const FIELD_LABELS: Record<string, string> = {
  allergy: 'Allergy',
  operationNatureAndDate: 'Operation details',
  bp: 'BP',
  cr: 'CR',
  rr: 'RR',
  temp: 'Temp',
  weight: 'Weight',
  height: 'Height',
  visualAcuity: 'Visual Acuity',
  skin: 'Skin',
  heent: 'HEENT',
  chestLungs: 'Chest/Lungs',
  heart: 'Heart',
  abdomen: 'Abdomen',
  extremities: 'Extremities',
  others: 'Others (specify)',
  examinedBy: 'Examined by',
  hgb: 'Hgb',
  hct: 'Hct',
  wbc: 'WBC',
  pltCt: 'Plt. Ct.',
  bloodType: 'Bld. Type',
  glucoseSugar: 'Glucose/Sugar',
  protein: 'Protein',
  xrayResult: 'Chest X-ray Result',
  abnormalFindings: 'Abnormal Findings',
  labOthers: 'Lab Others',
};

const PHYSICAL_REQUIRED_FIELDS: Array<keyof PhysicalExamRecordFormData> = [
  'allergy',
  'bp',
  'cr',
  'rr',
  'temp',
  'weight',
  'height',
  'visualAcuity',
  'skin',
  'heent',
  'chestLungs',
  'heart',
  'abdomen',
  'extremities',
  'others',
  'examinedBy',
  'hgb',
  'hct',
  'wbc',
  'pltCt',
  'bloodType',
  'glucoseSugar',
  'protein',
  'xrayResult',
  'labOthers',
];

const FIELD_TAB: Record<string, FormTab> = {
  allergy: 'medicalHistory',
  operationNatureAndDate: 'medicalHistory',
  bp: 'physicalExamination',
  cr: 'physicalExamination',
  rr: 'physicalExamination',
  temp: 'physicalExamination',
  weight: 'physicalExamination',
  height: 'physicalExamination',
  visualAcuity: 'physicalExamination',
  skin: 'physicalExamination',
  heent: 'physicalExamination',
  chestLungs: 'physicalExamination',
  heart: 'physicalExamination',
  abdomen: 'physicalExamination',
  extremities: 'physicalExamination',
  others: 'physicalExamination',
  examinedBy: 'physicalExamination',
  hgb: 'labResults',
  hct: 'labResults',
  wbc: 'labResults',
  pltCt: 'labResults',
  bloodType: 'labResults',
  glucoseSugar: 'labResults',
  protein: 'labResults',
  xrayResult: 'labResults',
  abnormalFindings: 'labResults',
  labOthers: 'labResults',
};

function TextField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  readOnly = false,
  error = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  readOnly?: boolean;
  error?: string;
}) {
  const inputId = useId();

  const className = readOnly
    ? 'w-full border border-gray-200 rounded p-2.5 text-sm text-gray-700 bg-gray-100'
    : `${INPUT_CLASS} ${error ? 'border-red-300 focus:ring-red-300 focus:border-red-400' : ''}`.trim();

  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-xs font-semibold text-gray-600">
        {label}
      </label>
      <input
        id={inputId}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        className={className}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  rows = 3,
  placeholder,
  error = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  placeholder?: string;
  error?: string;
}) {
  const inputId = useId();

  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-xs font-semibold text-gray-600">
        {label}
      </label>
      <textarea
        id={inputId}
        rows={rows}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className={`${INPUT_CLASS} resize-none ${error ? 'border-red-300 focus:ring-red-300 focus:border-red-400' : ''}`.trim()}
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

export default function PhysicalExamModal({ studentName, onClose, onSave }: PhysicalExamModalProps) {
  const [form, setForm] = useState<PhysicalExamRecordFormData>(INITIAL_FORM);
  const [activeTab, setActiveTab] = useState<FormTab>('medicalHistory');
  const [errors, setErrors] = useState<Record<string, string>>({});

  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const heightMeters = Number.parseFloat(form.height) / 100;
    const weightKg = Number.parseFloat(form.weight);
    const nextBmi = heightMeters > 0 && weightKg > 0
      ? (weightKg / (heightMeters * heightMeters)).toFixed(1)
      : '';

    if (form.bmi !== nextBmi) {
      setForm((current) => ({ ...current, bmi: nextBmi }));
    }
  }, [form.height, form.weight, form.bmi]);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
        return;
      }

      if (event.key !== 'Tab' || !dialogRef.current) {
        return;
      }

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])',
      );

      if (focusable.length === 0) {
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    window.addEventListener('keydown', onKeyDown);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  function handleBackdrop(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === overlayRef.current) {
      onClose();
    }
  }

  function setField<K extends keyof PhysicalExamRecordFormData>(
    field: K,
    value: PhysicalExamRecordFormData[K],
  ) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field as string] && field !== 'hasPastOperation' && field !== 'xrayResult') {
        return current;
      }
      const next = { ...current };
      delete next[field as string];
      if (field === 'hasPastOperation' && value === 'NO') {
        delete next.operationNatureAndDate;
      }
      if (field === 'xrayResult' && value === 'NORMAL') {
        delete next.abnormalFindings;
      }
      return next;
    });
  }

  function handleSave() {
    const nextErrors: Record<string, string> = {};

    PHYSICAL_REQUIRED_FIELDS.forEach((field) => {
      if (!String(form[field] ?? '').trim()) {
        nextErrors[field] = `${FIELD_LABELS[field]} is required.`;
      }
    });

    if (form.hasPastOperation === 'YES' && !form.operationNatureAndDate.trim()) {
      nextErrors.operationNatureAndDate = 'Operation details are required when past operation is YES.';
    }

    if (form.xrayResult === 'ABNORMAL' && !form.abnormalFindings.trim()) {
      nextErrors.abnormalFindings = 'Abnormal findings are required for an abnormal X-ray result.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      const firstMissingField = Object.keys(nextErrors)[0];
      const targetTab = FIELD_TAB[firstMissingField];
      if (targetTab) {
        setActiveTab(targetTab);
      }
      return;
    }

    setErrors({});
    onSave(form);
    onClose();
  }

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleBackdrop}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="physical-exam-modal-title"
        tabIndex={-1}
        className="relative bg-white rounded-lg shadow-xl w-full max-w-5xl p-6 md:p-8 max-h-[92vh] overflow-y-auto"
      >
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h2 id="physical-exam-modal-title" className="text-xl font-bold text-teal-800">Physical Exam Form</h2>
            <p className="mt-1 text-xs text-gray-500">Gordon College Clinic - Staff Data Entry</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close physical exam modal"
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-5 rounded-md border border-gray-200 bg-gray-50 p-3">
          <TextField label="Student" value={studentName} onChange={() => {}} readOnly />
        </div>

        <div className="mb-5 flex gap-2 overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-3 py-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-teal-600 text-white'
                  : 'bg-white border border-gray-300 text-gray-600 hover:border-teal-400 hover:text-teal-600'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-5">
          {Object.keys(errors).length > 0 && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              Please complete all required fields before saving.
            </div>
          )}

          {activeTab === 'medicalHistory' && (
            <>
              <TextField
                label="Allergy"
                value={form.allergy}
                placeholder="Specify allergy"
                onChange={(value) => setField('allergy', value)}
                error={errors.allergy}
              />

              <div>
                <p className="mb-2 text-xs font-semibold text-gray-600">Medical Conditions</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-md border border-gray-200 p-3 bg-gray-50">
                  {MEDICAL_CONDITIONS.map((condition) => (
                    <label key={condition.key} className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={form[condition.key]}
                        onChange={(event) => setField(condition.key, event.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                      />
                      <span>{condition.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-md border border-gray-200 p-3 bg-white space-y-3">
                <p className="text-xs font-semibold text-gray-600">Have you had any operation in the past?</p>
                <div className="flex gap-4">
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="hasPastOperation"
                      value="YES"
                      checked={form.hasPastOperation === 'YES'}
                      onChange={() => setField('hasPastOperation', 'YES')}
                      className="h-4 w-4 border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span>YES</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      name="hasPastOperation"
                      value="NO"
                      checked={form.hasPastOperation === 'NO'}
                      onChange={() => setField('hasPastOperation', 'NO')}
                      className="h-4 w-4 border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span>NO</span>
                  </label>
                </div>

                <TextAreaField
                  label="If yes, state the nature of the operation and date/year"
                  value={form.operationNatureAndDate}
                  onChange={(value) => setField('operationNatureAndDate', value)}
                  rows={2}
                  placeholder="Operation details"
                  error={errors.operationNatureAndDate}
                />
              </div>
            </>
          )}

          {activeTab === 'physicalExamination' && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="exam-year-level" className="mb-1 block text-xs font-semibold text-gray-600">Year Level</label>
                  <select
                    id="exam-year-level"
                    value={form.yearLevel}
                    onChange={(event) => setField('yearLevel', event.target.value)}
                    className={INPUT_CLASS}
                  >
                    <option>Yr. 1</option>
                    <option>Yr. 2</option>
                    <option>Yr. 3</option>
                    <option>Yr. 4</option>
                  </select>
                </div>

                <TextField
                  label="Date"
                  type="date"
                  value={form.examDate}
                  onChange={(value) => setField('examDate', value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <TextField label="BP" value={form.bp} onChange={(value) => setField('bp', value)} error={errors.bp} />
                <TextField label="CR" value={form.cr} onChange={(value) => setField('cr', value)} error={errors.cr} />
                <TextField label="RR" value={form.rr} onChange={(value) => setField('rr', value)} error={errors.rr} />
                <TextField label="Temp" value={form.temp} onChange={(value) => setField('temp', value)} error={errors.temp} />
                <TextField label="Weight" value={form.weight} onChange={(value) => setField('weight', value)} error={errors.weight} />
                <TextField label="Height" value={form.height} onChange={(value) => setField('height', value)} error={errors.height} />
                <TextField label="BMI" value={form.bmi} onChange={() => {}} readOnly />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <TextField label="Visual Acuity" value={form.visualAcuity} onChange={(value) => setField('visualAcuity', value)} error={errors.visualAcuity} />
                <TextField label="Skin" value={form.skin} onChange={(value) => setField('skin', value)} error={errors.skin} />
                <TextField label="HEENT" value={form.heent} onChange={(value) => setField('heent', value)} error={errors.heent} />
                <TextField label="Chest/Lungs" value={form.chestLungs} onChange={(value) => setField('chestLungs', value)} error={errors.chestLungs} />
                <TextField label="Heart" value={form.heart} onChange={(value) => setField('heart', value)} error={errors.heart} />
                <TextField label="Abdomen" value={form.abdomen} onChange={(value) => setField('abdomen', value)} error={errors.abdomen} />
                <TextField label="Extremities" value={form.extremities} onChange={(value) => setField('extremities', value)} error={errors.extremities} />
              </div>

              <TextAreaField label="Others (specify)" value={form.others} onChange={(value) => setField('others', value)} rows={2} error={errors.others} />
              <TextField label="Examined by" value={form.examinedBy} onChange={(value) => setField('examinedBy', value)} error={errors.examinedBy} />
            </>
          )}

          {activeTab === 'labResults' && (
            <>
              <div className="rounded-md border border-gray-200 p-3 space-y-3">
                <p className="text-xs font-semibold text-gray-600">CBC</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <TextField label="Date" type="date" value={form.cbcDate} onChange={(value) => setField('cbcDate', value)} />
                  <TextField label="Hgb" value={form.hgb} onChange={(value) => setField('hgb', value)} error={errors.hgb} />
                  <TextField label="Hct" value={form.hct} onChange={(value) => setField('hct', value)} error={errors.hct} />
                  <TextField label="WBC" value={form.wbc} onChange={(value) => setField('wbc', value)} error={errors.wbc} />
                  <TextField label="Plt. Ct." value={form.pltCt} onChange={(value) => setField('pltCt', value)} error={errors.pltCt} />
                  <TextField label="Bld. Type" value={form.bloodType} onChange={(value) => setField('bloodType', value)} error={errors.bloodType} />
                </div>
              </div>

              <div className="rounded-md border border-gray-200 p-3 space-y-3">
                <p className="text-xs font-semibold text-gray-600">U/A</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <TextField label="Date" type="date" value={form.uaDate} onChange={(value) => setField('uaDate', value)} />
                  <TextField label="Glucose/Sugar" value={form.glucoseSugar} onChange={(value) => setField('glucoseSugar', value)} error={errors.glucoseSugar} />
                  <TextField label="Protein" value={form.protein} onChange={(value) => setField('protein', value)} error={errors.protein} />
                </div>
              </div>

              <div className="rounded-md border border-gray-200 p-3 space-y-3">
                <p className="text-xs font-semibold text-gray-600">Chest X-ray</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <TextField label="Date" type="date" value={form.chestXrayDate} onChange={(value) => setField('chestXrayDate', value)} />
                  <div>
                    <label htmlFor="xray-result" className="mb-1 block text-xs font-semibold text-gray-600">Result</label>
                    <select
                      id="xray-result"
                      value={form.xrayResult}
                      onChange={(event) => setField('xrayResult', event.target.value as PhysicalExamRecordFormData['xrayResult'])}
                      className={`${INPUT_CLASS} ${errors.xrayResult ? 'border-red-300 focus:ring-red-300 focus:border-red-400' : ''}`.trim()}
                    >
                      <option value="">Select result</option>
                      <option value="NORMAL">Normal</option>
                      <option value="ABNORMAL">Abnormal</option>
                    </select>
                    {errors.xrayResult && <p className="mt-1 text-xs text-red-600">{errors.xrayResult}</p>}
                  </div>
                </div>
                <TextAreaField
                  label="Abnormal Findings"
                  value={form.abnormalFindings}
                  onChange={(value) => setField('abnormalFindings', value)}
                  rows={2}
                  error={errors.abnormalFindings}
                />
              </div>

              <TextAreaField label="Others" value={form.labOthers} onChange={(value) => setField('labOthers', value)} rows={2} error={errors.labOthers} />
              <TextField label="Date Received" type="date" value={form.dateReceived} onChange={(value) => setField('dateReceived', value)} />
            </>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="rounded-md bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition-colors"
          >
            Save Record
          </button>
        </div>
      </div>
    </div>
  );
}
