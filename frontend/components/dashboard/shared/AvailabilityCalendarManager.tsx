'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { formatTime12Hour } from '@/lib/time';

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
        slots: string[];
        isOverride: boolean;
      }
    >;
  };
}

const SLOT_OPTIONS = [
  '07:00', '07:10', '07:20', '07:30', '07:40', '07:50',
  '08:00', '08:10', '08:20', '08:30', '08:40', '08:50',
  '09:00', '09:10', '09:20', '09:30', '09:40', '09:50',
  '10:00', '10:10', '10:20', '10:30', '10:40', '10:50',
  '11:00', '11:10', '11:20', '11:30', '11:40', '11:50',
  '12:00', '12:10', '12:20', '12:30', '12:40', '12:50',
  '13:00', '13:10', '13:20', '13:30', '13:40', '13:50',
  '14:00', '14:10', '14:20', '14:30', '14:40', '14:50',
  '15:00', '15:10', '15:20', '15:30', '15:40', '15:50',
  '16:00', '16:10', '16:20', '16:30', '16:40', '16:50',
  '17:00', '17:10', '17:20', '17:30', '17:40', '17:50',
  '18:00', '18:10', '18:20', '18:30', '18:40', '18:50',
  '19:00',
];

interface AvailabilityCalendarManagerProps {
  scope: AvailabilityScope;
  title: string;
  subtitle: string;
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function AvailabilityCalendarManager({ scope, title, subtitle }: AvailabilityCalendarManagerProps) {
  const now = new Date();

  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [days, setDays] = useState<ScopeConfigResponse['data']['days']>({});
  const [selectedDate, setSelectedDate] = useState(todayIso());
  const [enabled, setEnabled] = useState(true);
  const [selectedSlots, setSelectedSlots] = useState<string[]>([]);
  const [isOverride, setIsOverride] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const daysInMonth = useMemo(() => new Date(year, month, 0).getDate(), [month, year]);
  const firstDayOfMonth = useMemo(() => new Date(year, month - 1, 1).getDay(), [month, year]);
  const monthName = useMemo(() => new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' }), [month, year]);

  const selectedDay = days[selectedDate];

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    async function fetchScopeConfig(showLoader = true) {
      const token = getToken();
      if (!token) {
        if (showLoader) setError('You are not logged in. Please sign in again.');
        return;
      }

      if (showLoader) setLoading(true);
      if (showLoader) setError('');

      try {
        const response = await api.get<ScopeConfigResponse>(`/appointments/availability/config?scope=${scope}&month=${month}&year=${year}`, token);
        setDays(response.data.days || {});
      } catch (err) {
        if (showLoader) {
          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError('Failed to load calendar availability.');
          }
        }
      } finally {
        if (showLoader) setLoading(false);
      }
    }

    void fetchScopeConfig(true);

    interval = setInterval(() => {
      void fetchScopeConfig(false);
    }, 15000);

    return () => clearInterval(interval);
  }, [scope, month, year]);

  useEffect(() => {
    if (!selectedDay) return;

    setEnabled(selectedDay.isAvailable);
    setSelectedSlots(selectedDay.slots || []);
    setIsOverride(selectedDay.isOverride);
  }, [selectedDay]);

  async function saveDateAvailability() {
    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      return;
    }

    if (!selectedDate) {
      setError('Please select a date first.');
      return;
    }

    if (enabled && selectedSlots.length === 0) {
      setError('Select at least one time slot when availability is enabled.');
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.put(
        '/appointments/availability/config',
        {
          scope,
          date: selectedDate,
          enabled,
          slots: selectedSlots,
        },
        token,
      );

      setSuccess('Calendar availability updated.');

      const response = await api.get<ScopeConfigResponse>(`/appointments/availability/config?scope=${scope}&month=${month}&year=${year}`, token);
      setDays(response.data.days || {});
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to save calendar availability.');
      }
    } finally {
      setSaving(false);
    }
  }

  async function resetToDefault() {
    const token = getToken();
    if (!token || !selectedDate) {
      return;
    }

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await api.put(
        '/appointments/availability/config',
        {
          scope,
          date: selectedDate,
          useDefault: true,
        },
        token,
      );

      setSuccess('Date reset to default schedule.');

      const response = await api.get<ScopeConfigResponse>(`/appointments/availability/config?scope=${scope}&month=${month}&year=${year}`, token);
      setDays(response.data.days || {});
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to reset date availability.');
      }
    } finally {
      setSaving(false);
    }
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
    <div className="p-5 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">{title}</h1>
        <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
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

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => setSelectedDate(dateKey)}
                  className={`relative aspect-square rounded-xl text-sm font-medium transition-all border ${
                    selected
                      ? 'border-teal-500 bg-teal-500 text-white'
                      : available
                        ? 'border-teal-100 bg-teal-50 text-teal-700 hover:bg-teal-100'
                        : 'border-gray-200 bg-gray-100 text-gray-500 hover:bg-gray-200'
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

          <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
              className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            Available for appointments
          </label>

          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-3">Time Slots</p>
            <div className="grid grid-cols-3 gap-2">
              {SLOT_OPTIONS.map((slot) => {
                const active = selectedSlots.includes(slot);
                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={!enabled}
                    onClick={() => {
                      setSelectedSlots((prev) => (
                        prev.includes(slot)
                          ? prev.filter((value) => value !== slot)
                          : [...prev, slot].sort()
                      ));
                    }}
                    className={`rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors ${
                      active
                        ? 'border-teal-500 bg-teal-500 text-white'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                  >
                    {formatTime12Hour(slot)}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => void saveDateAvailability()}
              disabled={saving || !selectedDate}
              className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving...' : 'Save Date'}
            </button>
            <button
              type="button"
              onClick={() => void resetToDefault()}
              disabled={saving || !selectedDate}
              className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reset to Default
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
