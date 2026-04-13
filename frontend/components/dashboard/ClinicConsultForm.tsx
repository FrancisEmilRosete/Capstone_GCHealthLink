'use client';

import { useMemo, useRef, useState } from 'react';

export const CLINIC_CONCERN_TAG_OPTIONS = [
  'Fever',
  'Cough/Colds',
  'Headache',
  'Stomachache',
  'Injury',
  'General Consultation',
] as const;

export type ClinicConcernTag = (typeof CLINIC_CONCERN_TAG_OPTIONS)[number];

export interface ClinicConsultStudentProfile {
  id: string;
  firstName: string;
  lastName: string;
  mi?: string | null;
  age?: number | null;
  courseDept?: string | null;
  sex?: string | null;
}

export interface ClinicConsultInventoryItem {
  id: string;
  itemName: string;
  currentStock: number;
  unit: string;
}

export interface ClinicConsultSubmitPayload {
  studentProfileId: string;
  visitDate: string;
  visitTime: string;
  concernTag: string;
  chiefComplaintEnc: string;
  dispensedMedicines: Array<{
    inventoryId: string;
    quantity: number;
  }>;
}

interface MedicineRowState {
  rowId: number;
  inventoryId: string;
  quantity: string;
}

interface ClinicConsultFormProps {
  studentProfile: ClinicConsultStudentProfile;
  inventoryItems: ClinicConsultInventoryItem[];
  onSubmit: (payload: ClinicConsultSubmitPayload) => Promise<void> | void;
  isSubmitting?: boolean;
  className?: string;
}

const INPUT_CLASS =
  'mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 shadow-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100';
const READONLY_INPUT_CLASS =
  'mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700';

function getLocalDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getLocalTimeInputValue(date = new Date()) {
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
}

function createMedicineRow(rowId: number): MedicineRowState {
  return {
    rowId,
    inventoryId: '',
    quantity: '1',
  };
}

function buildFullName(studentProfile: ClinicConsultStudentProfile) {
  const middleInitial = studentProfile.mi?.trim();
  return [studentProfile.firstName, middleInitial ? `${middleInitial}.` : '', studentProfile.lastName]
    .filter(Boolean)
    .join(' ')
    .trim();
}

export default function ClinicConsultForm({
  studentProfile,
  inventoryItems,
  onSubmit,
  isSubmitting = false,
  className = '',
}: ClinicConsultFormProps) {
  const [visitDate, setVisitDate] = useState(getLocalDateInputValue);
  const [visitTime, setVisitTime] = useState(getLocalTimeInputValue);
  const [concernTag, setConcernTag] = useState<string>('General Consultation');
  const [chiefComplaintEnc, setChiefComplaintEnc] = useState('');
  const [medicineRows, setMedicineRows] = useState<MedicineRowState[]>([createMedicineRow(1)]);
  const [formError, setFormError] = useState('');
  const [customConcernTags, setCustomConcernTags] = useState<string[]>([]);
  const [newConcernTag, setNewConcernTag] = useState('');

  const nextRowIdRef = useRef(2);

  const inventoryById = useMemo(
    () => new Map(inventoryItems.map((item) => [item.id, item])),
    [inventoryItems],
  );

  const allConcernTags = useMemo(
    () => [...CLINIC_CONCERN_TAG_OPTIONS, ...customConcernTags],
    [customConcernTags],
  );

  function addCustomConcernTag() {
    const normalized = newConcernTag.trim();
    if (!normalized) {
      return;
    }

    const alreadyExists = allConcernTags.some((tag) => tag.toLowerCase() === normalized.toLowerCase());
    if (alreadyExists) {
      setNewConcernTag('');
      return;
    }

    setCustomConcernTags((current) => [...current, normalized]);
    setConcernTag(normalized);
    setNewConcernTag('');
  }

  function addMedicineRow() {
    setMedicineRows((current) => [...current, createMedicineRow(nextRowIdRef.current++)]);
  }

  function removeMedicineRow(rowId: number) {
    setMedicineRows((current) => {
      if (current.length === 1) {
        return [{ ...current[0], inventoryId: '', quantity: '1' }];
      }

      return current.filter((row) => row.rowId !== rowId);
    });
  }

  function updateMedicineRow(rowId: number, patch: Partial<MedicineRowState>) {
    setMedicineRows((current) =>
      current.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)),
    );
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const normalizedComplaint = chiefComplaintEnc.trim();

    if (!visitDate) {
      setFormError('Visit date is required.');
      return;
    }

    if (!visitTime) {
      setFormError('Visit time is required.');
      return;
    }

    if (!normalizedComplaint) {
      setFormError('Chief complaint is required.');
      return;
    }

    const aggregatedMedicines = new Map<string, number>();

    for (const row of medicineRows) {
      const inventoryId = row.inventoryId.trim();
      if (!inventoryId) {
        continue;
      }

      const quantity = Number(row.quantity);
      if (!Number.isInteger(quantity) || quantity <= 0) {
        setFormError('Medicine quantity must be a positive whole number.');
        return;
      }

      aggregatedMedicines.set(inventoryId, (aggregatedMedicines.get(inventoryId) || 0) + quantity);
    }

    const dispensedMedicines = Array.from(aggregatedMedicines.entries()).map(
      ([inventoryId, quantity]) => ({ inventoryId, quantity }),
    );

    for (const medicine of dispensedMedicines) {
      const inventoryItem = inventoryById.get(medicine.inventoryId);

      if (!inventoryItem) {
        setFormError('One selected medicine no longer exists in inventory. Please reselect it.');
        return;
      }

      if (medicine.quantity > inventoryItem.currentStock) {
        setFormError(
          `Insufficient stock for ${inventoryItem.itemName}. Available: ${inventoryItem.currentStock} ${inventoryItem.unit}.`,
        );
        return;
      }
    }

    const payload: ClinicConsultSubmitPayload = {
      studentProfileId: studentProfile.id,
      visitDate,
      visitTime,
      concernTag,
      chiefComplaintEnc: normalizedComplaint,
      dispensedMedicines,
    };

    try {
      setFormError('');
      await onSubmit(payload);
    } catch (error) {
      setFormError(error instanceof Error ? error.message : 'Failed to save consultation.');
    }
  }

  return (
    <form
      onSubmit={(event) => {
        void handleSubmit(event);
      }}
      className={`mx-auto w-full max-w-5xl space-y-5 ${className}`}
    >
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Patient Info</h2>
          <p className="mt-1 text-xs text-slate-500">Auto-filled demographics from Student Profile</p>
        </div>

        <div className="grid grid-cols-1 gap-4 px-5 py-5 md:grid-cols-2">
          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Full Name</label>
            <input
              type="text"
              value={buildFullName(studentProfile)}
              readOnly
              disabled
              className={READONLY_INPUT_CLASS}
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Age</label>
            <input
              type="text"
              value={studentProfile.age ?? 'N/A'}
              readOnly
              disabled
              className={READONLY_INPUT_CLASS}
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Dept &amp; Course</label>
            <input
              type="text"
              value={studentProfile.courseDept?.trim() || 'N/A'}
              readOnly
              disabled
              className={READONLY_INPUT_CLASS}
            />
          </div>

          <div>
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sex</label>
            <input
              type="text"
              value={studentProfile.sex?.trim() || 'N/A'}
              readOnly
              disabled
              className={READONLY_INPUT_CLASS}
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Visit Details</h2>
          <p className="mt-1 text-xs text-slate-500">Maps to ClinicVisit fields</p>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label htmlFor="clinic-visit-date" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Visit Date
              </label>
              <input
                id="clinic-visit-date"
                type="date"
                value={visitDate}
                onChange={(event) => setVisitDate(event.target.value)}
                className={INPUT_CLASS}
                required
              />
            </div>

            <div>
              <label htmlFor="clinic-visit-time" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Visit Time
              </label>
              <input
                id="clinic-visit-time"
                type="time"
                value={visitTime}
                onChange={(event) => setVisitTime(event.target.value)}
                className={INPUT_CLASS}
                required
              />
            </div>

            <div>
              <label htmlFor="clinic-concern-tag" className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Concern Tag
              </label>
              <select
                id="clinic-concern-tag"
                value={concernTag}
                onChange={(event) => setConcernTag(event.target.value)}
                className={INPUT_CLASS}
              >
                {allConcernTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>

              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  value={newConcernTag}
                  onChange={(event) => setNewConcernTag(event.target.value)}
                  placeholder="Add custom category (e.g., First Aid)"
                  className={INPUT_CLASS}
                />
                <button
                  type="button"
                  onClick={addCustomConcernTag}
                  className="rounded-lg border border-teal-300 px-3 py-2 text-xs font-semibold text-teal-700 hover:bg-teal-50"
                >
                  Add Tag
                </button>
              </div>
            </div>
          </div>

          <div>
            <label
              htmlFor="clinic-chief-complaint"
              className="text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Chief Complaint
            </label>
            <textarea
              id="clinic-chief-complaint"
              value={chiefComplaintEnc}
              onChange={(event) => setChiefComplaintEnc(event.target.value)}
              className={`${INPUT_CLASS} min-h-[110px] resize-y`}
              placeholder="Enter detailed symptoms and chief complaint"
              required
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h2 className="text-base font-semibold text-slate-900">Medicine Dispensed</h2>
          <p className="mt-1 text-xs text-slate-500">Maps to VisitMedicine and Inventory</p>
        </div>

        <div className="space-y-3 px-5 py-5">
          {medicineRows.map((row, index) => {
            const selectedInventory = inventoryById.get(row.inventoryId);

            return (
              <div key={row.rowId} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Medicine #{index + 1}
                  </p>
                  <button
                    type="button"
                    onClick={() => removeMedicineRow(row.rowId)}
                    className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-white"
                  >
                    Remove
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_140px]">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Inventory Item</label>
                    <select
                      value={row.inventoryId}
                      onChange={(event) => updateMedicineRow(row.rowId, { inventoryId: event.target.value })}
                      className={INPUT_CLASS}
                    >
                      <option value="">Select medicine</option>
                      {inventoryItems.map((item) => (
                        <option key={item.id} value={item.id} disabled={item.currentStock <= 0}>
                          {item.itemName} ({item.currentStock} {item.unit})
                        </option>
                      ))}
                    </select>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedInventory
                        ? `Available: ${selectedInventory.currentStock} ${selectedInventory.unit}`
                        : 'Choose a medicine from inventory.'}
                    </p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">Quantity</label>
                    <input
                      type="number"
                      min={1}
                      step={1}
                      inputMode="numeric"
                      value={row.quantity}
                      onChange={(event) => updateMedicineRow(row.rowId, { quantity: event.target.value })}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={addMedicineRow}
            className="inline-flex items-center rounded-lg border border-dashed border-teal-300 bg-teal-50 px-4 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-100"
          >
            Add Another Medicine
          </button>
        </div>
      </div>

      {formError && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formError}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? 'Saving Consultation...' : 'Save Consultation'}
        </button>
      </div>
    </form>
  );
}
