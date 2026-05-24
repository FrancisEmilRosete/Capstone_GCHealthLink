'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Clock, Activity, Search, ChevronRight, Loader2 } from 'lucide-react';
import PredictiveInsightsCard from '@/components/dashboard/shared/PredictiveInsightsCard';
import HealthConcernsByDepartmentCard from '@/components/dashboard/shared/HealthConcernsByDepartmentCard';
import ConsultationModal, { type ConsultationForm, type ConsultationPatient } from '@/components/modals/ConsultationModal';
import { formatTime12Hour } from '@/lib/time';

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
  const [isPending, startTransition] = useTransition();

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
    <div className="min-h-screen bg-[hsl(var(--background))] flex flex-col">
      <div className="px-6 py-5 border-b border-[hsl(var(--border))] flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-[hsl(var(--foreground))]">Dental Clinic Dashboard</h1>
          <p className="text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wide mt-1">Dental queue • Live data</p>
        </div>

        <button
          onClick={() => router.push('/dashboard/dental/scanner')}
          className="flex items-center gap-2 px-5 py-2.5 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-hover))] text-white font-semibold rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] transition-all"
        >
          <UserPlus size={18} strokeWidth={1.5} />
          Open QR Scanner
        </button>
      </div>

      <main className="flex-1 p-6 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {error && (
            <div className="rounded-[var(--radius-lg)] border border-[hsl(var(--danger)_/_0.3)] bg-[hsl(var(--danger-soft))] px-4 py-3 text-sm text-[hsl(var(--danger))]">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="card p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[hsl(var(--primary-soft))] text-[hsl(var(--primary))] rounded-[var(--radius-lg)]">
                  <UserPlus size={20} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wide">All Patients</p>
                  <p className="text-2xl font-bold text-[hsl(var(--foreground))] tabular-nums">{allPatientsCount}</p>
                </div>
              </div>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[hsl(var(--info-soft))] text-[hsl(var(--info))] rounded-[var(--radius-lg)]">
                  <Clock size={20} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wide">Incoming</p>
                  <p className="text-2xl font-bold text-[hsl(var(--foreground))] tabular-nums">{incomingCount}</p>
                </div>
              </div>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[hsl(var(--warning-soft))] text-[hsl(var(--warning))] rounded-[var(--radius-lg)]">
                  <Clock size={20} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wide">Waiting</p>
                  <p className="text-2xl font-bold text-[hsl(var(--foreground))] tabular-nums">{waitingCount}</p>
                </div>
              </div>
            </div>
            <div className="card p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[hsl(var(--success-soft))] text-[hsl(var(--success))] rounded-[var(--radius-lg)]">
                  <Activity size={20} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wide">Pending</p>
                  <p className="text-2xl font-bold text-[hsl(var(--foreground))] tabular-nums">{pendingCount}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 card overflow-hidden flex flex-col h-[600px]">
              <div className="px-4 py-3 border-b border-[hsl(var(--border))] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-h3 text-[hsl(var(--foreground))]">Live Patient Queue</h2>
                  {isPending && (
                    <Loader2 size={16} className="text-[hsl(var(--primary))] animate-spin" />
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="inline-flex items-center rounded-[var(--radius-lg)] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-1">
                    <button
                      type="button"
                      onClick={() => startTransition(() => setLiveQueueFilter('all'))}
                      className={`px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-colors ${
                        liveQueueFilter === 'all' ? 'bg-[hsl(var(--primary))] text-white' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--primary-soft))]'
                      }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => startTransition(() => setLiveQueueFilter('incoming'))}
                      className={`px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-colors ${
                        liveQueueFilter === 'incoming' ? 'bg-[hsl(var(--primary))] text-white' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--primary-soft))]'
                      }`}
                    >
                      Incoming
                    </button>
                    <button
                      type="button"
                      onClick={() => startTransition(() => setLiveQueueFilter('waiting'))}
                      className={`px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-colors ${
                        liveQueueFilter === 'waiting' ? 'bg-[hsl(var(--primary))] text-white' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--primary-soft))]'
                      }`}
                    >
                      Waiting
                    </button>
                  </div>

                  <div className="relative">
                    <Search size={16} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted))]" />
                    <input
                      type="text"
                      placeholder="Search queue..."
                      value={searchQuery}
                      onChange={(e) => startTransition(() => setSearchQuery(e.target.value))}
                      className="pl-10 pr-4 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input-border))] rounded-[var(--radius-md)] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--focus-ring)_/_0.4)] focus:border-[hsl(var(--primary))] w-64 transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                {loading ? (
                  <div className="px-6 py-12 text-center text-[hsl(var(--muted))] text-sm">Loading queue...</div>
                ) : (
                  <div className={`transition-opacity duration-200 ${isPending ? 'opacity-60' : 'opacity-100'}`}>
                    <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 bg-[hsl(var(--card))] shadow-[var(--shadow-sm)] z-10">
                      <tr>
                        <th className="px-4 py-3 text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wide border-b border-[hsl(var(--border))]">Schedule</th>
                        <th className="px-4 py-3 text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wide border-b border-[hsl(var(--border))]">Patient</th>
                        <th className="px-4 py-3 text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wide border-b border-[hsl(var(--border))]">Department</th>
                        <th className="px-4 py-3 text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wide border-b border-[hsl(var(--border))]">Reason</th>
                        <th className="px-4 py-3 text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wide border-b border-[hsl(var(--border))]">Status</th>
                        <th className="px-4 py-3 text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wide border-b border-[hsl(var(--border))] text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[hsl(var(--border)_/_0.5)]">
                      {liveQueue.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-[hsl(var(--muted))] text-sm">No patients found.</td>
                        </tr>
                      ) : (
                        liveQueue.map((patient) => (
                          <tr key={patient.id} className="hover:bg-[hsl(var(--primary-soft)_/_0.3)] transition-colors group">
                            <td className="px-4 py-3">
                              <span className="text-sm font-medium text-[hsl(var(--muted-foreground))] tabular-nums">{formatDate(patient.preferredDate)} {formatTime12Hour(patient.preferredTime)}</span>
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{patient.studentProfile.firstName} {patient.studentProfile.lastName}</p>
                                <p className="text-xs font-medium text-[hsl(var(--muted))] tabular-nums">{patient.studentProfile.studentNumber}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <p className="text-xs font-medium text-[hsl(var(--muted-foreground))]">{patient.studentProfile.courseDept || 'N/A'}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-sm font-medium text-[hsl(var(--foreground))]">{patient.symptoms || 'N/A'}</span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                resolveLiveQueueStatus(patient) === 'INCOMING'
                                  ? 'bg-[hsl(var(--info-soft))] text-[hsl(var(--info))]'
                                  : 'bg-[hsl(var(--warning-soft))] text-[hsl(var(--warning))]'
                              }`}>
                                {resolveLiveQueueStatus(patient) === 'INCOMING'
                                  ? 'Incoming'
                                  : 'Waiting'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => openConsultModal(patient)}
                                className="p-2 text-[hsl(var(--muted))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-soft))] rounded-[var(--radius-md)] transition-colors inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider"
                              >
                                Consult <ChevronRight size={14} strokeWidth={1.5} />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>
            </div>

            <div className="xl:col-span-1 card overflow-hidden flex flex-col h-[600px]">
              <div className="px-5 py-4 border-b border-[hsl(var(--border))]">
                <h2 className="text-h3 text-[hsl(var(--foreground))]">Follow Ups</h2>
                <p className="text-xs text-[hsl(var(--muted))] mt-1">Dental follow-up appointments</p>
              </div>

              <div className="flex-1 overflow-auto divide-y divide-[hsl(var(--border)_/_0.5)]">
                {loading ? (
                  <div className="px-5 py-8 text-center text-[hsl(var(--muted))] text-sm">Loading follow ups...</div>
                ) : followUps.length === 0 ? (
                  <div className="px-5 py-8 text-center text-[hsl(var(--muted))] text-sm">No follow ups yet.</div>
                ) : (
                  followUps.map((item) => (
                    <div key={`followup-${item.id}`} className="px-5 py-4 hover:bg-[hsl(var(--primary-soft)_/_0.3)] transition-colors">
                      <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{item.studentProfile.firstName} {item.studentProfile.lastName}</p>
                      <p className="text-xs text-[hsl(var(--muted))] mt-0.5 tabular-nums">{item.studentProfile.studentNumber}</p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-2 tabular-nums">Follow-up: {formatDate(item.preferredDate)}</p>
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
      <HealthConcernsByDepartmentCard className="mx-8 mb-8" />
    </div>
  );
}
