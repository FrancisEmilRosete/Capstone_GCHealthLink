/**
 * PHYSICAL EXAMINATION MODAL
 * ─────────────────────────────────────────────────────────────
 * Shown when staff clicks "Add Physical Exam" on a student's
 * record page. Covers all fields from the Figma mockup:
 *
 *   • Student (read-only)
 *   • Year Level  /  Date of Exam  /  Examined By
 *   • Vital Signs  (BP, Heart Rate, Resp. Rate, Temp)
 *   • Anthropometrics  (Weight, Height, BMI auto-calculated)
 *   • System Review  (8 free-text fields)
 *
 * TODO: On "Save Physical Exam" call:
 *   POST /api/students/:id/physical-exams  { ...formData }
 */

'use client';

import { useState, useEffect, useRef } from 'react';

// ── Form shape ────────────────────────────────────────────────
interface PhysicalExamForm {
  yearLevel:    string;
  dateOfExam:   string;
  examinedBy:   string;
  // Vital Signs
  bp:           string;
  heartRate:    string;
  respRate:     string;
  temperature:  string;
  // Anthropometrics
  weight:       string;
  height:       string;
  // System Review
  visualAcuity: string;
  skin:         string;
  heent:        string;
  chestLungs:   string;
  heart:        string;
  abdomen:      string;
  extremities:  string;
  remarks:      string;
  // CBC
  hgb:          string;
  hct:          string;
  wbc:          string;
  cbcBldType:   string;
  // Urinalysis
  urineGlucose:      string;
  urineProtein:      string;
  // Chest X-ray
  chestXray:         'normal' | 'abnormal' | '';
  chestXrayFindings: string;
  // Lab Others
  labOthers:         string;
}

const INITIAL_FORM: PhysicalExamForm = {
  yearLevel:    '1st Year',
  dateOfExam:   new Date().toISOString().slice(0, 10),
  examinedBy:   'Dr. Maria Santos',
  bp:           '',
  heartRate:    '',
  respRate:     '',
  temperature:  '',
  weight:       '',
  height:       '',
  visualAcuity: '',
  skin:         '',
  heent:        '',
  chestLungs:   '',
  heart:        '',
  abdomen:      '',
  extremities:  '',
  remarks:      '',
  // CBC
  hgb:          '',
  hct:          '',
  wbc:          '',
  cbcBldType:   '',
  // Urinalysis
  urineGlucose:      '',
  urineProtein:      '',
  // Chest X-ray
  chestXray:         '',
  chestXrayFindings: '',
  // Lab Others
  labOthers:         '',
};

// ── Props ─────────────────────────────────────────────────────
interface PhysicalExamModalProps {
  studentName: string;      // e.g. "Juan Dela Cruz"
  onClose:     () => void;
  onSave:      (data: PhysicalExamForm) => void;
}

// ── Reusable input row ────────────────────────────────────────
function Field({
  label, placeholder, value, onChange, type = 'text', readOnly = false,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange?: (v: string) => void;
  type?: string;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-teal-500 mb-1">{label}</label>
      <input
        type={type}
        readOnly={readOnly}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        className={`
          w-full border rounded-lg px-3 py-2 text-sm
          focus:outline-none focus:ring-2 focus:ring-teal-400 transition
          ${readOnly
            ? 'bg-gray-50 text-gray-700 border-gray-100 cursor-default'
            : 'bg-white text-gray-800 border-gray-200 placeholder:text-gray-300'}
        `}
      />
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────
export default function PhysicalExamModal({
  studentName,
  onClose,
  onSave,
}: PhysicalExamModalProps) {
  const [form, setForm] = useState<PhysicalExamForm>(INITIAL_FORM);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Auto-calculate BMI when weight or height changes
  const bmi = (() => {
    const w = parseFloat(form.weight);
    const h = parseFloat(form.height) / 100; // cm → m
    if (w > 0 && h > 0) return (w / (h * h)).toFixed(1);
    return '';
  })();

  // Close on Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Close when clicking the dark backdrop
  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose();
  }

  function set(field: keyof PhysicalExamForm) {
    return (v: string) => setForm((prev) => ({ ...prev, [field]: v }));
  }

  function handleSave() {
    onSave({ ...form, weight: form.weight, height: form.height });
    onClose();
  }

  return (
    // ── Backdrop ──────────────────────────────────────────────
    <div
      ref={overlayRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
    >
      {/* ── Dialog ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh]
        overflow-y-auto flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <h2 className="text-base font-bold text-gray-900">Record Physical Examination</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form body */}
        <div className="px-5 pb-5 space-y-5 flex-1">

          {/* Student (read-only) */}
          <Field label="Student" value={studentName} readOnly />

          {/* Year Level / Date / Examined By */}
          <div className="grid grid-cols-3 gap-3">
            {/* Year Level dropdown */}
            <div>
              <label className="block text-[11px] font-medium text-teal-500 mb-1">Year Level</label>
              <select
                value={form.yearLevel}
                onChange={(e) => set('yearLevel')(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                  bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
              >
                <option>1st Year</option>
                <option>2nd Year</option>
                <option>3rd Year</option>
                <option>4th Year</option>
                <option>5th Year</option>
              </select>
            </div>

            {/* Date of Exam */}
            <Field
              label="Date of Exam"
              type="date"
              value={form.dateOfExam}
              onChange={set('dateOfExam')}
            />

            {/* Examined By */}
            <Field
              label="Examined By"
              placeholder="Dr. name"
              value={form.examinedBy}
              onChange={set('examinedBy')}
            />
          </div>

          {/* ── Vital Signs ─────────────────────────────────── */}
          <div>
            <p className="text-xs font-bold text-gray-900 mb-3">Vital Signs</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Field label="Blood Pressure"   placeholder="120/80" value={form.bp}          onChange={set('bp')} />
              <Field label="Heart Rate (bpm)" placeholder="75"     value={form.heartRate}   onChange={set('heartRate')} />
              <Field label="Resp. Rate (cpm)" placeholder="18"     value={form.respRate}    onChange={set('respRate')} />
              <Field label="Temperature (°C)" placeholder="36.5"   value={form.temperature} onChange={set('temperature')} />
            </div>
          </div>

          {/* ── Anthropometrics ─────────────────────────────── */}
          <div>
            <p className="text-xs font-bold text-gray-900 mb-3">Anthropometrics</p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Weight (kg)" placeholder="e.g. 60" value={form.weight} onChange={set('weight')} />
              <Field label="Height (cm)" placeholder="e.g. 165" value={form.height} onChange={set('height')} />

              {/* BMI — auto-calculated */}
              <div>
                <label className="block text-[11px] font-medium text-teal-500 mb-1">BMI</label>
                <div className="w-full border border-gray-100 rounded-lg px-3 py-2
                  bg-gray-50 text-sm text-gray-700 min-h-[38px] flex items-center">
                  {bmi || (
                    <span className="text-gray-300 text-xs">Auto-calculated</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── System Review ───────────────────────────────── */}
          <div>
            <p className="text-xs font-bold text-gray-900 mb-3">System Review</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Visual Acuity" placeholder="OD 20/20  OS 20/20" value={form.visualAcuity} onChange={set('visualAcuity')} />
              <Field label="Skin"          placeholder="Normal"               value={form.skin}         onChange={set('skin')} />
              <Field label="HEENT"         placeholder="Normal"               value={form.heent}        onChange={set('heent')} />
              <Field label="Chest/Lungs"   placeholder="Clear breath sounds"  value={form.chestLungs}   onChange={set('chestLungs')} />
              <Field label="Heart"         placeholder="Normal rate and rhythm" value={form.heart}      onChange={set('heart')} />
              <Field label="Abdomen"       placeholder="Soft, non-tender"     value={form.abdomen}      onChange={set('abdomen')} />
              <Field label="Extremities"   placeholder="No edema"             value={form.extremities}  onChange={set('extremities')} />
              <Field label="Others/Remarks" placeholder="—"                   value={form.remarks}      onChange={set('remarks')} />
            </div>
          </div>

          {/* ── Laboratory ──────────────────────────────────── */}
          <div>
            <p className="text-xs font-bold text-gray-900 mb-3">Laboratory</p>

            {/* CBC */}
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">CBC</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
              <Field label="Hgb."      placeholder="e.g. 140"  value={form.hgb}        onChange={set('hgb')} />
              <Field label="Hct."      placeholder="e.g. 0.42" value={form.hct}        onChange={set('hct')} />
              <Field label="WBC"       placeholder="e.g. 7000" value={form.wbc}        onChange={set('wbc')} />
              <Field label="Bld. Type" placeholder="e.g. O+"   value={form.cbcBldType} onChange={set('cbcBldType')} />
            </div>

            {/* Urinalysis */}
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Urinalysis</p>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <Field label="Glucose / Sugar" placeholder="e.g. Negative" value={form.urineGlucose} onChange={set('urineGlucose')} />
              <Field label="Protein"         placeholder="e.g. Negative" value={form.urineProtein} onChange={set('urineProtein')} />
            </div>

            {/* Chest X-ray */}
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Chest X-ray</p>
            <div className="border border-gray-100 rounded-xl p-3 mb-4 space-y-2 bg-gray-50">
              {/* Normal radio */}
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  name="chestXray"
                  value="normal"
                  checked={form.chestXray === 'normal'}
                  onChange={() => set('chestXray')('normal')}
                  className="w-4 h-4 accent-teal-500 cursor-pointer"
                />
                <span className="text-sm text-gray-700 group-hover:text-teal-600 transition-colors">
                  Normal
                </span>
              </label>

              {/* Abnormal radio */}
              <label className="flex items-center gap-2.5 cursor-pointer group">
                <input
                  type="radio"
                  name="chestXray"
                  value="abnormal"
                  checked={form.chestXray === 'abnormal'}
                  onChange={() => set('chestXray')('abnormal')}
                  className="w-4 h-4 accent-teal-500 cursor-pointer"
                />
                <span className="text-sm text-gray-700 group-hover:text-teal-600 transition-colors">
                  Abnormal Findings
                </span>
              </label>

              {/* Findings text input — only shown when Abnormal is selected */}
              {form.chestXray === 'abnormal' && (
                <input
                  type="text"
                  value={form.chestXrayFindings}
                  onChange={(e) => set('chestXrayFindings')(e.target.value)}
                  placeholder="Describe abnormal findings…"
                  className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm
                    bg-white text-gray-800 placeholder:text-gray-300
                    focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
                />
              )}
            </div>

            {/* Others */}
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-2">Others</p>
            <Field label="Others" placeholder="Additional lab findings" value={form.labOthers} onChange={set('labOthers')} />
          </div>

        </div>

        {/* Footer buttons */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-500
              border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-sm font-semibold text-white
              bg-teal-500 hover:bg-teal-600 rounded-xl transition-colors"
          >
            Save Physical Exam
          </button>
        </div>
      </div>
    </div>
  );
}
