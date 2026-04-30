'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Clock, Activity, Search } from 'lucide-react';

import Toast from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import PredictiveInsightsCard from '@/components/dashboard/shared/PredictiveInsightsCard';
import UseQrLookupModal, { type QrResolvedStudent } from '@/components/scanner/UseQrLookupModal';
import ConsultationModal, {
  type ConsultationForm,
  type InventoryOption,
  type ConsultationPatient,
} from '@/components/modals/ConsultationModal';

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
    yearLevel?: 'YR_1' | 'YR_2' | 'YR_3' | 'YR_4' | string | null;
    age?: number | null;
    sex?: string | null;
  };
}

interface QueueResponse {
  success: boolean;
  data: QueueItem[];
}

interface CreateVisitResponse {
  success: boolean;
  message: string;
}

interface InventoryResponse {
  success: boolean;
  data: InventoryOption[];
}

interface VisitRecordSummary {
  id: string;
  visitDate?: string;
  createdAt?: string;
  chiefComplaintEnc?: string;
}

interface VisitsResponse {
  success: boolean;
  data: VisitRecordSummary[];
}

type LiveQueueFilter = 'all' | 'incoming' | 'waiting' | 'pending';

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

function formatYearLevel(value?: string | null) {
  if (!value) return '';
  switch (value) {
    case 'YR_1': return 'Yr. 1';
    case 'YR_2': return 'Yr. 2';
    case 'YR_3': return 'Yr. 3';
    case 'YR_4': return 'Yr. 4';
    default: return value;
  }
}

export default function StaffCommandCenterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [toastConfig, setToastConfig] = useState({ isVisible: false, message: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [liveQueueFilter, setLiveQueueFilter] = useState<LiveQueueFilter>('all');
  const [consultModalOpen, setConsultModalOpen] = useState(false);
  const [consultingPatient, setConsultingPatient] = useState<QueueItem | null>(null);
  const [consultInitialValues, setConsultInitialValues] = useState<Partial<ConsultationForm> | null>(null);
  const [inventoryOptions, setInventoryOptions] = useState<InventoryOption[]>([]);

  function showToast(message: string) {
    setToastConfig({ isVisible: true, message });
    setTimeout(() => setToastConfig({ isVisible: false, message: '' }), 2500);
  }

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
      const response = await api.get<QueueResponse>('/appointments/queue?limit=500&status=WAITING,PENDING,IN_PROGRESS', token);
      setQueue(response.data || []);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load doctor queue.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQueue();
  }, []);

  useEffect(() => {
    function handleWindowFocus() {
      void loadQueue();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void loadQueue();
      }
    }

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  useEffect(() => {
    async function loadInventoryLookup() {
      const token = getToken();
      if (!token) return;

      try {
        const response = await api.get<InventoryResponse>('/inventory', token);
        setInventoryOptions(response.data || []);
      } catch {
        // Keep consult flow usable even when inventory lookup fails.
      }
    }

    void loadInventoryLookup();
  }, []);

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

  const liveQueueCandidates = filteredQueue.filter(
    (item) =>
      (item.status === 'WAITING' || item.status === 'PENDING')
      && (!isFollowUpAppointment(item) || !isFutureFollowUp(item))
  );

  const liveQueue = liveQueueCandidates.filter((item) => {
    const status = resolveLiveQueueStatus(item);
    if (liveQueueFilter === 'all') return true;
    if (liveQueueFilter === 'incoming') return status === 'INCOMING';
    if (liveQueueFilter === 'waiting') return status === 'WAITING';
    return status === 'PENDING';
  });

  const incomingCount = liveQueueCandidates.filter((item) => resolveLiveQueueStatus(item) === 'INCOMING').length;
  const waitingCount = liveQueueCandidates.filter((item) => resolveLiveQueueStatus(item) === 'WAITING').length;
  const pendingCount = liveQueueCandidates.filter((item) => resolveLiveQueueStatus(item) === 'PENDING').length;
  const allPatientsCount = liveQueueCandidates.length;
  const followUps = filteredQueue
    .filter((item) => (item.status === 'WAITING' || item.status === 'PENDING') && isFutureFollowUp(item))
    .slice(0, 10);

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

  function resolveLiveQueueStatus(item: QueueItem): 'INCOMING' | 'WAITING' | 'PENDING' {
    if (item.status === 'PENDING') return 'PENDING';
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

  async function loadLatestNurseTriage(patient: QueueItem) {
    const token = getToken();
    if (!token) return null;

    const response = await api.get<VisitsResponse>(
      `/clinic/visits?studentProfileId=${encodeURIComponent(patient.studentProfile.id)}&limit=20`,
      token,
    );

    for (const visit of response.data || []) {
      const raw = visit.chiefComplaintEnc || '';
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw) as {
          chiefComplaint?: string;
          symptoms?: string;
          vitals?: { bp?: string; temperature?: string };
        };

        const chiefComplaint = parsed.chiefComplaint || parsed.symptoms || '';
        const bp = parsed.vitals?.bp || '';
        const temperature = parsed.vitals?.temperature || '';

        if (chiefComplaint || bp || temperature) {
          return {
            chiefComplaint,
            bp,
            temperature,
          } as Partial<ConsultationForm>;
        }
      } catch {
        // Older records may be plain text; use as fallback complaint.
        if (raw.trim()) {
          return {
            chiefComplaint: raw.trim(),
          } as Partial<ConsultationForm>;
        }
      }
    }

    return null;
  }

  async function openConsultModal(patient: QueueItem) {
    setConsultInitialValues(null);
    setConsultingPatient(patient);
    setConsultModalOpen(true);

    try {
      const triage = await loadLatestNurseTriage(patient);
      if (triage) {
        setConsultInitialValues(triage);
      }
    } catch {
      // Keep consult accessible even when triage preload fails.
    }
  }

  async function handleConsultSave(
    form: ConsultationForm,
    medicines: Array<{ inventoryId: string; medicine: string; qty: string }>,
  ) {
    if (!consultingPatient) return;

    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      return;
    }

    const normalizedTag = 'General Consultation';
    const normalizedChiefComplaint = form.chiefComplaint?.trim() || '';
    const normalizedDiagnosis = form.diagnosis?.trim() || '';
    const normalizedTreatment = form.treatmentProvided?.trim() || '';
    const normalizedVisitDate = form.visitDate?.trim() || new Date().toISOString();
    const normalizedFollowUpDate = form.followUpDate?.trim() || '';
    const normalizedFollowUpTime = form.followUpTime?.trim() || '';

    const dispensedMedicines = medicines
      .map((medicine) => {
        if (!medicine.inventoryId) return null;
        const qty = Number(medicine.qty);
        return {
          inventoryId: medicine.inventoryId,
          quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
        };
      })
      .filter((entry): entry is { inventoryId: string; quantity: number } => entry !== null);

    const structuredComplaint = {
      concernTag: normalizedTag,
      symptoms: normalizedChiefComplaint,
      chiefComplaint: normalizedChiefComplaint || normalizedTag,
      diagnosis: normalizedDiagnosis,
      treatmentProvided: normalizedTreatment,
      treatmentManagement: normalizedTreatment,
      age: form.age?.trim() || null,
      sex: form.sex?.trim() || null,
      vitals: {
        bp: form.bp?.trim() || null,
        temperature: form.temperature?.trim() || null,
      },
      notes: [normalizedTag, normalizedChiefComplaint, normalizedDiagnosis, normalizedTreatment]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(' | ') || 'General consultation',
      followUp: form.addFollowUp
        ? {
            date: normalizedFollowUpDate,
            time: normalizedFollowUpTime,
          }
        : null,
    };

    try {
      setError('');

      await api.post<CreateVisitResponse>(
        '/clinic/visits',
        {
          studentProfileId: consultingPatient.studentProfile.id,
          visitDate: normalizedVisitDate,
          visitTime: form.visitTime?.trim() || consultingPatient.preferredTime || undefined,
          chiefComplaintEnc: JSON.stringify(structuredComplaint),
          dispensedMedicines,
        },
        token,
      );

      if (form.addFollowUp && normalizedFollowUpDate && normalizedFollowUpTime) {
        await api.post(
          '/appointments/queue',
          {
            studentProfileId: consultingPatient.studentProfile.id,
            preferredDate: normalizedFollowUpDate,
            preferredTime: normalizedFollowUpTime,
            serviceType: 'Medical Consultation',
            symptoms: `Follow Up: ${normalizedDiagnosis || normalizedChiefComplaint || 'Post consultation review'}`,
          },
          token,
        );
      }

      await api.put(`/appointments/queue/${consultingPatient.id}`, { status: 'COMPLETED' }, token);

      setConsultModalOpen(false);
      setConsultingPatient(null);
      showToast(
        form.addFollowUp
          ? 'Consultation completed and follow-up appointment scheduled.'
          : 'Consultation completed and saved to logs.'
      );
      await loadQueue();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to save doctor consultation.');
      }
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-30 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Doctor Dashboard</h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Live queue and follow-up management</p>
        </div>

        <button
          onClick={() => router.push('/dashboard/staff/scanner')}
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
            <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-white">
                <h2 className="text-sm font-bold text-gray-800">Live Patient Queue</h2>
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
                    <button
                      type="button"
                      onClick={() => setLiveQueueFilter('pending')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                        liveQueueFilter === 'pending' ? 'bg-teal-600 text-white' : 'text-gray-600 hover:bg-white'
                      }`}
                    >
                      Pending
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

                  <button
                    type="button"
                    onClick={() => setQrModalOpen(true)}
                    className="text-xs font-semibold border border-teal-200 text-teal-700 hover:bg-teal-50 px-3 py-2 rounded-xl transition-colors"
                  >
                    Use QR
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                {loading ? (
                  <div className="px-4 py-10 text-center text-gray-400 text-sm">Loading queue...</div>
                ) : (
                  <table className="w-full table-fixed text-sm">
                    <thead>
                      <tr>
                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-100">Student</th>
                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-100">Department</th>
                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-100">Preferred Slot</th>
                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-100">Reason</th>
                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-gray-500 border-b border-gray-100">Status</th>
                        <th className="px-4 py-3 text-right text-xs uppercase tracking-wide text-gray-500 border-b border-gray-100">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {liveQueue.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-10 text-center text-gray-400 text-sm">No patients found.</td>
                        </tr>
                      ) : (
                        liveQueue.map((patient) => (
                          <tr
                            key={patient.id}
                            className="hover:bg-gray-50 transition-colors"
                          >
                            <td className="px-4 py-3 text-left">
                              <div>
                                <p className="font-semibold text-gray-800">{patient.studentProfile.lastName}, {patient.studentProfile.firstName}</p>
                                <p className="text-xs text-teal-600 font-semibold mt-0.5">{patient.studentProfile.studentNumber}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-left text-gray-600">{patient.studentProfile.courseDept || 'N/A'}</td>
                            <td className="px-4 py-3 text-left text-gray-600">
                              {formatDate(patient.preferredDate)} at {patient.preferredTime}
                            </td>
                            <td className="px-4 py-3 text-left">
                              <p className="text-xs font-semibold text-teal-600">{patient.serviceType}</p>
                              <p className="text-gray-700 break-words leading-snug">{patient.symptoms || 'N/A'}</p>
                            </td>
                            <td className="px-4 py-3 text-left">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
                                resolveLiveQueueStatus(patient) === 'INCOMING'
                                  ? 'bg-slate-100 text-slate-700'
                                  : resolveLiveQueueStatus(patient) === 'PENDING'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-amber-100 text-amber-700'
                              }`}>
                                {resolveLiveQueueStatus(patient) === 'INCOMING'
                                  ? 'Incoming'
                                  : resolveLiveQueueStatus(patient) === 'PENDING'
                                    ? 'Pending'
                                    : 'Waiting'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => openConsultModal(patient)}
                                disabled={patient.status === 'COMPLETED' || patient.status === 'CANCELLED'}
                                className="text-xs font-semibold bg-teal-500 hover:bg-teal-600 text-white px-2.5 py-1.5 rounded-lg disabled:opacity-60 disabled:cursor-not-allowed"
                              >
                                Consult
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
                <p className="text-xs font-semibold text-slate-500 mt-1">Patients with follow-up appointments</p>
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

      <Toast
        isVisible={toastConfig.isVisible}
        message={toastConfig.message}
        onClose={() => setToastConfig({ isVisible: false, message: '' })}
      />

      {consultModalOpen && consultingPatient && (
        <ConsultationModal
          patient={{
            firstName: consultingPatient.studentProfile.firstName,
            middleName: '',
            lastName: consultingPatient.studentProfile.lastName,
            department: consultingPatient.studentProfile.courseDept,
            course: consultingPatient.studentProfile.course || consultingPatient.studentProfile.courseDept,
            yearLevel: formatYearLevel(consultingPatient.studentProfile.yearLevel),
            age: consultingPatient.studentProfile.age ? String(consultingPatient.studentProfile.age) : '',
            sex: consultingPatient.studentProfile.sex || '',
          } as ConsultationPatient}
          inventoryOptions={inventoryOptions}
          mode="full"
          saveLabel="Save Doctor Consult"
          requireDoctorFields
          initialValues={consultInitialValues || undefined}
          onClose={() => setConsultModalOpen(false)}
          onSave={(data, medicines) => {
            void handleConsultSave(data, medicines);
          }}
        />
      )}

      <UseQrLookupModal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        onResolved={(student: QrResolvedStudent) => {
          setSearchQuery(student.studentNumber);
          showToast(`Found ${student.lastName}, ${student.firstName}`);
        }}
        onNotFound={() => {
          showToast('Student not found.');
        }}
      />

      <PredictiveInsightsCard role="staff" className="mx-8 mb-8" />
    </div>
  );
}
