'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { normalizeComplaintDisplay } from '@/lib/complaint';
import UseQrLookupModal, { type QrResolvedStudent } from '@/components/scanner/UseQrLookupModal';

type LogKind = 'consultation' | 'physical_exam';

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
  consultation?: VisitRecord;
  physicalExam?: PhysicalExamRow;
  parsedConsultation?: ParsedConsultationData;
}

function normalizeYearLevel(value?: string) {
  if (!value) return 'N/A';
  switch (value) {
    case 'YR_1':
      return 'Yr. 1';
    case 'YR_2':
      return 'Yr. 2';
    case 'YR_3':
      return 'Yr. 3';
    case 'YR_4':
      return 'Yr. 4';
    default:
      return value;
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

interface ParsedConsultationData {
  concernTag: string;
  chiefComplaint: string;
  diagnosis: string;
  treatmentProvided: string;
  bp: string;
  temperature: string;
  notes: string;
}

interface VitalSnapshot {
  bp?: string;
  temperature?: string;
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
      vitals?: {
        bp?: string;
        temperature?: string;
      };
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

function hasDentalKeyword(value?: string) {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return (
    normalized.includes('dental')
    || normalized.includes('tooth')
    || normalized.includes('teeth')
    || normalized.includes('oral')
    || normalized.includes('gum')
    || normalized.includes('gingiv')
  );
}

function isDentalConsultation(visit: VisitRecord, parsed: ParsedConsultationData) {
  return [
    visit.concernTag,
    visit.chiefComplaintEnc,
    parsed.concernTag,
    parsed.chiefComplaint,
    parsed.diagnosis,
    parsed.treatmentProvided,
    parsed.notes,
  ].some((value) => hasDentalKeyword(value));
}

function VitalSignsPanel({ vitals }: { vitals: VitalSnapshot }) {
  const hasVitals = Boolean((vitals.bp && vitals.bp !== 'N/A') || (vitals.temperature && vitals.temperature !== 'N/A'));

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

function getVitalsForLog(log: UnifiedLogItem): VitalSnapshot {
  if (log.logType === 'physical_exam' && log.physicalExam) {
    return {
      bp: log.physicalExam.bp || 'N/A',
      temperature: 'N/A',
    };
  }

  if (log.logType === 'consultation') {
    return {
      bp: log.parsedConsultation?.bp || 'N/A',
      temperature: log.parsedConsultation?.temperature || 'N/A',
    };
  }

  return {
    bp: 'N/A',
    temperature: 'N/A',
  };
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

export default function DoctorRecordsPage() {
  const pathname = usePathname();
  const isDentalLogs = pathname?.startsWith('/dashboard/dental/') ?? false;
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [logs, setLogs] = useState<UnifiedLogItem[]>([]);
  const [selectedLog, setSelectedLog] = useState<UnifiedLogItem | null>(null);
  const [searchStudent, setSearchStudent] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterYearLevel, setFilterYearLevel] = useState('all');
  const [filterType, setFilterType] = useState<'all' | LogKind>('all');

  async function loadLogs() {
    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      setLoading(false);
      return;
    }

    try {
      setError('');
      const ts = Date.now();
      const [visitsResult, physicalResult] = await Promise.allSettled([
        api.get<VisitsResponse>(`/clinic/visits?limit=500&_ts=${ts}`, token),
        api.get<PhysicalExamResponse>(`/physical-exams?limit=500&_ts=${ts}`, token),
      ]);

      if (visitsResult.status !== 'fulfilled') {
        const reason = visitsResult.reason;
        if (reason instanceof ApiError) {
          throw reason;
        }
        throw new Error('Failed to load consultation logs.');
      }

      const visitsResponse = visitsResult.value;
      const physicalResponse = physicalResult.status === 'fulfilled'
        ? physicalResult.value
        : { success: false, data: [] as PhysicalExamRow[] };

      const visitLogs: UnifiedLogItem[] = (visitsResponse.data || [])
        .filter((visit) => !(visit.studentProfile.studentNumber || '').toUpperCase().startsWith('EMP'))
        .map((visit) => {
          const parsed = parseConsultationData(visit.chiefComplaintEnc);
          return {
            id: `consult-${visit.id}`,
            studentNumber: visit.studentProfile.studentNumber,
            studentName: `${visit.studentProfile.firstName} ${visit.studentProfile.lastName}`,
            department: visit.studentProfile.courseDept || 'N/A',
            yearLevel: normalizeYearLevel(visit.studentProfile.yearLevel),
            logType: 'consultation' as const,
            loggedAtIso: visit.createdAt || visit.visitDate || new Date().toISOString(),
            dateIso: visit.visitDate || visit.createdAt || new Date().toISOString(),
            visitTime: visit.visitTime,
            consultation: visit,
            parsedConsultation: parsed,
          };
        })
        .filter((item) => {
          const isDental = isDentalConsultation(item.consultation as VisitRecord, item.parsedConsultation as ParsedConsultationData);
          return isDentalLogs ? isDental : !isDental;
        });

      const physicalLogs: UnifiedLogItem[] = isDentalLogs ? [] : (physicalResponse.data || [])
        .filter((exam) => !(exam.studentNumber || '').toUpperCase().startsWith('EMP'))
        .map((exam) => ({
          id: `physical-${exam.id}`,
          studentNumber: exam.studentNumber,
          studentName: exam.studentName,
          department: exam.courseDept || 'N/A',
          yearLevel: normalizeYearLevel(exam.yearLevel),
          logType: 'physical_exam',
          loggedAtIso: exam.createdAt || exam.examDate,
          dateIso: exam.examDate,
          physicalExam: exam,
        }));

      const merged = [...visitLogs, ...physicalLogs].sort(
        (a, b) => +new Date(b.loggedAtIso || 0) - +new Date(a.loggedAtIso || 0)
      );

      setLogs(merged);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load logs.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadLogs();
  }, []);

  useEffect(() => {
    function handleWindowFocus() {
      void loadLogs();
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') {
        void loadLogs();
      }
    }

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void loadLogs();
      }
    }, 10000);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.clearInterval(intervalId);
    };
  }, []);

  const departmentOptions = Array.from(new Set(logs.map((item) => item.department).filter(Boolean))).sort();
  const yearLevelOptions = Array.from(new Set(logs.map((item) => item.yearLevel).filter(Boolean))).sort();
  const effectiveFilterType = isDentalLogs ? 'consultation' : filterType;

  const filteredLogs = logs.filter((item) => {
    const q = searchStudent.toLowerCase().trim();
    const matchesQuery = !q || item.studentName.toLowerCase().includes(q) || item.studentNumber.toLowerCase().includes(q);
    const matchesType = effectiveFilterType === 'all' || item.logType === effectiveFilterType;
    const matchesDate = !filterDate || toDateKey(item.loggedAtIso) === filterDate;
    const matchesDepartment = filterDepartment === 'all' || item.department === filterDepartment;
    const matchesYearLevel = filterYearLevel === 'all' || item.yearLevel === filterYearLevel;
    return matchesQuery && matchesType && matchesDate && matchesDepartment && matchesYearLevel;
  });

  const timelineGrouped = filteredLogs.reduce(
    (acc, item) => {
      const date = formatDate(item.loggedAtIso);
      if (!acc[date]) acc[date] = [];
      acc[date].push(item);
      return acc;
    },
    {} as Record<string, UnifiedLogItem[]>,
  );

  const sortedDates = Object.keys(timelineGrouped).sort((a, b) => {
    const aDate = new Date(a).getTime();
    const bDate = new Date(b).getTime();
    return bDate - aDate;
  });

  return (
    <>
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logs</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isDentalLogs ? 'Dental consultation logs.' : 'Consultation and physical examination logs.'}
          </p>
          <button
            type="button"
            onClick={() => { void loadLogs(); }}
            className="mt-2 text-xs font-semibold text-teal-700 hover:text-teal-800"
          >
            Refresh Logs
          </button>
        </div>

        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

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

              {!isDentalLogs && (
                <select
                  value={filterType}
                  onChange={(event) => setFilterType(event.target.value as 'all' | LogKind)}
                  className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                  aria-label="Filter by log type"
                >
                  <option value="all">Consultation + Physical Exam</option>
                  <option value="consultation">Consultation</option>
                  <option value="physical_exam">Physical Exam</option>
                </select>
              )}

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
          ) : sortedDates.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <p className="text-gray-500 text-sm">No logs found.</p>
            </div>
          ) : (
            <div className="space-y-8 p-6">
              {sortedDates.map((date) => (
                <div key={date}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-1 h-px bg-gradient-to-r from-teal-400 to-transparent"></div>
                    <p className="text-xs font-bold text-teal-600 uppercase tracking-wider whitespace-nowrap">{date}</p>
                    <div className="flex-1 h-px bg-gradient-to-l from-teal-400 to-transparent"></div>
                  </div>

                  <div className="space-y-3">
                    {timelineGrouped[date].map((item) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedLog(item)}
                        className="p-3 rounded-lg border border-gray-200 hover:border-teal-400 hover:bg-teal-50 cursor-pointer transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900">{item.studentName}</p>
                            <p className="text-xs text-teal-600 font-medium">{item.studentNumber}</p>
                            <p className="text-sm text-gray-700 mt-1.5">
                              {isDentalLogs ? 'Dental Consultation' : item.logType === 'consultation' ? 'Consultation' : 'Physical Exam'}
                            </p>
                            {isDentalLogs && item.logType === 'consultation' && (
                              <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                {displayOrFallback(getChiefComplaint(item), displayOrFallback(getConcernTag(item)))}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-xs text-gray-500">{formatTime(item.visitTime)}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setSelectedLog(null)}>
          <div
            className="w-full max-w-2xl rounded-2xl border border-gray-100 bg-white shadow-xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-100 bg-teal-50 flex items-center justify-between">
              <p className="text-sm font-bold text-gray-900">Visit Details & Vitals</p>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-gray-400 hover:text-gray-600 text-lg"
                aria-label="Close details"
              >
                ✕
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase">Student</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">{selectedLog.studentName}</p>
                <p className="text-xs text-teal-600 font-medium">{selectedLog.studentNumber}</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Log Type</p>
                  <p className="text-sm text-gray-900 font-medium mt-1">
                    {isDentalLogs ? 'Dental Consultation' : selectedLog.logType === 'consultation' ? 'Consultation' : 'Physical Exam'}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Date</p>
                  <p className="text-sm text-gray-900 font-medium mt-1">{formatDate(selectedLog.dateIso)}</p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs font-semibold text-gray-500 uppercase">Visit Date & Time</p>
                <p className="text-sm text-gray-900 font-medium mt-1">
                  {formatDate(selectedLog.dateIso)}
                  {selectedLog.visitTime && ` at ${selectedLog.visitTime}`}
                </p>
              </div>

              {selectedLog.logType === 'consultation' && selectedLog.consultation && (
                <>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">
                      {isDentalLogs ? 'Consultation Category' : 'Concern Tag'}
                    </p>
                    <p className="text-sm text-gray-900 font-medium mt-1">
                      {displayOrFallback(getConcernTag(selectedLog), 'General consultation')}
                    </p>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase">
                      {isDentalLogs ? 'Dental Findings / Concern' : 'Chief Complaint'}
                    </p>
                    <p className="text-sm text-gray-700 mt-1">
                      {displayOrFallback(getChiefComplaint(selectedLog), 'No complaint details recorded.')}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase">
                        {isDentalLogs ? 'Assessment / Diagnosis' : 'Diagnosis'}
                      </p>
                      <p className="text-sm text-gray-700 mt-1">{displayOrFallback(getDiagnosis(selectedLog))}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase">
                        {isDentalLogs ? 'Procedure / Treatment' : 'Treatment'}
                      </p>
                      <p className="text-sm text-gray-700 mt-1">{displayOrFallback(getTreatment(selectedLog), 'No treatment details recorded.')}</p>
                    </div>
                  </div>

                  {displayOrFallback(getConsultationNotes(selectedLog), '') && (
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs font-semibold text-gray-500 uppercase">
                        {isDentalLogs ? 'Clinical Notes' : 'Notes'}
                      </p>
                      <p className="text-sm text-gray-700 mt-1">{displayOrFallback(getConsultationNotes(selectedLog))}</p>
                    </div>
                  )}

                  {(selectedLog.consultation.dispensedMedicines?.length ?? 0) > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase">
                        {isDentalLogs ? 'Medicines / Supplies Dispensed' : 'Medicines Dispensed'}
                      </p>
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

              {(!isDentalLogs || hasMeaningfulVitals(getVitalsForLog(selectedLog))) && (
                <VitalSignsPanel vitals={getVitalsForLog(selectedLog)} />
              )}

              <Link
                href={isDentalLogs
                  ? `/dashboard/dental/records/${encodeURIComponent(selectedLog.studentNumber)}`
                  : `/dashboard/doctor/students/${encodeURIComponent(selectedLog.studentNumber)}?returnTo=${encodeURIComponent(pathname || '/dashboard/doctor/records')}`
                }
                className="block w-full text-center px-3 py-2.5 mt-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors"
              >
                View Full Record
              </Link>
            </div>
          </div>
        </div>
      )}

      <UseQrLookupModal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        onResolved={(student: QrResolvedStudent) => {
          setSearchStudent(student.studentNumber);
          setError('');
        }}
        onNotFound={() => {
          setError('Student not found. Please try another QR.');
        }}
      />
    </>
  );
}
