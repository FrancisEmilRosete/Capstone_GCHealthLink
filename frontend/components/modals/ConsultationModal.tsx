/**
 * CONSULTATION MODAL
 * ─────────────────────────────────────────────────────────────
 * Opened when staff clicks "Consult" on the scanner found card
 * or from the student record page.
 *
 * Sections:
 *   • Patient Information  (pre-filled from scanned student)
 *   • Vital Signs
 *   • Clinical Notes
 *   • Medicine Dispensed   (add multiple rows)
 *
 * TODO: On "Save Consultation Record" call:
 *   POST /api/consultations  { ...formData }
 */

'use client';

import { useState, useEffect, useRef } from 'react';

// ── Patient info passed in from parent ────────────────────────
export interface ConsultationPatient {
  name:       string;   // "Juan Dela Cruz"
  age:        string;   // optional — fill if available
  department: string;   // college/department
  course:     string;
  sex:        string;   // optional — fill if available
}

// ── Medicine row ──────────────────────────────────────────────
interface MedicineRow {
  id:       number;
  medicine: string;
  qty:      string;
}

// ── Full form ─────────────────────────────────────────────────
interface ConsultationForm {
  // Patient info (editable in case staff needs to correct)
  patientName:   string;
  age:           string;
  department:    string;
  course:        string;
  sex:           string;
  // Vital Signs
  bp:            string;
  temperature:   string;
  weight:        string;
  pulseRate:     string;
  // Clinical Notes
  chiefComplaint:      string;
  diagnosis:           string;
  treatmentManagement: string;
}

// ── Props ─────────────────────────────────────────────────────
interface ConsultationModalProps {
  patient:  ConsultationPatient;
  onClose:  () => void;
  onSave:   (data: ConsultationForm, medicines: MedicineRow[]) => void;
}

// ── Small reusable input ──────────────────────────────────────
function Field({
  label, placeholder, value, onChange, readOnly = false, as = 'input',
}: {
  label:        string;
  placeholder?: string;
  value:        string;
  onChange?:    (v: string) => void;
  readOnly?:    boolean;
  as?:          'input' | 'textarea';
}) {
  const base = `
    w-full border-b border-gray-200 bg-transparent px-0 py-2 text-sm
    text-gray-800 placeholder:text-gray-300
    focus:outline-none focus:border-teal-400 transition
    ${readOnly ? 'cursor-default text-gray-600' : ''}
  `;
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-500 mb-0.5">{label}</label>
      {as === 'textarea' ? (
        <textarea
          rows={2}
          value={value}
          readOnly={readOnly}
          placeholder={placeholder}
          onChange={(e) => onChange?.(e.target.value)}
          className={base + ' resize-none'}
        />
      ) : (
        <input
          type="text"
          value={value}
          readOnly={readOnly}
          placeholder={placeholder}
          onChange={(e) => onChange?.(e.target.value)}
          className={base}
        />
      )}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────
export default function ConsultationModal({
  patient,
  onClose,
  onSave,
}: ConsultationModalProps) {
  const [form, setForm] = useState<ConsultationForm>({
    patientName:         patient.name,
    age:                 patient.age,
    department:          patient.department,
    course:              patient.course,
    sex:                 patient.sex,
    bp:                  '',
    temperature:         '',
    weight:              '',
    pulseRate:           '',
    chiefComplaint:      '',
    diagnosis:           '',
    treatmentManagement: '',
  });

  const [medicines, setMedicines] = useState<MedicineRow[]>([]);
  const [newMed,    setNewMed]    = useState('');
  const [newQty,    setNewQty]    = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);
  let nextId = useRef(1);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === overlayRef.current) onClose();
  }

  function set(field: keyof ConsultationForm) {
    return (v: string) => setForm((prev) => ({ ...prev, [field]: v }));
  }

  function addMedicine() {
    if (!newMed.trim()) return;
    setMedicines((prev) => [
      ...prev,
      { id: nextId.current++, medicine: newMed.trim(), qty: newQty.trim() || '1' },
    ]);
    setNewMed('');
    setNewQty('');
  }

  function removeMedicine(id: number) {
    setMedicines((prev) => prev.filter((m) => m.id !== id));
  }

  function handleSave() {
    onSave(form, medicines);
    onClose();
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 bg-black/40 flex items-start justify-end p-0 sm:p-4"
    >
      {/* Slide-in panel — matches Figma side-sheet style */}
      <div className="bg-white w-full sm:max-w-sm h-full sm:h-auto sm:max-h-[95vh]
        sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">

        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">New Consultation</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* ── Scrollable body ──────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">

          {/* Patient Information */}
          <section>
            <h3 className="text-sm font-bold text-gray-800 mb-3">Patient Information</h3>
            <div className="space-y-3">
              <Field label="Name"       value={form.patientName} readOnly />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-0.5">Age</label>
                  <input
                    type="number"
                    min={0}
                    value={form.age}
                    onChange={(e) => set('age')(e.target.value)}
                    placeholder="e.g. 20"
                    className="w-full border-b border-gray-200 bg-transparent px-0 py-2 text-sm
                      text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-teal-400 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-0.5">Sex</label>
                  <select
                    value={form.sex}
                    onChange={(e) => set('sex')(e.target.value)}
                    className="w-full border-b border-gray-200 bg-transparent px-0 py-2 text-sm
                      text-gray-800 focus:outline-none focus:border-teal-400 transition"
                  >
                    <option value="">— select —</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                  </select>
                </div>
              </div>
              <Field label="Department" value={form.department} readOnly />
              <Field label="Course"     value={form.course}     readOnly />
            </div>
          </section>

          {/* Vital Signs */}
          <section>
            <h3 className="text-sm font-bold text-gray-800 mb-3">Vital Signs</h3>
            <div className="space-y-3">
              <Field label="Blood Pressure"   placeholder="120/80" value={form.bp}          onChange={set('bp')} />
              <Field label="Temperature (°C)" placeholder="36.5"   value={form.temperature} onChange={set('temperature')} />
              <Field label="Weight (kg)"      placeholder="60"     value={form.weight}      onChange={set('weight')} />
              <Field label="Pulse Rate"       placeholder="75 bpm" value={form.pulseRate}   onChange={set('pulseRate')} />
            </div>
          </section>

          {/* Clinical Notes */}
          <section>
            <h3 className="text-sm font-bold text-gray-800 mb-3">Clinical Notes</h3>
            <div className="space-y-3">
              <Field
                label="Chief Complaint"
                placeholder="Patient's main complaint..."
                value={form.chiefComplaint}
                onChange={set('chiefComplaint')}
                as="textarea"
              />
              <Field
                label="Diagnosis"
                placeholder="Enter diagnosis..."
                value={form.diagnosis}
                onChange={set('diagnosis')}
                as="textarea"
              />
              <Field
                label="Treatment / Management"
                placeholder="Treatment given..."
                value={form.treatmentManagement}
                onChange={set('treatmentManagement')}
                as="textarea"
              />
            </div>
          </section>

          {/* Medicine Dispensed */}
          <section>
            <h3 className="text-sm font-bold text-gray-800 mb-3">Medicine Dispensed</h3>

            {/* Added medicines list */}
            {medicines.length > 0 && (
              <div className="mb-3 space-y-1.5">
                {medicines.map((m) => (
                  <div key={m.id}
                    className="flex items-center justify-between bg-teal-50 border border-teal-100
                      rounded-lg px-3 py-2 text-sm">
                    <span className="text-gray-700 flex-1 truncate">{m.medicine}</span>
                    <span className="text-teal-600 font-semibold mx-3 shrink-0">×{m.qty}</span>
                    <button
                      onClick={() => removeMedicine(m.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                      aria-label="Remove"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add row */}
            <div className="flex gap-2 items-center">
              <input
                type="text"
                value={newMed}
                onChange={(e) => setNewMed(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addMedicine()}
                placeholder="Select medicine..."
                className="flex-1 border-b border-gray-200 bg-transparent px-0 py-2 text-sm
                  text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-teal-400 transition"
              />
              <span className="text-gray-300 text-xs shrink-0">—</span>
              <input
                type="number"
                min={1}
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addMedicine()}
                placeholder="Qty"
                className="w-14 border-b border-gray-200 bg-transparent px-0 py-2 text-sm text-center
                  text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-teal-400 transition"
              />
              <button
                onClick={addMedicine}
                className="ml-1 px-3 py-1.5 text-xs font-semibold text-teal-600
                  border border-teal-300 rounded-lg hover:bg-teal-50 transition-colors shrink-0"
              >
                Add
              </button>
            </div>
          </section>
        </div>

        {/* ── Footer ──────────────────────────────────────── */}
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
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white
              bg-teal-500 hover:bg-teal-600 rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3
                   M8 7V5a2 2 0 012-2h4a2 2 0 012 2v2M8 7h8" />
            </svg>
            Save Consultation Record
          </button>
        </div>
      </div>
    </div>
  );
}
