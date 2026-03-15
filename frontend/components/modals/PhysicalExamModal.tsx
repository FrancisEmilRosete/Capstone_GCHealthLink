'use client';

import { useEffect, useId, useRef, useState } from 'react';

interface PhysicalExamForm {
  yearLevel: string;
  dateOfExam: string;
  examinedBy: string;
  bp: string;
  heartRate: string;
  respRate: string;
  temperature: string;
  weight: string;
  height: string;
  visualAcuity: string;
  skin: string;
  heent: string;
  chestLungs: string;
  heart: string;
  abdomen: string;
  extremities: string;
  remarks: string;
  hgb: string;
  hct: string;
  wbc: string;
  cbcBldType: string;
  urineGlucose: string;
  urineProtein: string;
  chestXray: 'normal' | 'abnormal' | '';
  chestXrayFindings: string;
  labOthers: string;
}

const INITIAL_FORM: PhysicalExamForm = {
  yearLevel: '1st Year',
  dateOfExam: new Date().toISOString().slice(0, 10),
  examinedBy: '',
  bp: '',
  heartRate: '',
  respRate: '',
  temperature: '',
  weight: '',
  height: '',
  visualAcuity: '',
  skin: '',
  heent: '',
  chestLungs: '',
  heart: '',
  abdomen: '',
  extremities: '',
  remarks: '',
  hgb: '',
  hct: '',
  wbc: '',
  cbcBldType: '',
  urineGlucose: '',
  urineProtein: '',
  chestXray: '',
  chestXrayFindings: '',
  labOthers: '',
};

interface PhysicalExamModalProps {
  studentName: string;
  onClose: () => void;
  onSave: (data: PhysicalExamForm) => void;
}

type FindingField = 'heent' | 'heart' | 'chestLungs' | 'abdomen' | 'extremities' | 'skin';

const FINDING_TABS: Array<{ id: FindingField; label: string }> = [
  { id: 'heent', label: 'Head / Ears' },
  { id: 'heart', label: 'Heart' },
  { id: 'chestLungs', label: 'Chest/Lungs' },
  { id: 'abdomen', label: 'Abdomen' },
  { id: 'extremities', label: 'Extremities' },
  { id: 'skin', label: 'Skin' },
];

const INPUT_CLASS = 'w-full border border-gray-300 rounded p-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500';

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  as = 'input',
  rows = 3,
  readOnly = false,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  type?: string;
  as?: 'input' | 'textarea';
  rows?: number;
  readOnly?: boolean;
}) {
  const inputId = useId();

  const className = readOnly
    ? 'w-full border border-gray-200 rounded p-2.5 text-sm text-gray-700 bg-gray-50'
    : INPUT_CLASS;

  return (
    <div>
      <label htmlFor={inputId} className="mb-1 block text-xs font-semibold text-gray-600">
        {label}
      </label>
      {as === 'textarea' ? (
        <textarea
          id={inputId}
          rows={rows}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          className={`${className} resize-none`}
        />
      ) : (
        <input
          id={inputId}
          type={type}
          value={value}
          onChange={(event) => onChange?.(event.target.value)}
          placeholder={placeholder}
          readOnly={readOnly}
          className={className}
        />
      )}
    </div>
  );
}

export default function PhysicalExamModal({ studentName, onClose, onSave }: PhysicalExamModalProps) {
  const [form, setForm] = useState<PhysicalExamForm>(INITIAL_FORM);
  const [activeFindingTab, setActiveFindingTab] = useState<FindingField>('heent');

  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

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

  function set(field: keyof PhysicalExamForm) {
    return (value: string) => {
      setForm((current) => ({ ...current, [field]: value }));
    };
  }

  function handleSave() {
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
        className="relative bg-white rounded-lg shadow-xl w-full max-w-xl p-6 md:p-8 max-h-[92vh] overflow-y-auto"
      >
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h2 id="physical-exam-modal-title" className="text-xl font-bold text-teal-800">Add New Physical Exam</h2>
            <p className="mt-1 text-xs text-gray-500">Capture examination findings and recommendations.</p>
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
          <Field label="Student" value={studentName} readOnly />
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Date"
              type="date"
              value={form.dateOfExam}
              onChange={set('dateOfExam')}
            />

            <Field
              label="Attending Physician"
              placeholder="Enter physician name"
              value={form.examinedBy}
              onChange={set('examinedBy')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="exam-year-level" className="mb-1 block text-xs font-semibold text-gray-600">Year Level</label>
              <select
                id="exam-year-level"
                value={form.yearLevel}
                onChange={(event) => set('yearLevel')(event.target.value)}
                className={INPUT_CLASS}
              >
                <option>1st Year</option>
                <option>2nd Year</option>
                <option>3rd Year</option>
                <option>4th Year</option>
                <option>5th Year</option>
              </select>
            </div>

            <Field
              label="Visual Acuity"
              placeholder="OD 20/20, OS 20/20"
              value={form.visualAcuity}
              onChange={set('visualAcuity')}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Blood Pressure" placeholder="120/80" value={form.bp} onChange={set('bp')} />
            <Field label="Temperature" placeholder="36.8" value={form.temperature} onChange={set('temperature')} />
            <Field label="Heart Rate" placeholder="75" value={form.heartRate} onChange={set('heartRate')} />
            <Field label="Respiratory Rate" placeholder="18" value={form.respRate} onChange={set('respRate')} />
          </div>

          <div>
            <p className="mb-2 block text-xs font-semibold text-gray-600">Findings</p>
            <div className="mb-3 flex flex-wrap gap-2">
              {FINDING_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFindingTab(tab.id)}
                  className={`rounded-md border px-3 py-1.5 text-xs font-semibold transition-colors ${
                    activeFindingTab === tab.id
                      ? 'border-teal-600 bg-teal-600 text-white'
                      : 'border-gray-300 bg-white text-gray-600 hover:border-teal-400 hover:text-teal-600'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <Field
              label={`${FINDING_TABS.find((item) => item.id === activeFindingTab)?.label || 'Findings'} Details`}
              placeholder="Document examination findings"
              value={form[activeFindingTab]}
              onChange={set(activeFindingTab)}
              as="textarea"
              rows={4}
            />
          </div>

          <Field
            label="Detailed Recommendations"
            placeholder="Follow-up instructions, referral notes, and care plan"
            value={form.remarks}
            onChange={set('remarks')}
            as="textarea"
            rows={3}
          />
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
            Save Physical Exam
          </button>
        </div>
      </div>
    </div>
  );
}
