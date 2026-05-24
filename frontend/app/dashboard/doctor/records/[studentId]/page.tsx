'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, usePathname, useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { 
  User, Activity, FileText, Pill, Clock, 
  ChevronLeft, Printer, Save, Plus, ShieldAlert, Stethoscope, Heart, Smile
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { parseConsultationDisplay } from '@/lib/complaint';
import { formatDateTime12Hour, formatTime12Hour } from '@/lib/time';

// New Components
import PatientHeader from '@/components/doctor/PatientHeader';
import MedicalHistoryForm from '@/components/doctor/MedicalHistoryForm';
import DiagnosticsSection from '@/components/doctor/DiagnosticsSection';
import HistoryTable from '@/components/doctor/HistoryTable';
import PrescriptionPad from '@/components/doctor/PrescriptionPad';
import SaveConfirmationModal from '@/components/doctor/SaveConfirmationModal';
import RecordHistoryModal from '@/components/doctor/RecordHistoryModal';

interface ScanProfile {
  id: string;
  studentNumber: string;
  firstName: string;
  middleName?: string | null;
  middleInitial?: string | null;
  lastName: string;
  yearLevel?: string | null;
  courseDept: string;
  civilStatus: string | null;
  age: number | null;
  sex: string | null;
  birthday: string | null;
  presentAddress: string | null;
  telNumber: string | null;
  medicalHistory: any;
  physicalExaminations: any[];
  labResults: any[];
}

interface ClinicVisitHistoryItem {
  id: string;
  visitDate?: string | null;
  visitTime?: string | null;
  createdAt?: string;
  chiefComplaintEnc?: string | null;
  dispensedMedicines?: Array<{
    id: string;
    quantity: number;
    status?: string;
    inventory?: {
      itemName?: string;
      unit?: string | null;
    } | null;
  }>;
  handledBy?: {
    email?: string | null;
  } | null;
}

interface ClinicVisitsResponse {
  success: boolean;
  data: ClinicVisitHistoryItem[];
}

interface InventoryOption {
  id: string;
  itemName: string;
  currentStock: number;
  unit: string;
}

interface InventoryResponse {
  success: boolean;
  data: InventoryOption[];
}

interface QueueConsultationItem {
  id: string;
  preferredDate?: string;
  preferredTime?: string;
  serviceType?: string;
  symptoms?: string;
  status?: string;
  studentProfile?: {
    id?: string;
    studentNumber?: string;
  };
}

interface QueueConsultationResponse {
  success: boolean;
  data: QueueConsultationItem[];
}

interface CertificateHistoryItem {
  id: string;
  studentProfileId: string;
  certificateType: string;
  diagnosisFindings?: string;
  recommendationsRemarks?: string;
  issuedAt: string;
  issuedBy?: string;
}

interface CertificatesResponse {
  success: boolean;
  data: CertificateHistoryItem[];
}

type ClinicalEventType = 'consultation' | 'physical_exam' | 'certificate';

interface ClinicalHistoryEvent {
  id: string;
  type: ClinicalEventType;
  typeLabel: string;
  when: string;
  timestamp: number;
  summary: string;
  details: string[];
}

type YearKey = 'YR_1' | 'YR_2' | 'YR_3' | 'YR_4';

interface ConsultMedicineRow {
  id: number;
  inventoryId: string;
  medicine: string;
  qty: string;
}

function displayValue(value: unknown) {
  const normalized = typeof value === 'string' ? value.trim() : value;
  if (normalized === null || normalized === undefined || normalized === '') return '';
  return String(normalized);
}

function displayFormValue(value: unknown) {
  const normalized = typeof value === 'string' ? value.trim() : value;
  if (normalized === null || normalized === undefined || normalized === '') return '';
  return String(normalized);
}

function displayYesNo(value: unknown) {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return 'No';
  if (['yes', 'true', '1'].includes(normalized)) return 'Yes';
  if (['no', 'false', '0', 'none', 'n/a', 'na'].includes(normalized)) return 'No';
  return 'No';
}

function isChecked(value: unknown) {
  return displayYesNo(value) === 'Yes';
}

function displayDateOnly(value?: string | null) {
  if (!value) return 'N/A';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'N/A';
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function displayFormDateOnly(value?: string | null) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function stripBloodTypeFromOperationNotes(value: unknown) {
  const text = displayFormValue(value);
  if (!text) return '';
  return text
    .replace(/\|?\s*blood\s*type\s*:\s*[^|]+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function normalizeTimeForInput(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return '';

  const twentyFourHour = text.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourHour) {
    const hour = Number.parseInt(twentyFourHour[1], 10);
    const minute = Number.parseInt(twentyFourHour[2], 10);
    if (hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    }
  }

  const twelveHour = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelveHour) {
    let hour = Number.parseInt(twelveHour[1], 10);
    const minute = Number.parseInt(twelveHour[2], 10);
    const meridiem = twelveHour[3].toUpperCase();
    if (meridiem === 'PM' && hour < 12) hour += 12;
    if (meridiem === 'AM' && hour === 12) hour = 0;
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }

  return '';
}

function emptyConsultForm() {
  return {
    visitDate: '',
    visitTime: '',
    age: '',
    sex: '',
    chiefComplaint: '',
    bp: '',
    temperature: '',
    diagnosis: '',
    treatmentProvided: '',
    addFollowUp: false,
    followUpDate: '',
    followUpTime: '',
  };
}

function sanitizeFilePart(value: unknown, fallback: string) {
  const text = String(value || '')
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '')
    .trim();

  return text || fallback;
}

function normalizeYearLevelForFileName(value: unknown) {
  const text = String(value || '').trim();
  if (!text) return '';

  const match = text.match(/^YR[_\s-]?(\d)$/i);
  if (match) return `Year${match[1]}`;

  return text.replace(/\s+/g, '');
}

export default function DoctorRecordPage() {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isNurseSideRecord = pathname?.startsWith('/dashboard/staff/') ?? false;
  const isDoctorSideRecord = pathname?.startsWith('/dashboard/doctor/') ?? false;
  const shouldShowDentalRecordsTab = !isNurseSideRecord && !isDoctorSideRecord;
  const useNurseStyleMedicalRecord = isNurseSideRecord || isDoctorSideRecord;
  const studentNumberParam = typeof params.studentId === 'string' ? decodeURIComponent(params.studentId) : '';
  const backRoute = pathname?.startsWith('/dashboard/staff/students/')
    ? '/dashboard/staff/students'
    : pathname?.startsWith('/dashboard/staff/record/')
      ? '/dashboard/staff/record'
      : pathname?.startsWith('/dashboard/doctor/students/')
    ? '/dashboard/doctor/students'
    : pathname?.startsWith('/dashboard/doctor/')
      ? '/dashboard/doctor/records'
      : '/dashboard/doctor/records';
  const returnTo = searchParams.get('returnTo') || '';
  const resolvedBackRoute = returnTo.startsWith('/dashboard/') ? returnTo : backRoute;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [record, setRecord] = useState<ScanProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'medical-record' | 'clinical-history' | 'dental-records' | 'medical-consultation' | 'prescriptions'>('overview');
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [visitHistory, setVisitHistory] = useState<ClinicVisitHistoryItem[]>([]);
  const [certificateHistory, setCertificateHistory] = useState<CertificateHistoryItem[]>([]);
  const [editableMedicalHistory, setEditableMedicalHistory] = useState<any>({});
  const [editableExamsByYear, setEditableExamsByYear] = useState<Record<YearKey, any>>({
    YR_1: {},
    YR_2: {},
    YR_3: {},
    YR_4: {},
  });
  const [editableLabsByYear, setEditableLabsByYear] = useState<Record<YearKey, any>>({
    YR_1: {},
    YR_2: {},
    YR_3: {},
    YR_4: {},
  });

  // Form State
  const [medicalHistory, setMedicalHistory] = useState({
    pastMedicalHistory: '',
    reviewOfSystem: '',
    allergies: '',
    personalSocialHistory: '',
  });

  const [physicalExam, setPhysicalExam] = useState({
    bp: '', pr: '', rr: '', temperature: '',
    height: '', weight: '', bmi: '',
    visualAcuity: '', isNormal: true, abnormalFindings: '',
  });

  const [diagnostics, setDiagnostics] = useState({
    chestXray: '', laboratoryTest: '', others: '',
  });

  const [systemNotes, setSystemNotes] = useState({
    heent: '', chestLungs: '', abdomen: '', extremities: '', others: '',
  });

  const [medicines, setMedicines] = useState<any[]>([]);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [consultForm, setConsultForm] = useState(emptyConsultForm());
  const [isSavingConsult, setIsSavingConsult] = useState(false);
  const [consultError, setConsultError] = useState('');
  const [activeConsultationQueueItem, setActiveConsultationQueueItem] = useState<QueueConsultationItem | null>(null);
  const [consultMedicines, setConsultMedicines] = useState<ConsultMedicineRow[]>([]);
  const [consultNewMedicineId, setConsultNewMedicineId] = useState('');
  const [consultNewQty, setConsultNewQty] = useState('1');
  const [consultMedicineError, setConsultMedicineError] = useState('');
  const [inventoryOptions, setInventoryOptions] = useState<InventoryOption[]>([]);
  const [showAddMedicineModal, setShowAddMedicineModal] = useState(false);
  const [medicineDraft, setMedicineDraft] = useState({
    inventoryId: '',
    daysToTake: '7',
    timesPerDay: '3',
    intervalMode: 'after-meal' as 'after-meal' | 'hours',
    everyHours: '8',
  });
  const [medicineDraftError, setMedicineDraftError] = useState('');
  const [isPrintingPrescription, setIsPrintingPrescription] = useState(false);

  const handlePhysicalExamChange = useCallback((field: string, value: string | boolean) => {
    if (!isEditMode || activeTab !== 'overview') return;
    setPhysicalExam((prev) => ({ ...prev, [field]: value }));
  }, [isEditMode, activeTab]);

  const handleDiagnosticsChange = useCallback((field: string, value: string) => {
    if (!isEditMode || activeTab !== 'overview') return;
    setDiagnostics((prev) => ({ ...prev, [field]: value }));
  }, [isEditMode, activeTab]);

  useEffect(() => {
    async function loadRecord() {
      const token = getToken();

      if (!token) {
        setError('You are not logged in. Please sign in again.');
        setLoading(false);
        return;
      }

      try {
        const search = await api.get<any>(`/clinic/search?q=${encodeURIComponent(studentNumberParam)}`, token);
        const exact = (search.data || []).find((item: any) => item.studentNumber.toLowerCase() === studentNumberParam.toLowerCase());

        if (!exact) {
          setError(`No student record found for ${studentNumberParam}.`);
          setLoading(false);
          return;
        }

        const scan = await api.get<any>(`/clinic/scan/${exact.user.id}`, token);
        setRecord(scan.data);
        populateForm(scan.data);

        try {
          const [visitsResponse, certificatesResponse] = await Promise.all([
            api.get<ClinicVisitsResponse>(`/clinic/visits?studentProfileId=${encodeURIComponent(scan.data.id)}&limit=500`, token),
            api.get<CertificatesResponse>(`/certificates?q=${encodeURIComponent(scan.data.studentNumber)}&limit=300`, token),
          ]);

          setVisitHistory(visitsResponse.data || []);
          setCertificateHistory(
            (certificatesResponse.data || []).filter((certificate) => certificate.studentProfileId === scan.data.id)
          );
        } catch {
          setVisitHistory([]);
          setCertificateHistory([]);
        }
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load doctor record.');
        }
      } finally {
        setLoading(false);
      }
    }

    function populateForm(data: ScanProfile) {
      setMedicalHistory({
        pastMedicalHistory: data.medicalHistory?.pastOperationEnc || '',
        reviewOfSystem: 'General health is good.',
        allergies: data.medicalHistory?.allergyEnc || '',
        personalSocialHistory: 'Non-smoker, occasional alcohol.',
      });

      const latestExam = data.physicalExaminations?.[0];
      if (latestExam) {
        setPhysicalExam({
          bp: latestExam.bp || '', pr: latestExam.cr || '', rr: latestExam.rr || '',
          temperature: latestExam.temp || '', height: latestExam.height || '',
          weight: latestExam.weight || '', bmi: latestExam.bmi || '',
          visualAcuity: latestExam.visualAcuity || '',
          isNormal: !latestExam.others, abnormalFindings: latestExam.others || '',
        });
        setSystemNotes({
          heent: latestExam.heent || '', chestLungs: latestExam.chestLungs || '',
          abdomen: latestExam.abdomen || '', extremities: latestExam.extremities || '',
          others: latestExam.others || '',
        });
      }

      const latestLab = data.labResults?.[0];
      if (latestLab) {
        setDiagnostics({
          chestXray: latestLab.xrayFindingsEnc || '',
          laboratoryTest: latestLab.othersEnc || '',
          others: 'Blood Sugar: 95 mg/dL',
        });
      }

      setMedicines([]);
      setHistoryRecords([]);

      const exams = data.physicalExaminations || [];
      const mapExamByYear = (year: YearKey) => exams.find((exam) => (exam?.yearLevel || '').toUpperCase() === year) || {};
      const initialExamsByYear = {
        YR_1: mapExamByYear('YR_1'),
        YR_2: mapExamByYear('YR_2'),
        YR_3: mapExamByYear('YR_3'),
        YR_4: mapExamByYear('YR_4'),
      };

      const labs = data.labResults || [];
      const closestByExamDate = (examDate?: string | null) => {
        if (!examDate || labs.length === 0) return {};
        const examTimestamp = +new Date(examDate);
        if (Number.isNaN(examTimestamp)) return {};

        return [...labs]
          .sort((a, b) => {
            const aTimestamp = +new Date(a?.date || 0);
            const bTimestamp = +new Date(b?.date || 0);
            return Math.abs(aTimestamp - examTimestamp) - Math.abs(bTimestamp - examTimestamp);
          })[0] || {};
      };

      const initialLabsByYear = {
        YR_1: closestByExamDate(initialExamsByYear.YR_1?.examDate),
        YR_2: closestByExamDate(initialExamsByYear.YR_2?.examDate),
        YR_3: closestByExamDate(initialExamsByYear.YR_3?.examDate),
        YR_4: closestByExamDate(initialExamsByYear.YR_4?.examDate),
      };

      setEditableMedicalHistory(data.medicalHistory || {});
      setEditableExamsByYear(initialExamsByYear);
      setEditableLabsByYear(initialLabsByYear);
    }

    void loadRecord();
  }, [studentNumberParam]);

  useEffect(() => {
    async function loadInventoryLookup() {
      const token = getToken();
      if (!token) return;

      try {
        const response = await api.get<InventoryResponse>('/inventory', token);
        setInventoryOptions(response.data || []);
      } catch {
        setInventoryOptions([]);
      }
    }

    void loadInventoryLookup();
  }, []);

  const clinicalHistoryEvents = useMemo<ClinicalHistoryEvent[]>(() => {
    if (!record) return [];

    const consultationEvents = visitHistory.map((visit) => {
      const parsedConsultation = parseConsultationDisplay(visit.chiefComplaintEnc || '');
      const timestampSource = visit.createdAt || visit.visitDate || '';
      const timestamp = timestampSource ? +new Date(timestampSource) : 0;
      const dateLabel = timestampSource
        ? formatDateTime12Hour(timestampSource)
        : visit.visitDate
          ? new Date(visit.visitDate).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
          })
          : 'Date not recorded';
      const timeLabel = visit.visitTime ? formatTime12Hour(visit.visitTime) : '';
      const when = timeLabel && !visit.createdAt ? `${dateLabel} at ${timeLabel}` : dateLabel;

      return {
        id: `consult-${visit.id}`,
        type: 'consultation',
        typeLabel: 'Consultation',
        when,
        timestamp,
        summary: parsedConsultation.complaint || 'Consultation details not recorded.',
        details: [
          `Diagnosis: ${parsedConsultation.diagnosis || 'N/A'}`,
          `Treatment: ${parsedConsultation.treatment || 'N/A'}`,
          `Handled by: ${visit.handledBy?.email || 'Clinic Staff'}`,
        ],
      };
    });

    const physicalExamEvents = (record.physicalExaminations || []).map((exam) => {
      const timestamp = exam.examDate ? +new Date(exam.examDate) : 0;
      return {
        id: `pe-${exam.id || exam.examDate}`,
        type: 'physical_exam',
        typeLabel: 'Physical Examination',
        when: exam.examDate ? formatDateTime12Hour(exam.examDate) : 'Date not recorded',
        timestamp,
        summary: `Year Level: ${exam.yearLevel || 'N/A'}`,
        details: [
          `BP: ${exam.bp || 'N/A'}`,
          `BMI: ${exam.bmi || 'N/A'}`,
          `Examined by: ${exam.examinedBy || 'N/A'}`,
        ],
      };
    });

    const certificateEvents = certificateHistory.map((certificate) => {
      const timestamp = certificate.issuedAt ? +new Date(certificate.issuedAt) : 0;
      return {
        id: `cert-${certificate.id}`,
        type: 'certificate',
        typeLabel: 'Given Medical Certificate',
        when: certificate.issuedAt ? formatDateTime12Hour(certificate.issuedAt) : 'Date not recorded',
        timestamp,
        summary: `${certificate.certificateType === 'PHYSICAL_EXAM' ? 'Physical Exam' : 'Consultation'} certificate`,
        details: [
          `Issued by: ${certificate.issuedBy || 'Clinic Staff'}`,
          `Findings: ${certificate.diagnosisFindings || 'N/A'}`,
        ],
      };
    });

    return [...consultationEvents, ...physicalExamEvents, ...certificateEvents].sort((a, b) => {
      return b.timestamp - a.timestamp;
    });
  }, [record, visitHistory, certificateHistory]);

  const examsByYear = editableExamsByYear;
  const labsByYear = editableLabsByYear;
  const canEditCurrentTab = activeTab === 'medical-record';

  const latestExam = useMemo(() => {
    const fromRecord = (record?.physicalExaminations || [])[0] || null;
    const yearValues = Object.values(examsByYear || {}).filter(Boolean);

    const fromEditable = yearValues
      .filter((exam: any) => exam?.examDate)
      .sort((a: any, b: any) => +new Date(b.examDate) - +new Date(a.examDate))[0] || null;

    return fromEditable || fromRecord || {};
  }, [record, examsByYear]);

  const latestLab = useMemo(() => {
    const fromRecord = (record?.labResults || [])[0] || null;
    const yearValues = Object.values(labsByYear || {}).filter(Boolean);

    const fromEditable = yearValues
      .filter((lab: any) => lab?.date)
      .sort((a: any, b: any) => +new Date(b.date) - +new Date(a.date))[0] || null;

    return fromEditable || fromRecord || {};
  }, [record, labsByYear]);
  const bloodTypeValue = useMemo(() => {
    const fromMedicalHistory = displayFormValue(editableMedicalHistory?.bloodType);
    if (fromMedicalHistory) return fromMedicalHistory;

    const fromLabs = [
      editableLabsByYear?.YR_1?.bloodType,
      editableLabsByYear?.YR_2?.bloodType,
      editableLabsByYear?.YR_3?.bloodType,
      editableLabsByYear?.YR_4?.bloodType,
    ].find((value) => displayFormValue(value));

    return displayFormValue(fromLabs);
  }, [editableMedicalHistory, editableLabsByYear]);

  const operationDetailsValue = useMemo(() => {
    return stripBloodTypeFromOperationNotes(editableMedicalHistory?.operationNatureAndDateEnc);
  }, [editableMedicalHistory]);

  const latestConsultationDetails = useMemo(() => {
    const latestVisit = [...visitHistory].sort((a, b) => {
      const aTime = +(new Date(a.createdAt || a.visitDate || 0));
      const bTime = +(new Date(b.createdAt || b.visitDate || 0));
      return bTime - aTime;
    })[0];

    if (!latestVisit) {
      return {
        visitDate: '',
        visitTime: '',
        age: displayValue(record?.age),
        sex: displayValue(record?.sex),
        chiefComplaint: '',
        bp: '',
        temperature: '',
        diagnosis: '',
        treatmentProvided: '',
        addFollowUp: false,
        followUpDate: '',
        followUpTime: '',
        dispensedMedicines: [] as Array<{ id: string; label: string; status: string }>,
      };
    }

    const fallbackParsed = parseConsultationDisplay(latestVisit.chiefComplaintEnc || '');
    let parsedPayload: any = {};

    try {
      parsedPayload = latestVisit.chiefComplaintEnc ? JSON.parse(latestVisit.chiefComplaintEnc) : {};
    } catch {
      parsedPayload = {};
    }

    const followUpDate = displayFormValue(parsedPayload?.followUp?.date);
    const followUpTime = displayFormValue(parsedPayload?.followUp?.time);

    return {
      visitDate: displayFormValue(latestVisit.visitDate).slice(0, 10),
      visitTime: displayFormValue(latestVisit.visitTime),
      age: displayFormValue(parsedPayload?.age || record?.age),
      sex: displayFormValue(parsedPayload?.sex || record?.sex),
      chiefComplaint: displayFormValue(parsedPayload?.chiefComplaint || parsedPayload?.symptoms || fallbackParsed.complaint),
      bp: displayFormValue(parsedPayload?.vitals?.bp),
      temperature: displayFormValue(parsedPayload?.vitals?.temperature),
      diagnosis: displayFormValue(parsedPayload?.diagnosis || fallbackParsed.diagnosis),
      treatmentProvided: displayFormValue(parsedPayload?.treatmentProvided || parsedPayload?.treatmentManagement || fallbackParsed.treatment),
      addFollowUp: Boolean(followUpDate || followUpTime),
      followUpDate,
      followUpTime,
      dispensedMedicines: (latestVisit.dispensedMedicines || []).map((item) => ({
        id: item.id,
        label: `${item.inventory?.itemName || 'Medicine'} x${item.quantity}${item.inventory?.unit ? ` ${item.inventory.unit}` : ''}`,
        status: displayValue(item.status).toUpperCase(),
      })),
    };
  }, [visitHistory, record]);

  useEffect(() => {
    async function preloadActiveConsultation() {
      if (!record?.id) {
        setActiveConsultationQueueItem(null);
        setConsultForm(emptyConsultForm());
        setConsultMedicines([]);
        return;
      }

      const token = getToken();
      if (!token) {
        setActiveConsultationQueueItem(null);
        setConsultForm(emptyConsultForm());
        setConsultMedicines([]);
        return;
      }

      try {
        const queueResponse = await api.get<QueueConsultationResponse>(
          '/appointments/queue?limit=500&status=WAITING,PENDING,IN_PROGRESS',
          token,
        );

        const activeItem = (queueResponse.data || []).find((item) => {
          const belongsToStudent = item.studentProfile?.id === record.id;
          const service = (item.serviceType || '').toLowerCase();
          const isConsult = service.includes('consult');
          return belongsToStudent && isConsult;
        }) || null;

        setActiveConsultationQueueItem(activeItem);

        if (!activeItem) {
          setConsultForm(emptyConsultForm());
          setConsultMedicines([]);
          setConsultError('');
          return;
        }

        const triageResponse = await api.get<ClinicVisitsResponse>(
          `/clinic/visits?studentProfileId=${encodeURIComponent(record.id)}&limit=20`,
          token,
        );

        let triageDefaults = { chiefComplaint: '', bp: '', temperature: '' };
        for (const visit of triageResponse.data || []) {
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
              triageDefaults = { chiefComplaint, bp, temperature };
              break;
            }
          } catch {
            if (raw.trim()) {
              triageDefaults = { chiefComplaint: raw.trim(), bp: '', temperature: '' };
              break;
            }
          }
        }

        const now = new Date();
        const localDate = now.toISOString().slice(0, 10);
        const localTime = now.toTimeString().slice(0, 5);

        setConsultForm({
          visitDate: localDate,
          visitTime: normalizeTimeForInput(activeItem.preferredTime) || localTime,
          age: displayFormValue(record.age),
          sex: displayFormValue(record.sex),
          chiefComplaint: triageDefaults.chiefComplaint || displayFormValue(activeItem.symptoms),
          bp: displayFormValue(triageDefaults.bp),
          temperature: displayFormValue(triageDefaults.temperature),
          diagnosis: '',
          treatmentProvided: '',
          addFollowUp: false,
          followUpDate: '',
          followUpTime: '',
        });
        setConsultMedicines([]);
        setConsultError('');
      } catch {
        setActiveConsultationQueueItem(null);
        setConsultForm(emptyConsultForm());
        setConsultMedicines([]);
        setConsultError('');
      }
    }

    void preloadActiveConsultation();
  }, [record?.id]);

  const handleConsultFieldChange = useCallback((field: string, value: string | boolean) => {
    setConsultForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleAddConsultMedicine = useCallback(() => {
    const selected = inventoryOptions.find((item) => item.id === consultNewMedicineId);
    if (!selected) {
      setConsultMedicineError('Please select a medicine from inventory.');
      return;
    }

    const qty = Number(consultNewQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      setConsultMedicineError('Please enter a valid quantity.');
      return;
    }

    if (qty > selected.currentStock) {
      setConsultMedicineError(`Requested quantity exceeds available stock for ${selected.itemName}.`);
      return;
    }

    setConsultMedicines((prev) => [
      ...prev,
      {
        id: Date.now(),
        inventoryId: selected.id,
        medicine: selected.itemName,
        qty: String(qty),
      },
    ]);
    setConsultMedicineError('');
    setConsultNewMedicineId('');
    setConsultNewQty('1');
  }, [inventoryOptions, consultNewMedicineId, consultNewQty]);

  const handleRemoveConsultMedicine = useCallback((id: number) => {
    setConsultMedicines((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const handleSaveConsultation = useCallback(async () => {
    if (!record?.id) return;

    const token = getToken();
    if (!token) {
      setConsultError('You are not logged in. Please sign in again.');
      return;
    }

    if (!consultForm.chiefComplaint.trim()) {
      setConsultError('Chief Complaint is required.');
      return;
    }
    if (!consultForm.bp.trim()) {
      setConsultError('Blood Pressure is required.');
      return;
    }
    if (!consultForm.temperature.trim()) {
      setConsultError('Temperature is required.');
      return;
    }
    if (!consultForm.diagnosis.trim()) {
      setConsultError('Diagnosis is required.');
      return;
    }
    if (!consultForm.treatmentProvided.trim()) {
      setConsultError('Treatment Given is required.');
      return;
    }
    if (consultForm.addFollowUp && (!consultForm.followUpDate || !consultForm.followUpTime)) {
      setConsultError('Follow-up date and time are required when follow-up is enabled.');
      return;
    }

    const dispensedMedicines = consultMedicines
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
      concernTag: 'General Consultation',
      symptoms: consultForm.chiefComplaint.trim(),
      chiefComplaint: consultForm.chiefComplaint.trim(),
      diagnosis: consultForm.diagnosis.trim(),
      treatmentProvided: consultForm.treatmentProvided.trim(),
      treatmentManagement: consultForm.treatmentProvided.trim(),
      age: consultForm.age?.trim() || null,
      sex: consultForm.sex?.trim() || null,
      vitals: {
        bp: consultForm.bp?.trim() || null,
        temperature: consultForm.temperature?.trim() || null,
      },
      notes: ['General Consultation', consultForm.chiefComplaint, consultForm.diagnosis, consultForm.treatmentProvided]
        .map((part) => String(part || '').trim())
        .filter(Boolean)
        .join(' | '),
      followUp: consultForm.addFollowUp
        ? {
            date: consultForm.followUpDate,
            time: consultForm.followUpTime,
          }
        : null,
    };

    try {
      setConsultError('');
      setIsSavingConsult(true);

      await api.post(
        '/clinic/visits',
        {
          studentProfileId: record.id,
          visitDate: consultForm.visitDate || new Date().toISOString(),
          visitTime: consultForm.visitTime || undefined,
          chiefComplaintEnc: JSON.stringify(structuredComplaint),
          dispensedMedicines,
        },
        token,
      );

      if (consultForm.addFollowUp && consultForm.followUpDate && consultForm.followUpTime) {
        await api.post(
          '/appointments/queue',
          {
            studentProfileId: record.id,
            preferredDate: consultForm.followUpDate,
            preferredTime: consultForm.followUpTime,
            serviceType: 'Medical Consultation',
            symptoms: `Follow Up: ${consultForm.diagnosis || consultForm.chiefComplaint || 'Post consultation review'}`,
          },
          token,
        );
      }

      if (activeConsultationQueueItem?.id) {
        const nextStatus = dispensedMedicines.length > 0 ? 'FOR_DISPENSING' : 'COMPLETED';
        await api.put(`/appointments/queue/${activeConsultationQueueItem.id}`, { status: nextStatus }, token);
      }

      const refreshedVisits = await api.get<ClinicVisitsResponse>(`/clinic/visits?studentProfileId=${encodeURIComponent(record.id)}&limit=500`, token);
      setVisitHistory(refreshedVisits.data || []);
      setSaveToast('Consultation saved successfully.');
      setConsultForm(emptyConsultForm());
      setConsultMedicines([]);
      setActiveConsultationQueueItem(null);
    } catch (err) {
      if (err instanceof ApiError) {
        setConsultError(err.message);
      } else {
        setConsultError('Failed to save consultation.');
      }
    } finally {
      setIsSavingConsult(false);
    }
  }, [consultForm, record, consultMedicines, activeConsultationQueueItem]);

  const handleAddMedicineFromModal = useCallback(() => {
    const selected = inventoryOptions.find((item) => item.id === medicineDraft.inventoryId);
    if (!selected) {
      setMedicineDraftError('Please select a medicine.');
      return;
    }

    const days = Number(medicineDraft.daysToTake);
    const perDay = Number(medicineDraft.timesPerDay);
    const hours = Number(medicineDraft.everyHours);

    if (!Number.isFinite(days) || days <= 0) {
      setMedicineDraftError('Please enter a valid number of days.');
      return;
    }
    if (!Number.isFinite(perDay) || perDay <= 0) {
      setMedicineDraftError('Please enter a valid times per day value.');
      return;
    }
    if (medicineDraft.intervalMode === 'hours' && (!Number.isFinite(hours) || hours <= 0)) {
      setMedicineDraftError('Please enter a valid hour interval.');
      return;
    }

    const frequency = medicineDraft.intervalMode === 'after-meal'
      ? `After meal (${perDay}x/day)`
      : `Every ${hours}h (${perDay}x/day)`;

    setMedicines((prev) => [
      ...prev,
      {
        id: Math.random().toString(),
        name: selected.itemName,
        dosage: `${perDay}x per day`,
        frequency,
        duration: `${days} day${days > 1 ? 's' : ''}`,
      },
    ]);

    setMedicineDraftError('');
    setShowAddMedicineModal(false);
    setMedicineDraft({
      inventoryId: '',
      daysToTake: '7',
      timesPerDay: '3',
      intervalMode: 'after-meal',
      everyHours: '8',
    });
  }, [inventoryOptions, medicineDraft]);

  const medicalRecordFileName = useMemo(() => {
    if (!record) return 'MedicalRecord';

    const middleSource =
      displayValue((record as any)?.middleInitial) ||
      displayValue((record as any)?.middleName);

    const middleInitial = middleSource ? middleSource.charAt(0).toUpperCase() : 'X';
    const yearLevelSource =
      displayValue((record as any)?.yearLevel) ||
      displayValue(latestExam?.yearLevel);

    const lastName = sanitizeFilePart(record.lastName, 'StudentLastName');
    const firstName = sanitizeFilePart(record.firstName, 'FirstName');
    const middle = sanitizeFilePart(middleInitial, 'M');
    const yearLevel = sanitizeFilePart(normalizeYearLevelForFileName(yearLevelSource), 'YearLevel');

    return `${lastName}-${firstName}-${middle}_MedicalRecord_${yearLevel}`;
  }, [record, latestExam]);

  const handlePrintMedicalRecord = useCallback(() => {
    const originalTitle = document.title;
    const nextTitle = medicalRecordFileName;

    const restoreTitle = () => {
      document.title = originalTitle;
    };

    document.title = nextTitle;
    window.addEventListener('afterprint', restoreTitle, { once: true });
    window.print();

    window.setTimeout(() => {
      if (document.title === nextTitle) {
        restoreTitle();
      }
    }, 1200);
  }, [medicalRecordFileName]);

  const handlePrintPrescription = useCallback(() => {
    if (!record) return;
    setIsPrintingPrescription(true);
    const originalTitle = document.title;
    const lastName = sanitizeFilePart(record.lastName, 'LastName');
    const firstName = sanitizeFilePart(record.firstName, 'FirstName');
    document.title = `${lastName}-${firstName}_Prescription`;

    window.setTimeout(() => {
      window.print();
      setIsPrintingPrescription(false);
      document.title = originalTitle;
    }, 150);
  }, [record]);

  useEffect(() => {
    if (!canEditCurrentTab && isEditMode) {
      setIsEditMode(false);
    }
  }, [canEditCurrentTab, isEditMode]);

  useEffect(() => {
    if (!saveToast) return;

    const timer = window.setTimeout(() => {
      setSaveToast(null);
    }, 2800);

    return () => window.clearTimeout(timer);
  }, [saveToast]);

  const handleOverviewSystemNotesChange = useCallback((field: string, value: string) => {
    if (!isEditMode || activeTab !== 'overview') return;
    setSystemNotes((prev) => ({ ...prev, [field]: value }));
  }, [isEditMode, activeTab]);

  const handleMedicalHistoryFlagToggle = useCallback((key: string) => {
    if (!isEditMode || activeTab !== 'medical-record') return;
    setEditableMedicalHistory((prev: any) => {
      const currentlyChecked = isChecked(prev?.[key]);
      return { ...prev, [key]: currentlyChecked ? 'NO' : 'YES' };
    });
  }, [isEditMode, activeTab]);

  const handleYearExamFieldChange = useCallback((year: YearKey, field: string, value: string) => {
    if (!isEditMode || activeTab !== 'medical-record') return;
    setEditableExamsByYear((prev) => ({
      ...prev,
      [year]: {
        ...(prev[year] || {}),
        yearLevel: year,
        [field]: value,
      },
    }));
  }, [isEditMode, activeTab]);

  const handleYearLabFieldChange = useCallback((year: YearKey, field: string, value: string) => {
    if (!isEditMode || activeTab !== 'medical-record') return;
    setEditableLabsByYear((prev) => ({
      ...prev,
      [year]: {
        ...(prev[year] || {}),
        [field]: value,
      },
    }));
  }, [isEditMode, activeTab]);

  const tabs = isNurseSideRecord
    ? [
      { id: 'overview', label: 'Overview', icon: <User size={18} /> },
      { id: 'medical-record', label: 'Medical Record', icon: <Activity size={18} /> },
      { id: 'clinical-history', label: 'Clinical History', icon: <FileText size={18} /> },
    ]
    : [
      { id: 'overview', label: 'Overview', icon: <User size={18} /> },
      { id: 'medical-record', label: 'Medical Record', icon: <Activity size={18} /> },
      { id: 'clinical-history', label: 'Clinical History', icon: <FileText size={18} /> },
      ...(shouldShowDentalRecordsTab ? [{ id: 'dental-records', label: 'Dental Records', icon: <Smile size={18} /> }] : []),
      ...(!isNurseSideRecord ? [{ id: 'medical-consultation', label: 'Consult', icon: <Stethoscope size={18} /> }] : []),
      ...(!isNurseSideRecord ? [{ id: 'prescriptions', label: 'Prescription', icon: <Pill size={18} /> }] : []),
    ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="font-bold text-slate-400 animate-pulse">Loading Clinical Record...</p>
      </div>
    </div>
  );

  if (!record) return <div className="p-8 text-center text-red-500">{error || 'Record not found.'}</div>;

  return (
    <div className="bg-slate-50 min-h-screen pb-32 print:bg-white print:pb-0 print:w-full print:m-0">
      {/* Print-Only Legal Document */}
      <div id="print-medical-record" className="hidden print:block px-8 py-6 text-black">
        <div className="flex items-start gap-4 border-b border-black pb-3">
          <div className="flex items-center gap-2 min-w-[110px]">
            <Image src="/icons/gc-logo.png" alt="GC Logo" width={44} height={44} />
            <Image src="/icons/clinic-logo.png" alt="Clinic Logo" width={44} height={44} />
          </div>
          <div className="flex-1 text-center">
            <p className="text-sm font-semibold">Gordon College</p>
            <p className="text-xs">Olongapo City</p>
            <p className="text-base font-bold tracking-wide">Health Services Unit</p>
          </div>
          <div className="min-w-[110px] flex flex-col items-end">
            <div className="w-[95px] h-[95px] border border-black flex items-center justify-center text-[10px]">
              1x1 Photo
            </div>
          </div>
        </div>

        <div className="mt-3 space-y-1 text-[11px]">
          <div className="grid grid-cols-2 gap-x-6">
            <p><span className="font-semibold">Student #:</span> {displayValue(record.studentNumber)}</p>
            <p><span className="font-semibold">Course/Dept:</span> {displayValue(record.courseDept)}</p>
          </div>
          <div className="grid grid-cols-3 gap-x-6">
            <p><span className="font-semibold">Name:</span> {displayValue(record.lastName)}, {displayValue(record.firstName)}</p>
            <p><span className="font-semibold">Civil Status:</span> {displayValue(record.civilStatus)}</p>
            <p><span className="font-semibold">Tel./CP#:</span> {displayValue(record.telNumber)}</p>
          </div>
          <div className="grid grid-cols-3 gap-x-6">
            <p><span className="font-semibold">Birthday:</span> {displayValue(record.birthday ? new Date(record.birthday).toLocaleDateString() : '')}</p>
            <p><span className="font-semibold">Age:</span> {displayValue(record.age)}</p>
            <p><span className="font-semibold">Sex:</span> {displayValue(record.sex)}</p>
          </div>
          <p><span className="font-semibold">Present Address:</span> {displayValue(record.presentAddress)}</p>
        </div>

        <div className="mt-4 space-y-2 text-[10px]">
          <div>
            <p className="font-bold uppercase mb-1">Medical History</p>
            <p className="font-semibold uppercase mb-1">Medical History: Place a check (v) if you have or had:</p>
            <p><span className="font-semibold">Allergy:</span> {displayValue(editableMedicalHistory?.allergyEnc)}</p>

            <div className="grid grid-cols-4 gap-x-4 gap-y-1 mt-2">
              {[
                { label: 'Asthma', key: 'asthmaEnc' },
                { label: 'Epilepsy/Seizure', key: 'epilepsySeizureEnc' },
                { label: 'Mumps', key: 'mumpsEnc' },
                { label: 'Typhoid Fever', key: 'typhoidFeverEnc' },
                { label: 'Chicken Pox', key: 'chickenPoxEnc' },
                { label: 'Heart Disorder', key: 'heartDisorderEnc' },
                { label: 'Anxiety Disorder', key: 'anxietyDisorderEnc' },
                { label: 'COVID-19', key: 'covid19Enc' },
                { label: 'Diabetes', key: 'diabetesEnc' },
                { label: 'Hepatitis', key: 'hepatitisEnc' },
                { label: 'Panic Attack/Hyperventilation', key: 'panicAttackHyperventilationEnc' },
                { label: 'Urinary Tract Infection', key: 'urinaryTractInfectionEnc' },
                { label: 'Dysmenorrhea', key: 'dysmenorrheaEnc' },
                { label: 'Hypertension', key: 'hypertensionEnc' },
                { label: 'Pneumonia', key: 'pneumoniaEnc' },
                { label: 'PTB/Primary Complex', key: 'ptbPrimaryComplexEnc' },
                { label: 'Measles', key: 'measlesEnc' },
              ].map((item) => (
                <p key={`print-${item.key}`} className="flex items-center gap-1">
                  <span className="inline-flex h-3 w-3 items-center justify-center border border-black text-[9px] leading-none">
                    {isChecked(editableMedicalHistory?.[item.key]) ? '✓' : ''}
                  </span>
                  <span>{item.label}</span>
                </p>
              ))}
            </div>

            <p className="mt-2">
              <span className="font-semibold">Have you had any operation in the past?</span>{' '}
              YES [{isChecked(editableMedicalHistory?.hasPastOperationEnc) ? '✓' : ' '}] NO [{!isChecked(editableMedicalHistory?.hasPastOperationEnc) ? '✓' : ' '}]
            </p>
            <p><span className="font-semibold">If yes, state the nature of the operation and date/year:</span> {displayValue(operationDetailsValue)}</p>
            <p><span className="font-semibold">Blood Type:</span> {displayValue(bloodTypeValue)}</p>

            <div className="grid grid-cols-2 gap-x-6 mt-2">
              <p><span className="font-semibold">Emergency Contact Person Name:</span> {displayValue((record as any)?.emergencyContactName)}</p>
              <p><span className="font-semibold">Tel. phone No. CP:</span> {displayValue((record as any)?.emergencyContactTelNumber)}</p>
              <p className="col-span-2"><span className="font-semibold">Address:</span> {displayValue((record as any)?.presentAddress)}</p>
            </div>

            <div className="mt-2 border-t border-black pt-2 space-y-1">
              <p>Data Privacy Waiver: I am willing to disclose my personal information with the GC clinic. I have the right to access my personal data in a timely manner (5 days request). The clinic respects patient privacy and is accountable to protect my personal information.</p>
              <p className="text-right pr-8">
                <span className="font-semibold">Signature of Student</span>
              </p>
              <div className="flex justify-end pr-8">
                <span className="inline-block border-b border-black min-w-[190px] h-4" />
              </div>
            </div>
          </div>

          <div>
            <p className="font-bold uppercase mb-1">Physical Examination</p>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-black px-2 py-1 text-left">Item</th>
                  <th className="border border-black px-2 py-1 text-left">Yr. I / {displayFormDateOnly(examsByYear.YR_1?.examDate)}</th>
                  <th className="border border-black px-2 py-1 text-left">Yr. II / {displayFormDateOnly(examsByYear.YR_2?.examDate)}</th>
                  <th className="border border-black px-2 py-1 text-left">Yr. III / {displayFormDateOnly(examsByYear.YR_3?.examDate)}</th>
                  <th className="border border-black px-2 py-1 text-left">Yr. IV / {displayFormDateOnly(examsByYear.YR_4?.examDate)}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['BP', 'bp'],
                  ['CR', 'cr'],
                  ['RR', 'rr'],
                  ['Temp', 'temp'],
                  ['Weight', 'weight'],
                  ['Height', 'height'],
                  ['BMI', 'bmi'],
                  ['Visual Acuity', 'visualAcuity'],
                  ['Skin', 'skin'],
                  ['HEENT', 'heent'],
                  ['Chest/Lungs', 'chestLungs'],
                  ['Heart', 'heart'],
                  ['Abdomen', 'abdomen'],
                  ['Extremities', 'extremities'],
                  ['Others', 'others'],
                  ['Examined by', 'examinedBy'],
                ].map(([label, key]) => (
                  <tr key={String(key)}>
                    <td className="border border-black px-2 py-1">{label}</td>
                    <td className="border border-black px-2 py-1">{displayFormValue((examsByYear.YR_1 as any)?.[key])}</td>
                    <td className="border border-black px-2 py-1">{displayFormValue((examsByYear.YR_2 as any)?.[key])}</td>
                    <td className="border border-black px-2 py-1">{displayFormValue((examsByYear.YR_3 as any)?.[key])}</td>
                    <td className="border border-black px-2 py-1">{displayFormValue((examsByYear.YR_4 as any)?.[key])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div>
            <p className="font-bold uppercase mb-1">Lab Results</p>
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="border border-black px-2 py-1 text-left">Item</th>
                  <th className="border border-black px-2 py-1 text-left">Yr. I / {displayFormDateOnly(labsByYear.YR_1?.date)}</th>
                  <th className="border border-black px-2 py-1 text-left">Yr. II / {displayFormDateOnly(labsByYear.YR_2?.date)}</th>
                  <th className="border border-black px-2 py-1 text-left">Yr. III / {displayFormDateOnly(labsByYear.YR_3?.date)}</th>
                  <th className="border border-black px-2 py-1 text-left">Yr. IV / {displayFormDateOnly(labsByYear.YR_4?.date)}</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Hgb', 'hgb'],
                  ['Hct', 'hct'],
                  ['WBC', 'wbc'],
                  ['Plt. Ct.', 'pltCt'],
                  ['Blood Type', 'bloodType'],
                  ['Glucose/Sugar', 'glucoseSugar'],
                  ['Protein', 'protein'],
                  ['X-ray Result', 'xrayResult'],
                  ['Abnormal Findings', 'xrayFindingsEnc'],
                  ['Others', 'othersEnc'],
                  ['Date Received', 'dateReceived'],
                ].map(([label, key]) => (
                  <tr key={String(key)}>
                    <td className="border border-black px-2 py-1">{label}</td>
                    <td className="border border-black px-2 py-1">{key === 'dateReceived' ? displayFormDateOnly((labsByYear.YR_1 as any)?.[key]) : displayFormValue((labsByYear.YR_1 as any)?.[key])}</td>
                    <td className="border border-black px-2 py-1">{key === 'dateReceived' ? displayFormDateOnly((labsByYear.YR_2 as any)?.[key]) : displayFormValue((labsByYear.YR_2 as any)?.[key])}</td>
                    <td className="border border-black px-2 py-1">{key === 'dateReceived' ? displayFormDateOnly((labsByYear.YR_3 as any)?.[key]) : displayFormValue((labsByYear.YR_3 as any)?.[key])}</td>
                    <td className="border border-black px-2 py-1">{key === 'dateReceived' ? displayFormDateOnly((labsByYear.YR_4 as any)?.[key]) : displayFormValue((labsByYear.YR_4 as any)?.[key])}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Print-Only Prescription (5.5" x 8.5" Half-Letter size) */}
      {record && (
        <div id="print-prescription" className="hidden print:block w-full text-black font-sans p-6 bg-white">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-800 pb-4 mb-4">
            <div className="space-y-0.5">
              <h3 className="text-xl font-extrabold text-blue-900 tracking-tighter">GC-HEALTHLINK</h3>
              <p className="text-[8px] font-bold text-blue-400 uppercase tracking-widest">Medical Clinic & Wellness</p>
            </div>
            <div className="text-right space-y-0.5">
              <p className="text-xs font-bold text-slate-800">Dr. Juan Dela Cruz, MD</p>
              <p className="text-[8px] text-slate-500 font-medium">License No: 123456</p>
              <p className="text-[8px] text-slate-500 font-medium">PTR No: 7890123</p>
            </div>
          </div>

          {/* Patient Details */}
          <div className="grid grid-cols-12 gap-2 text-xs border-b border-slate-200 pb-3 mb-6">
            <div className="col-span-7">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold block">Patient Name</span>
              <span className="font-serif text-sm font-bold italic text-slate-800">{record.lastName}, {record.firstName}</span>
            </div>
            <div className="col-span-2 text-center">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold block">Age</span>
              <span className="font-serif text-sm font-bold text-slate-800">{record.age || 'N/A'}</span>
            </div>
            <div className="col-span-3 text-right">
              <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold block">Date</span>
              <span className="font-serif text-xs text-slate-800 font-semibold">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
          </div>

          {/* Body */}
          <div className="min-h-[280px] relative mt-4">
            {/* Rx watermark */}
            <div className="absolute top-0 left-0 text-7xl font-serif italic text-slate-100/50 select-none pointer-events-none z-0">
              Rx
            </div>

            <div className="relative z-10 pt-8 space-y-4">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-200 pb-1 text-slate-400 font-semibold text-[9px] uppercase tracking-wider">
                    <th className="text-left pb-2">Medicine Name</th>
                    <th className="text-left pb-2">Dosage</th>
                    <th className="text-left pb-2">Frequency</th>
                    <th className="text-right pb-2">Duration</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {medicines.map((med) => (
                    <tr key={med.id} className="text-slate-800">
                      <td className="py-2.5 font-bold">{med.name || '—'}</td>
                      <td className="py-2.5 font-medium">{med.dosage || '—'}</td>
                      <td className="py-2.5 font-medium">{med.frequency || '—'}</td>
                      <td className="py-2.5 font-medium text-right">{med.duration || '—'}</td>
                    </tr>
                  ))}
                  {medicines.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400 italic">No medicines prescribed</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-slate-800 pt-4 flex justify-between items-center mt-6">
            <div className="text-[7px] font-semibold text-slate-400 uppercase tracking-wider max-w-[180px]">
              * VALID FOR 30 DAYS FROM DATE OF ISSUE. KEEP FOR YOUR RECORDS.
            </div>
            <div className="text-right flex flex-col items-end">
               <div className="w-28 border-b border-slate-400 mb-1" />
               <p className="text-[8px] font-bold text-slate-700 uppercase tracking-widest">Physician Signature</p>
            </div>
          </div>
        </div>
      )}

      {/* Prescription Print Styles */}
      <style>{`
        @media print {
          #print-prescription {
            display: none !important;
          }
        }
      `}</style>

      {isPrintingPrescription && (
        <style>{`
          @media print {
            #print-medical-record {
              display: none !important;
            }
            #print-prescription {
              display: block !important;
            }
            @page {
              size: 5.5in 8.5in;
              margin: 0.4in;
            }
          }
        `}</style>
      )}

      {/* NEW: Patient Info Card - STICKY AT TOP */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm px-6 py-6 print:hidden">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push(resolvedBackRoute)}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 print:hidden"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex-1">
              <PatientHeader 
                patient={{
                  studentNumber: record.studentNumber,
                  firstName: record.firstName, middleName: '', lastName: record.lastName,
                  civilStatus: record.civilStatus || undefined,
                  age: record.age || 0, sex: record.sex || '',
                  dob: record.birthday ? new Date(record.birthday).toLocaleDateString() : '',
                  address: record.presentAddress || '',
                  contactNumber: record.telNumber || '',
                  department: record.courseDept, status: 'Student',
                }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="sticky top-[140px] z-40 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-6 py-4 print:hidden">
        <div className="max-w-6xl mx-auto">
          <div className={`${isNurseSideRecord ? 'grid grid-cols-3 max-w-2xl mx-auto' : 'flex justify-start md:justify-center md:max-w-fit mx-auto'} gap-2 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm w-full overflow-x-auto`}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div
        aria-live="polite"
        className={`fixed top-24 right-4 z-50 text-sm font-semibold px-4 py-3 rounded-xl shadow-lg transition-all duration-300 bg-white border border-teal-200 text-teal-700 shadow-teal-100 ${saveToast ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
      >
        {saveToast ?? ''}
      </div>

      <main className="max-w-6xl mx-auto px-6 mt-8 space-y-8 animate-in fade-in duration-500 print:hidden">
        {/* Tab Content */}
        <div className="min-h-[60vh] pb-20">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-lg font-semibold text-slate-800 border-b pb-2 inline-block border-slate-200">Physical Examination</h2>
                <div className="text-xs text-slate-400 italic mt-2">
                  Last Updated: {displayFormDateOnly(latestExam?.examDate) || new Date().toLocaleDateString()} by Current Staff
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  {[
                    ['BP', latestExam?.bp, 'mmHg'],
                    ['CR', latestExam?.cr, 'bpm'],
                    ['RR', latestExam?.rr, 'bpm'],
                    ['Temp', latestExam?.temp, 'C'],
                    ['Height', latestExam?.height, 'cm'],
                    ['Weight', latestExam?.weight, 'kg'],
                    ['Visual Acuity', latestExam?.visualAcuity, ''],
                    ['BMI', latestExam?.bmi, ''],
                  ].map(([label, value, unit]) => (
                    <div key={String(label)} className="space-y-1">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</label>
                      <div className="w-full px-3 py-2 rounded-md bg-slate-50 border border-slate-100 font-semibold text-slate-700 min-h-[42px]">
                        {displayValue(value)}
                      </div>
                      <span className="text-[10px] font-bold text-slate-400">{unit}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-slate-100 pt-4 flex items-center gap-6">
                  <span className="text-sm font-bold text-green-600">Normal</span>
                  {!!displayValue(latestExam?.others) && (
                    <span className="text-sm font-bold text-rose-600">Abnormal Findings: {displayValue(latestExam?.others)}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                  <h2 className="text-lg font-semibold text-slate-800 border-b pb-2 inline-block border-slate-200">System-Specific Notes</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {[
                      ['HEENT', latestExam?.heent],
                      ['Chest / Lungs', latestExam?.chestLungs],
                      ['Abdomen', latestExam?.abdomen],
                      ['Extremities', latestExam?.extremities],
                      ['Others', latestExam?.others],
                    ].map(([label, value]) => (
                      <div key={String(label)} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                        <p className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">{label}</p>
                        <p className="text-sm text-slate-700 min-h-[72px] whitespace-pre-wrap">{displayValue(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <ShieldAlert size={18} className="text-rose-500" /> Critical Info
                    </h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                        <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Allergies</p>
                        <p className="text-sm font-bold text-rose-700">{displayValue(editableMedicalHistory?.allergyEnc)}</p>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Blood Type</p>
                        <p className="text-sm font-bold text-blue-700">{displayValue(bloodTypeValue)}</p>
                      </div>
                      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Emergency Contact</p>
                        <p className="text-sm font-bold text-slate-700">{displayValue((record as any)?.emergencyContactName)}</p>
                        <p className="text-xs text-slate-500 mt-1">{displayValue((record as any)?.emergencyContactTelNumber)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

           {/* MEDICAL RECORD TAB */}
          {activeTab === 'medical-record' && (
            useNurseStyleMedicalRecord ? (
              <div className="space-y-6">
                <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-base font-bold text-slate-800">Medical Record</h3>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePrintMedicalRecord}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                      >
                        <Printer size={16} /> Print
                      </button>
                      {canEditCurrentTab && (
                        <button
                          onClick={() => {
                            if (!isEditMode) {
                              setIsEditMode(true);
                              return;
                            }
                            setShowSaveConfirmation(true);
                          }}
                          disabled={isSaving}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Save size={16} /> {isSaving ? 'Saving...' : isEditMode ? 'Save Updates' : 'Update Record'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Medical History: place a check (v) if you have or had:</p>

                      <div className="text-sm text-slate-700 border-b border-slate-200 pb-3">
                        <span className="font-semibold">Allergy = </span>
                        {isEditMode ? (
                          <input
                            value={displayFormValue(editableMedicalHistory?.allergyEnc)}
                            onChange={(e) => setEditableMedicalHistory((prev: any) => ({ ...prev, allergyEnc: e.target.value }))}
                            className="inline-block min-w-[200px] border-b border-slate-400 leading-6 px-1 bg-transparent outline-none"
                          />
                        ) : (
                          <span className="inline-block min-w-[160px] border-b border-slate-400 leading-6 px-1">{displayValue(editableMedicalHistory?.allergyEnc)}</span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-x-6 gap-y-2">
                        {[
                          { label: 'Asthma', key: 'asthmaEnc' },
                          { label: 'Epilepsy/Seizure', key: 'epilepsySeizureEnc' },
                          { label: 'Mumps', key: 'mumpsEnc' },
                          { label: 'Typhoid Fever', key: 'typhoidFeverEnc' },
                          { label: 'Chicken Pox', key: 'chickenPoxEnc' },
                          { label: 'Heart Disorder', key: 'heartDisorderEnc' },
                          { label: 'Anxiety Disorder', key: 'anxietyDisorderEnc' },
                          { label: 'COVID-19', key: 'covid19Enc' },
                          { label: 'Diabetes', key: 'diabetesEnc' },
                          { label: 'Hepatitis', key: 'hepatitisEnc' },
                          { label: 'Panic Attack/Hyperventilation', key: 'panicAttackHyperventilationEnc' },
                          { label: 'Urinary Tract Infection', key: 'urinaryTractInfectionEnc' },
                          { label: 'Dysmenorrhea', key: 'dysmenorrheaEnc' },
                          { label: 'Hypertension', key: 'hypertensionEnc' },
                          { label: 'Pneumonia', key: 'pneumoniaEnc' },
                          { label: 'PTB/Primary Complex', key: 'ptbPrimaryComplexEnc' },
                          { label: 'Measles', key: 'measlesEnc' },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center gap-2 text-sm text-slate-700">
                            <button
                              type="button"
                              disabled={!isEditMode}
                              onClick={() => handleMedicalHistoryFlagToggle(item.key)}
                              className={`inline-flex h-4 w-4 items-center justify-center border border-slate-500 text-[11px] font-bold ${isChecked(editableMedicalHistory?.[item.key]) ? 'text-slate-800' : 'text-transparent'} ${isEditMode ? '' : 'cursor-default'}`}
                            >
                              ✓
                            </button>
                            <span>{item.label}</span>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-slate-200 pt-3 space-y-2 text-sm text-slate-700">
                        <div className="flex flex-wrap items-center gap-3">
                          <span>Have you had any operation in the past?</span>
                          <span className="font-semibold">YES</span>
                          <button
                            type="button"
                            disabled={!isEditMode}
                            onClick={() => setEditableMedicalHistory((prev: any) => ({ ...prev, hasPastOperationEnc: 'YES' }))}
                            className={`inline-flex h-4 w-4 items-center justify-center border border-slate-500 text-[11px] font-bold ${isChecked(editableMedicalHistory?.hasPastOperationEnc) ? 'text-slate-800' : 'text-transparent'}`}
                          >✓</button>
                          <span className="font-semibold">NO</span>
                          <button
                            type="button"
                            disabled={!isEditMode}
                            onClick={() => setEditableMedicalHistory((prev: any) => ({ ...prev, hasPastOperationEnc: 'NO' }))}
                            className={`inline-flex h-4 w-4 items-center justify-center border border-slate-500 text-[11px] font-bold ${!isChecked(editableMedicalHistory?.hasPastOperationEnc) ? 'text-slate-800' : 'text-transparent'}`}
                          >✓</button>
                        </div>
                        <div>
                          <span>If yes, state the nature of the operation and date/year: </span>
                          {isEditMode ? (
                            <input
                              value={operationDetailsValue}
                              onChange={(e) => setEditableMedicalHistory((prev: any) => ({ ...prev, operationNatureAndDateEnc: e.target.value }))}
                              className="inline-block min-w-[320px] border-b border-slate-400 leading-6 px-1 bg-transparent outline-none"
                            />
                          ) : (
                            <span className="inline-block min-w-[220px] border-b border-slate-400 leading-6 px-1">{displayValue(operationDetailsValue)}</span>
                          )}
                        </div>

                        <div>
                          <span className="font-semibold">Blood Type: </span>
                          {isEditMode ? (
                            <input
                              value={bloodTypeValue}
                              onChange={(e) => setEditableMedicalHistory((prev: any) => ({ ...prev, bloodType: e.target.value }))}
                              className="inline-block min-w-[120px] border-b border-slate-400 leading-6 px-1 bg-transparent outline-none"
                            />
                          ) : (
                            <span className="inline-block min-w-[90px] border-b border-slate-400 leading-6 px-1">{displayValue(bloodTypeValue)}</span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 pt-1">
                          <p>
                            <span className="font-semibold">Emergency Contact Person Name:</span>{' '}
                            <span className="inline-block min-w-[180px] border-b border-slate-400 leading-6 px-1">{displayValue((record as any)?.emergencyContactName)}</span>
                          </p>
                          <p>
                            <span className="font-semibold">Relationship:</span>{' '}
                            <span className="inline-block min-w-[180px] border-b border-slate-400 leading-6 px-1">{displayValue((record as any)?.emergencyContactRelationship || (record as any)?.emergencyContactRelation)}</span>
                          </p>
                          <p>
                            <span className="font-semibold">Tel. phone No. CP:</span>{' '}
                            <span className="inline-block min-w-[180px] border-b border-slate-400 leading-6 px-1">{displayValue((record as any)?.emergencyContactTelNumber)}</span>
                          </p>
                          <p className="md:col-span-2">
                            <span className="font-semibold">Address:</span>{' '}
                            <span className="inline-block min-w-[280px] border-b border-slate-400 leading-6 px-1">{displayValue((record as any)?.presentAddress)}</span>
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                      <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Physical Examination</p>

                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[860px] border-collapse text-sm text-slate-700">
                          <thead>
                            <tr>
                              <th className="border border-slate-300 px-3 py-2 text-left font-semibold">Physical Examination</th>
                              <th className="border border-slate-300 px-3 py-2 text-left font-semibold">Yr. I / Date: {isEditMode ? <input type="date" value={displayFormValue(examsByYear.YR_1?.examDate).slice(0, 10)} onChange={(e) => handleYearExamFieldChange('YR_1', 'examDate', e.target.value)} className="ml-1 border-b border-slate-400 bg-transparent outline-none" /> : displayFormDateOnly(examsByYear.YR_1?.examDate)}</th>
                              <th className="border border-slate-300 px-3 py-2 text-left font-semibold">Yr. II / Date: {isEditMode ? <input type="date" value={displayFormValue(examsByYear.YR_2?.examDate).slice(0, 10)} onChange={(e) => handleYearExamFieldChange('YR_2', 'examDate', e.target.value)} className="ml-1 border-b border-slate-400 bg-transparent outline-none" /> : displayFormDateOnly(examsByYear.YR_2?.examDate)}</th>
                              <th className="border border-slate-300 px-3 py-2 text-left font-semibold">Yr. III / Date: {isEditMode ? <input type="date" value={displayFormValue(examsByYear.YR_3?.examDate).slice(0, 10)} onChange={(e) => handleYearExamFieldChange('YR_3', 'examDate', e.target.value)} className="ml-1 border-b border-slate-400 bg-transparent outline-none" /> : displayFormDateOnly(examsByYear.YR_3?.examDate)}</th>
                              <th className="border border-slate-300 px-3 py-2 text-left font-semibold">Yr. IV / Date: {isEditMode ? <input type="date" value={displayFormValue(examsByYear.YR_4?.examDate).slice(0, 10)} onChange={(e) => handleYearExamFieldChange('YR_4', 'examDate', e.target.value)} className="ml-1 border-b border-slate-400 bg-transparent outline-none" /> : displayFormDateOnly(examsByYear.YR_4?.examDate)}</th>
                            </tr>
                          </thead>
                          <tbody>
                            {[
                              { label: 'BP', key: 'bp' },
                              { label: 'CR', key: 'cr' },
                              { label: 'RR', key: 'rr' },
                              { label: 'Temp.', key: 'temp' },
                              { label: 'Weight', key: 'weight' },
                              { label: 'Height', key: 'height' },
                              { label: 'BMI', key: 'bmi' },
                              { label: 'Visual Acuity', key: 'visualAcuity' },
                              { label: 'Skin', key: 'skin' },
                              { label: 'HEENT', key: 'heent' },
                              { label: 'Chest/Lungs', key: 'chestLungs' },
                              { label: 'Heart', key: 'heart' },
                              { label: 'Abdomen', key: 'abdomen' },
                              { label: 'Extremities', key: 'extremities' },
                              { label: 'Others, specify', key: 'others' },
                            ].map((row) => (
                              <tr key={row.key}>
                                <td className="border border-slate-300 px-3 py-2 font-medium">{row.label}</td>
                                <td className="border border-slate-300 px-3 py-2">{isEditMode ? <input value={displayFormValue((examsByYear.YR_1 as any)?.[row.key])} onChange={(e) => handleYearExamFieldChange('YR_1', row.key, e.target.value)} className="w-full bg-transparent outline-none" /> : displayFormValue((examsByYear.YR_1 as any)?.[row.key])}</td>
                                <td className="border border-slate-300 px-3 py-2">{isEditMode ? <input value={displayFormValue((examsByYear.YR_2 as any)?.[row.key])} onChange={(e) => handleYearExamFieldChange('YR_2', row.key, e.target.value)} className="w-full bg-transparent outline-none" /> : displayFormValue((examsByYear.YR_2 as any)?.[row.key])}</td>
                                <td className="border border-slate-300 px-3 py-2">{isEditMode ? <input value={displayFormValue((examsByYear.YR_3 as any)?.[row.key])} onChange={(e) => handleYearExamFieldChange('YR_3', row.key, e.target.value)} className="w-full bg-transparent outline-none" /> : displayFormValue((examsByYear.YR_3 as any)?.[row.key])}</td>
                                <td className="border border-slate-300 px-3 py-2">{isEditMode ? <input value={displayFormValue((examsByYear.YR_4 as any)?.[row.key])} onChange={(e) => handleYearExamFieldChange('YR_4', row.key, e.target.value)} className="w-full bg-transparent outline-none" /> : displayFormValue((examsByYear.YR_4 as any)?.[row.key])}</td>
                              </tr>
                            ))}
                            <tr>
                              <td className="border border-slate-300 px-3 py-2 font-medium">Examined by:</td>
                              <td className="border border-slate-300 px-3 py-2">{isEditMode ? <input value={displayFormValue(examsByYear.YR_1?.examinedBy)} onChange={(e) => handleYearExamFieldChange('YR_1', 'examinedBy', e.target.value)} className="w-full bg-transparent outline-none" /> : displayFormValue(examsByYear.YR_1?.examinedBy)}</td>
                              <td className="border border-slate-300 px-3 py-2">{isEditMode ? <input value={displayFormValue(examsByYear.YR_2?.examinedBy)} onChange={(e) => handleYearExamFieldChange('YR_2', 'examinedBy', e.target.value)} className="w-full bg-transparent outline-none" /> : displayFormValue(examsByYear.YR_2?.examinedBy)}</td>
                              <td className="border border-slate-300 px-3 py-2">{isEditMode ? <input value={displayFormValue(examsByYear.YR_3?.examinedBy)} onChange={(e) => handleYearExamFieldChange('YR_3', 'examinedBy', e.target.value)} className="w-full bg-transparent outline-none" /> : displayFormValue(examsByYear.YR_3?.examinedBy)}</td>
                              <td className="border border-slate-300 px-3 py-2">{isEditMode ? <input value={displayFormValue(examsByYear.YR_4?.examinedBy)} onChange={(e) => handleYearExamFieldChange('YR_4', 'examinedBy', e.target.value)} className="w-full bg-transparent outline-none" /> : displayFormValue(examsByYear.YR_4?.examinedBy)}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-700">Lab Results</p>

                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[860px] border-collapse text-sm text-slate-700">
                        <thead>
                          <tr>
                            <th className="border border-slate-300 px-3 py-2 text-left font-semibold">Laboratory</th>
                            <th className="border border-slate-300 px-3 py-2 text-left font-semibold">Yr. I / Date: {isEditMode ? <input type="date" value={displayFormValue(labsByYear.YR_1?.date).slice(0, 10)} onChange={(e) => handleYearLabFieldChange('YR_1', 'date', e.target.value)} className="ml-1 border-b border-slate-400 bg-transparent outline-none" /> : displayFormDateOnly(labsByYear.YR_1?.date)}</th>
                            <th className="border border-slate-300 px-3 py-2 text-left font-semibold">Yr. II / Date: {isEditMode ? <input type="date" value={displayFormValue(labsByYear.YR_2?.date).slice(0, 10)} onChange={(e) => handleYearLabFieldChange('YR_2', 'date', e.target.value)} className="ml-1 border-b border-slate-400 bg-transparent outline-none" /> : displayFormDateOnly(labsByYear.YR_2?.date)}</th>
                            <th className="border border-slate-300 px-3 py-2 text-left font-semibold">Yr. III / Date: {isEditMode ? <input type="date" value={displayFormValue(labsByYear.YR_3?.date).slice(0, 10)} onChange={(e) => handleYearLabFieldChange('YR_3', 'date', e.target.value)} className="ml-1 border-b border-slate-400 bg-transparent outline-none" /> : displayFormDateOnly(labsByYear.YR_3?.date)}</th>
                            <th className="border border-slate-300 px-3 py-2 text-left font-semibold">Yr. IV / Date: {isEditMode ? <input type="date" value={displayFormValue(labsByYear.YR_4?.date).slice(0, 10)} onChange={(e) => handleYearLabFieldChange('YR_4', 'date', e.target.value)} className="ml-1 border-b border-slate-400 bg-transparent outline-none" /> : displayFormDateOnly(labsByYear.YR_4?.date)}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { label: 'Hgb', key: 'hgb' },
                            { label: 'Hct', key: 'hct' },
                            { label: 'WBC', key: 'wbc' },
                            { label: 'Plt. Ct.', key: 'pltCt' },
                            { label: 'Blood Type', key: 'bloodType' },
                            { label: 'Glucose/Sugar', key: 'glucoseSugar' },
                            { label: 'Protein', key: 'protein' },
                            { label: 'X-ray Result', key: 'xrayResult' },
                            { label: 'Abnormal Findings', key: 'xrayFindingsEnc' },
                            { label: 'Others', key: 'othersEnc' },
                          ].map((row) => (
                            <tr key={row.key}>
                              <td className="border border-slate-300 px-3 py-2 font-medium">{row.label}</td>
                              <td className="border border-slate-300 px-3 py-2">{isEditMode ? <input value={displayFormValue((labsByYear.YR_1 as any)?.[row.key])} onChange={(e) => handleYearLabFieldChange('YR_1', row.key, e.target.value)} className="w-full bg-transparent outline-none" /> : displayFormValue((labsByYear.YR_1 as any)?.[row.key])}</td>
                              <td className="border border-slate-300 px-3 py-2">{isEditMode ? <input value={displayFormValue((labsByYear.YR_2 as any)?.[row.key])} onChange={(e) => handleYearLabFieldChange('YR_2', row.key, e.target.value)} className="w-full bg-transparent outline-none" /> : displayFormValue((labsByYear.YR_2 as any)?.[row.key])}</td>
                              <td className="border border-slate-300 px-3 py-2">{isEditMode ? <input value={displayFormValue((labsByYear.YR_3 as any)?.[row.key])} onChange={(e) => handleYearLabFieldChange('YR_3', row.key, e.target.value)} className="w-full bg-transparent outline-none" /> : displayFormValue((labsByYear.YR_3 as any)?.[row.key])}</td>
                              <td className="border border-slate-300 px-3 py-2">{isEditMode ? <input value={displayFormValue((labsByYear.YR_4 as any)?.[row.key])} onChange={(e) => handleYearLabFieldChange('YR_4', row.key, e.target.value)} className="w-full bg-transparent outline-none" /> : displayFormValue((labsByYear.YR_4 as any)?.[row.key])}</td>
                            </tr>
                          ))}
                          <tr>
                            <td className="border border-slate-300 px-3 py-2 font-medium">Date Received</td>
                            <td className="border border-slate-300 px-3 py-2">{isEditMode ? <input type="date" value={displayFormValue(labsByYear.YR_1?.dateReceived).slice(0, 10)} onChange={(e) => handleYearLabFieldChange('YR_1', 'dateReceived', e.target.value)} className="w-full bg-transparent outline-none" /> : displayFormDateOnly(labsByYear.YR_1?.dateReceived)}</td>
                            <td className="border border-slate-300 px-3 py-2">{isEditMode ? <input type="date" value={displayFormValue(labsByYear.YR_2?.dateReceived).slice(0, 10)} onChange={(e) => handleYearLabFieldChange('YR_2', 'dateReceived', e.target.value)} className="w-full bg-transparent outline-none" /> : displayFormDateOnly(labsByYear.YR_2?.dateReceived)}</td>
                            <td className="border border-slate-300 px-3 py-2">{isEditMode ? <input type="date" value={displayFormValue(labsByYear.YR_3?.dateReceived).slice(0, 10)} onChange={(e) => handleYearLabFieldChange('YR_3', 'dateReceived', e.target.value)} className="w-full bg-transparent outline-none" /> : displayFormDateOnly(labsByYear.YR_3?.dateReceived)}</td>
                            <td className="border border-slate-300 px-3 py-2">{isEditMode ? <input type="date" value={displayFormValue(labsByYear.YR_4?.dateReceived).slice(0, 10)} onChange={(e) => handleYearLabFieldChange('YR_4', 'dateReceived', e.target.value)} className="w-full bg-transparent outline-none" /> : displayFormDateOnly(labsByYear.YR_4?.dateReceived)}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-12">
                <div className="flex items-center justify-end gap-2">
                  <button
                    onClick={handlePrintMedicalRecord}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
                  >
                    <Printer size={16} /> Print
                  </button>
                  {canEditCurrentTab && (
                    <button
                      onClick={() => {
                        if (!isEditMode) {
                          setIsEditMode(true);
                          return;
                        }
                        setShowSaveConfirmation(true);
                      }}
                      disabled={isSaving}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save size={16} /> {isSaving ? 'Saving...' : isEditMode ? 'Save Updates' : 'Update Record'}
                    </button>
                  )}
                </div>
                <MedicalHistoryForm 
                  data={medicalHistory} 
                  onChange={(f, v) => {
                    if (!isEditMode || activeTab !== 'medical-record') return;
                    setMedicalHistory(prev => ({ ...prev, [f]: v }));
                  }} 
                />
                <DiagnosticsSection
                  data={diagnostics}
                  onChange={(f, v) => {
                    if (!isEditMode || activeTab !== 'medical-record') return;
                    setDiagnostics(prev => ({ ...prev, [f]: v }));
                  }}
                />
              </div>
            )
          )}

           {/* CLINICAL HISTORY TAB */}
          {activeTab === 'clinical-history' && (
            <div className="space-y-12">
              {useNurseStyleMedicalRecord ? (
                <div className="bg-white rounded-2xl border border-slate-100 p-6 space-y-4">
                  <h3 className="text-base font-bold text-slate-800">Clinical History</h3>
                  {clinicalHistoryEvents.length === 0 ? (
                    <p className="text-sm text-slate-500">No clinic history entries found.</p>
                  ) : (
                    <div className="space-y-3">
                      {clinicalHistoryEvents.map((event) => (
                        <div key={event.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{event.typeLabel}</p>
                            <p className="text-sm font-bold text-blue-700">{event.when}</p>
                          </div>
                          <div className="mt-3 rounded-lg border border-blue-100 bg-blue-50 p-3">
                            <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">Findings</p>
                            <p className="text-sm font-semibold text-slate-800 mt-1">{event.summary}</p>
                          </div>
                          <div className="mt-2 space-y-1">
                            {event.details.map((detail) => (
                              <p key={`${event.id}-${detail}`} className="text-xs text-slate-500">{detail}</p>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <HistoryTable 
                  records={historyRecords}
                  onAdd={() => setHistoryRecords(prev => [...prev, { id: Math.random().toString(), date: new Date().toISOString().split('T')[0], complaint: '', treatment: '', remarks: '' }])}
                  onUpdate={(id, f, v) => setHistoryRecords(prev => prev.map(r => r.id === id ? { ...r, [f]: v } : r))}
                  onDelete={(id) => setHistoryRecords(prev => prev.filter(r => r.id !== id))}
                />
              )}
            </div>
          )}

          {/* DENTAL RECORDS TAB - Coming Soon */}
          {shouldShowDentalRecordsTab && activeTab === 'dental-records' && (
            <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center">
              <Smile size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">Dental Records</h3>
              <p className="text-slate-500">Dental records module coming soon</p>
            </div>
          )}

          {/* MEDICAL CONSULTATION TAB */}
          {activeTab === 'medical-consultation' && (
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-800 border-b pb-2 inline-block border-slate-200">Consult</h2>
                  <div className="text-xs text-slate-400 italic mt-2">
                    {activeConsultationQueueItem
                      ? 'Active consultation found. Chief complaint, BP, and temperature were auto-filled.'
                      : 'No active consultation found. Fill out the fields manually.'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { void handleSaveConsultation(); }}
                  disabled={isSavingConsult}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Save size={16} /> {isSavingConsult ? 'Saving...' : 'Save Consultation'}
                </button>
              </div>

              <div className="bg-teal-50 rounded-xl border border-teal-200 p-4 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-teal-600">Patient Information (auto-filled)</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="mb-1 text-xs font-semibold text-teal-700">Full Name</p>
                    <div className="rounded p-2.5 text-sm text-gray-700 bg-gray-100 border border-gray-200">{displayValue(record.lastName)}, {displayValue(record.firstName)}</div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold text-teal-700">Course / Dept</p>
                    <div className="rounded p-2.5 text-sm text-gray-700 bg-gray-100 border border-gray-200">{displayValue(record.courseDept)}</div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="mb-1 block text-xs font-semibold text-gray-600">Date</p>
                      <input
                        type="date"
                        value={consultForm.visitDate}
                        onChange={(e) => handleConsultFieldChange('visitDate', e.target.value)}
                        className="w-full border border-gray-300 rounded p-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <p className="mb-1 block text-xs font-semibold text-gray-600">Time</p>
                      <input
                        type="time"
                        value={consultForm.visitTime}
                        onChange={(e) => handleConsultFieldChange('visitTime', e.target.value)}
                        className="w-full border border-gray-300 rounded p-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="mb-1 block text-xs font-semibold text-gray-600">Age</p>
                      <input
                        type="text"
                        value={consultForm.age}
                        onChange={(e) => handleConsultFieldChange('age', e.target.value)}
                        className="w-full border border-gray-300 rounded p-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <p className="mb-1 block text-xs font-semibold text-gray-600">Sex</p>
                      <input
                        type="text"
                        value={consultForm.sex}
                        onChange={(e) => handleConsultFieldChange('sex', e.target.value)}
                        className="w-full border border-gray-300 rounded p-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 block text-xs font-semibold text-gray-600">Chief Complaint</p>
                    <textarea
                      value={consultForm.chiefComplaint}
                      onChange={(e) => handleConsultFieldChange('chiefComplaint', e.target.value)}
                      className="w-full min-h-[78px] border border-gray-300 rounded p-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="mb-1 block text-xs font-semibold text-gray-600">Blood Pressure</p>
                      <input
                        type="text"
                        value={consultForm.bp}
                        onChange={(e) => handleConsultFieldChange('bp', e.target.value)}
                        className="w-full border border-gray-300 rounded p-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                    <div>
                      <p className="mb-1 block text-xs font-semibold text-gray-600">Temperature (°C)</p>
                      <input
                        type="text"
                        value={consultForm.temperature}
                        onChange={(e) => handleConsultFieldChange('temperature', e.target.value)}
                        className="w-full border border-gray-300 rounded p-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      />
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 block text-xs font-semibold text-gray-600">Diagnosis</p>
                    <textarea
                      value={consultForm.diagnosis}
                      onChange={(e) => handleConsultFieldChange('diagnosis', e.target.value)}
                      className="w-full min-h-[78px] border border-gray-300 rounded p-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                    />
                  </div>

                  <div>
                    <p className="mb-1 block text-xs font-semibold text-gray-600">Treatment Given</p>
                    <textarea
                      value={consultForm.treatmentProvided}
                      onChange={(e) => handleConsultFieldChange('treatmentProvided', e.target.value)}
                      className="w-full min-h-[78px] border border-gray-300 rounded p-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                    />
                  </div>

                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-3">
                    <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                      <input
                        type="checkbox"
                        checked={consultForm.addFollowUp}
                        onChange={(e) => handleConsultFieldChange('addFollowUp', e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      />
                      Add Follow Up Appointment
                    </label>
                    {consultForm.addFollowUp && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <p className="mb-1 block text-xs font-semibold text-gray-600">Follow Up Date</p>
                          <input
                            type="date"
                            value={consultForm.followUpDate}
                            onChange={(e) => handleConsultFieldChange('followUpDate', e.target.value)}
                            className="w-full border border-gray-300 rounded p-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          />
                        </div>
                        <div>
                          <p className="mb-1 block text-xs font-semibold text-gray-600">Follow Up Time</p>
                          <input
                            type="time"
                            value={consultForm.followUpTime}
                            onChange={(e) => handleConsultFieldChange('followUpTime', e.target.value)}
                            className="w-full border border-gray-300 rounded p-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <p className="mb-1 block text-xs font-semibold text-gray-600">Medicine Dispensed (Inventory)</p>
                    {consultMedicines.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {consultMedicines.map((item) => (
                          <div key={item.id} className="flex items-center justify-between rounded border border-teal-100 bg-teal-50 px-3 py-2 text-sm">
                            <span className="text-gray-700">{item.medicine}</span>
                            <div className="flex items-center gap-3">
                              <span className="font-semibold text-teal-700">x{item.qty}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveConsultMedicine(item.id)}
                                className="rounded border border-red-200 bg-white px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_auto] gap-3">
                      <select
                        value={consultNewMedicineId}
                        onChange={(e) => setConsultNewMedicineId(e.target.value)}
                        className="w-full border border-gray-300 rounded p-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      >
                        <option value="">Select medicine from inventory</option>
                        {inventoryOptions.map((item) => (
                          <option key={item.id} value={item.id} disabled={item.currentStock <= 0}>
                            {item.itemName} ({item.currentStock} {item.unit})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min={1}
                        value={consultNewQty}
                        onChange={(e) => setConsultNewQty(e.target.value)}
                        className="w-full border border-gray-300 rounded p-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                        placeholder="Quantity"
                      />
                      <button
                        type="button"
                        onClick={handleAddConsultMedicine}
                        className="rounded border border-teal-300 px-4 py-2.5 text-sm font-semibold text-teal-700 hover:bg-teal-50"
                      >
                        Add
                      </button>
                    </div>

                    {consultMedicineError && (
                      <div className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{consultMedicineError}</div>
                    )}

                    {consultMedicines.length === 0 && !consultMedicineError && (
                      <div className="mt-2 rounded p-2.5 text-sm text-gray-500 bg-gray-100 border border-gray-200">No medicine selected for this consultation.</div>
                    )}
                  </div>

                  {consultError && (
                    <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{consultError}</div>
                  )}
                </div>

              {latestConsultationDetails.visitDate && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Latest Saved Consultation</p>
                  <p className="text-sm text-slate-700 mt-1">
                    {displayFormDateOnly(latestConsultationDetails.visitDate)} {latestConsultationDetails.visitTime ? `at ${formatTime12Hour(latestConsultationDetails.visitTime)}` : ''}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* PRESCRIPTIONS TAB */}
          {!isNurseSideRecord && activeTab === 'prescriptions' && (
            <div className="max-w-4xl mx-auto">
              <PrescriptionPad 
                patient={{
                  fullName: `${record.lastName}, ${record.firstName}`,
                  age: record.age || 0,
                  date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                }}
                medicines={medicines}
                onAddMedicine={() => {
                  setMedicineDraftError('');
                  setShowAddMedicineModal(true);
                }}
                onUpdateMedicine={(id, f, v) => setMedicines(prev => prev.map(m => m.id === id ? { ...m, [f]: v } : m))}
                onDeleteMedicine={(id) => setMedicines(prev => prev.filter(m => m.id !== id))}
                onPrint={handlePrintPrescription}
                onDownload={() => alert('PDF Generation')}
              />
            </div>
          )}
        </div>
      </main>

      <SaveConfirmationModal 
        isOpen={showSaveConfirmation}
        onConfirm={() => {
          setIsSaving(true);
          setTimeout(() => {
            setIsSaving(false);
            setIsEditMode(false);
            setShowSaveConfirmation(false);
            setSaveToast('Record updates saved successfully.');
          }, 1500);
        }}
        onCancel={() => setShowSaveConfirmation(false)}
        isLoading={isSaving}
      />

      {showAddMedicineModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0, 0, 0, 0.45)' }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddMedicineModal(false);
            }
          }}
        >
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-bold text-gray-900">Add Medicine</h3>
              <button
                type="button"
                onClick={() => setShowAddMedicineModal(false)}
                className="rounded-md p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
              >
                ×
              </button>
            </div>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-600">Medicine</label>
                <select
                  value={medicineDraft.inventoryId}
                  onChange={(e) => setMedicineDraft((prev) => ({ ...prev, inventoryId: e.target.value }))}
                  className="w-full border border-gray-300 rounded p-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">Select medicine from inventory</option>
                  {inventoryOptions.map((item) => (
                    <option key={item.id} value={item.id} disabled={item.currentStock <= 0}>
                      {item.itemName} ({item.currentStock} {item.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">How many days to take</label>
                  <input
                    type="number"
                    min={1}
                    value={medicineDraft.daysToTake}
                    onChange={(e) => setMedicineDraft((prev) => ({ ...prev, daysToTake: e.target.value }))}
                    className="w-full border border-gray-300 rounded p-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">How many per day</label>
                  <input
                    type="number"
                    min={1}
                    value={medicineDraft.timesPerDay}
                    onChange={(e) => setMedicineDraft((prev) => ({ ...prev, timesPerDay: e.target.value }))}
                    className="w-full border border-gray-300 rounded p-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-600">Intervals</label>
                <div className="flex flex-wrap gap-3">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      checked={medicineDraft.intervalMode === 'after-meal'}
                      onChange={() => setMedicineDraft((prev) => ({ ...prev, intervalMode: 'after-meal' }))}
                    />
                    Every after meal
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="radio"
                      checked={medicineDraft.intervalMode === 'hours'}
                      onChange={() => setMedicineDraft((prev) => ({ ...prev, intervalMode: 'hours' }))}
                    />
                    Specific hours
                  </label>
                </div>
              </div>

              {medicineDraft.intervalMode === 'hours' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Every how many hours</label>
                  <input
                    type="number"
                    min={1}
                    value={medicineDraft.everyHours}
                    onChange={(e) => setMedicineDraft((prev) => ({ ...prev, everyHours: e.target.value }))}
                    className="w-full border border-gray-300 rounded p-2.5 text-sm text-gray-800 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              )}

              {medicineDraftError && (
                <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">{medicineDraftError}</div>
              )}
            </div>

            <div className="mt-5 flex justify-end gap-2 border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setShowAddMedicineModal(false)}
                className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAddMedicineFromModal}
                className="rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
              >
                Add to Prescription
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
