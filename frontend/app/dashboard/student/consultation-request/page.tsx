'use client';

import { useState, useEffect } from 'react';
import { Clock3, ChevronLeft, ChevronRight } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface AppointmentResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    preferredDate: string;
    preferredTime: string;
    serviceType: string;
    symptoms: string;
    status: string;
    createdAt: string;
  };
}

interface AvailabilityResponse {
  success: boolean;
  data: Record<string, number>;
}

const SERVICE_OPTIONS = ['Medical Consultation', 'Dental Check-up', 'Medical Clearance'] as const;
type ServiceType = (typeof SERVICE_OPTIONS)[number];

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export default function ConsultationRequestPage() {
  const [serviceType, setServiceType] = useState<ServiceType>('Medical Consultation');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('09:00');
  const [symptoms, setSymptoms] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Calendar State
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1); // 1-12
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [availability, setAvailability] = useState<Record<string, number>>({});
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  useEffect(() => {
    async function fetchAvailability() {
      const token = getToken();
      if (!token) return;
      
      setLoadingCalendar(true);
      try {
        const res = await api.get<AvailabilityResponse>(`/appointments/availability?month=${currentMonth}&year=${currentYear}`, token);
        setAvailability(res.data);
      } catch (err) {
        console.error('Failed to load availability', err);
      } finally {
        setLoadingCalendar(false);
      }
    }
    fetchAvailability();
  }, [currentMonth, currentYear]);

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();

    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      return;
    }

    if (!preferredDate) {
      setError('Please select a preferred date from the calendar.');
      return;
    }

    if (!symptoms.trim()) {
      setError('Please provide your symptoms or reason for visit.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        preferredDate,
        preferredTime,
        serviceType,
        symptoms: symptoms.trim(),
      };

      const response = await api.post<AppointmentResponse>('/appointments/book', payload, token);

      setSuccess(
        `${response.message} Schedule: ${new Date(response.data.preferredDate).toLocaleDateString('en-US')} at ${response.data.preferredTime}.`,
      );
      setSymptoms('');
      setPreferredDate('');
      
      // Refresh calendar
      const res = await api.get<AvailabilityResponse>(`/appointments/availability?month=${currentMonth}&year=${currentYear}`, token);
      setAvailability(res.data);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to submit consultation request.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  // Generate calendar days
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay();
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const prevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const monthName = new Date(currentYear, currentMonth - 1, 1).toLocaleString('default', { month: 'long' });

  return (
    <div className="p-5 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Consultation Request</h1>
        <p className="text-sm text-gray-500 mt-1">
          Book a medical consultation, dental check-up, or medical clearance request to avoid queue congestion.
        </p>
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
        {/* Left Column: Calendar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col">
          <h2 className="text-sm font-semibold text-gray-800 mb-4">Select Preferred Date</h2>
          
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
              <ChevronLeft size={18} />
            </button>
            <span className="font-semibold text-gray-800">{monthName} {currentYear}</span>
            <button type="button" onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-600">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => (
              <div key={d} className="text-xs font-semibold text-gray-400 py-1">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 flex-1 content-start relative">
            {loadingCalendar && (
              <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10 backdrop-blur-sm rounded-xl">
                <span className="text-sm font-medium text-gray-500">Loading availability...</span>
              </div>
            )}
            {blanks.map((b) => (
              <div key={`blank-${b}`} className="aspect-square"></div>
            ))}
            {days.map((day) => {
              const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const count = availability[dateStr] || 0;
              const isPast = new Date(dateStr) < new Date(today.setHours(0,0,0,0));
              
              const isFullyBooked = count >= 10;
              const isFillingUp = count >= 7 && count < 10;
              const isAvailable = count < 7;
              
              const isSelected = preferredDate === dateStr;
              
              let bgClass = "bg-gray-50 text-gray-400 hover:bg-gray-100"; // Default / Past
              let borderClass = isSelected ? "border-2 border-teal-500" : "border border-transparent";

              if (!isPast) {
                if (isFullyBooked) {
                  bgClass = "bg-red-50 text-red-700 cursor-not-allowed opacity-60";
                } else if (isFillingUp) {
                  bgClass = isSelected ? "bg-amber-400 text-white shadow-sm" : "bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer";
                } else {
                  bgClass = isSelected ? "bg-teal-500 text-white shadow-sm" : "bg-teal-50 text-teal-800 hover:bg-teal-100 cursor-pointer";
                }
              }

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isPast || isFullyBooked}
                  onClick={() => setPreferredDate(dateStr)}
                  className={`relative aspect-square rounded-xl flex items-center justify-center text-sm font-medium transition-all ${bgClass} ${borderClass}`}
                >
                  {day}
                  {!isPast && (
                    <span className="absolute bottom-1 right-1.5 text-[9px] font-bold opacity-70">
                      {isFullyBooked ? 'FULL' : count > 0 ? count : ''}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex flex-wrap gap-5 text-xs font-bold text-gray-600 justify-center bg-gray-50 p-4 rounded-xl border border-gray-100">
            <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-md bg-teal-100 border-2 border-teal-300"></div> Available</div>
            <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-md bg-amber-200 border-2 border-amber-400 shadow-sm"></div> Filling Up (7-9)</div>
            <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-md bg-red-100 border-2 border-red-300"></div> Fully Booked (10)</div>
          </div>
        </div>

        {/* Right Column: Form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/40 p-6 sm:p-8 space-y-6">
          <form onSubmit={submitRequest} className="flex flex-col h-full space-y-4">
            
            {preferredDate ? (
              <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 mb-2 flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-teal-800 uppercase tracking-wider">Selected Date</p>
                  <p className="text-sm font-bold text-teal-900 mt-0.5">
                    {new Date(preferredDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 border-dashed rounded-xl p-3 mb-2 text-center text-sm font-medium text-gray-500">
                Please select a date from the calendar
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Service Type</label>
              <select
                value={serviceType}
                onChange={(event) => setServiceType(event.target.value as ServiceType)}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all cursor-pointer"
              >
                {SERVICE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Preferred Time</label>
              <div className="relative">
                <Clock3 size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-teal-600" />
                <input
                  type="time"
                  step={300}
                  value={preferredTime}
                  onChange={(event) => setPreferredTime(event.target.value)}
                  className="w-full border border-gray-200 rounded-xl pl-12 pr-4 py-3 text-sm font-medium bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all cursor-pointer"
                />
              </div>
            </div>

            <div className="space-y-1.5 flex-1 flex flex-col">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Symptoms / Reason</label>
              <textarea
                value={symptoms}
                onChange={(event) => setSymptoms(event.target.value)}
                placeholder="Describe your symptoms or the concern you want checked..."
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium bg-gray-50 focus:bg-white resize-none flex-1 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
              />
            </div>

            <div className="pt-4 mt-auto border-t border-gray-100">
              <p className="mb-5 text-xs font-bold text-red-700 leading-relaxed bg-red-50 p-4 rounded-xl border border-red-200 flex gap-3 shadow-sm">
                <span className="text-xl">⚠️</span>
                <span>For severe emergencies (e.g., difficulty breathing, severe bleeding), do not use this form. Proceed immediately to the Gordon College Clinic.</span>
              </p>
              <button
                type="submit"
                disabled={submitting || !preferredDate}
                className="w-full px-6 py-4 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-base font-bold shadow-lg hover:shadow-teal-500/30 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:hover:shadow-none disabled:active:scale-100"
              >
                {submitting ? 'Submitting Request...' : 'Confirm Request'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
