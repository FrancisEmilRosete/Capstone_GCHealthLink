'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import {
  Search,
  Loader2,
  AlertCircle,
  CheckCircle2,
  QrCode,
  Calendar,
  Clock,
  Activity,
  UserCheck,
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import toast from 'react-hot-toast';
import { getToken } from '@/lib/auth';
import { useServerEvents } from '@/lib/useServerEvents';
import ConsultationModal, {
  type ConsultationForm,
  type InventoryOption,
  type ConsultationPatient,
} from '@/components/modals/ConsultationModal';
import { formatTime12Hour } from '@/lib/time';
import ScannerWidget from '@/components/scanner/ScannerWidget';
import { printCertificate, printCertificatesBatch } from '@/lib/printCertificate';
import MedicalCertificateModal from '@/components/modals/MedicalCertificateModal';
import RoleWellnessTrends from '@/components/dashboard/shared/RoleWellnessTrends';

// ── Types ──────────────────────────────────────────────────────────────────
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

interface QueueResponse { success: boolean; data: QueueItem[]; }
interface CreateVisitResponse { success: boolean; message: string; }
interface InventoryResponse { success: boolean; data: InventoryOption[]; }

type LiveQueueFilter = 'all' | 'incoming' | 'waiting' | 'pending' | 'for-dispensing' | 'done';

// ── Helpers ────────────────────────────────────────────────────────────────

function isFollowUp(item: QueueItem) {
  const s = (item.serviceType + item.symptoms).toLowerCase();
  return s.includes('follow') || s.includes('recheck') || s.includes('revisit');
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatYearLevel(v?: string | null) {
  const map: Record<string, string> = { YR_1: 'Yr.1', YR_2: 'Yr.2', YR_3: 'Yr.3', YR_4: 'Yr.4' };
  return v ? (map[v] ?? v) : '';
}

const STATUS_PILL: Record<string, string> = {
  INCOMING: 'bg-violet-50  text-violet-600  border border-violet-200/60',
  WAITING: 'bg-amber-50   text-amber-600   border border-amber-200/60',
  PENDING: 'bg-sky-50     text-sky-600     border border-sky-200/60',
  IN_PROGRESS: 'bg-teal-50    text-teal-600    border border-teal-200/60',
  FOR_DISPENSING: 'bg-orange-50  text-orange-600  border border-orange-200/60',
  COMPLETED: 'bg-emerald-50 text-emerald-600 border border-emerald-200/60',
};

// ── Main Page ──────────────────────────────────────────────────────────────
export default function NurseDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<LiveQueueFilter>('all');
  const [consultOpen, setConsultOpen] = useState(false);
  const [consultPatient, setConsultPatient] = useState<QueueItem | null>(null);
  const [inventoryOptions, setInventoryOptions] = useState<InventoryOption[]>([]);
  const [isPending, startTransition] = useTransition();
  const [selectedDoneIds, setSelectedDoneIds] = useState<string[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const [dispensePatient, setDispensePatient] = useState<QueueItem | null>(null);
  const [isDispensing, setIsDispensing] = useState(false);
  const [followUpPage, setFollowUpPage] = useState(1);

  // ── Certificate Modal State ──────────────────────────────────────────────
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certTargets, setCertTargets] = useState<QueueItem[]>([]);
  const [certForms, setCertForms] = useState<Record<string, {
    certificateType: string;
    diagnosisFindings: string;
    recommendationsRemarks: string;
  }>>({});
  const [printCertModalOpen, setPrintCertModalOpen] = useState(false);
  const [printCertPatient, setPrintCertPatient] = useState<QueueItem | null>(null);
  const [printCertType, setPrintCertType] = useState<'CONSULTATION' | 'PHYSICAL_EXAM'>('CONSULTATION');
  const [printCertDiagnosis, setPrintCertDiagnosis] = useState('');
  const [printCertRemarks, setPrintCertRemarks] = useState('');

  // ── Modals State ───────────────────────────────────────────────────────────
  function parseScheduled(item: QueueItem): Date | null {
    const d = new Date(item.preferredDate);
    if (isNaN(d.getTime())) return null;
    const raw = (item.preferredTime || '').trim();
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

  function resolveStatus(item: QueueItem): 'INCOMING' | 'WAITING' | 'PENDING' | 'IN_PROGRESS' | 'FOR_DISPENSING' | 'COMPLETED' {
    if (item.status === 'COMPLETED') return 'COMPLETED';
    if (item.status === 'FOR_DISPENSING') return 'FOR_DISPENSING';
    if (item.status === 'IN_PROGRESS') return 'IN_PROGRESS';
    if (item.status === 'PENDING') return 'PENDING';
    const sched = parseScheduled(item);
    return sched && sched.getTime() > Date.now() ? 'INCOMING' : 'WAITING';
  }

  function isFutureFollowUp(item: QueueItem) {
    if (!isFollowUp(item)) return false;
    const sched = parseScheduled(item);
    if (!sched) return false;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const day = new Date(sched); day.setHours(0, 0, 0, 0);
    return day.getTime() > today.getTime();
  }

  // ── Data fetching ────────────────────────────────────────────────────────

  async function loadQueue(showLoading = true) {
    const token = getToken();
    if (!token) { toast.error('Not authenticated.'); if (showLoading) setLoading(false); return; }
    try {
      if (showLoading) setLoading(true);
      const res = await api.get<QueueResponse>(
        '/appointments/queue?limit=100&status=WAITING,PENDING,IN_PROGRESS,FOR_DISPENSING,COMPLETED',
        token,
      );
      setQueue(res.data || []);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : 'Failed to load queue.');
    } finally { if (showLoading) setLoading(false); }
  }

  useEffect(() => {
    void loadQueue(true);

    function handleWindowFocus() { void loadQueue(false); }
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') void loadQueue(false);
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
    async function loadInv() {
      const token = getToken(); if (!token) return;
      try { const r = await api.get<InventoryResponse>('/inventory', token); setInventoryOptions(r.data || []); } catch { /* ignore */ }
    }
    void loadInv();
  }, []);

  // ── Manual student lookup ────────────────────────────────────────────────

  // ── Derived queue data ───────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return queue;
    return queue.filter((item) =>
      `${item.studentProfile.firstName} ${item.studentProfile.lastName}`.toLowerCase().includes(q)
      || item.studentProfile.studentNumber.toLowerCase().includes(q)
      || (item.symptoms || '').toLowerCase().includes(q)
    );
  }, [queue, search]);

  const liveCandidates = filtered.filter(
    (i) => (
      i.status === 'WAITING'
      || i.status === 'PENDING'
      || i.status === 'IN_PROGRESS'
      || i.status === 'FOR_DISPENSING'
    ) && !isFutureFollowUp(i),
  );
  const doneCandidates = filtered.filter((i) => i.status === 'COMPLETED' && !isFutureFollowUp(i));
  
  const followUpsAll = filtered.filter((i) => (i.status === 'WAITING' || i.status === 'PENDING') && isFutureFollowUp(i));
  const followUpPageSize = 5;
  const followUpTotalPages = Math.max(1, Math.ceil(followUpsAll.length / followUpPageSize));
  const followUps = followUpsAll.slice((followUpPage - 1) * followUpPageSize, followUpPage * followUpPageSize);

  const incomingCount = liveCandidates.filter((i) => resolveStatus(i) === 'INCOMING').length;
  const waitingCount = liveCandidates.filter((i) => resolveStatus(i) === 'WAITING').length;
  const pendingCount = liveCandidates.filter((i) => resolveStatus(i) === 'PENDING' || resolveStatus(i) === 'IN_PROGRESS').length;
  const dispensingCount = liveCandidates.filter((i) => resolveStatus(i) === 'FOR_DISPENSING').length;
  const allCount = liveCandidates.length;
  const doneCount = doneCandidates.length;

  const liveQueue = (filter === 'done' ? doneCandidates : liveCandidates).filter((item) => {
    const s = resolveStatus(item);
    if (filter === 'done') return item.status === 'COMPLETED';
    if (filter === 'all') return true;
    if (filter === 'incoming') return s === 'INCOMING';
    if (filter === 'waiting') return s === 'WAITING';
    if (filter === 'for-dispensing') return s === 'FOR_DISPENSING';
    return s === 'PENDING' || s === 'IN_PROGRESS';
  });

  const selectedSet = useMemo(() => new Set(selectedDoneIds), [selectedDoneIds]);

  useEffect(() => {
    if (filter !== 'done') { setSelectedDoneIds([]); setSelectMode(false); }
  }, [filter]);

  // ── Actions ──────────────────────────────────────────────────────────────
  function openConsult(patient: QueueItem) { setConsultPatient(patient); setConsultOpen(true); }

  async function handleConsultSave(form: ConsultationForm, _meds: Array<{ inventoryId: string; medicine: string; qty: string }>) {
    if (!consultPatient) return;
    const token = getToken(); if (!token) return;
    const tag = 'General Consultation';
    const complaint = form.chiefComplaint?.trim() || '';
    try {
      await api.post<CreateVisitResponse>('/clinic/visits', {
        studentProfileId: consultPatient.studentProfile.id,
        visitDate: form.visitDate?.trim() || new Date().toISOString(),
        visitTime: form.visitTime?.trim() || consultPatient.preferredTime || undefined,
        chiefComplaintEnc: JSON.stringify({
          concernTag: tag, symptoms: complaint, chiefComplaint: complaint || tag,
          diagnosis: null, treatmentProvided: null, treatmentManagement: null,
          age: form.age?.trim() || null, sex: form.sex?.trim() || null,
          vitals: { bp: form.bp?.trim() || null, temperature: form.temperature?.trim() || null },
          notes: [tag, complaint].filter(Boolean).join(' | ') || 'General consultation',
        }),
        dispensedMedicines: [],
      }, token);
      await api.put(`/appointments/queue/${consultPatient.id}`, { status: 'PENDING' }, token);
      setConsultOpen(false); setConsultPatient(null);
      toast.success('Consultation saved \u2014 sent to doctor.');
      await loadQueue();
    } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Failed to save consultation.'); }
  }

  async function handleDispenseConfirm() {
    if (!dispensePatient) return;
    const token = getToken(); if (!token) return;
    const prescribed = (dispensePatient.pendingMedicines || []).filter((m) => m.status === 'PRESCRIBED');
    if (!prescribed.length) { toast.error('No prescribed medicines found.'); setDispensePatient(null); return; }
    try {
      setIsDispensing(true);
      for (const m of prescribed) {
        const res = await api.put<{ warning?: string; lowStockWarning?: string }>(`/clinic/visits/dispense/${m.id}`, {}, token);
        if (res.warning) toast.success(res.warning);
        if (res.lowStockWarning) toast.error(res.lowStockWarning);
      }
      await api.put(`/appointments/queue/${dispensePatient.id}`, { status: 'COMPLETED' }, token);
      toast.success('Medicines dispensed \u2014 queue item completed.');
      setDispensePatient(null);
      await loadQueue();
    } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Failed to dispense medicines.'); }
    finally { setIsDispensing(false); }
  }

  function openIssueSingle(patient: QueueItem) {
    setCertTargets([patient]);
    setCertForms({
      [patient.id]: {
        certificateType: 'CONSULTATION',
        diagnosisFindings: patient.symptoms || '',
        recommendationsRemarks: '',
      }
    });
    setCertModalOpen(true);
  }

  function openIssueBulk() {
    if (!selectedDoneIds.length) { toast.error('Select at least one completed patient.'); return; }
    const targets = doneCandidates.filter((i) => selectedSet.has(i.id));
    setCertTargets(targets);
    
    const initialForms: Record<string, { certificateType: string; diagnosisFindings: string; recommendationsRemarks: string; }> = {};
    targets.forEach(t => {
      initialForms[t.id] = {
        certificateType: 'CONSULTATION',
        diagnosisFindings: t.symptoms || '',
        recommendationsRemarks: '',
      };
    });
    
    setCertForms(initialForms);
    setCertModalOpen(true);
  }

  async function executeGiveCert() {
    if (!certTargets.length) return;
    try {
      const token = getToken(); if (!token) return;
      const createdCerts = [];
      for (const p of certTargets) {
        const form = certForms[p.id] || { certificateType: 'CONSULTATION', diagnosisFindings: '', recommendationsRemarks: '' };
        const res = await api.post<{ data: any }>('/certificates', {
          studentIdentifier: p.studentProfile.studentNumber,
          certificateType: form.certificateType,
          diagnosisFindings: form.diagnosisFindings.trim() || 'Consultation completed',
          recommendationsRemarks: form.recommendationsRemarks.trim(),
          dateIssued: new Date().toISOString(),
        }, token);
        if (res.data) createdCerts.push(res.data);
      }
      
      setCertModalOpen(false);
      setSelectedDoneIds([]); setSelectMode(false);
      toast.success(`Issued ${createdCerts.length} medical certificate${createdCerts.length > 1 ? 's' : ''}.`);
      
      if (createdCerts.length === 1) {
        const p = certTargets[0];
        const form = certForms[p.id] || { certificateType: 'CONSULTATION', diagnosisFindings: '', recommendationsRemarks: '' };
        
        setPrintCertPatient(p);
        setPrintCertType(form.certificateType === 'PHYSICAL_EXAM' ? 'PHYSICAL_EXAM' : 'CONSULTATION');
        setPrintCertDiagnosis(form.diagnosisFindings);
        setPrintCertRemarks(form.recommendationsRemarks);
        setPrintCertModalOpen(true);
      } else if (createdCerts.length > 1) {
        printCertificatesBatch(createdCerts);
      }
    } catch (e) { toast.error(e instanceof ApiError ? e.message : 'Failed to issue certificates.'); }
  }

  const filterTabs: { key: LiveQueueFilter; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: allCount },
    { key: 'incoming', label: 'Incoming', count: incomingCount },
    { key: 'waiting', label: 'Waiting', count: waitingCount },
    { key: 'pending', label: 'Pending', count: pendingCount },
    { key: 'for-dispensing', label: 'For Dispensing', count: dispensingCount },
    { key: 'done', label: 'Done', count: doneCount },
  ];

  // ── Render ───────────────────────────────────────────────────────────────
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
                      onClick={() => startTransition(() => setFilter('all'))}
                      className={`relative px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-colors ${filter === 'all' ? 'bg-[hsl(var(--primary))] text-white' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--primary-soft))]'
                        }`}
                    >
                      All
                    </button>
                    <button
                      type="button"
                      onClick={() => startTransition(() => setFilter('incoming'))}
                      className={`relative px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-colors ${filter === 'incoming' ? 'bg-[hsl(var(--primary))] text-white' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--primary-soft))]'
                        }`}
                    >
                      Incoming
                      {incomingCount > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[hsl(var(--surface))] -translate-y-1/2 translate-x-1/2" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => startTransition(() => setFilter('waiting'))}
                      className={`relative px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-colors ${filter === 'waiting' ? 'bg-[hsl(var(--primary))] text-white' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--primary-soft))]'
                        }`}
                    >
                      Waiting
                      {waitingCount > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[hsl(var(--surface))] -translate-y-1/2 translate-x-1/2" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => startTransition(() => setFilter('pending'))}
                      className={`relative px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-colors ${filter === 'pending' ? 'bg-[hsl(var(--primary))] text-white' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--primary-soft))]'
                        }`}
                    >
                      Pending
                      {pendingCount > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[hsl(var(--surface))] -translate-y-1/2 translate-x-1/2" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => startTransition(() => setFilter('for-dispensing'))}
                      className={`relative px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-colors ${filter === 'for-dispensing' ? 'bg-[hsl(var(--primary))] text-white' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--primary-soft))]'
                        }`}
                    >
                      For Dispensing
                      {dispensingCount > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[hsl(var(--surface))] -translate-y-1/2 translate-x-1/2" />}
                    </button>
                    <button
                      type="button"
                      onClick={() => startTransition(() => setFilter('done'))}
                      className={`relative px-3 py-1.5 rounded-[var(--radius-md)] text-xs font-medium transition-colors ${filter === 'done' ? 'bg-[hsl(var(--primary))] text-white' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--primary-soft))]'
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
                        value={search}
                        onChange={(e) => startTransition(() => setSearch(e.target.value))}
                        className="pl-10 pr-4 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input-border))] rounded-[var(--radius-md)] text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--focus-ring)_/_0.4)] focus:border-[hsl(var(--primary))] w-full transition-all"
                      />
                    </div>
                  </div>

                  {filter === 'done' && (
                    <div className="flex items-center gap-2 lg:justify-end">
                      <button
                        type="button"
                        onClick={() => {
                          if (!selectMode) { setSelectMode(true); setSelectedDoneIds([]); return; }
                          if (selectedDoneIds.length > 0) { openIssueBulk(); return; }
                          setSelectMode(false); setSelectedDoneIds([]);
                        }}
                        className="text-xs font-medium bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-hover))] text-white px-3 py-2 rounded-[var(--radius-md)] transition-colors"
                      >
                        {!selectMode ? 'Select' : selectedDoneIds.length > 0 ? `Give Med Cert (${selectedDoneIds.length})` : 'Cancel Select'}
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
                          {filter === 'done' && selectMode && (
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
                            <td colSpan={filter === 'done' && selectMode ? 7 : 6} className="px-4 py-10 text-center text-[hsl(var(--muted))] text-sm">No patients found.</td>
                          </tr>
                        ) : (
                          liveQueue.map((patient) => {
                            const rs = resolveStatus(patient);
                            const isDisp = rs === 'FOR_DISPENSING';
                            const isPend = rs === 'PENDING' || rs === 'IN_PROGRESS';
                            const isComp = patient.status === 'COMPLETED';

                            return (
                              <tr
                                key={patient.id}
                                className="hover:bg-[hsl(var(--primary-soft)_/_0.3)] transition-colors"
                              >
                                {filter === 'done' && selectMode && (
                                  <td className="px-4 py-3 text-left">
                                    <input
                                      type="checkbox"
                                      checked={selectedSet.has(patient.id)}
                                      onChange={() => setSelectedDoneIds((p) =>
                                        p.includes(patient.id) ? p.filter((id) => id !== patient.id) : [...p, patient.id]
                                      )}
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
                                          : rs === 'PENDING' || rs === 'IN_PROGRESS'
                                            ? 'bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]'
                                            : 'bg-[hsl(var(--warning-soft))] text-[hsl(var(--warning))]'
                                    }`}>
                                    {patient.status === 'COMPLETED'
                                      ? 'Done'
                                      : rs === 'INCOMING'
                                        ? 'Incoming'
                                        : rs === 'FOR_DISPENSING'
                                          ? 'For Dispensing'
                                          : rs === 'PENDING' || rs === 'IN_PROGRESS'
                                            ? 'Pending'
                                            : 'Waiting'}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  {isComp ? (
                                    <button
                                      type="button"
                                      onClick={() => openIssueSingle(patient)}
                                      className="text-xs font-medium bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-hover))] text-white px-3 py-1.5 rounded-[var(--radius-md)] transition-colors"
                                    >
                                      Give Med Cert
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => { if (isDisp) setDispensePatient(patient); else openConsult(patient); }}
                                      disabled={isPend}
                                      className="text-xs font-medium bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-hover))] text-white px-3 py-1.5 rounded-[var(--radius-md)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                                    >
                                      {isDisp ? 'Dispense' : isPend ? 'Sent to Doctor' : 'Consult'}
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

      {certModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-[hsl(var(--border))] flex justify-between items-center bg-[hsl(var(--surface))]">
              <h3 className="font-bold text-lg text-[hsl(var(--foreground))]">Issue Medical Certificate</h3>
              <button type="button" onClick={() => setCertModalOpen(false)} className="text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] transition-colors">&times;</button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
               {certTargets.map((target, idx) => {
                  const form = certForms[target.id] || { certificateType: 'CONSULTATION', diagnosisFindings: '', recommendationsRemarks: '' };
                  return (
                    <div key={target.id} className={idx > 0 ? "pt-6 border-t border-[hsl(var(--border))]" : ""}>
                       <p className="text-sm font-semibold text-[hsl(var(--foreground))] mb-3">
                         {target.studentProfile.firstName} {target.studentProfile.lastName} <span className="text-[hsl(var(--muted-foreground))]">({target.studentProfile.studentNumber})</span>
                       </p>
                       
                       <div className="space-y-4">
                         <div>
                            <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1">Certificate Type</label>
                            <select
                              value={form.certificateType}
                              onChange={(e) => setCertForms(prev => ({ ...prev, [target.id]: { ...prev[target.id], certificateType: e.target.value } }))}
                              className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input-border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)_/_0.3)] focus:border-[hsl(var(--primary))] transition-all"
                            >
                              <option value="CONSULTATION">Consultation</option>
                              <option value="PHYSICAL_EXAM">Physical Exam</option>
                            </select>
                         </div>
                         
                         <div>
                            <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1">Diagnosis / Findings</label>
                            <textarea
                              value={form.diagnosisFindings}
                              onChange={(e) => setCertForms(prev => ({ ...prev, [target.id]: { ...prev[target.id], diagnosisFindings: e.target.value } }))}
                              className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input-border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)_/_0.3)] focus:border-[hsl(var(--primary))] transition-all resize-y min-h-[60px]"
                              placeholder="Enter diagnosis or clinical findings..."
                            />
                         </div>
                         
                         <div>
                            <label className="block text-xs font-semibold text-[hsl(var(--foreground))] mb-1">Recommendations / Remarks</label>
                            <textarea
                              value={form.recommendationsRemarks}
                              onChange={(e) => setCertForms(prev => ({ ...prev, [target.id]: { ...prev[target.id], recommendationsRemarks: e.target.value } }))}
                              className="w-full px-3 py-2 bg-[hsl(var(--background))] border border-[hsl(var(--input-border))] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary)_/_0.3)] focus:border-[hsl(var(--primary))] transition-all resize-y min-h-[60px]"
                              placeholder="Enter remarks or recommendations (e.g., Rest for 2 days)..."
                            />
                         </div>
                       </div>
                    </div>
                  );
               })}
            </div>
            
            <div className="px-6 py-4 border-t border-[hsl(var(--border))] bg-gray-50 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setCertModalOpen(false)}
                className="px-4 py-2 text-sm font-medium text-[hsl(var(--muted-foreground))] hover:bg-gray-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeGiveCert}
                className="px-4 py-2 text-sm font-medium bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-colors shadow-sm"
              >
                Give & Print
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Consult Modal ────────────────────────────────────────── */}
      {consultOpen && consultPatient && (
        <ConsultationModal
          patient={{
            firstName: consultPatient.studentProfile.firstName,
            middleName: '',
            lastName: consultPatient.studentProfile.lastName,
            department: consultPatient.studentProfile.courseDept,
            course: consultPatient.studentProfile.course || consultPatient.studentProfile.courseDept,
            yearLevel: formatYearLevel(consultPatient.studentProfile.yearLevel),
            age: consultPatient.studentProfile.age ? String(consultPatient.studentProfile.age) : '',
            sex: consultPatient.studentProfile.sex || '',
          } as ConsultationPatient}
          inventoryOptions={inventoryOptions}
          mode="nurse-triage"
          saveLabel="Send to Doctor"
          onClose={() => setConsultOpen(false)}
          onSave={(data, meds) => { void handleConsultSave(data, meds); }}
        />
      )}

      {/* ── Dispense Confirmation Modal ───────────────────────────── */}
      {dispensePatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !isDispensing && setDispensePatient(null)} />
          <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-[hsl(var(--border))]">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-bold text-[hsl(var(--foreground))]">Dispense Medicines</h2>
                  <p className="text-xs text-[hsl(var(--muted))] mt-0.5">
                    {dispensePatient.studentProfile.lastName}, {dispensePatient.studentProfile.firstName}
                    {' '}&mdash;{' '}{dispensePatient.studentProfile.studentNumber}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setDispensePatient(null)}
                  disabled={isDispensing}
                  className="text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] text-xl leading-none disabled:opacity-40"
                  aria-label="Close"
                >&times;</button>
              </div>
            </div>

            {/* Medicine list */}
            <div className="px-6 py-4 space-y-3">
              <p className="text-xs font-semibold text-[hsl(var(--muted))] uppercase tracking-wide">Prescribed Medicines</p>
              {(dispensePatient.pendingMedicines || []).filter((m) => m.status === 'PRESCRIBED').length === 0 ? (
                <p className="text-sm text-[hsl(var(--muted))] py-4 text-center">No prescribed medicines found.</p>
              ) : (
                <div className="space-y-2">
                  {(dispensePatient.pendingMedicines || [])
                    .filter((m) => m.status === 'PRESCRIBED')
                    .map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--surface))] px-4 py-3"
                      >
                        <div>
                          <p className="text-sm font-semibold text-[hsl(var(--foreground))]">
                            {m.inventory?.itemName || 'Unknown Medicine'}
                          </p>
                          {m.inventory?.unit && (
                            <p className="text-[11px] text-[hsl(var(--muted))] mt-0.5">{m.inventory.unit}</p>
                          )}
                        </div>
                        <span className="text-sm font-bold text-[hsl(var(--primary))]">&times;{m.quantity}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[hsl(var(--border))] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setDispensePatient(null)}
                disabled={isDispensing}
                className="text-xs font-medium border border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--surface))] px-4 py-2 rounded-[var(--radius-md)] transition-colors disabled:opacity-40"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDispenseConfirm()}
                disabled={isDispensing || (dispensePatient.pendingMedicines || []).filter((m) => m.status === 'PRESCRIBED').length === 0}
                className="flex items-center gap-2 text-xs font-bold bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-hover))] text-white px-5 py-2 rounded-[var(--radius-md)] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isDispensing && <Loader2 size={13} className="animate-spin" />}
                {isDispensing ? 'Dispensing...' : 'Confirm Dispense'}
              </button>
            </div>
          </div>
        </div>
      )}

      {printCertModalOpen && printCertPatient && (
        <MedicalCertificateModal
          isOpen={printCertModalOpen}
          onClose={() => {
            setPrintCertModalOpen(false);
            setPrintCertPatient(null);
          }}
          student={{
            id: printCertPatient.studentProfile.id,
            studentNumber: printCertPatient.studentProfile.studentNumber,
            firstName: printCertPatient.studentProfile.firstName,
            lastName: printCertPatient.studentProfile.lastName,
            course: printCertPatient.studentProfile.course || printCertPatient.studentProfile.courseDept,
            yearLevel: printCertPatient.studentProfile.yearLevel || '',
            age: printCertPatient.studentProfile.age || '',
            sex: printCertPatient.studentProfile.sex || '',
          }}
          certificateType={printCertType}
          initialDiagnosis={printCertDiagnosis}
          initialRemarks={printCertRemarks}
        />
      )}

    </div>
  );
}
