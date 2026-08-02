'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { normalizeComplaintDisplay } from '@/lib/complaint';
import { formatTime12Hour } from '@/lib/time';
import UseQrLookupModal, { type QrResolvedStudent } from '@/components/scanner/UseQrLookupModal';
import toast from 'react-hot-toast';

type LogKind = 'consultation' | 'physical_exam' | 'other_operation';

interface VisitRecord {
  id: string;
  visitDate: string;
  visitTime?: string;
  createdAt?: string;
  studentProfile: {
    id: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
    courseDept?: string;
    yearLevel?: string;
  };
  chiefComplaintEnc?: string;
  concernTag?: string;
  dispensedMedicines?: Array<{
    inventory: {
      itemName: string;
    };
    quantity: number;
  }>;
  handledBy?: {
    id: string;
    email?: string;
    role?: string;
    clinicStaffType?: string;
  };
}

interface PhysicalExamRow {
  id: string;
  studentProfileId: string;
  studentNumber: string;
  studentName: string;
  courseDept?: string;
  yearLevel?: string;
  examDate: string;
  createdAt?: string;
  bmi: string;
  bp: string;
  examinedBy: string;
}

interface VisitsResponse {
  success: boolean;
  data: VisitRecord[];
}

interface PhysicalExamResponse {
  success: boolean;
  data: PhysicalExamRow[];
}

interface OtherOperationRow {
  id: string;
  action: string;
  actionLabel: string;
  timestamp: string;
  targetId?: string | null;
  metadata?: unknown;
  actorName?: string;
  actorRole?: string;
}

interface OtherOperationResponse {
  success: boolean;
  data: OtherOperationRow[];
}

interface ParsedConsultationData {
  concernTag: string;
  chiefComplaint: string;
  diagnosis: string;
  treatmentProvided: string;
  bp: string;
  temperature: string;
  notes: string;
}

interface UnifiedLogItem {
  id: string;
  studentNumber: string;
  studentName: string;
  department: string;
  yearLevel: string;
  logType: LogKind;
  loggedAtIso: string;
  dateIso: string;
  visitTime?: string;
  actorName: string;
  actorRole: string;
  operationLabel?: string;
  action?: string;
  targetId?: string;
  metadata?: unknown;
  consultation?: VisitRecord;
  physicalExam?: PhysicalExamRow;
  parsedConsultation?: ParsedConsultationData;
}

interface VitalSnapshot {
  bp?: string;
  temperature?: string;
}

interface OtherOperationDetails {
  title: string;
  changedItem: string;
  changeType: string;
  previousValue: string;
  newValue: string;
  appointmentInfo: string;
  recordReference: string;
}

interface OtherOperationMetadata {
  entityType?: string;
  appointmentId?: string;
  studentProfileId?: string;
  serviceType?: string;
  preferredDate?: string;
  preferredTime?: string;
  changes?: {
    status?: {
      from?: string | null;
      to?: string | null;
    };
  };
}

function normalizeYearLevel(value?: string) {
  if (!value) return 'N/A';
  switch (value) {
    case 'YR_1': return 'Yr. 1';
    case 'YR_2': return 'Yr. 2';
    case 'YR_3': return 'Yr. 3';
    case 'YR_4': return 'Yr. 4';
    default: return value;
  }
}

function toDateKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, '0');
  const d = `${date.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(timeStr?: string) {
  if (!timeStr) return '';
  return timeStr;
}

function formatActorName(email?: string, fallback = 'Clinic Staff') {
  const value = (email || '').trim();
  if (!value) return fallback;
  const localPart = value.split('@')[0] || '';
  const normalized = localPart.replace(/[._-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!normalized) return value;
  return normalized
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatRole(role?: string, clinicStaffType?: string) {
  const normalized = (clinicStaffType || role || '').trim().toUpperCase();
  if (normalized === 'NURSE') return 'Nurse';
  if (normalized === 'DOCTOR') return 'Doctor';
  if (normalized === 'DENTIST' || normalized === 'DENTAL') return 'Dentist';
  if (normalized === 'ADMIN') return 'Admin';
  if (normalized === 'CLINIC_STAFF') return 'Clinic Staff';
  if (!normalized) return 'Clinic Staff';
  return normalized.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
}

function formatActionLabel(action?: string) {
  const normalized = (action || '').trim();
  if (!normalized) return 'Other Operation';
  return normalized.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function toSentenceCase(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

function formatChangeValue(value?: string | null) {
  const normalized = (value || '').trim();
  if (!normalized) return 'N/A';
  return normalized
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function parseOtherOperationMetadata(raw: unknown): OtherOperationMetadata | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return null;
  }
  return raw as OtherOperationMetadata;
}

function buildAppointmentInfo(metadata: OtherOperationMetadata | null) {
  if (!metadata) return '';
  const dateText = metadata.preferredDate ? formatDate(metadata.preferredDate) : '';
  const timeText = (metadata.preferredTime || '').trim();
  const serviceType = (metadata.serviceType || '').trim();

  const dateAndTime = dateText && timeText
    ? `${dateText} at ${timeText}`
    : dateText || timeText;

  if (dateAndTime && serviceType) {
    return `${dateAndTime} (${serviceType})`;
  }

  return dateAndTime || serviceType;
}

function buildOtherOperationDetails(log: UnifiedLogItem): OtherOperationDetails {
  const actionCode = (log.action || '').trim().toUpperCase();
  const words = actionCode ? actionCode.split('_').filter(Boolean) : [];
  const metadata = parseOtherOperationMetadata(log.metadata);
  const statusChange = metadata?.changes?.status;

  if (statusChange && (statusChange.from !== undefined || statusChange.to !== undefined)) {
    return {
      title: log.operationLabel || formatActionLabel(log.action),
      changedItem: 'Appointment Status',
      changeType: 'Updated',
      previousValue: formatChangeValue(statusChange.from),
      newValue: formatChangeValue(statusChange.to),
      appointmentInfo: buildAppointmentInfo(metadata),
      recordReference: (metadata?.appointmentId || log.targetId || '').trim(),
    };
  }

  const changeTypeMap: Record<string, string> = {
    CREATE: 'Created',
    CREATED: 'Created',
    UPDATE: 'Updated',
    UPDATED: 'Updated',
    DELETE: 'Deleted',
    DELETED: 'Deleted',
    RECORD: 'Recorded',
    RECORDED: 'Recorded',
    ISSUE: 'Issued',
    ISSUED: 'Issued',
    APPROVE: 'Approved',
    APPROVED: 'Approved',
    REJECT: 'Rejected',
    REJECTED: 'Rejected',
    CANCEL: 'Cancelled',
    CANCELLED: 'Cancelled',
    UPLOAD: 'Uploaded',
    UPLOADED: 'Uploaded',
    GENERATE: 'Generated',
    GENERATED: 'Generated',
  };

  const firstVerbIndex = words.findIndex((word) => Boolean(changeTypeMap[word]));
  const changeType = firstVerbIndex >= 0 ? changeTypeMap[words[firstVerbIndex]] : 'Updated';
  const changedWords = words
    .filter((_, index) => index !== firstVerbIndex)
    .map((word) => toSentenceCase(word));
  const changedItem = changedWords.length > 0 ? changedWords.join(' ') : 'Record';
  const title = log.operationLabel || formatActionLabel(log.action);

  return {
    title,
    changedItem,
    changeType,
    previousValue: 'N/A',
    newValue: 'N/A',
    appointmentInfo: buildAppointmentInfo(metadata),
    recordReference: (log.targetId || '').trim(),
  };
}

function hasMeaningfulText(value?: string | null) {
  const normalized = (value || '').trim().toUpperCase();
  return normalized !== '' && normalized !== 'N/A' && normalized !== 'NULL';
}

function parseConsultationData(raw?: string): ParsedConsultationData {
  if (!raw?.trim()) {
    return {
      concernTag: 'General Consultation',
      chiefComplaint: 'N/A',
      diagnosis: 'N/A',
      treatmentProvided: 'N/A',
      bp: 'N/A',
      temperature: 'N/A',
      notes: '',
    };
  }

  try {
    const parsed = JSON.parse(raw) as {
      concernTag?: string;
      chiefComplaint?: string;
      symptoms?: string;
      diagnosis?: string;
      treatmentProvided?: string;
      treatmentManagement?: string;
      vitals?: { bp?: string; temperature?: string };
      notes?: string;
    };

    return {
      concernTag: normalizeComplaintDisplay(parsed.concernTag, 'General Consultation'),
      chiefComplaint: normalizeComplaintDisplay(parsed.chiefComplaint || parsed.symptoms, 'N/A'),
      diagnosis: normalizeComplaintDisplay(parsed.diagnosis, 'N/A'),
      treatmentProvided: normalizeComplaintDisplay(parsed.treatmentProvided || parsed.treatmentManagement, 'N/A'),
      bp: parsed.vitals?.bp?.trim() || 'N/A',
      temperature: parsed.vitals?.temperature?.trim() || 'N/A',
      notes: normalizeComplaintDisplay(parsed.notes, ''),
    };
  } catch {
    return {
      concernTag: 'General Consultation',
      chiefComplaint: normalizeComplaintDisplay(raw, 'N/A'),
      diagnosis: 'N/A',
      treatmentProvided: 'N/A',
      bp: 'N/A',
      temperature: 'N/A',
      notes: '',
    };
  }
}

function displayOrFallback(value?: string, fallback = 'Not recorded') {
  const normalized = (value || '').trim();
  if (!normalized || normalized.toUpperCase() === 'N/A') return fallback;
  return normalized;
}

function hasMeaningfulVitals(vitals: VitalSnapshot) {
  const bp = (vitals.bp || '').trim().toUpperCase();
  const temp = (vitals.temperature || '').trim().toUpperCase();
  return (bp && bp !== 'N/A') || (temp && temp !== 'N/A');
}

function getVitalsForLog(log: UnifiedLogItem): VitalSnapshot {
  if (log.logType === 'physical_exam' && log.physicalExam) {
    return { bp: log.physicalExam.bp || 'N/A', temperature: 'N/A' };
  }
  if (log.logType === 'consultation') {
    return {
      bp: log.parsedConsultation?.bp || 'N/A',
      temperature: log.parsedConsultation?.temperature || 'N/A',
    };
  }
  return { bp: 'N/A', temperature: 'N/A' };
}

function getConcernTag(log: UnifiedLogItem): string {
  if (log.logType !== 'consultation') return 'N/A';
  return normalizeComplaintDisplay(log.consultation?.concernTag || log.parsedConsultation?.concernTag, 'General Consultation');
}

function getChiefComplaint(log: UnifiedLogItem): string {
  if (log.logType !== 'consultation') return 'N/A';
  return log.parsedConsultation?.chiefComplaint || 'N/A';
}

function getDiagnosis(log: UnifiedLogItem): string {
  if (log.logType !== 'consultation') return 'N/A';
  return log.parsedConsultation?.diagnosis || 'N/A';
}

function getTreatment(log: UnifiedLogItem): string {
  if (log.logType !== 'consultation') return 'N/A';
  return log.parsedConsultation?.treatmentProvided || 'N/A';
}

function getConsultationNotes(log: UnifiedLogItem): string {
  if (log.logType !== 'consultation') return '';
  return log.parsedConsultation?.notes || '';
}

function VitalSignsPanel({ vitals }: { vitals: VitalSnapshot }) {
  const hasVitals = hasMeaningfulVitals(vitals);
  return (
    <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-4 border border-cyan-200 space-y-3">
      <p className="text-xs font-bold text-teal-700 uppercase tracking-wider">Vital Signs</p>
      {hasVitals ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="bg-white/70 rounded-lg p-3 border border-cyan-100">
            <p className="text-xs font-semibold text-gray-600 uppercase">BP (mmHg)</p>
            <p className="text-sm font-bold text-gray-900 mt-1">{vitals.bp || 'N/A'}</p>
          </div>
          <div className="bg-white/70 rounded-lg p-3 border border-cyan-100">
            <p className="text-xs font-semibold text-gray-600 uppercase">Temperature</p>
            <p className="text-sm font-bold text-gray-900 mt-1">{vitals.temperature || 'N/A'}</p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-gray-600">No recorded vitals for this log entry.</p>
      )}
    </div>
  );
}

const PAGE_SIZE = 10;

export default function StaffLogsPage() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [logs, setLogs] = useState<UnifiedLogItem[]>([]);
  const [selectedLog, setSelectedLog] = useState<UnifiedLogItem | null>(null);
  const [searchStudent, setSearchStudent] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterYearLevel, setFilterYearLevel] = useState('all');
  const [filterType, setFilterType] = useState<'all' | LogKind>('all');
  const [page, setPage] = useState(1);
  const prevFilterKeyRef = useRef('');
  const [certModal, setCertModal] = useState<{
    open: boolean;
    log: UnifiedLogItem | null;
    loading: boolean;
    diagnosisFindings: string;
    recommendationsRemarks: string;
    dateIssued: string;
  }>({ open: false, log: null, loading: false, diagnosisFindings: '', recommendationsRemarks: '', dateIssued: '' });

  async function loadLogs() {
    const token = getToken();
    if (!token) {
      toast.error('You are not logged in. Please sign in again.');
      setLoading(false);
      return;
    }

    try {
      const ts = Date.now();
      const [visitsResult, physicalResult, otherResult] = await Promise.allSettled([
        api.get<VisitsResponse>(`/clinic/visits?limit=200&_ts=${ts}`, token),
        api.get<PhysicalExamResponse>(`/physical-exams?limit=200&_ts=${ts}`, token),
        api.get<OtherOperationResponse>(`/clinic/activity-logs?limit=200&_ts=${ts}`, token),
      ]);

      if (visitsResult.status !== 'fulfilled') {
        const reason = visitsResult.reason;
        if (reason instanceof ApiError) throw reason;
        throw new Error('Failed to load consultation logs.');
      }

      const visitsResponse = visitsResult.value;
      const physicalResponse = physicalResult.status === 'fulfilled'
        ? physicalResult.value
        : { success: false, data: [] as PhysicalExamRow[] };
      const otherResponse = otherResult.status === 'fulfilled'
        ? otherResult.value
        : { success: false, data: [] as OtherOperationRow[] };

      const visitCandidates = (visitsResponse.data || [])
        .filter((visit) => !(visit.studentProfile.studentNumber || '').toUpperCase().startsWith('EMP'))
        .map((visit) => {
          const parsed = parseConsultationData(visit.chiefComplaintEnc);
          const actorName = formatActorName(visit.handledBy?.email);
          const actorRole = formatRole(visit.handledBy?.role, visit.handledBy?.clinicStaffType);
          const visitTimestamp = +new Date(visit.createdAt || visit.visitDate || new Date().toISOString());
          const hasDiagnosisOrTreatment = hasMeaningfulText(parsed.diagnosis) || hasMeaningfulText(parsed.treatmentProvided);

          return {
            visit,
            parsed,
            actorName,
            actorRole,
            visitTimestamp,
            isNurseTriage: actorRole === 'Nurse' && !hasDiagnosisOrTreatment,
            isDoctorFinal: actorRole === 'Doctor' && hasDiagnosisOrTreatment,
          };
        });

      const matchedNurseVisitIds = new Set<string>();
      const representedDoctorVisitIds = new Set<string>();

      const doctorFinalCandidates = visitCandidates
        .filter((candidate) => candidate.isDoctorFinal)
        .sort((a, b) => a.visitTimestamp - b.visitTimestamp);

      const pairedDoctorLogs: UnifiedLogItem[] = doctorFinalCandidates.map((doctorCandidate) => {
        representedDoctorVisitIds.add(doctorCandidate.visit.id);

        const pairedNurse = visitCandidates
          .filter((candidate) => (
            candidate.isNurseTriage
            && !matchedNurseVisitIds.has(candidate.visit.id)
            && candidate.visit.studentProfile.studentNumber === doctorCandidate.visit.studentProfile.studentNumber
            && toDateKey(candidate.visit.createdAt || candidate.visit.visitDate || '')
              === toDateKey(doctorCandidate.visit.createdAt || doctorCandidate.visit.visitDate || '')
            && candidate.visitTimestamp <= doctorCandidate.visitTimestamp
          ))
          .sort((a, b) => b.visitTimestamp - a.visitTimestamp)[0];

        if (pairedNurse) {
          matchedNurseVisitIds.add(pairedNurse.visit.id);
        }

        return {
          id: `consult-${doctorCandidate.visit.id}`,
          studentNumber: doctorCandidate.visit.studentProfile.studentNumber,
          studentName: `${doctorCandidate.visit.studentProfile.firstName} ${doctorCandidate.visit.studentProfile.lastName}`,
          department: doctorCandidate.visit.studentProfile.courseDept || 'N/A',
          yearLevel: normalizeYearLevel(doctorCandidate.visit.studentProfile.yearLevel),
          logType: 'consultation' as const,
          loggedAtIso: doctorCandidate.visit.createdAt || doctorCandidate.visit.visitDate || new Date().toISOString(),
          dateIso: doctorCandidate.visit.visitDate || doctorCandidate.visit.createdAt || new Date().toISOString(),
          visitTime: doctorCandidate.visit.visitTime,
          actorName: pairedNurse
            ? `${pairedNurse.actorName} + ${doctorCandidate.actorName}`
            : doctorCandidate.actorName,
          actorRole: pairedNurse ? 'Nurse + Doctor' : doctorCandidate.actorRole,
          consultation: doctorCandidate.visit,
          parsedConsultation: doctorCandidate.parsed,
        };
      });

      const remainingVisitLogs: UnifiedLogItem[] = visitCandidates
        .filter((candidate) => !representedDoctorVisitIds.has(candidate.visit.id))
        .filter((candidate) => !(candidate.isNurseTriage && matchedNurseVisitIds.has(candidate.visit.id)))
        .map((candidate) => ({
          id: `consult-${candidate.visit.id}`,
          studentNumber: candidate.visit.studentProfile.studentNumber,
          studentName: `${candidate.visit.studentProfile.firstName} ${candidate.visit.studentProfile.lastName}`,
          department: candidate.visit.studentProfile.courseDept || 'N/A',
          yearLevel: normalizeYearLevel(candidate.visit.studentProfile.yearLevel),
          logType: 'consultation' as const,
          loggedAtIso: candidate.visit.createdAt || candidate.visit.visitDate || new Date().toISOString(),
          dateIso: candidate.visit.visitDate || candidate.visit.createdAt || new Date().toISOString(),
          visitTime: candidate.visit.visitTime,
          actorName: candidate.actorName,
          actorRole: candidate.actorRole,
          consultation: candidate.visit,
          parsedConsultation: candidate.parsed,
        }));

      const visitLogs: UnifiedLogItem[] = [...pairedDoctorLogs, ...remainingVisitLogs];

      const physicalLogs: UnifiedLogItem[] = (physicalResponse.data || [])
        .filter((exam) => !(exam.studentNumber || '').toUpperCase().startsWith('EMP'))
        .map((exam) => ({
          id: `physical-${exam.id}`,
          studentNumber: exam.studentNumber,
          studentName: exam.studentName,
          department: exam.courseDept || 'N/A',
          yearLevel: normalizeYearLevel(exam.yearLevel),
          logType: 'physical_exam' as const,
          loggedAtIso: exam.createdAt || exam.examDate,
          dateIso: exam.examDate,
          actorName: exam.examinedBy?.trim() || 'Clinic Staff',
          actorRole: 'Nurse',
          physicalExam: exam,
        }));

      const otherLogs: UnifiedLogItem[] = (otherResponse.data || []).map((row) => ({
        id: `other-${row.id}`,
        studentNumber: row.targetId || 'N/A',
        studentName: row.actionLabel || formatActionLabel(row.action),
        department: 'N/A',
        yearLevel: 'N/A',
        logType: 'other_operation' as const,
        loggedAtIso: row.timestamp,
        dateIso: row.timestamp,
        actorName: row.actorName?.trim() || 'Clinic Staff',
        actorRole: formatRole(row.actorRole),
        operationLabel: row.actionLabel || formatActionLabel(row.action),
        action: row.action,
        targetId: row.targetId || undefined,
        metadata: row.metadata,
      }));

      const merged = [...visitLogs, ...physicalLogs, ...otherLogs].sort(
        (a, b) => +new Date(b.loggedAtIso || 0) - +new Date(a.loggedAtIso || 0),
      );

      setLogs(merged);
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message);
      } else {
        toast.error('Failed to load logs.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLogs();
  }, []);

  useEffect(() => {
    function handleWindowFocus() { void loadLogs(); }
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') void loadLogs();
    }

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') void loadLogs();
    }, 10000);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, []);

  const departmentOptions = Array.from(new Set(logs.map((item) => item.department).filter(Boolean))).sort();
  const yearLevelOptions = Array.from(new Set(logs.map((item) => item.yearLevel).filter(Boolean))).sort();

  const filteredLogs = logs.filter((item) => {
    const q = searchStudent.toLowerCase().trim();
    const matchesQuery = !q || item.studentName.toLowerCase().includes(q) || item.studentNumber.toLowerCase().includes(q);
    const matchesType = filterType === 'all' || item.logType === filterType;
    const matchesDate = !filterDate || toDateKey(item.loggedAtIso) === filterDate;
    const matchesDepartment = filterDepartment === 'all' || item.department === filterDepartment;
    const matchesYearLevel = filterYearLevel === 'all' || item.yearLevel === filterYearLevel;
    return matchesQuery && matchesType && matchesDate && matchesDepartment && matchesYearLevel;
  });

  const filterKey = `${searchStudent}|${filterDate}|${filterDepartment}|${filterYearLevel}|${filterType}`;
  if (prevFilterKeyRef.current !== filterKey) {
    prevFilterKeyRef.current = filterKey;
    setPage(1);
  }

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE));
  const selectedOtherDetails = selectedLog?.logType === 'other_operation'
    ? buildOtherOperationDetails(selectedLog)
    : null;
  const pagedLogs = useMemo(
    () => filteredLogs.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredLogs, page],
  );

  const pagedGrouped = pagedLogs.reduce(
    (acc, item) => {
      const date = formatDate(item.loggedAtIso);
      if (!acc[date]) acc[date] = [];
      acc[date].push(item);
      return acc;
    },
    {} as Record<string, UnifiedLogItem[]>,
  );

  const pagedDates = Object.keys(pagedGrouped).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  function handleOpenCertModal(log: UnifiedLogItem) {
    const diagnosisFindings = log.logType === 'consultation'
      ? [log.parsedConsultation?.chiefComplaint, log.parsedConsultation?.diagnosis]
          .filter((v) => v && v !== 'N/A')
          .join('\n')
      : log.physicalExam
        ? `BP: ${log.physicalExam.bp || 'N/A'}, BMI: ${log.physicalExam.bmi || 'N/A'}`
        : '';
    setCertModal({
      open: true,
      log,
      loading: false,
      diagnosisFindings,
      recommendationsRemarks: '',
      dateIssued: (log.dateIso || new Date().toISOString()).split('T')[0],
    });
  }

  async function handleSubmitCert(e: React.FormEvent) {
    e.preventDefault();
    if (!certModal.log) return;
    if (!certModal.diagnosisFindings.trim()) {
      toast.error('Diagnosis / Findings are required.');
      return;
    }
    setCertModal((m) => ({ ...m, loading: true }));
    try {
      const token = getToken();
      await api.post('/certificates', {
        studentIdentifier: certModal.log.studentNumber,
        certificateType: certModal.log.logType === 'consultation' ? 'CONSULTATION' : 'PHYSICAL_EXAM',
        diagnosisFindings: certModal.diagnosisFindings.trim(),
        recommendationsRemarks: certModal.recommendationsRemarks.trim(),
        dateIssued: certModal.dateIssued,
      }, token!);
      toast.success('Certificate issued successfully.');
      setCertModal((m) => ({ ...m, open: false }));
    } catch (err) {
      const msg = err instanceof ApiError ? err.message : 'Failed to issue certificate.';
      toast.error(msg);
    } finally {
      setCertModal((m) => ({ ...m, loading: false }));
    }
  }

  return (
    <>
      <div className="p-4 sm:p-6 space-y-5">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => { void loadLogs(); }}
            className="text-xs font-semibold text-teal-700 hover:text-teal-800"
          >
            Refresh Logs
          </button>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-4 border-b border-gray-100">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:max-w-sm">
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search student..."
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                />
              </div>

              <input
                type="date"
                value={filterDate}
                onChange={(event) => setFilterDate(event.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                aria-label="Filter by date"
              />

              <select
                value={filterDepartment}
                onChange={(event) => setFilterDepartment(event.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                aria-label="Filter by department"
              >
                <option value="all">All Departments</option>
                {departmentOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>

              <select
                value={filterYearLevel}
                onChange={(event) => setFilterYearLevel(event.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                aria-label="Filter by year level"
              >
                <option value="all">All Year Levels</option>
                {yearLevelOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>

              <select
                value={filterType}
                onChange={(event) => setFilterType(event.target.value as 'all' | LogKind)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                aria-label="Filter by log type"
              >
                <option value="all">All Types</option>
                <option value="consultation">Consultation</option>
                <option value="physical_exam">Physical Exam</option>
                <option value="other_operation">Others</option>
              </select>

              <button
                type="button"
                onClick={() => setQrModalOpen(true)}
                className="text-xs font-semibold border border-teal-200 text-teal-700 hover:bg-teal-50 px-3 py-2 rounded-lg transition-colors"
              >
                Use QR
              </button>
            </div>
          </div>

          {loading ? (
            <div className="px-4 py-12 text-center text-gray-400">Loading logs...</div>
          ) : pagedDates.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-gray-500 text-sm">No logs found.</p>
            </div>
          ) : (
            <div className="space-y-8 p-6">
              {pagedDates.map((date) => (
                <div key={date}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-gradient-to-r from-teal-400 to-transparent" />
                    <p className="text-xs font-bold text-teal-600 uppercase tracking-wider whitespace-nowrap">{date}</p>
                    <div className="flex-1 h-px bg-gradient-to-l from-teal-400 to-transparent" />
                  </div>

                  <div className="space-y-3">
                    {pagedGrouped[date].map((item) => {
                      let typeStyle = {
                        border: 'border-slate-200 bg-slate-50/20 hover:border-slate-300 hover:bg-slate-50/50',
                        badge: 'bg-slate-100 text-slate-700 border border-slate-200',
                        label: 'Operation'
                      };

                      if (item.logType === 'consultation') {
                        typeStyle = {
                          border: 'border-blue-100 bg-blue-50/20 hover:border-blue-300 hover:bg-blue-50/50',
                          badge: 'bg-blue-100 text-blue-700 border border-blue-200',
                          label: 'Consultation'
                        };
                      } else if (
                        item.logType === 'physical_exam' || 
                        (item.logType === 'other_operation' && 
                          (item.action?.toLowerCase().includes('exam') || 
                           item.operationLabel?.toLowerCase().includes('physical')))
                      ) {
                        typeStyle = {
                          border: 'border-emerald-100 bg-emerald-50/20 hover:border-emerald-300 hover:bg-emerald-50/50',
                          badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
                          label: 'Physical Therapy'
                        };
                      } else if (
                        item.logType === 'other_operation' && 
                        (item.action?.toLowerCase().includes('dispens') || 
                         item.operationLabel?.toLowerCase().includes('dispens'))
                      ) {
                        typeStyle = {
                          border: 'border-orange-100 bg-orange-50/20 hover:border-orange-300 hover:bg-orange-50/50',
                          badge: 'bg-orange-100 text-orange-700 border border-orange-200',
                          label: 'Dispensing'
                        };
                      }

                      return (
                        <div
                          key={item.id}
                          onClick={() => setSelectedLog(item)}
                          className={`p-3 rounded-xl border ${typeStyle.border} cursor-pointer transition-all shadow-[var(--shadow-sm)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4`}
                        >
                          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2 sm:gap-3 flex-1 min-w-0">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${typeStyle.badge}`}>
                              {typeStyle.label}
                            </span>
                            
                            {item.logType !== 'other_operation' && (
                              <span className="text-xs font-semibold text-[hsl(var(--primary))] font-mono shrink-0">
                                {item.studentNumber}
                              </span>
                            )}
                            
                            <span className="font-semibold text-gray-900 text-sm truncate max-w-[200px]">
                              {item.logType === 'other_operation' ? item.operationLabel || 'Other Operation' : item.studentName}
                            </span>
                            
                            <span className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                              <span className="hidden sm:inline">| </span>By: <span className="font-medium text-[hsl(var(--foreground))]">{item.actorName}</span> <span className="hidden sm:inline">({item.actorRole})</span>
                            </span>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 w-full sm:w-auto">
                            <span className="text-xs text-[hsl(var(--muted))] font-medium">{formatTime(item.visitTime)}</span>
                            {item.logType !== 'other_operation' && (
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); handleOpenCertModal(item); }}
                                className="text-[10px] font-bold border border-[hsl(var(--primary-soft))] hover:border-[hsl(var(--primary))] bg-white text-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-soft))] px-2.5 py-1 rounded-[var(--radius-md)] transition-colors"
                              >
                                Give Cert.
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && filteredLogs.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-50 flex items-center justify-between gap-4">
              <span className="text-[11px] text-gray-400">
                Showing {pagedLogs.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredLogs.length)} of {filteredLogs.length} logs
              </span>
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:border-teal-300 hover:text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Prev
                  </button>
                  <span className="text-[11px] text-gray-400">Page {page} / {totalPages}</span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-2.5 py-1 text-xs rounded-lg border border-gray-200 text-gray-500 hover:border-teal-300 hover:text-teal-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {selectedLog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-gray-100 bg-white shadow-xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-100 bg-teal-50 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-900">Log Details</p>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600 text-lg"
                aria-label="Close details"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {selectedLog.logType !== 'other_operation' ? (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Student</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{selectedLog.studentName}</p>
                  <p className="text-xs text-teal-600 font-medium">{selectedLog.studentNumber}</p>
                </div>
              ) : (
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Operation</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{selectedOtherDetails?.title || 'Other Operation'}</p>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase">Performed By</p>
                <p className="text-sm text-gray-900 font-medium mt-1">{selectedLog.actorName}</p>
                <p className="text-xs text-gray-500 mt-0.5">Role: {selectedLog.actorRole}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedLog.logType !== 'other_operation' && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Log Type</p>
                    <p className="text-sm text-gray-900 font-medium mt-1">
                      {selectedLog.logType === 'consultation'
                        ? 'Consultation'
                        : selectedLog.logType === 'physical_exam'
                          ? 'Physical Exam'
                          : 'Other Operation'}
                    </p>
                  </div>
                )}
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Date</p>
                  <p className="text-sm text-gray-900 font-medium mt-1">{formatDate(selectedLog.dateIso)}</p>
                </div>
              </div>

              {selectedLog.logType !== 'other_operation' && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Visit Date & Time</p>
                  <p className="text-sm text-gray-900 font-medium mt-1">
                    {formatDate(selectedLog.dateIso)}
                    {selectedLog.visitTime && ` at ${formatTime12Hour(selectedLog.visitTime)}`}
                  </p>
                </div>
              )}

              {selectedLog.logType === 'other_operation' && selectedOtherDetails && (
                <div className="bg-gray-50 rounded-lg p-3 space-y-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Changed Data</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500 uppercase">Changed Item</p>
                      <p className="text-sm text-gray-900 mt-1">{selectedOtherDetails.changedItem}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500 uppercase">Change Type</p>
                      <p className="text-sm text-gray-900 mt-1">{selectedOtherDetails.changeType}</p>
                    </div>
                  </div>
                  {(selectedOtherDetails.previousValue !== 'N/A' || selectedOtherDetails.newValue !== 'N/A') && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <p className="text-[11px] font-semibold text-gray-500 uppercase">Previous Value</p>
                        <p className="text-sm text-gray-900 mt-1">{selectedOtherDetails.previousValue}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-gray-500 uppercase">New Value</p>
                        <p className="text-sm text-gray-900 mt-1">{selectedOtherDetails.newValue}</p>
                      </div>
                    </div>
                  )}
                  {selectedOtherDetails.appointmentInfo && (
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500 uppercase">Appointment</p>
                      <p className="text-sm text-gray-900 mt-1">{selectedOtherDetails.appointmentInfo}</p>
                    </div>
                  )}
                  {selectedOtherDetails.recordReference && (
                    <div>
                      <p className="text-[11px] font-semibold text-gray-500 uppercase">Record Reference</p>
                      <p className="text-sm text-gray-900 mt-1 break-all">{selectedOtherDetails.recordReference}</p>
                    </div>
                  )}
                </div>
              )}

              {selectedLog.logType === 'consultation' && selectedLog.consultation && (
                <>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Concern Tag</p>
                    <p className="text-sm text-gray-900 font-medium mt-1">
                      {displayOrFallback(getConcernTag(selectedLog), 'General consultation')}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Chief Complaint</p>
                    <p className="text-sm text-gray-700 mt-1">
                      {displayOrFallback(getChiefComplaint(selectedLog), 'No complaint details recorded.')}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Diagnosis</p>
                      <p className="text-sm text-gray-700 mt-1">{displayOrFallback(getDiagnosis(selectedLog))}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Treatment</p>
                      <p className="text-sm text-gray-700 mt-1">{displayOrFallback(getTreatment(selectedLog), 'No treatment details recorded.')}</p>
                    </div>
                  </div>

                  {displayOrFallback(getConsultationNotes(selectedLog), '') && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase">Notes</p>
                      <p className="text-sm text-gray-700 mt-1">{displayOrFallback(getConsultationNotes(selectedLog))}</p>
                    </div>
                  )}

                  {(selectedLog.consultation.dispensedMedicines?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">Medicines Dispensed</p>
                      <div className="mt-2 space-y-1">
                        {selectedLog.consultation.dispensedMedicines?.map((med, idx) => (
                          <div key={idx} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1.5 rounded-lg font-medium">
                            {med.inventory.itemName} × {med.quantity}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {selectedLog.logType === 'physical_exam' && selectedLog.physicalExam && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase">BP</p>
                    <p className="text-sm text-gray-900 font-medium mt-1">{selectedLog.physicalExam.bp || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase">BMI</p>
                    <p className="text-sm text-gray-900 font-medium mt-1">{selectedLog.physicalExam.bmi || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase">Examined By</p>
                    <p className="text-sm text-gray-900 font-medium mt-1">{selectedLog.physicalExam.examinedBy || 'N/A'}</p>
                  </div>
                </div>
              )}

              {hasMeaningfulVitals(getVitalsForLog(selectedLog)) && (
                <VitalSignsPanel vitals={getVitalsForLog(selectedLog)} />
              )}

              {selectedLog.logType !== 'other_operation' && (
                <Link
                  href={`/dashboard/staff/students/${encodeURIComponent(selectedLog.studentNumber)}?returnTo=${encodeURIComponent(pathname || '/dashboard/staff/logs')}`}
                  className="block w-full text-center px-3 py-2.5 mt-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors"
                >
                  View Full Record
                </Link>
              )}
            </div>
          </div>
        </div>
      )}

      {certModal.open && certModal.log && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={() => setCertModal((m) => ({ ...m, open: false }))}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-base font-bold text-gray-900">Issue Medical Certificate</h2>
              <button
                type="button"
                onClick={() => setCertModal((m) => ({ ...m, open: false }))}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg text-lg"
              >✕</button>
            </div>
            <form onSubmit={handleSubmitCert} className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-500 font-semibold uppercase mb-1">Student</p>
                <p className="text-sm font-bold text-gray-900">{certModal.log.studentName}</p>
                <p className="text-xs text-teal-600 font-medium">{certModal.log.studentNumber}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 font-semibold uppercase mb-1.5">Certificate Type</p>
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                  certModal.log.logType === 'consultation' ? 'bg-teal-100 text-teal-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {certModal.log.logType === 'consultation' ? 'Consultation' : 'Physical Examination'}
                </span>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  {certModal.log.logType === 'consultation' ? 'Diagnosis / Clinical Findings' : 'Physical Examination Findings'}
                </label>
                <textarea
                  rows={4}
                  value={certModal.diagnosisFindings}
                  onChange={(e) => setCertModal((m) => ({ ...m, diagnosisFindings: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none resize-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Recommendations / Remarks</label>
                <textarea
                  rows={3}
                  value={certModal.recommendationsRemarks}
                  onChange={(e) => setCertModal((m) => ({ ...m, recommendationsRemarks: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none resize-none"
                  placeholder="Optional recommendations or restrictions..."
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Date Issued</label>
                <input
                  type="date"
                  value={certModal.dateIssued}
                  onChange={(e) => setCertModal((m) => ({ ...m, dateIssued: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none"
                  required
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setCertModal((m) => ({ ...m, open: false }))}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >Cancel</button>
                <button
                  type="submit"
                  disabled={certModal.loading}
                  className="flex-1 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
                >
                  {certModal.loading ? 'Issuing...' : 'Issue Certificate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <UseQrLookupModal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        onResolved={(student: QrResolvedStudent) => {
          setSearchStudent(student.studentNumber);
        }}
        onNotFound={() => {
          toast.error('Student not found. Please try another QR.');
        }}
      />
    </>
  );
}
