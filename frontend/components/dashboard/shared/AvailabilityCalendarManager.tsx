'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { getToken } from '@/lib/auth';
import { api, ApiError } from '@/lib/api';
import { formatTime12Hour } from '@/lib/time';
import { useServerEvents } from '@/lib/useServerEvents';
import toast from 'react-hot-toast';

type AvailabilityScope = 'medical' | 'dental';

interface ScopeConfigResponse {
  success: boolean;
  data: {
    scope: AvailabilityScope;
    month: number;
    year: number;
    days: Record<
      string,
      {
        isAvailable: boolean;
        slots: { startTime: string; endTime: string; capacity: number }[];
        isOverride: boolean;
      }
    >;
  };
}

type DayState = ScopeConfigResponse['data']['days'][string];

interface AvailabilityCalendarManagerProps {
  scope: AvailabilityScope;
  title: string;
  subtitle: string;
  hideHeader?: boolean;
  containerClassName?: string;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function AvailabilityCalendarManager({
  scope,
  title,
  subtitle,
  hideHeader = false,
  containerClassName = 'p-5 max-w-6xl mx-auto space-y-6',
}: AvailabilityCalendarManagerProps) {
  const now = new Date();

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [days, setDays] = useState<ScopeConfigResponse['data']['days']>({});
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [enabled, setEnabled] = useState(true);
  const [selectedSlots, setSelectedSlots] = useState<{ startTime: string; endTime: string; capacity: number }[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newSlotStartTime, setNewSlotStartTime] = useState('08:00');
  const [newSlotEndTime, setNewSlotEndTime] = useState('09:00');
  const [newSlotCapacity, setNewSlotCapacity] = useState<number | string>(1);
  const [isOverride, setIsOverride] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const isSelectedPast = selectedDate < todayIso();

  const [editingSlotIndex, setEditingSlotIndex] = useState<number | null>(null);
  const [editSlotStartTime, setEditSlotStartTime] = useState('');
  const [editSlotEndTime, setEditSlotEndTime] = useState('');
  const [editSlotCapacity, setEditSlotCapacity] = useState<number | string>(1);
  const [showEditConfirmModal, setShowEditConfirmModal] = useState(false);

  const [removingSlotIndex, setRemovingSlotIndex] = useState<number | null>(null);
  const [showRemoveConfirmModal, setShowRemoveConfirmModal] = useState(false);

  const [showForceConfirmModal, setShowForceConfirmModal] = useState(false);
  const [forceReason, setForceReason] = useState('');
  const [droppedCount, setDroppedCount] = useState(0);
  const [pendingConfig, setPendingConfig] = useState<{enabled: boolean, slots: any[]} | null>(null);

  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [month, year]);
  const firstDayOfMonth = useMemo(() => new Date(year, month - 1, 1).getDay(), [month, year]);
  const monthName = useMemo(() => new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' }), [month, year]);

  const selectedDay = days[selectedDate];

  function processFetchedDays(fetchedDays: Record<string, DayState>) {
    const today = todayIso();
    const updatedDays: Record<string, DayState> = {};
    for (const [dateKey, dayState] of Object.entries(fetchedDays)) {
      let isAvailable = dayState.isAvailable;
      if (!dayState.isOverride) {
        const dateObj = new Date(`${dateKey}T00:00:00`);
        const isSunday = dateObj.getDay() === 0;
        if (dateKey >= today && !isSunday) {
          isAvailable = true;
        }
      }
      updatedDays[dateKey] = { ...dayState, isAvailable };
    }
    return updatedDays;
  }

  async function fetchScopeConfig(showLoader = true) {
    const token = getToken();
    if (!token) {
      if (showLoader) toast.error('You are not logged in. Please sign in again.');
      return;
    }

    if (showLoader) setLoading(true);

    try {
      const response = await api.get<ScopeConfigResponse>(`/appointments/availability/config?scope=${scope}&month=${month}&year=${year}`, token);
      setDays(processFetchedDays(response.data.days || {}));
    } catch (err) {
      if (showLoader) {
        if (err instanceof ApiError) {
          toast.error(err.message);
        } else {
          toast.error('Failed to load calendar availability.');
        }
      }
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  useEffect(() => {
    void fetchScopeConfig(true);
  }, [scope, month, year]);

  useServerEvents(['calendar'], () => {
    void fetchScopeConfig(false);
  });

  useEffect(() => {
    if (!selectedDay) return;

    setEnabled(selectedDay.isAvailable);
    setSelectedSlots(selectedDay.slots || []);
    setIsOverride(selectedDay.isOverride);
  }, [selectedDay]);

  async function saveDateAvailability(newEnabled: boolean, newSlots: typeof selectedSlots, force = false, reason = '') {
    const token = getToken();
    if (!token) {
      toast.error('You are not logged in. Please sign in again.');
      return;
    }

    if (!selectedDate) {
      return;
    }

    setSaving(true);

    try {
      const payload: any = {
        scope,
        date: selectedDate,
        enabled: newEnabled,
        slots: newSlots,
      };
      if (force) {
        payload.force = true;
        payload.reason = reason;
      }
      
      await api.put('/appointments/availability/config', payload, token);

      toast.success('Calendar availability auto-saved.');
      void fetchScopeConfig(false);
      setShowForceConfirmModal(false);
      setPendingConfig(null);
    } catch (err: any) {
      if (err instanceof ApiError && err.status === 409) {
        // Conflict! Need to ask for reason.
        setDroppedCount(err.data?.droppedCount || 0);
        setPendingConfig({ enabled: newEnabled, slots: newSlots });
        setShowForceConfirmModal(true);
      } else if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to auto-save calendar availability.');
      }
    } finally {
      setSaving(false);
    }
  }

  function handleAddSlot() {
    if (!newSlotStartTime || !newSlotEndTime) return;

    if (selectedDate === todayIso()) {
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (newSlotStartTime <= currentHHMM) {
        toast.error('Cannot add a time slot in the past.');
        return;
      }
    }

    if (selectedSlots.some((s) => s.startTime === newSlotStartTime && s.endTime === newSlotEndTime)) {
      toast.error('This exact time range already exists.');
      return;
    }

    const capacity = typeof newSlotCapacity === 'number' && newSlotCapacity > 0 ? newSlotCapacity : 1;
    const newSlots = [...selectedSlots, { startTime: newSlotStartTime, endTime: newSlotEndTime, capacity }].sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    setSelectedSlots(newSlots);
    setIsAdding(false);
    void saveDateAvailability(enabled, newSlots);
  }

  function handleRemoveSlot(indexToRemove: number) {
    setRemovingSlotIndex(indexToRemove);
    setShowRemoveConfirmModal(true);
  }

  function handleRemoveConfirm() {
    if (removingSlotIndex === null) return;
    const newSlots = selectedSlots.filter((_, i) => i !== removingSlotIndex);
    setSelectedSlots(newSlots);
    setRemovingSlotIndex(null);
    setShowRemoveConfirmModal(false);
    void saveDateAvailability(enabled, newSlots);
  }

  function handleRemoveCancel() {
    setRemovingSlotIndex(null);
    setShowRemoveConfirmModal(false);
  }

  function handleStartEdit(index: number) {
    const slot = selectedSlots[index];
    setEditingSlotIndex(index);
    setEditSlotStartTime(slot.startTime);
    setEditSlotEndTime(slot.endTime);
    setEditSlotCapacity(slot.capacity);
  }

  function handleCancelEdit() {
    setEditingSlotIndex(null);
    setShowEditConfirmModal(false);
  }

  function handleSaveEditConfirm() {
    if (editingSlotIndex === null) return;

    if (selectedDate === todayIso()) {
      const now = new Date();
      const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      if (editSlotStartTime <= currentHHMM) {
        toast.error('Cannot update time slot to the past.');
        setShowEditConfirmModal(false);
        return;
      }
    }

    const capacity = typeof editSlotCapacity === 'number' && editSlotCapacity > 0 ? editSlotCapacity : 1;
    const newSlots = [...selectedSlots];
    newSlots[editingSlotIndex] = {
      startTime: editSlotStartTime,
      endTime: editSlotEndTime,
      capacity,
    };
    newSlots.sort((a, b) => a.startTime.localeCompare(b.startTime));
    
    setSelectedSlots(newSlots);
    setEditingSlotIndex(null);
    setShowEditConfirmModal(false);
    void saveDateAvailability(enabled, newSlots);
  }

  function handleEnabledChange(checked: boolean) {
    setEnabled(checked);
    void saveDateAvailability(checked, selectedSlots);
  }

  function prevMonth() {
    if (month === 1) {
      setMonth(12);
      setYear((value) => value - 1);
      return;
    }

    setMonth((value) => value - 1);
  }

  function nextMonth() {
    if (month === 12) {
      setMonth(1);
      setYear((value) => value + 1);
      return;
    }

    setMonth((value) => value + 1);
  }

  return (
    <div className={containerClassName}>
      {!hideHeader && (
        <div>
          <h1 className="text-xl font-bold text-gray-900">{title}</h1>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
              <ChevronLeft size={18} />
            </button>
            <span className="font-semibold text-gray-800">{monthName} {year}</span>
            <button type="button" onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((label) => (
              <div key={label} className="text-xs font-semibold text-gray-400 py-1">{label}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 relative">
            {loading && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 backdrop-blur-sm rounded-xl">
                <span className="text-sm font-medium text-gray-500">Loading calendar...</span>
              </div>
            )}

            {Array.from({ length: firstDayOfMonth }).map((_, index) => (
              <div key={`blank-${index}`} className="aspect-square" />
            ))}

            {Array.from({ length: daysInMonth }).map((_, index) => {
              const day = index + 1;
              const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayState = days[dateKey];
              const selected = selectedDate === dateKey;
              const available = !!dayState?.isAvailable;
              const isPast = dateKey < todayIso();

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => setSelectedDate(dateKey)}
                  className={`relative aspect-square rounded-xl text-sm font-medium transition-all border ${
                    isPast
                      ? selected ? 'border-gray-500 bg-gray-400 text-white shadow-inner' : 'border-gray-100 bg-gray-50 text-gray-400 opacity-60'
                      : selected
                        ? 'border-teal-700 bg-teal-600 text-white shadow-md ring-2 ring-teal-600/30 ring-offset-1'
                        : available
                          ? 'border-teal-200 bg-teal-50 text-teal-800 hover:bg-teal-100 hover:border-teal-300'
                          : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {day}
                  <span className="absolute bottom-1 right-1 text-[9px] opacity-80">
                    {available ? 'ON' : 'OFF'}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Selected Date</p>
            <p className="text-base font-bold text-gray-900 mt-1">
              {selectedDate
                ? new Date(`${selectedDate}T00:00:00`).toLocaleDateString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })
                : 'No date selected'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {isOverride ? 'Custom override is active for this date.' : 'Using default weekday schedule.'}
            </p>
          </div>

          <label className={`flex items-center gap-2 text-sm font-medium ${isSelectedPast ? 'text-gray-400' : 'text-gray-800'}`}>
            <input
              type="checkbox"
              checked={enabled}
              disabled={isSelectedPast}
              onChange={(event) => handleEnabledChange(event.target.checked)}
              className="rounded border-gray-300 text-teal-600 focus:ring-teal-500 disabled:opacity-50"
            />
            Available for appointments
          </label>

          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Time Slots</p>
              {enabled && !isAdding && !isSelectedPast && (
                <button
                  type="button"
                  onClick={() => setIsAdding(true)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-teal-50 text-teal-700 text-xs font-semibold hover:bg-teal-100 transition-colors border border-teal-200"
                >
                  <span className="text-lg leading-none mb-0.5">+</span> Add Slot
                </button>
              )}
            </div>
            
            <div className="space-y-4">
              {/* Add new slot form */}
              {enabled && isAdding && (
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 shadow-sm space-y-3">
                  <p className="text-xs font-semibold text-gray-700">Add New Time Slot</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">From</label>
                      <input
                        type="time"
                        value={newSlotStartTime}
                        onChange={(e) => setNewSlotStartTime(e.target.value)}
                        className="w-full rounded-xl border-gray-200 bg-white py-3 px-4 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-sm font-medium transition-colors hover:border-gray-300"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">To</label>
                      <input
                        type="time"
                        value={newSlotEndTime}
                        onChange={(e) => setNewSlotEndTime(e.target.value)}
                        className="w-full rounded-xl border-gray-200 bg-white py-3 px-4 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-sm font-medium transition-colors hover:border-gray-300"
                      />
                    </div>
                    <div className="w-28">
                      <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Slots</label>
                      <input
                        type="number"
                        min="1"
                        value={newSlotCapacity}
                        onChange={(e) => setNewSlotCapacity(e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                        className="w-full rounded-xl border-gray-200 bg-white py-3 px-4 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-sm font-medium transition-colors hover:border-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAdding(false)}
                      className="px-4 py-1.5 rounded-lg text-gray-600 text-sm font-medium hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleAddSlot}
                      className="px-4 py-1.5 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 transition-colors"
                    >
                      Add Slot
                    </button>
                  </div>
                </div>
              )}

              {/* List existing slots */}
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                {selectedSlots.length === 0 ? (
                  <p className="text-sm text-gray-500 italic py-2">No slots configured for this date.</p>
                ) : (
                  selectedSlots.map((slot, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-xl border ${
                        enabled ? 'border-gray-200 bg-white shadow-sm hover:border-teal-300 transition-colors' : 'border-gray-200 bg-gray-50 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-bold text-gray-900 mb-1">
                            {formatTime12Hour(slot.startTime)} - {formatTime12Hour(slot.endTime)}
                          </p>
                          <span className="inline-flex items-center rounded-md bg-teal-50 px-2 py-1 text-xs font-medium text-teal-700 ring-1 ring-inset ring-teal-600/20">
                            {slot.capacity} {slot.capacity === 1 ? 'slot available' : 'slots available'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            disabled={!enabled || isSelectedPast}
                            onClick={() => handleStartEdit(index)}
                            className="text-xs font-semibold text-teal-600 hover:text-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-teal-50 hover:bg-teal-100 px-3 py-1.5 rounded-lg"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={!enabled || isSelectedPast}
                            onClick={() => handleRemoveSlot(index)}
                            className="text-xs font-semibold text-red-600 hover:text-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>


        </div>
      </div>

      {/* Edit Slot Modal */}
      {editingSlotIndex !== null && !showEditConfirmModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-sm space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900">Edit Time Slot</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">From</label>
                <input
                  type="time"
                  value={editSlotStartTime}
                  onChange={(e) => setEditSlotStartTime(e.target.value)}
                  className="w-full rounded-xl border-gray-200 bg-gray-50 py-3 px-4 shadow-sm focus:bg-white focus:border-teal-500 focus:ring-teal-500 font-medium transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">To</label>
                <input
                  type="time"
                  value={editSlotEndTime}
                  onChange={(e) => setEditSlotEndTime(e.target.value)}
                  className="w-full rounded-xl border-gray-200 bg-gray-50 py-3 px-4 shadow-sm focus:bg-white focus:border-teal-500 focus:ring-teal-500 font-medium transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Number of Slots</label>
                <input
                  type="number"
                  min="1"
                  value={editSlotCapacity}
                  onChange={(e) => setEditSlotCapacity(e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                  className="w-full rounded-xl border-gray-200 bg-gray-50 py-3 px-4 shadow-sm focus:bg-white focus:border-teal-500 focus:ring-teal-500 font-medium transition-colors [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="px-4 py-2 rounded-lg text-gray-600 font-medium hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setShowEditConfirmModal(true)}
                className="px-4 py-2 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Confirm Modal */}
      {showEditConfirmModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-sm space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900">Confirm Edit</h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to save changes to this time slot? This will update the availability for the selected date.
            </p>
            <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
              <p className="text-sm font-medium text-gray-800">New Schedule:</p>
              <p className="text-sm text-gray-600">{formatTime12Hour(editSlotStartTime)} - {formatTime12Hour(editSlotEndTime)}</p>
              <p className="text-sm text-gray-600">{editSlotCapacity} {editSlotCapacity === 1 ? 'slot' : 'slots'}</p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowEditConfirmModal(false)}
                className="px-4 py-2 rounded-lg text-gray-600 font-medium hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditConfirm}
                className="px-4 py-2 rounded-lg bg-teal-600 text-white font-semibold hover:bg-teal-700 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remove Confirm Modal */}
      {showRemoveConfirmModal && removingSlotIndex !== null && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-sm space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900">Remove Time Slot</h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to remove this time slot? This action cannot be undone.
            </p>
            <div className="bg-red-50 rounded-lg p-3 border border-red-100">
              <p className="text-sm font-medium text-red-800">Removing:</p>
              <p className="text-sm text-red-600">
                {formatTime12Hour(selectedSlots[removingSlotIndex].startTime)} - {formatTime12Hour(selectedSlots[removingSlotIndex].endTime)}
              </p>
              <p className="text-sm text-red-600">
                {selectedSlots[removingSlotIndex].capacity} {selectedSlots[removingSlotIndex].capacity === 1 ? 'slot' : 'slots'}
              </p>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={handleRemoveCancel}
                className="px-4 py-2 rounded-lg text-gray-600 font-medium hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRemoveConfirm}
                className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Force Confirm Modal for Dropped Appointments */}
      {showForceConfirmModal && pendingConfig && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 shadow-xl w-full max-w-sm space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold text-gray-900">Confirm Slot Reduction</h3>
            <div className="bg-orange-50 rounded-lg p-3 border border-orange-100">
              <p className="text-sm font-medium text-orange-800">Warning: Appointments will be dropped!</p>
              <p className="text-sm text-orange-700 mt-1">
                This action will drop <strong>{droppedCount}</strong> existing consultation(s) that are already booked by students.
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for cancellation <span className="text-red-500">*</span>
              </label>
              <textarea
                value={forceReason}
                onChange={(e) => setForceReason(e.target.value)}
                rows={3}
                placeholder="e.g. Doctor had an emergency..."
                className="w-full rounded-xl border-gray-200 bg-gray-50 py-3 px-4 shadow-sm focus:bg-white focus:border-orange-500 focus:ring-orange-500 font-medium transition-colors"
                required
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowForceConfirmModal(false);
                  setPendingConfig(null);
                  setForceReason('');
                }}
                className="px-4 py-2 rounded-lg text-gray-600 font-medium hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!forceReason.trim() || saving}
                onClick={() => {
                  if (pendingConfig && forceReason.trim()) {
                    void saveDateAvailability(pendingConfig.enabled, pendingConfig.slots, true, forceReason.trim());
                  }
                }}
                className="px-4 py-2 rounded-lg bg-orange-600 text-white font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Dropping...' : 'Confirm & Drop'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
