'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Clock, Activity, Search, ChevronRight } from 'lucide-react';
import PredictiveInsightsCard from '@/components/dashboard/shared/PredictiveInsightsCard';
import ConsultationModal, { type ConsultationForm, type ConsultationPatient } from '@/components/modals/ConsultationModal';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface QueueItem {
  id: string;
  preferredDate: string;
  preferredTime: string;
  serviceType: string;
  symptoms: string;
  status: 'WAITING' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  studentProfile: {
    id: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
    courseDept: string;
    course?: string | null;
    yearLevel?: string | null;
    age?: number | null;
    sex?: string | null;
  };
}

interface QueueResponse {
  success: boolean;
  data: QueueItem[];
}

type LiveQueueFilter = 'all' | 'incoming' | 'waiting';

function isFollowUpAppointment(item: QueueItem) {
  const service = (item.serviceType || '').toLowerCase();
  const reason = (item.symptoms || '').toLowerCase();
  return (
    service.includes('follow up')
    || service.includes('follow-up')
    || reason.includes('follow up')
    || reason.includes('follow-up')
    || reason.includes('recheck')
    || reason.includes('re-check')
    || reason.includes('revisit')
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DentalDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [liveQueueFilter, setLiveQueueFilter] = useState<LiveQueueFilter>('all');
  const [consultModalOpen, setConsultModalOpen] = useState(false);
  const [consultingPatient, setConsultingPatient] = useState<QueueItem | null>(null);

  async function loadQueue() {
    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await api.get<QueueResponse>(
        '/appointments/queue?limit=500&serviceType=Dental%20Check-up&status=WAITING,PENDING,IN_PROGRESS,COMPLETED,CANCELLED',
        token,
      );
      setQueue(response.data || []);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load dental queue.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQueue();
  }, []);

  function openConsultModal(patient: QueueItem) {
    setConsultingPatient(patient);
    setConsultModalOpen(true);
  }

  async function handleConsultSave(form: ConsultationForm) {
    if (!consultingPatient) return;

    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      return;
    }

    if (!consultingPatient.studentProfile.id) {
      setError('Student profile is missing. Please refresh and try again.');
      return;
    }

    const normalizedChiefComplaint = form.chiefComplaint?.trim() || '';
    const normalizedDiagnosis = form.diagnosis?.trim() || '';
    const normalizedTreatment = form.treatmentProvided?.trim() || '';

    const structuredComplaint = {
      concernTag: 'Dental Consultation',
      symptoms: normalizedChiefComplaint,
      chiefComplaint: normalizedChiefComplaint || 'Dental concern',
      diagnosis: normalizedDiagnosis || null,
      treatmentProvided: normalizedTreatment || null,
      treatmentManagement: normalizedTreatment || null,
      age: form.age?.trim() || null,
      sex: form.sex?.trim() || null,
      notes: ['Dental Consultation', normalizedChiefComplaint, normalizedDiagnosis, normalizedTreatment]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(' | ') || 'Dental consultation',
      followUp: form.addFollowUp
        ? {
            date: form.followUpDate?.trim() || '',
            time: form.followUpTime?.trim() || '',
          }
        : null,
    };

    try {
      setError('');
      await api.post(
        '/clinic/visits',
        {
          studentProfileId: consultingPatient.studentProfile.id,
          visitDate: form.visitDate?.trim() || new Date().toISOString(),
          visitTime: form.visitTime?.trim() || consultingPatient.preferredTime || undefined,
          chiefComplaintEnc: JSON.stringify(structuredComplaint),
          dispensedMedicines: [],
        },
        token,
      );

      await api.put(`/appointments/queue/${consultingPatient.id}`, { status: 'COMPLETED' }, token);

      setConsultModalOpen(false);
      setConsultingPatient(null);
      await loadQueue();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to save dental consultation.');
      }
    }
  }

  const filteredQueue = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return queue;

    return queue.filter((item) => {
      const fullName = `${item.studentProfile.firstName} ${item.studentProfile.lastName}`.toLowerCase();
      return (
        fullName.includes(q)
        || item.studentProfile.studentNumber.toLowerCase().includes(q)
        || (item.symptoms || '').toLowerCase().includes(q)
      );
    });
  }, [queue, searchQuery]);

  function parseScheduleDateTime(item: QueueItem): Date | null {
    const datePart = new Date(item.preferredDate);
    if (Number.isNaN(datePart.getTime())) return null;

    const raw = (item.preferredTime || '').trim();
    if (!raw) {
      return new Date(datePart.getFullYear(), datePart.getMonth(), datePart.getDate(), 0, 0, 0, 0);
    }

    const twelveHour = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (twelveHour) {
      let hour = Number.parseInt(twelveHour[1], 10);
      const minute = Number.parseInt(twelveHour[2], 10);
      const meridiem = twelveHour[3].toUpperCase();
      if (meridiem === 'PM' && hour < 12) hour += 12;
      if (meridiem === 'AM' && hour === 12) hour = 0;
      return new Date(datePart.getFullYear(), datePart.getMonth(), datePart.getDate(), hour, minute, 0, 0);
    }

    const twentyFourHour = raw.match(/^(\d{1,2}):(\d{2})$/);
    if (twentyFourHour) {
      const hour = Number.parseInt(twentyFourHour[1], 10);
      const minute = Number.parseInt(twentyFourHour[2], 10);
      return new Date(datePart.getFullYear(), datePart.getMonth(), datePart.getDate(), hour, minute, 0, 0);
    }

    return new Date(datePart.getFullYear(), datePart.getMonth(), datePart.getDate(), 0, 0, 0, 0);
  }

  function getDisplayQueueStatus(item: QueueItem): 'INCOMING' | 'WAITING' {
    const scheduled = parseScheduleDateTime(item);
    if (!scheduled) return 'WAITING';
    return scheduled.getTime() > Date.now() ? 'INCOMING' : 'WAITING';
  }

  function resolveLiveQueueStatus(item: QueueItem): 'INCOMING' | 'WAITING' {
    return getDisplayQueueStatus(item);
  }

  function isFutureFollowUp(item: QueueItem): boolean {
    if (!isFollowUpAppointment(item)) return false;
    const scheduled = parseScheduleDateTime(item);
    if (!scheduled) return false;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const scheduledDay = new Date(scheduled);
    scheduledDay.setHours(0, 0, 0, 0);

    return scheduledDay.getTime() > todayStart.getTime();
  }

  const liveQueueCandidates = filteredQueue.filter(
    (item) =>
      item.status === 'WAITING'
      && (!isFollowUpAppointment(item) || !isFutureFollowUp(item))
  );

  const allPatientsCount = liveQueueCandidates.length;
  const incomingCount = liveQueueCandidates.filter((item) => resolveLiveQueueStatus(item) === 'INCOMING').length;
  const waitingCount = liveQueueCandidates.filter((item) => resolveLiveQueueStatus(item) === 'WAITING').length;
  const pendingCount = filteredQueue.filter((item) => item.status === 'PENDING').length;

  const liveQueue = liveQueueCandidates.filter((item) => {
    const status = resolveLiveQueueStatus(item);
    if (liveQueueFilter === 'all') return true;
    if (liveQueueFilter === 'incoming') return status === 'INCOMING';
    return status === 'WAITING';
  });

  const followUps = filteredQueue
    .filter((item) => item.status === 'WAITING' && isFutureFollowUp(item))
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-30 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Dental Clinic Dashboard</h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Dental queue from live backend data</p>
        </div>

        <button
          onClick={() => router.push('/dashboard/dental/scanner')}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
        >
          <UserPlus size={18} />
          Open QR Scanner
        </button>
      </header>

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <UserPlus size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">All Patients</p>
                  <p className="text-2xl font-black text-slate-800">{allPatientsCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-sky-50 text-sky-600 rounded-2xl">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Incoming</p>
                  <p className="text-2xl font-black text-slate-800">{incomingCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Waiting</p>
                  <p className="text-2xl font-black text-slate-800">{waitingCount}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                  <Activity size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Pending</p>
                  <p className="text-2xl font-black text-slate-800">{pendingCount}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
              <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-lg font-black text-slate-800 tracking-tight">Live Patient Queue</h2>
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center rounded-2xl border border-gray-200 bg-gray-100 p-1">
                    <button
                      type="button"
                      onClick={() => setLiveQueueFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        liveQueueFilter === 'all' ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-white'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => setLiveQueueFilter('incoming')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        liveQueueFilter === 'incoming' ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-white'
                      }`}
                    >
                      Incoming
                    </button>
                    <button
                      type="button"
                      onClick={() => setLiveQueueFilter('waiting')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        liveQueueFilter === 'waiting' ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-white'
                      }`}
                    >
                      Waiting
                    </button>
                  </div>

                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search queue..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                {loading ? (
                  <div className="px-6 py-12 text-center text-slate-400 font-bold">Loading queue...</div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-white shadow-sm z-10">
                      <tr>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Schedule</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Patient</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Department</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Reason</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {liveQueue.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold">No patients found.</td>
                        </tr>
                      ) : (
                        liveQueue.map((patient) => (
                          <tr key={patient.id} className="hover:bg-slate-50/50 transition-colors group">
                            <td className="px-6 py-4">
                              <span className="text-sm font-bold text-slate-600">{formatDate(patient.preferredDate)} {patient.preferredTime}</span>
                            </td>
                            <td className="px-6 py-4">
                              <div>
                                <p className="text-sm font-black text-slate-800">{patient.studentProfile.firstName} {patient.studentProfile.lastName}</p>
                                <p className="text-xs font-semibold text-slate-400">{patient.studentProfile.studentNumber}</p>
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <p className="text-xs font-semibold text-slate-500">{patient.studentProfile.courseDept || 'N/A'}</p>
                            </td>
                            <td className="px-6 py-4">
                              <span className="text-sm font-bold text-slate-600">{patient.symptoms || 'N/A'}</span>
                            </td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                resolveLiveQueueStatus(patient) === 'INCOMING'
                                  ? 'bg-slate-100 text-slate-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}>
                                {resolveLiveQueueStatus(patient) === 'INCOMING'
                                  ? 'Incoming'
                                  : 'Waiting'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                type="button"
                                onClick={() => openConsultModal(patient)}
                                className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider"
                              >
                                Consult <ChevronRight size={14} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            <div className="xl:col-span-1 bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
              <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-black text-slate-800 tracking-tight">Follow Ups</h2>
                <p className="text-xs font-semibold text-slate-500 mt-1">Dental follow-up appointments</p>
              </div>

              <div className="flex-1 overflow-auto divide-y divide-slate-50">
                {loading ? (
                  <div className="px-6 py-8 text-center text-slate-400 font-bold">Loading follow ups...</div>
                ) : followUps.length === 0 ? (
                  <div className="px-6 py-8 text-center text-slate-400 font-bold">No follow ups yet.</div>
                ) : (
                  followUps.map((item) => (
                    <div key={`followup-${item.id}`} className="px-6 py-4 hover:bg-slate-50/60 transition-colors">
                      <p className="text-sm font-black text-slate-800">{item.studentProfile.firstName} {item.studentProfile.lastName}</p>
                      <p className="text-xs font-semibold text-slate-400 mt-0.5">{item.studentProfile.studentNumber}</p>
                      <p className="text-xs text-slate-500 mt-2">Follow-up Date: {formatDate(item.preferredDate)}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {consultModalOpen && consultingPatient && (
        <ConsultationModal
          patient={{
            firstName: consultingPatient.studentProfile.firstName,
            middleName: '',
            lastName: consultingPatient.studentProfile.lastName,
            department: consultingPatient.studentProfile.courseDept,
            course: consultingPatient.studentProfile.course || consultingPatient.studentProfile.courseDept,
            yearLevel: consultingPatient.studentProfile.yearLevel || '',
            age: consultingPatient.studentProfile.age ? String(consultingPatient.studentProfile.age) : '',
            sex: consultingPatient.studentProfile.sex || '',
          } as ConsultationPatient}
          inventoryOptions={[]}
          mode="dental"
          saveLabel="Save Dental Consult"
          requireDoctorFields
          initialValues={{
            chiefComplaint: consultingPatient.symptoms || '',
          }}
          onClose={() => setConsultModalOpen(false)}
          onSave={(data) => {
            void handleConsultSave(data);
          }}
        />
      )}

      <PredictiveInsightsCard role="dental" className="mx-8 mb-8" />
    </div>
  );
}
