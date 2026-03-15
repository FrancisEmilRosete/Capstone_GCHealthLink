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
  visitDate: string;
  concernTag: string;
  symptoms: string;
  diagnosisDetails: string;
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

const INPUT_CLASS = 'w-full border border-gray-300 rounded p-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500';

function Field({
  label,
  value,
  onChange,
  placeholder,
  as = 'input',
  type = 'text',
  rows = 3,
}: {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  as?: 'input' | 'textarea';
  type?: string;
  rows?: number;
}) {
  const inputId = useId();

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
          placeholder={placeholder}
          onChange={(event) => onChange?.(event.target.value)}
          className={`${INPUT_CLASS} resize-none`}
        />
      ) : (
        <input
          id={inputId}
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange?.(event.target.value)}
          className={INPUT_CLASS}
        />
      )}
    </div>
  );
}

export default function ConsultationModal({ patient, inventoryOptions, onClose, onSave }: ConsultationModalProps) {
  const [form, setForm] = useState<ConsultationForm>({
    visitDate: new Date().toISOString().slice(0, 10),
    concernTag: 'General Consultation',
    symptoms: '',
    diagnosisDetails: '',
    bp: '',
    temperature: '',
    treatmentProvided: '',
  });
  const [medicines, setMedicines] = useState<MedicineRow[]>([]);
  const [newMedicineId, setNewMedicineId] = useState('');
  const [newQty, setNewQty] = useState('1');
  const [validationError, setValidationError] = useState('');

  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const nextId = useRef(1);

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

  function set(field: keyof ConsultationForm) {
    return (value: string) => {
      setForm((current) => ({ ...current, [field]: value }));
    };
  }

  function handleBackdrop(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === overlayRef.current) {
      onClose();
    }
  }

  function addMedicine() {
    if (!newMedicineId) {
      return;
    }

    const selected = inventoryOptions.find((item) => item.id === newMedicineId);
    if (!selected) {
      setValidationError('Selected medicine was not found in inventory.');
      return;
    }

    const quantity = Number(newQty);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setValidationError('Please enter a valid medicine quantity.');
      return;
    }

    if (quantity > selected.currentStock) {
      setValidationError(`Requested quantity exceeds available stock for ${selected.itemName}.`);
      return;
    }

    setValidationError('');
    setMedicines((current) => [
      ...current,
      {
        id: nextId.current++,
        inventoryId: selected.id,
        medicine: selected.itemName,
        qty: String(quantity),
      },
    ]);
    setNewMedicineId('');
    setNewQty('1');
  }

  function removeMedicine(id: number) {
    setMedicines((current) => current.filter((item) => item.id !== id));
  }

  function handleSave() {
    if (!form.visitDate) {
      setValidationError('Date is required.');
      return;
    }

    if (!form.symptoms.trim()) {
      setValidationError('Symptom(s) are required.');
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
      onMouseDown={handleBackdrop}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="consult-modal-title"
        tabIndex={-1}
        className="relative bg-white rounded-lg shadow-xl w-full max-w-xl p-6 md:p-8 max-h-[92vh] overflow-y-auto"
      >
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h2 id="consult-modal-title" className="text-xl font-bold text-teal-800">Add New Consult</h2>
            <p className="mt-1 text-xs text-gray-500">Record consultation details and dispensed medicine.</p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close consult modal"
            className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-5 rounded-md border border-gray-200 bg-gray-50 p-3">
          <p className="text-sm font-semibold text-gray-800">{patient.name}</p>
          <p className="text-xs text-gray-500">{patient.department} - {patient.course}</p>
        </div>

        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Date"
              type="date"
              value={form.visitDate}
              onChange={set('visitDate')}
            />

            <div>
              <label htmlFor="consult-tag" className="mb-1 block text-xs font-semibold text-gray-600">Diagnosis/Tags</label>
              <select
                id="consult-tag"
                value={form.concernTag}
                onChange={(event) => set('concernTag')(event.target.value)}
                className={INPUT_CLASS}
              >
                {CONCERN_TAG_OPTIONS.map((tag) => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            </div>
          </div>

          <Field
            label="Symptom(s)"
            placeholder="Describe presenting symptoms"
            value={form.symptoms}
            onChange={set('symptoms')}
            as="textarea"
            rows={3}
          />

          <Field
            label="Diagnosis Notes"
            placeholder="Add additional diagnosis details"
            value={form.diagnosisDetails}
            onChange={set('diagnosisDetails')}
            as="textarea"
            rows={3}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field
              label="Blood Pressure"
              placeholder="120/80"
              value={form.bp}
              onChange={set('bp')}
            />
            <Field
              label="Temperature"
              placeholder="36.8"
              value={form.temperature}
              onChange={set('temperature')}
            />
          </div>

          <Field
            label="Treatment Provided"
            placeholder="Document treatment, care advice, and follow-up"
            value={form.treatmentProvided}
            onChange={set('treatmentProvided')}
            as="textarea"
            rows={3}
          />

          <div>
            <p className="mb-1 block text-xs font-semibold text-gray-600">Medicine Dispensed</p>

            {medicines.length > 0 && (
              <div className="mb-3 space-y-2">
                {medicines.map((item) => (
                  <div key={item.id} className="flex items-center justify-between rounded border border-teal-100 bg-teal-50 px-3 py-2 text-sm">
                    <span className="text-gray-700">{item.medicine}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-teal-700">x{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => removeMedicine(item.id)}
                        className="rounded p-1 text-gray-400 hover:bg-white hover:text-red-500 transition-colors"
                        aria-label="Remove dispensed medicine"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_auto] gap-3">
              <select
                value={newMedicineId}
                onChange={(event) => setNewMedicineId(event.target.value)}
                className={INPUT_CLASS}
              >
                <option value="">Select medicine from inventory</option>
                {inventoryOptions.map((item) => (
                  <option key={item.id} value={item.id} disabled={item.currentStock <= 0}>
                    {item.itemName} ({item.currentStock} {item.unit})
                  </option>
                ))}
              </select>

              <input
                type="number"
                min={1}
                value={newQty}
                onChange={(event) => setNewQty(event.target.value)}
                className={INPUT_CLASS}
                placeholder="Quantity"
              />

              <button
                type="button"
                onClick={addMedicine}
                className="rounded border border-teal-300 px-4 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 transition-colors"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {validationError && (
          <div className="mt-5 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
            {validationError}
          </div>
        )}

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
            Save Consult
          </button>
        </div>
      </div>
    </div>
  );
}
