'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Clock, Activity, Search, Loader2 } from 'lucide-react';

import { api, ApiError } from '@/lib/api';
import toast from 'react-hot-toast';
import { getToken } from '@/lib/auth';
import { useServerEvents } from '@/lib/useServerEvents';
import PredictiveInsightsCard from '@/components/dashboard/shared/PredictiveInsightsCard';
import HealthConcernsByDepartmentCard from '@/components/dashboard/shared/HealthConcernsByDepartmentCard';
import ScannerWidget from '@/components/scanner/ScannerWidget';
import UseQrLookupModal, { type QrResolvedStudent } from '@/components/scanner/UseQrLookupModal';
import ConsultationModal, {
  type ConsultationForm,
  type InventoryOption,
  type ConsultationPatient,
} from '@/components/modals/ConsultationModal';
import { formatTime12Hour } from '@/lib/time';
import RoleWellnessTrends from '@/components/dashboard/shared/RoleWellnessTrends';

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

export default function StaffCommandCenterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [liveQueueFilter, setLiveQueueFilter] = useState<LiveQueueFilter>('all');
  const [consultModalOpen, setConsultModalOpen] = useState(false);
  const [consultingPatient, setConsultingPatient] = useState<QueueItem | null>(null);
  const [consultInitialValues, setConsultInitialValues] = useState<Partial<ConsultationForm> | null>(null);
  const [inventoryOptions, setInventoryOptions] = useState<InventoryOption[]>([]);
  const [isPending, startTransition] = useTransition();
  const [selectedDoneIds, setSelectedDoneIds] = useState<string[]>([]);
  const [isDoneSelectMode, setIsDoneSelectMode] = useState(false);
  const [followUpPage, setFollowUpPage] = useState(1);

  async function loadQueue(showLoading = true) {
    const token = getToken();
    if (!token) {
      toast.error('You are not logged in. Please sign in again.');
      if (showLoading) setLoading(false);
      return;
    }

    try {
      if (showLoading) setLoading(true);
      const response = await api.get<QueueResponse>('/appointments/queue?limit=500&status=WAITING,PENDING,IN_PROGRESS,FOR_DISPENSING,COMPLETED', token);
      setQueue(response.data || []);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to load doctor queue.');
      }
    } finally {
      if (showLoading) setLoading(false);
    }
  }

  useEffect(() => {
    void loadQueue(true);
  }, []);

  useEffect(() => {
    function handleWindowFocus() {
      void loadQueue(false);
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void loadQueue(false);
      }
    }

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Real-time: reload queue whenever the server signals a queue or visit change.
  useServerEvents(['queue', 'visits'], () => {
    startTransition(() => { void loadQueue(false); });
  });

  useEffect(() => {
    async function loadInventoryLookup() {
      const token = getToken();
      if (!token) return;

      try {
        const response = await api.get<InventoryResponse>('/inventory?category=MEDICINE&limit=500', token);
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
      (item.status === 'WAITING' || item.status === 'PENDING' || item.status === 'IN_PROGRESS' || item.status === 'FOR_DISPENSING')
      && (!isFollowUpAppointment(item) || !isFutureFollowUp(item))
  );

  const doneQueueCandidates = filteredQueue.filter(
    (item) => item.status === 'COMPLETED' && (!isFollowUpAppointment(item) || !isFutureFollowUp(item))
  );

  const liveQueue = (liveQueueFilter === 'done' ? doneQueueCandidates : liveQueueCandidates).filter((item) => {
    const status = resolveLiveQueueStatus(item);
    if (liveQueueFilter === 'done') return item.status === 'COMPLETED';
    if (liveQueueFilter === 'all') return true;
    if (liveQueueFilter === 'incoming') return status === 'INCOMING';
    if (liveQueueFilter === 'waiting') return status === 'WAITING';
    if (liveQueueFilter === 'for-dispensing') return status === 'FOR_DISPENSING';
    return status === 'PENDING';
  });

  const incomingCount = liveQueueCandidates.filter((item) => resolveLiveQueueStatus(item) === 'INCOMING').length;
  const waitingCount = liveQueueCandidates.filter((item) => resolveLiveQueueStatus(item) === 'WAITING').length;
  const pendingCount = liveQueueCandidates.filter((item) => resolveLiveQueueStatus(item) === 'PENDING').length;
  const forDispensingCount = liveQueueCandidates.filter((item) => resolveLiveQueueStatus(item) === 'FOR_DISPENSING').length;
  const doneCount = doneQueueCandidates.length;
  const allPatientsCount = liveQueueCandidates.length;
  const followUpsAll = filteredQueue.filter((item) => (item.status === 'WAITING' || item.status === 'PENDING') && isFutureFollowUp(item));
  const followUpPageSize = 5;
  const followUpTotalPages = Math.max(1, Math.ceil(followUpsAll.length / followUpPageSize));
  const followUps = followUpsAll.slice((followUpPage - 1) * followUpPageSize, followUpPage * followUpPageSize);
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

  async function issueConsultationCertificate(patient: QueueItem) {
    const token = getToken();
    if (!token) {
      toast.error('You are not logged in. Please sign in again.');
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
      await issueConsultationCertificate(patient);
      toast.success('Medical certificate issued.');
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to issue medical certificate.');
      }
    }
  }

  async function handleIssueBulkConsultationCertificates() {
    if (selectedDoneIds.length === 0) {
      toast.error('Select at least one completed consultation.');
      return;
    }

    const selectedPatients = doneQueueCandidates.filter((item) => selectedDoneSet.has(item.id));
    if (selectedPatients.length === 0) {
      toast.error('No valid completed consultations selected.');
      return;
    }

    try {
      for (const patient of selectedPatients) {
        await issueConsultationCertificate(patient);
      }
      setSelectedDoneIds([]);
      setIsDoneSelectMode(false);
      toast.success(`Issued ${selectedPatients.length} medical certificate${selectedPatients.length > 1 ? 's' : ''}.`);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to issue bulk medical certificates.');
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
    if (item.status === 'PENDING' || item.status === 'IN_PROGRESS') return 'PENDING';
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

    // Always reload inventory when the modal opens so the dropdown is never
    // empty due to a failed initial fetch (e.g. DB cold-start on page load).
    const token = getToken();
    if (token) {
      try {
        const invResponse = await api.get<InventoryResponse>('/inventory?category=MEDICINE&limit=500', token);
        setInventoryOptions(invResponse.data || []);
      } catch {
        // Non-fatal — keep whatever was loaded previously (or empty).
      }
    }

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
      toast.error('You are not logged in. Please sign in again.');
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

      const nextStatus = dispensedMedicines.length > 0 ? 'FOR_DISPENSING' : 'COMPLETED';
      await api.put(`/appointments/queue/${consultingPatient.id}`, { status: nextStatus }, token);

      setConsultModalOpen(false);
      setConsultingPatient(null);
      if (dispensedMedicines.length > 0) {
        toast.success('Consultation saved. Patient returned to nurse queue for dispensing.');
      } else {
        toast.success(
          form.addFollowUp
            ? 'Consultation completed and follow-up appointment scheduled.'
            : 'Consultation completed and saved to logs.'
        );
      }
      await loadQueue();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to save doctor consultation.');
      }
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
      <main className="flex-1 px-6 py-5 overflow-y-auto">
        <div className="space-y-5">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* ── LEFT: Live Patient Queue ────────────────────── */}
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
                      className={`relative px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-colors ${liveQueueFilter === 'all' ? 'bg-[hsl(var(--primary))] text-white' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--primary-soft))]'
                        }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => startTransition(() => setLiveQueueFilter('incoming'))}
                      className={`relative px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-colors ${liveQueueFilter === 'incoming' ? 'bg-[hsl(var(--primary))] text-white' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--primary-soft))]'
                        }`}
                    >
                      Incoming
                      {incomingCount > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[hsl(var(--surface))] -translate-y-1/2 translate-x-1/2" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => startTransition(() => setLiveQueueFilter('waiting'))}
                      className={`relative px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-colors ${liveQueueFilter === 'waiting' ? 'bg-[hsl(var(--primary))] text-white' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--primary-soft))]'
                        }`}
                    >
                      Waiting
                      {waitingCount > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[hsl(var(--surface))] -translate-y-1/2 translate-x-1/2" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => startTransition(() => setLiveQueueFilter('pending'))}
                      className={`relative px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-colors ${liveQueueFilter === 'pending' ? 'bg-[hsl(var(--primary))] text-white' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--primary-soft))]'
                        }`}
                    >
                      Pending
                      {pendingCount > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[hsl(var(--surface))] -translate-y-1/2 translate-x-1/2" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => startTransition(() => setLiveQueueFilter('for-dispensing'))}
                      className={`relative px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-colors ${liveQueueFilter === 'for-dispensing' ? 'bg-[hsl(var(--primary))] text-white' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--primary-soft))]'
                        }`}
                    >
                      For Dispensing
                      {forDispensingCount > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[hsl(var(--surface))] -translate-y-1/2 translate-x-1/2" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => startTransition(() => setLiveQueueFilter('done'))}
                      className={`relative px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-colors ${liveQueueFilter === 'done' ? 'bg-[hsl(var(--primary))] text-white' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--primary-soft))]'
                        }`}
                    >
                      Done
                      {doneCount > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[hsl(var(--surface))] -translate-y-1/2 translate-x-1/2" />}
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
                          liveQueue.map((patient) => {
                            const rs = resolveLiveQueueStatus(patient);
                            const isDisp = rs === 'FOR_DISPENSING';
                            const isPend = rs === 'PENDING';
                            const isComp = patient.status === 'COMPLETED';

                            return (
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
                                  {isDisp && (patient.pendingMedicines?.length || 0) > 0 && (
                                    <p className="text-xs text-[hsl(var(--warning))] mt-1">
                                      Rx: {patient.pendingMedicines?.map((medicine) => `${medicine.inventory?.itemName || 'Medicine'} x${medicine.quantity}`).join(', ')}
                                    </p>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-left">
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${patient.status === 'COMPLETED'
                                      ? 'bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]'
                                      :
                                      rs === 'INCOMING'
                                        ? 'bg-[hsl(var(--info-soft))] text-[hsl(var(--info))]'
                                        : rs === 'FOR_DISPENSING'
                                          ? 'bg-[hsl(var(--warning-soft))] text-[hsl(var(--warning))]'
                                          : rs === 'PENDING'
                                            ? 'bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]'
                                            : 'bg-[hsl(var(--warning-soft))] text-[hsl(var(--warning))]'
                                    }`}>
                                    {patient.status === 'COMPLETED'
                                      ? 'Done'
                                      : rs === 'INCOMING'
                                        ? 'Incoming'
                                        : rs === 'FOR_DISPENSING'
                                          ? 'For Dispensing'
                                          : rs === 'PENDING'
                                            ? 'Pending'
                                            : 'Waiting'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {isComp ? (
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
                                      onClick={() => openConsultModal(patient)}
                                      disabled={isComp || patient.status === 'CANCELLED' || isDisp}
                                      className="text-xs font-medium bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-hover))] text-white px-3 py-1.5 rounded-[var(--radius-md)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                    >
                                      {isDisp ? 'Queued for Nurse' : 'Consult'}
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            <div className="xl:col-span-1 flex flex-col gap-5">
              {/* QR Scanner Card */}
              <div className="card">
                <ScannerWidget standalone={false} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 mt-6">
            <RoleWellnessTrends className="h-[400px]" />

            {/* Follow Ups Card */}
            <div className="card overflow-hidden flex flex-col h-[400px]">
                <div className="px-5 py-4 border-b border-[hsl(var(--border))]">
                  <h3 className="text-h3 text-[hsl(var(--foreground))]">Follow Ups</h3>
                  <p className="text-xs text-[hsl(var(--muted))] mt-1">Scheduled follow-up appointments</p>
                </div>

                <div className="flex-1 overflow-auto divide-y divide-[hsl(var(--border)_/_0.5)]">
                  {loading ? (
                    <div className="px-5 py-8 text-center text-[hsl(var(--muted))] text-sm flex-1 flex items-center justify-center">Loading follow ups...</div>
                  ) : followUpsAll.length === 0 ? (
                    <div className="px-5 py-8 text-center text-[hsl(var(--muted))] text-sm flex-1 flex items-center justify-center">No follow ups yet.</div>
                  ) : (
                    followUps.map((item) => (
                      <div key={`followup-${item.id}`} className="px-5 py-[14px] hover:bg-[hsl(var(--primary-soft)_/_0.3)] transition-colors h-[65px] flex flex-col justify-center">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="text-sm font-semibold text-[hsl(var(--foreground))]">{item.studentProfile.firstName} {item.studentProfile.lastName}</p>
                            <p className="text-xs text-[hsl(var(--muted))] mt-0.5 tabular-nums">{item.studentProfile.studentNumber}</p>
                          </div>
                          <p className="text-xs text-[hsl(var(--muted-foreground))] tabular-nums bg-gray-100 px-2 py-1 rounded">
                            {formatDate(item.preferredDate)}
                          </p>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {followUpTotalPages > 1 && (
                  <div className="px-5 py-3 border-t border-[hsl(var(--border))] flex items-center justify-between bg-[hsl(var(--surface))]">
                    <button
                      type="button"
                      disabled={followUpPage === 1}
                      onClick={() => setFollowUpPage(p => Math.max(1, p - 1))}
                      className="text-xs font-medium px-3 py-1.5 rounded-md border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-[hsl(var(--muted))]">
                      Page {followUpPage} of {followUpTotalPages}
                    </span>
                    <button
                      type="button"
                      disabled={followUpPage === followUpTotalPages}
                      onClick={() => setFollowUpPage(p => Math.min(followUpTotalPages, p + 1))}
                      className="text-xs font-medium px-3 py-1.5 rounded-md border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                )}
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
          toast.success(`Found ${student.lastName}, ${student.firstName}`);
        }}
        onNotFound={() => {
          toast.error('Student not found.');
        }}
      />
    </div>
  );
}
