'use client';

import { useEffect, useId, useRef, useState } from 'react';

export interface ConsultationPatient {
  firstName: string;
  middleName?: string;
  lastName: string;
  department: string;
  course: string;
  yearLevel?: string;
  age?: string;
  sex?: string;
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

export interface ConsultationForm {
  visitDate: string;
  visitTime: string;
  age: string;
  sex: string;
  chiefComplaint: string;
  diagnosis: string;
  bp: string;
  temperature: string;
  treatmentProvided: string;
  addFollowUp: boolean;
  followUpDate: string;
  followUpTime: string;
}

interface ConsultationModalProps {
  patient: ConsultationPatient;
  inventoryOptions: InventoryOption[];
  onClose: () => void;
  onSave: (data: ConsultationForm, medicines: MedicineRow[]) => void;
  mode?: 'full' | 'nurse-triage' | 'dental';
  saveLabel?: string;
  requireDoctorFields?: boolean;
  initialValues?: Partial<ConsultationForm>;
}

const INPUT_CLASS = 'w-full border border-gray-300 rounded p-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500';
const READONLY_CLASS = 'w-full rounded p-2.5 text-sm text-gray-700 bg-gray-100 border border-gray-200 cursor-default select-none';

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
      <label htmlFor={inputId} className="mb-1 block text-xs font-semibold text-gray-600">{label}</label>
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

function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="mb-1 text-xs font-semibold text-teal-700">{label}</p>
      <div className={READONLY_CLASS}>{value || '—'}</div>
    </div>
  );
}

export default function ConsultationModal({ patient, inventoryOptions, onClose, onSave, mode = 'full', saveLabel, requireDoctorFields = false, initialValues }: ConsultationModalProps) {
  const isNurseTriage = mode === 'nurse-triage';
  const isDentalMode = mode === 'dental';
  const [form, setForm] = useState<ConsultationForm>({
    visitDate: new Date().toISOString().slice(0, 10),
    visitTime: new Date().toTimeString().slice(0, 5),
    age: patient.age ?? '',
    sex: patient.sex ?? '',
    chiefComplaint: '',
    diagnosis: '',
    bp: '',
    temperature: '',
    treatmentProvided: '',
    addFollowUp: false,
    followUpDate: '',
    followUpTime: '',
    ...initialValues,
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
      if (event.key === 'Escape') { onClose(); return; }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
        'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey && active === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && active === last) { event.preventDefault(); first.focus(); }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose]);

  useEffect(() => {
    if (!initialValues) return;
    setForm((current) => ({ ...current, ...initialValues }));
  }, [initialValues]);

  function set(field: keyof ConsultationForm) {
    return (value: string) => setForm((current) => ({ ...current, [field]: value }));
  }

  function handleBackdrop(event: React.MouseEvent<HTMLDivElement>) {
    if (event.target === overlayRef.current) onClose();
  }

  function addMedicine() {
    if (!newMedicineId) return;
    const selected = inventoryOptions.find((item) => item.id === newMedicineId);
    if (!selected) { setValidationError('Selected medicine was not found in inventory.'); return; }
    const quantity = Number(newQty);
    if (!Number.isFinite(quantity) || quantity <= 0) { setValidationError('Please enter a valid medicine quantity.'); return; }
    if (quantity > selected.currentStock) { setValidationError(`Requested quantity exceeds available stock for ${selected.itemName}.`); return; }
    setValidationError('');
    setMedicines((current) => [...current, { id: nextId.current++, inventoryId: selected.id, medicine: selected.itemName, qty: String(quantity) }]);
    setNewMedicineId('');
    setNewQty('1');
  }

  function removeMedicine(id: number) {
    setMedicines((current) => current.filter((item) => item.id !== id));
  }

  function handleSave() {
    if (!form.visitDate) { setValidationError('Date is required.'); return; }
    if (!form.chiefComplaint.trim()) { setValidationError('Chief Complaint is required.'); return; }
    if (!isDentalMode && !form.bp.trim()) { setValidationError('Blood Pressure is required.'); return; }
    if (!isDentalMode && !form.temperature.trim()) { setValidationError('Temperature is required.'); return; }
    if (!isNurseTriage && requireDoctorFields && !form.diagnosis.trim()) { setValidationError('Diagnosis is required.'); return; }
    if (!isNurseTriage && !form.treatmentProvided.trim()) { setValidationError('Treatment provided is required.'); return; }
    if (!isNurseTriage && requireDoctorFields && form.addFollowUp && (!form.followUpDate || !form.followUpTime)) {
      setValidationError('Follow-up date and time are required when follow-up is enabled.');
      return;
    }
    setValidationError('');
    onSave(form, medicines);
    onClose();
  }

  return (
    <div ref={overlayRef} onMouseDown={handleBackdrop} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="consult-modal-title"
        tabIndex={-1}
        className="relative bg-white rounded-lg shadow-xl w-full max-w-xl p-6 md:p-8 max-h-[92vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="mb-6 flex items-start justify-between gap-3">
          <div>
            <h2 id="consult-modal-title" className="text-xl font-bold text-teal-800">Add New Consult</h2>
            <p className="mt-1 text-xs text-gray-500">
              {isNurseTriage
                ? 'Record nurse triage details and send to doctor for diagnosis and treatment.'
                : isDentalMode
                  ? 'Record dental consultation details.'
                  : 'Record consultation details and dispensed medicine.'}
            </p>
          </div>
          <button ref={closeButtonRef} type="button" onClick={onClose} aria-label="Close consult modal" className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors">
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Auto-populated read-only patient info */}
        <div className="mb-5 rounded-md border border-teal-200 bg-teal-50 p-4 space-y-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-teal-600">Patient Information (auto-filled)</p>
          <div className="grid grid-cols-1 gap-3">
            <ReadonlyField
              label="Full Name"
              value={`${patient.lastName}, ${patient.firstName}${patient.middleName ? ` ${patient.middleName.charAt(0)}.` : ''}`}
            />
            <div className="grid grid-cols-2 gap-3">
              <ReadonlyField
                label="Course"
                value={patient.course || patient.department || '—'}
              />
              <ReadonlyField
                label="Year Level"
                value={patient.yearLevel || '—'}
              />
            </div>
          </div>
        </div>

        <div className="space-y-5">
          {/* Date / Time / Age / Sex */}
          <div className="grid grid-cols-2 gap-4">
            <ReadonlyField
              label="Date"
              value={form.visitDate
                ? new Date(form.visitDate + 'T00:00:00').toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })
                : '—'}
            />
            <ReadonlyField
              label="Time"
              value={form.visitTime
                ? (() => {
                    const [h, m] = form.visitTime.split(':').map(Number);
                    const period = h >= 12 ? 'PM' : 'AM';
                    const hour   = h % 12 || 12;
                    return `${String(hour).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
                  })()
                : '—'}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <ReadonlyField label="Age" value={form.age || '—'} />
            <ReadonlyField label="Sex" value={form.sex || '—'} />
          </div>

          {/* Chief Complaint */}
          <Field label="Chief Complaint" placeholder="Describe the patient's primary complaint" value={form.chiefComplaint} onChange={set('chiefComplaint')} as="textarea" rows={3} />

          {!isDentalMode && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Blood Pressure" placeholder="120/80" value={form.bp} onChange={set('bp')} />
              <Field label="Temperature (°C)" placeholder="36.8" value={form.temperature} onChange={set('temperature')} />
            </div>
          )}

          {!isNurseTriage && (
            <>
              {requireDoctorFields && (
                <Field label="Diagnosis" placeholder="Document diagnosis assessment" value={form.diagnosis} onChange={set('diagnosis')} as="textarea" rows={3} />
              )}

              {/* Treatment Provided */}
              <Field label={requireDoctorFields ? 'Treatment Given' : 'Treatment Provided'} placeholder="Document treatment, care advice, and follow-up" value={form.treatmentProvided} onChange={set('treatmentProvided')} as="textarea" rows={3} />

              {!isDentalMode && (
                <div>
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="block text-xs font-semibold text-gray-600">Medicine Dispensed (Inventory)</p>
                    {medicines.length > 0 && (
                      <button type="button" onClick={() => setMedicines([])} className="text-[11px] font-semibold text-red-600 hover:text-red-700">
                        Clear all
                      </button>
                    )}
                  </div>

                  {medicines.length > 0 && (
                    <div className="mb-3 space-y-2">
                      {medicines.map((item) => (
                        <div key={item.id} className="flex items-center justify-between rounded border border-teal-100 bg-teal-50 px-3 py-2 text-sm">
                          <span className="text-gray-700">{item.medicine}</span>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-teal-700">x{item.qty}</span>
                            <button type="button" onClick={() => removeMedicine(item.id)} className="rounded border border-red-200 bg-white px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50 transition-colors" aria-label="Remove dispensed medicine">
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-[1fr_120px_auto] gap-3">
                    <select value={newMedicineId} onChange={(event) => setNewMedicineId(event.target.value)} className={INPUT_CLASS}>
                      <option value="">Select medicine from inventory</option>
                      {inventoryOptions.map((item) => (
                        <option key={item.id} value={item.id} disabled={item.currentStock <= 0}>
                          {item.itemName} ({item.currentStock} {item.unit})
                        </option>
                      ))}
                    </select>
                    <input type="number" min={1} value={newQty} onChange={(event) => setNewQty(event.target.value)} className={INPUT_CLASS} placeholder="Quantity" />
                    <button type="button" onClick={addMedicine} className="rounded border border-teal-300 px-4 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50 transition-colors">
                      Add
                    </button>
                  </div>
                </div>
              )}

              {requireDoctorFields && (
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-3">
                  <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.addFollowUp}
                      onChange={(event) => setForm((current) => ({ ...current, addFollowUp: event.target.checked }))}
                      className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    Add Follow Up Appointment
                  </label>

                  {form.addFollowUp && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field label="Follow Up Date" type="date" value={form.followUpDate} onChange={set('followUpDate')} />
                      <Field label="Follow Up Time" type="time" value={form.followUpTime} onChange={set('followUpTime')} />
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {validationError && (
          <div className="mt-5 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{validationError}</div>
        )}

        <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-4">
          <button type="button" onClick={onClose} className="rounded-md border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors">
            Cancel
          </button>
          <button type="button" onClick={handleSave} className="rounded-md bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 transition-colors">
            {saveLabel || (isNurseTriage ? 'Send to Doctor' : 'Save Consult')}
          </button>
        </div>
      </div>
    </div>
  );
}
