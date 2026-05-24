'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Clock, Activity, Search, Loader2 } from 'lucide-react';

import Toast from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import PredictiveInsightsCard from '@/components/dashboard/shared/PredictiveInsightsCard';
import HealthConcernsByDepartmentCard from '@/components/dashboard/shared/HealthConcernsByDepartmentCard';
import UseQrLookupModal, { type QrResolvedStudent } from '@/components/scanner/UseQrLookupModal';
import ConsultationModal, {
  type ConsultationForm,
  type InventoryOption,
  type ConsultationPatient,
} from '@/components/modals/ConsultationModal';
import { formatTime12Hour } from '@/lib/time';

interface QueueItem {
  id: string;
  preferredDate: string;
  preferredTime: string;
  serviceType: string;
  symptoms: string;
  status: 'WAITING' | 'PENDING' | 'IN_PROGRESS' | 'FOR_DISPENSING' | 'COMPLETED' | 'CANCELLED';
  pendingMedicines?: Array<{
    id: string;
    quantity: number;
    status: 'PRESCRIBED' | 'DISPENSED' | 'CANCELLED' | string;
    inventoryId: string;
    inventory?: {
      itemName?: string;
      unit?: string | null;
      currentStock?: number;
    } | null;
  }>;
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

type LiveQueueFilter = 'all' | 'incoming' | 'waiting' | 'pending' | 'for-dispensing' | 'done';

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

export default function NurseDashboardPage() {
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
  const [inventoryOptions, setInventoryOptions] = useState<InventoryOption[]>([]);
  const [isPending, startTransition] = useTransition();
  const [selectedDoneIds, setSelectedDoneIds] = useState<string[]>([]);
  const [isDoneSelectMode, setIsDoneSelectMode] = useState(false);

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
      const response = await api.get<QueueResponse>('/appointments/queue?limit=100&status=WAITING,PENDING,IN_PROGRESS,FOR_DISPENSING,COMPLETED', token);
      setQueue(response.data || []);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load nurse queue.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQueue();
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
      (item.status === 'WAITING' || item.status === 'PENDING' || item.status === 'FOR_DISPENSING')
      && (!isFollowUpAppointment(item) || !isFutureFollowUp(item))
  );

  const doneQueueCandidates = filteredQueue.filter(
    (item) => item.status === 'COMPLETED' && (!isFollowUpAppointment(item) || !isFutureFollowUp(item))
  );

  const incomingCount = liveQueueCandidates.filter((item) => resolveLiveQueueStatus(item) === 'INCOMING').length;
  const waitingQueueCount = liveQueueCandidates.filter((item) => resolveLiveQueueStatus(item) === 'WAITING').length;
  const pendingCount = liveQueueCandidates.filter((item) => resolveLiveQueueStatus(item) === 'PENDING').length;
  const forDispensingCount = liveQueueCandidates.filter((item) => resolveLiveQueueStatus(item) === 'FOR_DISPENSING').length;
  const doneCount = doneQueueCandidates.length;
  const allPatientsCount = liveQueueCandidates.length;

  const liveQueue = (liveQueueFilter === 'done' ? doneQueueCandidates : liveQueueCandidates).filter((item) => {
    const status = resolveLiveQueueStatus(item);
    if (liveQueueFilter === 'done') return item.status === 'COMPLETED';
    if (liveQueueFilter === 'all') return true;
    if (liveQueueFilter === 'incoming') return status === 'INCOMING';
    if (liveQueueFilter === 'waiting') return status === 'WAITING';
    if (liveQueueFilter === 'for-dispensing') return status === 'FOR_DISPENSING';
    return status === 'PENDING';
  });

  const waitingCount = waitingQueueCount;
  const followUps = filteredQueue
    .filter((item) => (item.status === 'WAITING' || item.status === 'PENDING') && isFutureFollowUp(item))
    .slice(0, 10);

  const selectedDoneSet = useMemo(() => new Set(selectedDoneIds), [selectedDoneIds]);
  const selectedDoneCount = selectedDoneIds.length;

  useEffect(() => {
    if (liveQueueFilter !== 'done') {
      if (selectedDoneIds.length > 0) setSelectedDoneIds([]);
      if (isDoneSelectMode) setIsDoneSelectMode(false);
    }
  }, [liveQueueFilter, selectedDoneIds.length, isDoneSelectMode]);

  useEffect(() => {
    if (selectedDoneIds.length === 0) return;
    const validIds = new Set(doneQueueCandidates.map((item) => item.id));
    const next = selectedDoneIds.filter((id) => validIds.has(id));
    if (next.length !== selectedDoneIds.length) {
      setSelectedDoneIds(next);
    }
  }, [doneQueueCandidates, selectedDoneIds]);

  function toggleDoneSelection(id: string) {
    setSelectedDoneIds((current) => (
      current.includes(id)
        ? current.filter((itemId) => itemId !== id)
        : [...current, id]
    ));
  }

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

  function resolveLiveQueueStatus(item: QueueItem): 'INCOMING' | 'WAITING' | 'PENDING' | 'FOR_DISPENSING' {
    if (item.status === 'FOR_DISPENSING') return 'FOR_DISPENSING';
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

  function openConsultModal(patient: QueueItem) {
    setConsultingPatient(patient);
    setConsultModalOpen(true);
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
    const normalizedVisitDate = form.visitDate?.trim() || new Date().toISOString();

    const structuredComplaint = {
      concernTag: normalizedTag,
      symptoms: normalizedChiefComplaint,
      chiefComplaint: normalizedChiefComplaint || normalizedTag,
      diagnosis: null,
      treatmentProvided: null,
      treatmentManagement: null,
      age: form.age?.trim() || null,
      sex: form.sex?.trim() || null,
      vitals: {
        bp: form.bp?.trim() || null,
        temperature: form.temperature?.trim() || null,
      },
      notes: [normalizedTag, normalizedChiefComplaint]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(' | ') || 'General consultation',
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
          dispensedMedicines: [],
        },
        token,
      );

      await api.put(`/appointments/queue/${consultingPatient.id}`, { status: 'PENDING' }, token);

      setConsultModalOpen(false);
      setConsultingPatient(null);
      showToast('Consultation saved and sent to doctor.');
      await loadQueue();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to save consultation.');
      }
    }
  }

  async function handleDispenseMedicines(patient: QueueItem) {
    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      return;
    }

    const prescribed = (patient.pendingMedicines || []).filter((medicine) => medicine.status === 'PRESCRIBED');
    if (prescribed.length === 0) {
      setError('No prescribed medicines found for this patient.');
      return;
    }

    try {
      setError('');

      for (const medicine of prescribed) {
        const response = await api.put<{ warning?: string }>(`/clinic/visits/dispense/${medicine.id}`, {}, token);
        if (response.warning) {
          showToast(response.warning);
        }
      }

      await api.put(`/appointments/queue/${patient.id}`, { status: 'COMPLETED' }, token);

      showToast('Medicines dispensed. Queue item marked as completed.');
      await loadQueue();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to dispense medicines.');
      }
    }
  }

  async function issueConsultationCertificate(patient: QueueItem) {
    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      return;
    }

    const diagnosisFindings = (patient.symptoms || '').trim() || 'Consultation completed';

    await api.post('/certificates', {
      studentIdentifier: patient.studentProfile.studentNumber,
      certificateType: 'CONSULTATION',
      diagnosisFindings,
      recommendationsRemarks: '',
      dateIssued: new Date().toISOString(),
    }, token);
  }

  async function handleIssueSingleConsultationCertificate(patient: QueueItem) {
    try {
      setError('');
      await issueConsultationCertificate(patient);
      showToast('Medical certificate issued.');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to issue medical certificate.');
      }
    }
  }

  async function handleIssueBulkConsultationCertificates() {
    if (selectedDoneIds.length === 0) {
      showToast('Select at least one completed consultation.');
      return;
    }

    const selectedPatients = doneQueueCandidates.filter((item) => selectedDoneSet.has(item.id));
    if (selectedPatients.length === 0) {
      showToast('No valid completed consultations selected.');
      return;
    }

    try {
      setError('');
      for (const patient of selectedPatients) {
        await issueConsultationCertificate(patient);
      }
      setSelectedDoneIds([]);
      setIsDoneSelectMode(false);
      showToast(`Issued ${selectedPatients.length} medical certificate${selectedPatients.length > 1 ? 's' : ''}.`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to issue bulk medical certificates.');
      }
    }
  }

  async function handleDoneSelectPrimaryAction() {
    if (!isDoneSelectMode) {
      setIsDoneSelectMode(true);
      setSelectedDoneIds([]);
      return;
    }

    if (selectedDoneCount > 0) {
      await handleIssueBulkConsultationCertificates();
      return;
    }

    setIsDoneSelectMode(false);
    setSelectedDoneIds([]);
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))] flex flex-col">
      <div className="px-6 py-5 border-b border-[hsl(var(--border))] flex items-center justify-between">
        <div>
          <h1 className="text-h1 text-[hsl(var(--foreground))]">Medical Clinic Dashboard</h1>
          <p className="text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wide mt-1">Nurse queue • Live data</p>
        </div>

        <button
          onClick={() => router.push('/dashboard/staff/scanner')}
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

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
            <div className="card p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-[hsl(var(--warning-soft))] text-[hsl(var(--warning))] rounded-[var(--radius-lg)]">
                  <Activity size={20} strokeWidth={1.5} />
                </div>
                <div>
                  <p className="text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wide">For Dispensing</p>
                  <p className="text-2xl font-bold text-[hsl(var(--foreground))] tabular-nums">{forDispensingCount}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 card overflow-hidden flex flex-col h-[600px]">
              <div className="px-4 pt-1 pb-2.5 border-b border-[hsl(var(--border))] flex flex-col lg:flex-row lg:items-start lg:justify-between gap-2">
                <div className="flex items-center gap-2">
                  <h2 className="text-h3 text-[hsl(var(--foreground))]">Live Patient Queue</h2>
                  {isPending && (
                    <Loader2 size={16} className="text-[hsl(var(--primary))] animate-spin" />
                  )}
                </div>
                <div className="w-fit max-w-full flex flex-col gap-1.5 lg:items-stretch">
                  <div className="inline-flex w-max max-w-full items-center rounded-[var(--radius-lg)] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] p-1">
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
                    <button
                      type="button"
                      onClick={() => startTransition(() => setLiveQueueFilter('pending'))}
                      className={`px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-colors ${
                        liveQueueFilter === 'pending' ? 'bg-[hsl(var(--primary))] text-white' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--primary-soft))]'
                      }`}
                    >
                      Pending
                    </button>
                    <button
                      type="button"
                      onClick={() => startTransition(() => setLiveQueueFilter('for-dispensing'))}
                      className={`px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-colors ${
                        liveQueueFilter === 'for-dispensing' ? 'bg-[hsl(var(--primary))] text-white' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--primary-soft))]'
                      }`}
                    >
                      For Dispensing
                    </button>
                    <button
                      type="button"
                      onClick={() => startTransition(() => setLiveQueueFilter('done'))}
                      className={`px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-colors ${
                        liveQueueFilter === 'done' ? 'bg-[hsl(var(--primary))] text-white' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--primary-soft))]'
                      }`}
                    >
                      Done ({doneCount})
                    </button>
                  </div>

                  <div className="w-full flex items-center gap-3">
                    <div className="relative flex-1">
                      <Search size={16} strokeWidth={1.5} className="absolute left-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted))]" />
                      <input
                        type="text"
                        placeholder="Search queue..."
                        value={searchQuery}
                        onChange={(e) => startTransition(() => setSearchQuery(e.target.value))}
                        className="pl-10 pr-4 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input-border))] rounded-[var(--radius-md)] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--focus-ring)_/_0.4)] focus:border-[hsl(var(--primary))] w-full transition-all"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setQrModalOpen(true)}
                      className="text-xs font-medium border border-[hsl(var(--border))] text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-soft))] px-3 py-2 rounded-[var(--radius-md)] transition-colors"
                    >
                      Use QR
                    </button>
                  </div>

                  {liveQueueFilter === 'done' && (
                    <div className="flex items-center gap-2 lg:justify-end">
                      <button
                        type="button"
                        onClick={() => void handleDoneSelectPrimaryAction()}
                        className="text-xs font-medium bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-hover))] text-white px-3 py-2 rounded-[var(--radius-md)] transition-colors"
                      >
                        {!isDoneSelectMode ? 'Select' : selectedDoneCount > 0 ? `Give Med Cert (${selectedDoneCount})` : 'Cancel Select'}
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                {loading ? (
                  <div className="px-4 py-10 text-center text-[hsl(var(--muted))] text-sm">Loading queue...</div>
                ) : (
                  <div className={`transition-opacity duration-200 ${isPending ? 'opacity-60' : 'opacity-100'}`}>
                    <table className="w-full table-fixed text-sm">
                    <thead>
                      <tr>
                        {liveQueueFilter === 'done' && isDoneSelectMode && (
                          <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-[hsl(var(--muted))] border-b border-[hsl(var(--border))]">Select</th>
                        )}
                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-[hsl(var(--muted))] border-b border-[hsl(var(--border))]">Student</th>
                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-[hsl(var(--muted))] border-b border-[hsl(var(--border))]">Department</th>
                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-[hsl(var(--muted))] border-b border-[hsl(var(--border))]">Preferred Slot</th>
                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-[hsl(var(--muted))] border-b border-[hsl(var(--border))]">Reason</th>
                        <th className="px-4 py-3 text-left text-xs uppercase tracking-wide text-[hsl(var(--muted))] border-b border-[hsl(var(--border))]">Status</th>
                        <th className="px-4 py-3 text-right text-xs uppercase tracking-wide text-[hsl(var(--muted))] border-b border-[hsl(var(--border))]">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[hsl(var(--border)_/_0.5)]">
                      {liveQueue.length === 0 ? (
                        <tr>
                          <td colSpan={liveQueueFilter === 'done' && isDoneSelectMode ? 7 : 6} className="px-4 py-10 text-center text-[hsl(var(--muted))] text-sm">No patients found.</td>
                        </tr>
                      ) : (
                        liveQueue.map((patient) => (
                          <tr
                            key={patient.id}
                            className="hover:bg-[hsl(var(--primary-soft)_/_0.3)] transition-colors"
                          >
                            {liveQueueFilter === 'done' && isDoneSelectMode && (
                              <td className="px-4 py-3 text-left">
                                <input
                                  type="checkbox"
                                  checked={selectedDoneSet.has(patient.id)}
                                  onChange={() => toggleDoneSelection(patient.id)}
                                />
                              </td>
                            )}
                            <td className="px-4 py-3 text-left">
                              <div>
                                <p className="font-semibold text-[hsl(var(--foreground))]">{patient.studentProfile.lastName}, {patient.studentProfile.firstName}</p>
                                <p className="text-xs text-[hsl(var(--primary))] font-medium mt-0.5 tabular-nums">{patient.studentProfile.studentNumber}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-left text-[hsl(var(--muted-foreground))]">{patient.studentProfile.courseDept || 'N/A'}</td>
                            <td className="px-4 py-3 text-left text-[hsl(var(--muted-foreground))] tabular-nums">
                              {formatDate(patient.preferredDate)} at {formatTime12Hour(patient.preferredTime)}
                            </td>
                            <td className="px-4 py-3 text-left">
                              <p className="text-xs font-medium text-[hsl(var(--primary))]">{patient.serviceType}</p>
                              <p className="text-[hsl(var(--foreground))] break-words leading-snug">{patient.symptoms || 'N/A'}</p>
                              {resolveLiveQueueStatus(patient) === 'FOR_DISPENSING' && (patient.pendingMedicines?.length || 0) > 0 && (
                                <p className="text-xs text-[hsl(var(--warning))] mt-1">
                                  Rx: {patient.pendingMedicines?.map((medicine) => `${medicine.inventory?.itemName || 'Medicine'} x${medicine.quantity}`).join(', ')}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-left">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                patient.status === 'COMPLETED'
                                  ? 'bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]'
                                  :
                                resolveLiveQueueStatus(patient) === 'INCOMING'
                                  ? 'bg-[hsl(var(--info-soft))] text-[hsl(var(--info))]'
                                  : resolveLiveQueueStatus(patient) === 'FOR_DISPENSING'
                                    ? 'bg-[hsl(var(--warning-soft))] text-[hsl(var(--warning))]'
                                  : resolveLiveQueueStatus(patient) === 'PENDING'
                                    ? 'bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]'
                                    : 'bg-[hsl(var(--warning-soft))] text-[hsl(var(--warning))]'
                              }`}>
                                {patient.status === 'COMPLETED'
                                  ? 'Done'
                                  : resolveLiveQueueStatus(patient) === 'INCOMING'
                                  ? 'Incoming'
                                  : resolveLiveQueueStatus(patient) === 'FOR_DISPENSING'
                                    ? 'For Dispensing'
                                  : resolveLiveQueueStatus(patient) === 'PENDING'
                                    ? 'Pending'
                                    : 'Waiting'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                              {patient.status === 'COMPLETED' ? (
                                <button
                                  type="button"
                                  onClick={() => void handleIssueSingleConsultationCertificate(patient)}
                                  className="text-xs font-medium bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-hover))] text-white px-3 py-1.5 rounded-[var(--radius-md)] transition-colors"
                                >
                                  Give Med Cert
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (resolveLiveQueueStatus(patient) === 'FOR_DISPENSING') {
                                      void handleDispenseMedicines(patient);
                                      return;
                                    }

                                    openConsultModal(patient);
                                  }}
                                  disabled={resolveLiveQueueStatus(patient) === 'PENDING'}
                                  className="text-xs font-medium bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-hover))] text-white px-3 py-1.5 rounded-[var(--radius-md)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                >
                                  {resolveLiveQueueStatus(patient) === 'FOR_DISPENSING'
                                    ? 'Dispense'
                                    : resolveLiveQueueStatus(patient) === 'PENDING'
                                      ? 'Sent'
                                      : 'Consult'}
                                </button>
                              )}
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
                <p className="text-xs text-[hsl(var(--muted))] mt-1">Scheduled follow-up appointments</p>
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
          mode="nurse-triage"
          saveLabel="Send to Doctor"
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

      <PredictiveInsightsCard role="doctor" className="mx-8 mb-8" />
      <HealthConcernsByDepartmentCard className="mx-8 mb-8" />
    </div>
  );
}
