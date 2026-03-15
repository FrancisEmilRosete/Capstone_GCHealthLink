'use client';

import { useEffect, useId, useRef, useState } from 'react';

export interface ConsultationPatient {
  name: string;
  department: string;
  course: string;
}

interface MedicineRow {
  id: number;
  inventoryId: string;
  medicine: string;
  qty: string;
}

export interface InventoryOption {
  id: string;
  itemName: string;
  currentStock: number;
  unit: string;
}

interface ConsultationForm {
  concernTag: string;
  symptoms: string;
  bp: string;
  temperature: string;
  treatmentProvided: string;
}

interface ConsultationModalProps {
  patient: ConsultationPatient;
  inventoryOptions: InventoryOption[];
  onClose: () => void;
  onSave: (data: ConsultationForm, medicines: MedicineRow[]) => void;
}

const CONCERN_TAG_OPTIONS = [
  'General Consultation',
  'Medical Clearance',
  'Dental Concern',
  'Fever',
  'Headache',
  'Stomach Pain',
  'Diarrhea',
  'Vomiting',
  'Cough',
  'Sore Throat',
  'Flu-like Illness',
  'Skin Rash',
  'Eye Irritation',
  'Dizziness',
  'Injury',
  'Menstrual Pain',
  'Respiratory Concern',
];

function Field({
  label,
  placeholder,
  value,
  onChange,
  as = 'input',
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange?: (v: string) => void;
  as?: 'input' | 'textarea';
}) {
  const inputId = useId();

  if (as === 'textarea') {
    return (
      <div>
        <label htmlFor={inputId} className="block text-xs font-semibold text-gray-500 mb-0.5">{label}</label>
        <textarea
          id={inputId}
          rows={3}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange?.(event.target.value)}
          className="w-full border-b border-gray-200 bg-transparent px-0 py-2 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-teal-400 transition resize-none"
        />
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={inputId} className="block text-xs font-semibold text-gray-500 mb-0.5">{label}</label>
      <input
        id={inputId}
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange?.(event.target.value)}
        className="w-full border-b border-gray-200 bg-transparent px-0 py-2 text-sm text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-teal-400 transition"
      />
    </div>
  );
}

export default function ConsultationModal({ patient, inventoryOptions, onClose, onSave }: ConsultationModalProps) {
  const [form, setForm] = useState<ConsultationForm>({
    concernTag: 'General Consultation',
    symptoms: '',
    bp: '',
    temperature: '',
    treatmentProvided: '',
  });
  const [medicines, setMedicines] = useState<MedicineRow[]>([]);
  const [newMedId, setNewMedId] = useState('');
  const [newQty, setNewQty] = useState('');
  const [validationError, setValidationError] = useState('');

  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const nextId = useRef(1);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const handler = (event: KeyboardEvent) => {
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

      if (focusable.length === 0) return;

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
    };

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  function handleBackdrop(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === overlayRef.current) onClose();
  }

  function set(field: keyof ConsultationForm) {
    return (value: string) => setForm((prev) => ({ ...prev, [field]: value }));
  }

  function addMedicine() {
    if (!newMedId) return;
    const selectedMedicine = inventoryOptions.find((item) => item.id === newMedId);
    if (!selectedMedicine || selectedMedicine.currentStock <= 0) {
      setValidationError('Selected medicine is unavailable or out of stock.');
      return;
    }

    setValidationError('');

    setMedicines((prev) => [
      ...prev,
      {
        id: nextId.current++,
        inventoryId: selectedMedicine.id,
        medicine: selectedMedicine.itemName,
        qty: newQty.trim() || '1',
      },
    ]);
    setNewMedId('');
    setNewQty('');
  }

  function removeMedicine(id: number) {
    setMedicines((prev) => prev.filter((item) => item.id !== id));
  }

  function handleSave() {
    if (!form.symptoms.trim()) {
      setValidationError('Symptoms are required.');
      return;
    }

    if (!form.treatmentProvided.trim()) {
      setValidationError('Treatment provided is required.');
      return;
    }

    setValidationError('');
    onSave(form, medicines);
    onClose();
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 bg-black/40 flex items-start justify-end p-0 sm:p-4"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="consultation-modal-title"
        tabIndex={-1}
        className="bg-white w-full sm:max-w-sm h-full sm:h-auto sm:max-h-[95vh] sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0 border-b border-gray-100">
          <h2 id="consultation-modal-title" className="text-base font-bold text-gray-900">New Consultation</h2>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close consultation modal"
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6">
          <section className="space-y-2">
            <h3 className="text-sm font-bold text-gray-800">Patient</h3>
            <p className="text-sm text-gray-800">{patient.name}</p>
            <p className="text-xs text-gray-500">{patient.department} - {patient.course}</p>
          </section>

          <section>
            <h3 className="text-sm font-bold text-gray-800 mb-3">Symptoms / Diagnosis</h3>
            <div className="mb-4">
              <label htmlFor="consult-standardized-tag" className="block text-xs font-semibold text-gray-500 mb-1">Standardized Concern Tag</label>
              <select
                id="consult-standardized-tag"
                value={form.concernTag}
                onChange={(event) => set('concernTag')(event.target.value)}
                className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-teal-400 transition"
              >
                {CONCERN_TAG_OPTIONS.map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
            <Field
              label="Symptoms"
              placeholder="Describe patient symptoms..."
              value={form.symptoms}
              onChange={set('symptoms')}
              as="textarea"
            />
          </section>

          <section>
            <h3 className="text-sm font-bold text-gray-800 mb-3">Vital Signs</h3>
            <div className="space-y-3">
              <Field label="Blood Pressure" placeholder="120/80" value={form.bp} onChange={set('bp')} />
              <Field label="Temperature (C)" placeholder="36.8" value={form.temperature} onChange={set('temperature')} />
            </div>
          </section>

          <section>
            <h3 className="text-sm font-bold text-gray-800 mb-3">Treatment Provided</h3>
            <Field
              label="Treatment Provided"
              placeholder="Document treatment provided..."
              value={form.treatmentProvided}
              onChange={set('treatmentProvided')}
              as="textarea"
            />
          </section>

          <section>
            <h3 className="text-sm font-bold text-gray-800 mb-3">Medicine Dispensed</h3>

            {medicines.length > 0 && (
              <div className="mb-3 space-y-1.5">
                {medicines.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-teal-50 border border-teal-100 rounded-lg px-3 py-2 text-sm"
                  >
                    <span className="text-gray-700 flex-1 truncate">{item.medicine}</span>
                    <span className="text-teal-600 font-semibold mx-3 shrink-0">x{item.qty}</span>
                    <button
                      type="button"
                      onClick={() => removeMedicine(item.id)}
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

            <div className="flex gap-2 items-center">
              <select
                value={newMedId}
                onChange={(event) => setNewMedId(event.target.value)}
                className="flex-1 border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-teal-400 transition"
              >
                <option value="">Select medicine from inventory</option>
                {inventoryOptions.map((item) => (
                  <option
                    key={item.id}
                    value={item.id}
                    disabled={item.currentStock <= 0}
                  >
                    {item.itemName} ({item.currentStock} {item.unit})
                  </option>
                ))}
              </select>
              <span className="text-gray-300 text-xs shrink-0">-</span>
              <input
                type="number"
                min={1}
                value={newQty}
                onChange={(event) => setNewQty(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && addMedicine()}
                placeholder="Qty"
                className="w-14 border-b border-gray-200 bg-transparent px-0 py-2 text-sm text-center text-gray-800 placeholder:text-gray-300 focus:outline-none focus:border-teal-400 transition"
              />
              <button
                type="button"
                onClick={addMedicine}
                className="ml-1 px-3 py-1.5 text-xs font-semibold text-teal-600 border border-teal-300 rounded-lg hover:bg-teal-50 transition-colors shrink-0"
              >
                Add
              </button>
            </div>

            {inventoryOptions.length === 0 && (
              <p className="mt-2 text-xs text-amber-600">
                Inventory list is unavailable. Prescribed medicine cannot be selected right now.
              </p>
            )}
          </section>

          {validationError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {validationError}
            </div>
          )}
        </div>

        <div className="sticky bottom-0 z-10 flex justify-end gap-2 px-5 py-4 border-t border-gray-100 bg-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-gray-500 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2 text-sm font-semibold text-white bg-teal-500 hover:bg-teal-600 rounded-xl transition-colors"
          >
            Save Consultation Record
          </button>
        </div>
      </div>
    </div>
  );
}
