'use client';

import { useState, useEffect, useMemo } from 'react';
import { Clock3, ChevronLeft, ChevronRight, X } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { formatTime12Hour } from '@/lib/time';
import { normalizeComplaintDisplay } from '@/lib/complaint';
import toast from 'react-hot-toast';

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
  data: {
    counts: Record<string, number>;
    dayAvailability: Record<string, { isAvailable: boolean; slots: any[] }>;
    bookedSlots?: Record<string, string[]>;
  };
}

interface VisitMedicine {
  quantity: number;
  inventory: {
    itemName: string;
    unit: string;
  };
}

interface ClinicVisit {
  id: string;
  visitDate: string;
  visitTime: string | null;
  chiefComplaintEnc: string | null;
  handledBy: {
    email: string;
  };
  dispensedMedicines: VisitMedicine[];
}



const SERVICE_OPTIONS = ['Medical Consultation', 'Dental Check-up'] as const;
type ServiceType = (typeof SERVICE_OPTIONS)[number];

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDate(value?: string | null) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
function parseScheduled(apt: any): Date | null {
  const d = new Date(apt.preferredDate || apt.preferred_date);
  if (isNaN(d.getTime())) return null;
  const raw = ((apt.preferredTime || apt.preferred_time) || '').trim();
  const m12 = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    let h = parseInt(m12[1]); const min = parseInt(m12[2]);
    if (m12[3].toUpperCase() === 'PM' && h < 12) h += 12;
    if (m12[3].toUpperCase() === 'AM' && h === 12) h = 0;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, min);
  }
  const m24 = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) return new Date(d.getFullYear(), d.getMonth(), d.getDate(), parseInt(m24[1]), parseInt(m24[2]));
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function resolveStatus(apt: any): string {
  const s = apt.status?.toUpperCase();
  if (s === 'WAITING') {
    const sched = parseScheduled(apt);
    return sched && sched.getTime() > Date.now() ? 'INCOMING' : 'WAITING';
  }
  return s || 'UNKNOWN';
}

function formatStatus(status?: string) {
  if (!status) return 'UNKNOWN';
  return status
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}


export default function ConsultationRequestPage() {
  const [serviceType, setServiceType] = useState<ServiceType>('Medical Consultation');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [preferredTimeIndex, setPreferredTimeIndex] = useState<number>(0);
  const [symptoms, setSymptoms] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [modalDateStr, setModalDateStr] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Calendar State
  const today = new Date();
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1); // 1-12
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [availabilityCounts, setAvailabilityCounts] = useState<Record<string, number>>({});
  const [dayAvailability, setDayAvailability] = useState<Record<string, { isAvailable: boolean; slots: any[] }>>({});
  const [bookedSlots, setBookedSlots] = useState<Record<string, string[]>>({});
  const [loadingCalendar, setLoadingCalendar] = useState(false);

  // My Consultations State
  const [appointments, setAppointments] = useState<any[]>([]);
  const [certificates, setCertificates] = useState<any[]>([]);
  const [clinicVisits, setClinicVisits] = useState<ClinicVisit[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<any | null>(null);

  const [consultationPage, setConsultationPage] = useState(1);
  const [requestsPage, setRequestsPage] = useState(1);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [selectedCancelId, setSelectedCancelId] = useState<string | null>(null);


  async function fetchProfileData() {
    const token = getToken();
    if (!token) return;
    try {
      setLoadingProfile(true);
      const res = await api.get<any>('/students/me', token);
      if (res.success && res.data) {
        setAppointments(res.data.appointments || []);
        setCertificates(res.data.medicalCertificates || []);
        setClinicVisits(res.data.clinicVisits || []);
      }
    } catch (err) {
      console.error('Failed to load profile data', err);
    } finally {
      setLoadingProfile(false);
    }
  }

  useEffect(() => {
    fetchProfileData();
  }, []);

  const pendingRequests = useMemo(() => appointments.filter(a => a.status === 'WAITING'), [appointments]);
  const touchedAppointments = useMemo(() => appointments.filter(a => a.status !== 'WAITING'), [appointments]);

  const mergedConsultations = useMemo(() => {
    const merged = [
      ...touchedAppointments.map(a => ({ ...a, _type: 'appointment' as const, sortDate: new Date(a.preferredDate).getTime() })),
      ...clinicVisits.map(v => ({ ...v, _type: 'clinicVisit' as const, sortDate: new Date(v.visitDate).getTime() }))
    ];
    merged.sort((a, b) => b.sortDate - a.sortDate);
    return merged;
  }, [touchedAppointments, clinicVisits]);

  const itemsPerPage = 5;
  
  const totalRequests = pendingRequests.length;
  const totalRequestPages = Math.max(1, Math.ceil(totalRequests / itemsPerPage));
  const displayedRequests = useMemo(() => {
    const startIndex = (requestsPage - 1) * itemsPerPage;
    return pendingRequests.slice(startIndex, startIndex + itemsPerPage);
  }, [pendingRequests, requestsPage]);

  const totalConsultations = mergedConsultations.length;
  const totalConsultationPages = Math.max(1, Math.ceil(totalConsultations / itemsPerPage));
  const displayedConsultations = useMemo(() => {
    const startIndex = (consultationPage - 1) * itemsPerPage;
    return mergedConsultations.slice(startIndex, startIndex + itemsPerPage);
  }, [mergedConsultations, consultationPage]);

  function handleEditRequest(apt: any, e: React.MouseEvent) {
    e.stopPropagation();
    setEditingRequestId(apt.id);
    setServiceType(apt.serviceType);
    setSymptoms(apt.symptoms);
    setPreferredDate(new Date(apt.preferredDate).toISOString().split('T')[0]);
    setPreferredTime(apt.preferredTime);
    setEditModalOpen(true);
  }

  function handleCancelRequest(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedCancelId(id);
    setCancelModalOpen(true);
  }

  async function confirmCancelRequest() {
    if (!selectedCancelId) return;
    const token = getToken();
    if (!token) return;
    try {
      await api.del(`/appointments/${selectedCancelId}`, token);
      toast.success('Consultation request cancelled.');
      fetchProfileData();
    } catch (err) {
      toast.error("Failed to cancel request.");
    } finally {
      setCancelModalOpen(false);
      setSelectedCancelId(null);
    }
  }

  function getScopeByServiceType(value: ServiceType): 'medical' | 'dental' {
    return value === 'Dental Check-up' ? 'dental' : 'medical';
  }

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    
    async function fetchAvailability(showLoader = true) {
      const token = getToken();
      if (!token) return;
      
      if (showLoader) setLoadingCalendar(true);
      try {
        const res = await api.get<AvailabilityResponse>(`/appointments/availability?month=${currentMonth}&year=${currentYear}&serviceType=${encodeURIComponent(serviceType)}`, token);
        setAvailabilityCounts(res.data?.counts || {});
        setDayAvailability(res.data?.dayAvailability || {});
        setBookedSlots(res.data?.bookedSlots || {});
      } catch (err) {
        console.error('Failed to load availability', err);
      } finally {
        if (showLoader) setLoadingCalendar(false);
      }
    }
    
    fetchAvailability(true);
    
    // Poll every 15 seconds to sync availability
    interval = setInterval(() => {
      fetchAvailability(false);
    }, 15000);

    return () => clearInterval(interval);
  }, [currentMonth, currentYear, serviceType]);

  useEffect(() => {
    // We handle preferred time selection in the modal now
  }, [dayAvailability, preferredDate]);

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();

    const token = getToken();
    if (!token) {
      toast.error('You are not logged in. Please sign in again.');
      return;
    }

    if (!preferredDate) {
      toast.error('Please select a preferred date from the calendar.');
      return;
    }

    if (!symptoms.trim()) {
      toast.error('Please provide your symptoms or reason for visit.');
      return;
    }

    const selectedDay = dayAvailability[preferredDate];
    if (!selectedDay || !selectedDay.isAvailable) {
      toast.error(`${getScopeByServiceType(serviceType) === 'dental' ? 'Dentist' : 'Doctor'} is not available on the selected date.`);
      return;
    }

    const isValidSlot = selectedDay.slots.some((slotObj: any) => {
      if (typeof slotObj === 'string') return slotObj === preferredTime;
      
      if (slotObj.startTime && slotObj.endTime) {
        const [sH, sM] = slotObj.startTime.split(':').map(Number);
        const [eH, eM] = slotObj.endTime.split(':').map(Number);
        const startMins = sH * 60 + sM;
        const endMins = eH * 60 + eM;
        
        const [pH, pM] = preferredTime.split(':').map(Number);
        const prefMins = pH * 60 + pM;
        
        return prefMins >= startMins && prefMins < endMins;
      }
      return slotObj.startTime === preferredTime;
    });

    if (!isValidSlot) {
      toast.error('Please select a valid available appointment time.');
      return;
    }

    const selectedDateTime = new Date(`${preferredDate}T${preferredTime}:00`);
    if (Number.isNaN(selectedDateTime.getTime()) || selectedDateTime.getTime() <= Date.now()) {
      toast.error('Preferred appointment date/time must be in the future.');
      return;
    }

    setSubmitting(true);

    try {
      const payload = {
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        service_type: serviceType,
        symptoms: symptoms.trim(),
      };

      if (editingRequestId) {
        await api.put<AppointmentResponse>(`/appointments/${editingRequestId}`, payload, token);
        toast.success('Request updated successfully.');
        setEditingRequestId(null);
        setEditModalOpen(false);
      } else {
        const response = await api.post<AppointmentResponse>('/appointments', payload, token);
        toast.success(`Consultation requested successfully. Schedule: ${new Date(response.data.preferredDate).toLocaleDateString('en-US')} at ${response.data.preferredTime}.`);
      }
      setSymptoms('');
      setPreferredDate('');
      setPreferredTime('');
      setPreferredTimeIndex(0);
      
      // Refresh calendar and profile
      fetchProfileData();
      const res = await api.get<AvailabilityResponse>(`/appointments/availability?month=${currentMonth}&year=${currentYear}&serviceType=${encodeURIComponent(serviceType)}`, token);
      setAvailabilityCounts(res.data?.counts || {});
      setDayAvailability(res.data?.dayAvailability || {});
      setBookedSlots(res.data?.bookedSlots || {});
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to submit consultation request.');
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

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200 relative">
            <button 
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition"
            >
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold text-gray-800 mb-1">Select Time Slot</h2>
            <p className="text-sm text-gray-500 mb-5">
              {new Date(modalDateStr).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
            
            <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
              {(() => {
                 const dayConfig = dayAvailability[modalDateStr];
                 const baseSlots = dayConfig?.slots || [];
                 
                 const expandedSlots: { time: string; index: number; globalIndex: number }[] = [];
                 let gIndex = 0;
                 baseSlots.forEach((slotObj: any) => {
                   if (typeof slotObj === 'string') {
                     expandedSlots.push({ time: slotObj, index: 0, globalIndex: gIndex++ });
                   } else {
                     const capacity = typeof slotObj.capacity === 'number' && slotObj.capacity > 0 ? slotObj.capacity : 1;
                     const start = slotObj.startTime;
                     const end = slotObj.endTime;
                     
                     if (capacity === 1 || !start || !end) {
                       expandedSlots.push({ time: start || slotObj.time, index: 0, globalIndex: gIndex++ });
                     } else {
                       const [sH, sM] = start.split(':').map(Number);
                       const [eH, eM] = end.split(':').map(Number);
                       const startMins = sH * 60 + sM;
                       const endMins = eH * 60 + eM;
                       const duration = endMins - startMins;
                       const interval = Math.floor(duration / capacity);

                       for(let i = 0; i < capacity; i++) {
                         const currentMins = startMins + (interval * i);
                         const hh = String(Math.floor(currentMins / 60)).padStart(2, '0');
                         const mm = String(currentMins % 60).padStart(2, '0');
                         const time = `${hh}:${mm}`;
                         expandedSlots.push({ time, index: i, globalIndex: gIndex++ });
                       }
                     }
                   }
                 });

                 if (!dayConfig?.isAvailable || expandedSlots.length === 0) {
                   return (
                     <div className="py-10 text-center flex flex-col items-center">
                       <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                         <Clock3 className="text-gray-400" size={24} />
                       </div>
                       <p className="text-gray-500 font-medium">No available slots for this day.</p>
                       <p className="text-xs text-gray-400 mt-1">Please select a different date.</p>
                     </div>
                   );
                 }
                 return (
                    <div className="grid grid-cols-2 gap-3">
                      {expandedSlots.map(slotItem => {
                        const slot = slotItem.time;
                        const isBooked = (bookedSlots[modalDateStr] || []).includes(slot);
                        return (
                          <button
                            key={`${slot}-${slotItem.globalIndex}`}
                            type="button"
                            disabled={isBooked}
                            onClick={() => {
                              if (isBooked) return;
                              setPreferredDate(modalDateStr);
                              setPreferredTime(slot);
                              setPreferredTimeIndex(slotItem.globalIndex);
                              setModalOpen(false);
                            }}
                            className={`p-4 rounded-xl border-2 text-center transition-all ${
                              isBooked 
                                ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed opacity-60'
                                : preferredDate === modalDateStr && preferredTime === slot && preferredTimeIndex === slotItem.globalIndex
                                  ? 'border-teal-500 bg-teal-50 text-teal-700 font-bold shadow-sm'
                                  : 'border-gray-100 hover:border-teal-300 hover:bg-teal-50 text-gray-700 font-semibold'
                            }`}
                          >
                            <div className="flex flex-col items-center justify-center space-y-1">
                              <span>{formatTime12Hour(slot)}</span>
                              <span className="text-xs opacity-75">
                                {isBooked ? 'Booked' : `Slot #${slotItem.globalIndex + 1}`}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                 );
              })()}
            </div>
          </div>
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
              const count = availabilityCounts[dateStr] || 0;
              const isPast = new Date(dateStr) < new Date(todayDateString());
              const dayConfig = dayAvailability[dateStr];
              const isDayUnavailable = !dayConfig?.isAvailable;
              
              const isFullyBooked = count >= 10;
              const isFillingUp = count >= 7 && count < 10;
              const isAvailable = count < 7;
              
              const isSelected = preferredDate === dateStr;
              
              let bgClass = "bg-gray-50 text-gray-400 hover:bg-gray-100"; // Default / Past
              let borderClass = isSelected ? "border-2 border-teal-500" : "border border-transparent";

              if (!isPast) {
                if (isDayUnavailable) {
                  bgClass = "bg-gray-100 text-gray-500 cursor-not-allowed opacity-70";
                } else if (isFullyBooked) {
                  bgClass = "bg-red-50 text-red-700 cursor-not-allowed opacity-60";
                } else if (isFillingUp) {
                  bgClass = isSelected ? "bg-amber-500 border-amber-600 text-white shadow-md ring-2 ring-amber-500/30 ring-offset-1" : "bg-amber-100 text-amber-900 border-amber-200 hover:bg-amber-200 cursor-pointer";
                } else {
                  bgClass = isSelected ? "bg-teal-600 border-teal-700 text-white shadow-md ring-2 ring-teal-600/30 ring-offset-1" : "bg-teal-50 text-teal-800 border-teal-200 hover:bg-teal-100 cursor-pointer";
                }
              }

              return (
                <button
                  key={day}
                  type="button"
                  disabled={isPast}
                  onClick={() => {
                    setModalDateStr(dateStr);
                    setModalOpen(true);
                  }}
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


        </div>

        {/* Right Column: Form */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/40 p-6 sm:p-8 space-y-6">
          <form onSubmit={submitRequest} className="flex flex-col h-full space-y-4">
            
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Service Type</label>
              <select
                value={serviceType}
                onChange={(event) => {
                  const nextService = event.target.value as ServiceType;
                  setServiceType(nextService);
                  setPreferredDate('');
                  setPreferredTime('');
                  setPreferredTimeIndex(0);
                }}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all cursor-pointer"
              >
                {SERVICE_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Preferred Schedule</label>
              <div className="relative">
                {preferredDate && preferredTime ? (
                  <div className="w-full border border-teal-200 rounded-xl px-4 py-3 text-sm font-bold bg-teal-50 text-teal-800 flex items-center justify-between">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <Clock3 size={16} className="text-teal-600" />
                        <span>{new Date(preferredDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {formatTime12Hour(preferredTime)}</span>
                      </div>
                      <span className="text-xs font-medium text-teal-600 pl-6">
                        Slot #{preferredTimeIndex + 1}
                      </span>
                    </div>
                    <button 
                      type="button"
                      onClick={() => {
                        setModalDateStr(preferredDate);
                        setModalOpen(true);
                      }}
                      className="text-xs font-semibold text-teal-600 hover:underline px-2"
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className="w-full border border-gray-200 border-dashed rounded-xl px-4 py-3.5 text-sm font-medium bg-gray-50 text-gray-400 flex items-center justify-center gap-2">
                    <Clock3 size={18} className="text-gray-400" />
                    Select date from calendar
                  </div>
                )}
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
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={submitting || !preferredDate}
                  className="w-full px-6 py-4 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-sm font-bold shadow-lg hover:shadow-teal-500/30 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:hover:shadow-none disabled:active:scale-100"
                >
                  {submitting ? 'Submitting...' : 'Confirm Request'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* My Requests List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-6">
        <h2 className="text-base font-bold text-gray-800 mb-6">My Requests</h2>
        {loadingProfile ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : pendingRequests.length === 0 ? (
          <p className="text-sm text-gray-400">No pending requests found.</p>
        ) : (
          <div className="border border-blue-100 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F4F8FB] text-slate-500 text-xs font-bold border-b border-blue-100">
                  <th className="px-6 py-4 uppercase tracking-wider">Service</th>
                  <th className="px-6 py-4 uppercase tracking-wider">Schedule</th>
                  <th className="px-6 py-4 uppercase tracking-wider hidden md:table-cell">Symptoms</th>
                  <th className="px-6 py-4 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedRequests.map((apt) => (
                  <tr key={apt.id} className="border-b border-blue-50 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {apt.serviceType}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {formatDate(apt.preferredDate)} <span className="text-slate-300 mx-1">|</span> {formatTime12Hour(apt.preferredTime)}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-500 hidden md:table-cell max-w-[200px] truncate">
                      {apt.symptoms}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAppointment({ ...apt, _type: 'appointment' });
                            setDetailsModalOpen(true);
                          }}
                          className="px-3 py-1.5 border border-blue-200 text-blue-600 text-[11px] font-bold rounded-full hover:bg-blue-50 transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={(e) => handleEditRequest(apt, e)}
                          className="px-3 py-1.5 border border-amber-200 text-amber-600 text-[11px] font-bold rounded-full hover:bg-amber-50 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => handleCancelRequest(apt.id, e)}
                          className="px-3 py-1.5 border border-red-200 text-red-600 text-[11px] font-bold rounded-full hover:bg-red-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalRequestPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
            <button
              onClick={() => setRequestsPage(p => Math.max(1, p - 1))}
              disabled={requestsPage === 1}
              className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Previous
            </button>
            <span className="text-xs font-medium text-gray-500">
              Page {requestsPage} of {totalRequestPages}
            </span>
            <button
              onClick={() => setRequestsPage(p => Math.min(totalRequestPages, p + 1))}
              disabled={requestsPage === totalRequestPages}
              className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* My Consultations List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-6">
        <h2 className="text-base font-bold text-gray-800 mb-4">My Consultations</h2>
        {mergedConsultations.length === 0 ? (
          <p className="text-sm text-gray-400">No consultations on record yet.</p>
        ) : (
          <div className="border border-blue-100 rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F4F8FB] text-slate-500 text-xs font-bold border-b border-blue-100">
                  <th className="px-6 py-4 uppercase tracking-wider">Service</th>
                  <th className="px-6 py-4 uppercase tracking-wider">Schedule</th>
                  <th className="px-6 py-4 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-4 uppercase tracking-wider text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {displayedConsultations.map((item) => (
                  <tr key={item.id} className="border-b border-blue-50 hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {item._type === 'appointment' ? item.serviceType : 'CONSULTATION'}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-700">
                      {formatDate(item._type === 'appointment' ? item.preferredDate : item.visitDate)} <span className="text-slate-300 mx-1">|</span> {item._type === 'appointment' ? formatTime12Hour(item.preferredTime) : (item.visitTime ? formatTime12Hour(item.visitTime) : 'N/A')}
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">
                      <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        item._type === 'appointment' 
                          ? resolveStatus(item) === 'INCOMING' ? 'bg-indigo-100 text-indigo-800'
                          : resolveStatus(item) === 'PENDING' ? 'bg-amber-100 text-amber-800'
                          : resolveStatus(item) === 'WAITING' ? 'bg-blue-100 text-blue-800'
                          : resolveStatus(item) === 'IN_PROGRESS' ? 'bg-teal-100 text-teal-800'
                          : resolveStatus(item) === 'FOR_DISPENSING' || resolveStatus(item) === 'FOR DISPENSING' ? 'bg-purple-100 text-purple-800'
                          : resolveStatus(item) === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800'
                          : resolveStatus(item) === 'CANCELLED' ? 'bg-red-100 text-red-800'
                          : 'bg-slate-100 text-slate-600'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {item._type === 'appointment' ? formatStatus(resolveStatus(item)) : 'COMPLETED'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAppointment(item);
                          setDetailsModalOpen(true);
                        }}
                        className="px-4 py-1.5 border border-blue-200 text-blue-600 text-[11px] font-bold rounded-full hover:bg-blue-50 transition-colors"
                      >
                        View Record
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalConsultationPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-gray-100 pt-4">
            <button
              onClick={() => setConsultationPage(p => Math.max(1, p - 1))}
              disabled={consultationPage === 1}
              className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Previous
            </button>
            <span className="text-xs font-medium text-gray-500">
              Page {consultationPage} of {totalConsultationPages}
            </span>
            <button
              onClick={() => setConsultationPage(p => Math.min(totalConsultationPages, p + 1))}
              disabled={consultationPage === totalConsultationPages}
              className="px-3 py-1.5 text-xs font-semibold border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {detailsModalOpen && selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => {
                setDetailsModalOpen(false);
                setSelectedAppointment(null);
              }}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              {selectedAppointment._type === 'appointment' ? 'Request Details' : 'Consultation Details'}
            </h3>
            
            {selectedAppointment._type === 'appointment' ? (
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Service Type</p>
                  <p className="text-sm font-medium text-gray-800">{selectedAppointment.serviceType}</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</p>
                  <p className={`text-sm font-bold ${selectedAppointment.status === 'CANCELLED' ? 'text-red-600' : 'text-gray-800'}`}>
                    {formatStatus(resolveStatus(selectedAppointment))}
                  </p>
                </div>
                {selectedAppointment.status === 'CANCELLED' && selectedAppointment.cancellationReason && (
                  <div>
                    <p className="text-[11px] font-semibold text-red-500 uppercase tracking-wider mb-1">Cancellation Reason</p>
                    <div className="text-sm font-medium text-red-700 bg-red-50 p-3 rounded-xl whitespace-pre-wrap border border-red-100">
                      {selectedAppointment.cancellationReason}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Schedule</p>
                  <p className="text-sm font-medium text-gray-800">
                    {new Date(selectedAppointment.preferredDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {formatTime12Hour(selectedAppointment.preferredTime)}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Symptoms / Reason</p>
                  <div className="text-sm font-medium text-gray-700 bg-gray-50 p-3 rounded-xl whitespace-pre-wrap">
                    {selectedAppointment.symptoms}
                  </div>
                </div>
                
                {/* Check if a certificate was issued on the exact same date */}
                {(() => {
                  if (!selectedAppointment?.preferredDate) return null;
                  const preferredDateObj = new Date(selectedAppointment.preferredDate);
                  if (isNaN(preferredDateObj.getTime())) return null;
                  const preferredDateStr = preferredDateObj.toISOString().split('T')[0];

                  const cert = certificates.find(c => {
                    if (!c.issuedAt) return false;
                    const issuedAtObj = new Date(c.issuedAt);
                    if (isNaN(issuedAtObj.getTime())) return false;
                    return issuedAtObj.toISOString().split('T')[0] === preferredDateStr;
                  });
                  if (cert) {
                    return (
                      <div className="pt-4 border-t border-gray-100">
                        <button 
                          className="w-full text-center bg-teal-50 hover:bg-teal-100 text-teal-700 font-bold py-3 rounded-xl transition-colors border border-teal-200"
                          onClick={() => {
                            toast('Please download the certificate from your My Record tab', { icon: '📄' });
                          }} 
                        >
                          View Certificate
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</p>
                  <p className="text-sm font-medium text-gray-800">Completed</p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Schedule</p>
                  <p className="text-sm font-medium text-gray-800">
                    {formatDate(selectedAppointment.visitDate)} at {selectedAppointment.visitTime ? formatTime12Hour(selectedAppointment.visitTime) : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Complaint / Notes</p>
                  <div className="text-sm font-medium text-gray-700 bg-gray-50 p-3 rounded-xl whitespace-pre-wrap">
                    {normalizeComplaintDisplay(selectedAppointment.chiefComplaintEnc)}
                  </div>
                </div>
                
                {selectedAppointment.dispensedMedicines && selectedAppointment.dispensedMedicines.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">Prescribed Medicines</p>
                    <div className="space-y-2">
                      {selectedAppointment.dispensedMedicines.map((med: any) => (
                        <div key={med.id} className="flex justify-between items-center bg-teal-50/50 p-2.5 rounded-lg border border-teal-100">
                          <span className="text-sm font-semibold text-teal-800">{med.inventory.itemName}</span>
                          <span className="text-xs font-bold text-teal-600 bg-teal-100 px-2 py-1 rounded-md">
                            Qty: {med.quantity} {med.inventory.unit}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Handled By</p>
                  <p className="text-sm font-medium text-gray-800">{selectedAppointment.handledBy?.email || 'Clinic Staff'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {cancelModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <h3 className="text-lg font-bold text-gray-800 mb-2">Cancel Request</h3>
            <p className="text-sm text-gray-600 mb-6">Are you sure you want to cancel this consultation request? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setCancelModalOpen(false);
                  setSelectedCancelId(null);
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-bold transition-all"
              >
                No, Keep it
              </button>
              <button
                onClick={confirmCancelRequest}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold shadow-lg transition-all"
              >
                Yes, Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editModalOpen && (
        <div className="fixed inset-0 z-[40] flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200 my-8">
            <button 
              onClick={() => {
                setEditModalOpen(false);
                setEditingRequestId(null);
                setSymptoms('');
                setPreferredDate('');
              }}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-800 mb-4">Edit Request</h3>
            <form onSubmit={submitRequest} className="flex flex-col gap-5">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Service Type</label>
                <select
                  value={serviceType}
                  onChange={(e) => setServiceType(e.target.value as ServiceType)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                >
                  <option value="Medical Consultation">Medical Consultation</option>
                  <option value="Dental Check-up">Dental Check-up</option>
                  <option value="Medical Clearance">Medical Clearance</option>
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Preferred Date</label>
                <input
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  min={todayDateString()}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Preferred Time</label>
                <select
                  value={preferredTime}
                  onChange={(e) => setPreferredTime(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium bg-gray-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                >
                  <option value="">Select Time</option>
                  {(dayAvailability[preferredDate]?.slots || []).map(slotObj => {
                    const slot = typeof slotObj === 'string' ? slotObj : (slotObj as any).startTime;
                    return <option key={slot} value={slot}>{formatTime12Hour(slot)}</option>;
                  })}
                </select>
                {!dayAvailability[preferredDate]?.slots?.length && preferredDate && (
                  <p className="text-xs text-red-500 mt-1">No available slots for the selected date.</p>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Symptoms / Reason</label>
                <textarea
                  value={symptoms}
                  onChange={(event) => setSymptoms(event.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium bg-gray-50 focus:bg-white resize-none min-h-[100px] focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 transition-all"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting || !preferredDate || !preferredTime}
                  className="w-full px-6 py-4 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-sm font-bold shadow-lg hover:shadow-teal-500/30 transition-all transform active:scale-[0.98] disabled:opacity-50 disabled:hover:shadow-none disabled:active:scale-100"
                >
                  {submitting ? 'Updating...' : 'Update Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
