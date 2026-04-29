'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import PhysicalExamModal, { type PhysicalExamRecordFormData } from '@/components/modals/PhysicalExamModal';
import ConsultationModal, { type InventoryOption } from '@/components/modals/ConsultationModal';

const QrScannerInput = dynamic(() => import('@/components/scanner/QrCameraScanner'), {
  ssr: false,
});

interface SearchStudent {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  courseDept: string;
  age: number | null;
  sex: string | null;
  user: {
    id: string;
  };
}

interface SearchResponse {
  success: boolean;
  data: SearchStudent[];
  message?: string;
}

interface ScanProfile {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  mi?: string | null;
  courseDept: string;
  age: number | null;
  sex: string | null;
  physicalExaminations?: { yearLevel?: string | null }[];
  medicalHistory?: {
    allergyEnc?: string | null;
    bloodType?: string | null;
  } | null;
}

interface ScanResponse {
  success: boolean;
  data: ScanProfile;
  emergencyAlert?: {
    warning?: string;
    instructions?: string;
  } | null;
}

interface InventoryResponse {
  success: boolean;
  data: InventoryOption[];
}

interface EmergencySmsResponse {
  success: boolean;
  message: string;
  data?: {
    studentProfileId?: string;
    recipientTelNumber?: string;
    messageSid?: string;
    status?: string;
  };
}

interface StatusToast {
  type: 'success' | 'error';
  message: string;
}

interface UiStudent {
  userId: string;
  studentProfileId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  mi: string;
  course: string;
  college: string;
  yearLevel: string;
  age: string;
  sex: string;
  allergies: string[];
  bloodType: string;
}

type SearchStatus = 'idle' | 'found' | 'not-found';
type CertificateStatus = 'pending' | 'pending_doctor' | 'doctor_approved' | 'denied';

const CERT_REQUEST_STORAGE_KEY = 'gchl_cert_requests';

interface ScannerCertificateRequest {
  id: string;
  studentName: string;
  studentNumber: string;
  courseDept: string;
  reason: string;
  requestedDateIso: string;
  status: CertificateStatus;
  doctorName?: string;
}

function parseAllergies(value?: string | null): string[] {
  if (!value) return [];

  const normalized = value.trim();
  if (!normalized) return [];

  const lowered = normalized.toLowerCase();
  if (['none', 'no', 'n/a', 'na'].includes(lowered)) return [];

  return normalized
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function looksLikeStudentNumber(value: string) {
  return /^\d{4}-\d{3,}$/.test(value.trim());
}

function normalizeParsedValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function classifyStudentIdentifier(value: string): { userId?: string; studentNumber?: string } {
  const normalized = value.trim();
  if (!normalized) return {};
  if (looksLikeStudentNumber(normalized)) {
    return { studentNumber: normalized };
  }
  return { userId: normalized };
}

function parseQrPayload(raw: string): {
  userId?: string;
  studentNumber?: string;
  qrToken?: string;
  fallbackText: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) return { fallbackText: '' };

  const fromRecord = (record: Record<string, unknown>) => {
    const qrToken = normalizeParsedValue(record.qrToken ?? record.token);
    const explicitUserId = normalizeParsedValue(record.userId ?? record.id);
    const explicitStudentNumber = normalizeParsedValue(record.studentNumber ?? record.studentNo);
    const ambiguousStudentId = normalizeParsedValue(record.studentId);

    const fromAmbiguousStudentId = classifyStudentIdentifier(ambiguousStudentId);
    const fromExplicitUserId = classifyStudentIdentifier(explicitUserId);
    const fromExplicitStudentNumber = classifyStudentIdentifier(explicitStudentNumber);

    return {
      qrToken: qrToken || undefined,
      userId: fromAmbiguousStudentId.userId || fromExplicitUserId.userId || undefined,
      studentNumber:
        fromAmbiguousStudentId.studentNumber
        || fromExplicitStudentNumber.studentNumber
        || undefined,
    };
  };

  try {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      const resolved = fromRecord(parsed);
      if (resolved.qrToken || resolved.userId || resolved.studentNumber) {
        return { ...resolved, fallbackText: trimmed };
      }
    }
  } catch {
    // Non-JSON payloads are treated as manual query text.
  }

  try {
    const url = new URL(trimmed);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const lastSegment = decodeURIComponent(pathSegments[pathSegments.length - 1] || '');
    const resolved = fromRecord({
      qrToken:
        url.searchParams.get('qrToken')
        || url.searchParams.get('token')
        || (url.pathname.includes('/scan-token/') ? lastSegment : ''),
      userId: url.searchParams.get('userId') || url.searchParams.get('id') || '',
      studentId:
        url.searchParams.get('studentId')
        || (url.pathname.includes('/scan/') ? lastSegment : ''),
      studentNumber: url.searchParams.get('studentNumber') || url.searchParams.get('studentNo') || '',
    });

    if (resolved.qrToken || resolved.userId || resolved.studentNumber) {
      return { ...resolved, fallbackText: trimmed };
    }
  } catch {
    // Keep raw fallback handling when payload is not a URL.
  }

  return { fallbackText: trimmed };
}

function mapProfileToStudent(userId: string, profile: ScanProfile): UiStudent {
  return {
    userId,
    studentProfileId: profile.id,
    studentNumber: profile.studentNumber,
    firstName: profile.firstName,
    lastName: profile.lastName,
    mi: profile.mi?.trim() || '',
    course: profile.courseDept || 'N/A',
    college: profile.courseDept || 'N/A',
    yearLevel: profile.physicalExaminations?.[0]?.yearLevel?.replace('YR_', 'Year ') || '',
    age: profile.age ? String(profile.age) : '',
    sex: profile.sex || '',
    allergies: parseAllergies(profile.medicalHistory?.allergyEnc),
    bloodType: profile.medicalHistory?.bloodType?.trim() || 'N/A',
  };
}

function BloodTypePill({ bloodType }: { bloodType: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-100">
      Blood Type: {bloodType || 'N/A'}
    </span>
  );
}

function AllergyPill({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-50 text-rose-500 border border-rose-100">
      {name}
    </span>
  );
}

function appendPendingLog(payload: unknown) {
  if (typeof window === 'undefined') {
    return;
  }

  const storageKey = 'pendingLogs';

  let existing: unknown[] = [];
  try {
    const raw = localStorage.getItem(storageKey);
    const parsed = raw ? JSON.parse(raw) : [];
    existing = Array.isArray(parsed) ? parsed : [];
  } catch {
    existing = [];
  }

  existing.push(payload);
  localStorage.setItem(storageKey, JSON.stringify(existing));
}

function readCertificateRequests(): ScannerCertificateRequest[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CERT_REQUEST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as ScannerCertificateRequest[] : [];
  } catch {
    return [];
  }
}

function saveCertificateRequests(rows: ScannerCertificateRequest[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CERT_REQUEST_STORAGE_KEY, JSON.stringify(rows));
}

export default function ScannerPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const roleSegment = pathname.split('/')[2] || 'staff';
  const recordBasePath = roleSegment === 'staff' ? '/dashboard/staff/record' : `/dashboard/${roleSegment}/records`;
  const studentIdParam = (searchParams.get('studentId') || '').trim();

  const [studentInput, setStudentInput] = useState('');
  const [status, setStatus] = useState<SearchStatus>('idle');
  const [foundStudent, setFoundStudent] = useState<UiStudent | null>(null);
  const [cameraActive, setCameraActive] = useState(true);

  const [showExamModal, setShowExamModal] = useState(false);
  const [showConsultModal, setShowConsultModal] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [statusToast, setStatusToast] = useState<StatusToast | null>(null);
  const [sendingEmergency, setSendingEmergency] = useState(false);
  const [requestingCertificate, setRequestingCertificate] = useState(false);
  const [certificateStatus, setCertificateStatus] = useState<CertificateStatus | null>(null);

  const [toastType, setToastType] = useState<'found' | 'not-found' | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousStudentIdParam = useRef(studentIdParam);

  const [inventoryOptions, setInventoryOptions] = useState<InventoryOption[]>([]);

  useEffect(() => {
    if (toastType) {
      toastTimer.current = setTimeout(() => setToastType(null), 2500);
    }

    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [toastType]);

  useEffect(() => {
    if (!statusToast) {
      return;
    }

    const timer = setTimeout(() => {
      setStatusToast(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [statusToast]);

  useEffect(() => {
    if (!foundStudent) {
      setCertificateStatus(null);
      return;
    }
    const rows = readCertificateRequests();
    const latest = rows
      .filter((item) => typeof item?.studentNumber === 'string' && item.studentNumber.toLowerCase() === foundStudent.studentNumber.toLowerCase())
      .sort((a, b) => new Date(b.requestedDateIso || 0).getTime() - new Date(a.requestedDateIso || 0).getTime())[0];
    setCertificateStatus((latest?.status as CertificateStatus | undefined) ?? null);
  }, [foundStudent]);

  function replaceStudentIdParam(nextStudentId: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    const currentStudentId = (searchParams.get('studentId') || '').trim();
    const normalized = nextStudentId?.trim() || '';

    if (!normalized) {
      if (!params.has('studentId')) return;
      params.delete('studentId');
    } else {
      if (currentStudentId.toLowerCase() === normalized.toLowerCase()) return;
      params.set('studentId', normalized);
    }

    const query = params.toString();
    const nextUrl = query ? `${pathname}?${query}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }

  function resetScannerState() {
    setStudentInput('');
    setStatus('idle');
    setFoundStudent(null);
    setError('');
    setActionMessage('');
    setToastType(null);
    setShowConsultModal(false);
    setShowExamModal(false);
    setCameraActive(true);
  }

  useEffect(() => {
    async function loadInventoryLookup() {
      const token = getToken();
      if (!token) return;

      try {
        const response = await api.get<InventoryResponse>('/inventory', token);
        setInventoryOptions(response.data || []);
      } catch {
        // Keep scanner usable even when inventory lookup fails.
      }
    }

    void loadInventoryLookup();
  }, []);

  useEffect(() => {
    const hadStudentIdParam = !!previousStudentIdParam.current;
    previousStudentIdParam.current = studentIdParam;

    if (!studentIdParam) {
      if (!hadStudentIdParam) return;
      resetScannerState();
      return;
    }

    if (foundStudent?.studentNumber.toLowerCase() === studentIdParam.toLowerCase()) {
      return;
    }

    setCameraActive(false);
    setStudentInput(studentIdParam);
    void resolveLookup(studentIdParam);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentIdParam, foundStudent?.studentNumber]);

  async function fetchStudentByUserId(userId: string) {
    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      return;
    }

    const response = await api.get<ScanResponse>(`/clinic/scan/${userId}`, token);
    const mappedStudent = mapProfileToStudent(userId, response.data);

    setFoundStudent(mappedStudent);
    setStudentInput(mappedStudent.studentNumber);
    setStatus('found');
    setCameraActive(false);
    setToastType('found');
    setError('');
    replaceStudentIdParam(mappedStudent.studentNumber);

    if (response.emergencyAlert?.warning) {
      setActionMessage(response.emergencyAlert.warning);
    } else {
      setActionMessage('');
    }
  }

  async function fetchStudentByQrToken(qrToken: string) {
    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      return;
    }

    const response = await api.get<ScanResponse>(`/clinic/scan-token/${encodeURIComponent(qrToken)}`, token);
    const mappedStudent = mapProfileToStudent('', response.data);

    setFoundStudent(mappedStudent);
    setStudentInput(mappedStudent.studentNumber);
    setStatus('found');
    setCameraActive(false);
    setToastType('found');
    setError('');
    replaceStudentIdParam(mappedStudent.studentNumber);

    if (response.emergencyAlert?.warning) {
      setActionMessage(response.emergencyAlert.warning);
    } else {
      setActionMessage('');
    }
  }

  async function searchStudent(query: string) {
    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      return;
    }

    const response = await api.get<SearchResponse>(`/clinic/search?q=${encodeURIComponent(query)}`, token);
    const matches = response.data || [];

    if (matches.length === 0) {
      setFoundStudent(null);
      setStatus('not-found');
      setToastType('not-found');
      return;
    }

    const exactMatch = matches.find((student) => student.studentNumber.toLowerCase() === query.toLowerCase());
    const chosen = exactMatch || matches[0];

    await fetchStudentByUserId(chosen.user.id);
  }

  async function resolveLookup(rawInput: string) {
    const parsed = parseQrPayload(rawInput);
    if (!parsed.userId && !parsed.studentNumber && !parsed.qrToken && !parsed.fallbackText) return;

    setLoading(true);
    setError('');
    setActionMessage('');

    try {
      if (parsed.qrToken) {
        await fetchStudentByQrToken(parsed.qrToken);
      } else if (parsed.userId) {
        await fetchStudentByUserId(parsed.userId);
      } else if (parsed.studentNumber) {
        await searchStudent(parsed.studentNumber);
      } else {
        await searchStudent(parsed.fallbackText);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Could not fetch student record right now.');
      }
      setFoundStudent(null);
      setStatus('not-found');
      setToastType('not-found');
    } finally {
      setLoading(false);
    }
  }

  async function handleQrScan(text: string) {
    setCameraActive(false);
    await resolveLookup(text);
  }

  async function handleManualSearch() {
    const query = studentInput.trim();
    if (!query) return;

    setCameraActive(false);
    await resolveLookup(query);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      void handleManualSearch();
    }
  }

  function handleReset() {
    resetScannerState();
    replaceStudentIdParam(null);
  }

  async function handleConsultSave(
    form: {
      visitDate: string;
      visitTime: string;
      age: string;
      sex: string;
      chiefComplaint: string;
      bp: string;
      temperature: string;
      treatmentProvided: string;
    },
    medicines: Array<{ inventoryId: string; medicine: string; qty: string }>,
  ) {
    if (!foundStudent) return;

    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      return;
    }

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

    const normalizedTag = 'General Consultation';
    const normalizedChiefComplaint = form.chiefComplaint?.trim() || '';
    const normalizedTreatment = form.treatmentProvided?.trim() || '';
    const normalizedVisitDate = form.visitDate?.trim() || new Date().toISOString();

    const structuredComplaint = {
      concernTag: normalizedTag,
      symptoms: normalizedChiefComplaint,
      chiefComplaint: normalizedChiefComplaint || normalizedTag,
      diagnosis: normalizedTag,
      treatmentProvided: normalizedTreatment,
      treatmentManagement: normalizedTreatment,
      age: form.age?.trim() || null,
      sex: form.sex?.trim() || null,
      vitals: {
        bp: form.bp?.trim() || null,
        temperature: form.temperature?.trim() || null,
      },
      notes: [normalizedTag, normalizedChiefComplaint, normalizedTreatment]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(' | ') || 'General consultation',
    };

    const requestPayload = {
      studentProfileId: foundStudent.studentProfileId,
      visitDate: normalizedVisitDate,
      visitTime: form.visitTime?.trim() || new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
      chiefComplaintEnc: JSON.stringify(structuredComplaint),
      dispensedMedicines,
    };

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      appendPendingLog({
        type: 'CLINIC_VISIT',
        queuedAt: new Date().toISOString(),
        payload: requestPayload,
      });

      alert('You are offline. This consultation was saved to pendingLogs and can be synced when internet is back.');
      setActionMessage('Offline mode: consultation saved locally (pendingLogs).');
      return;
    }

    try {
      await api.post(
        '/clinic/visits',
        requestPayload,
        token,
      );

      const skipped = medicines.length - dispensedMedicines.length;
      if (skipped > 0) {
        setActionMessage(`Consultation saved. ${skipped} medicine item(s) were not in inventory and were skipped.`);
      } else {
        setActionMessage('Consultation saved successfully and inventory levels were updated.');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to save consultation record.');
      }
    }
  }

  async function handleEmergencyAlert() {
    if (!foundStudent) return;

    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      return;
    }

    try {
      setSendingEmergency(true);
      setError('');

      const response = await api.post<EmergencySmsResponse>(
        '/clinic/emergency/send-sms',
        {
          studentProfileId: foundStudent.studentProfileId,
        },
        token,
      );

      setActionMessage('');
      setStatusToast({
        type: 'success',
        message: response.message || 'Emergency SMS has been sent to the guardian.',
      });
    } catch (err) {
      if (err instanceof ApiError) {
        setError('');
        setStatusToast({
          type: 'error',
          message: err.message,
        });
      } else {
        setError('');
        setStatusToast({
          type: 'error',
          message: 'Failed to send emergency SMS.',
        });
      }
    } finally {
      setSendingEmergency(false);
    }
  }

  async function handlePhysicalExamSave(form: PhysicalExamRecordFormData) {
    if (!foundStudent) return;

    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      return;
    }

    try {
      setError('');

      await api.post(
        '/physical-exams',
        {
          studentProfileId: foundStudent.studentProfileId,
          ...form,
        },
        token,
      );

      setActionMessage('Physical examination recorded successfully.');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to save physical examination record.');
      }
    }
  }

  async function handleRequestMedicalCertificate() {
    if (!foundStudent || requestingCertificate || certificateStatus) return;
    setRequestingCertificate(true);

    try {
      const rows = readCertificateRequests();
      const newRequest = {
        id: `cert-${Date.now()}`,
        studentName: `${foundStudent.firstName} ${foundStudent.lastName}`,
        studentNumber: foundStudent.studentNumber,
        courseDept: foundStudent.course || foundStudent.college || 'N/A',
        reason: 'Medical certificate requested from QR View Record.',
        requestedDateIso: new Date().toISOString(),
        status: 'pending' as const,
      };
      saveCertificateRequests([newRequest, ...rows]);
      setCertificateStatus('pending');
      setStatusToast({
        type: 'success',
        message: 'Medical certificate request submitted. Status: Pending.',
      });
    } finally {
      setRequestingCertificate(false);
    }
  }

  const initials = foundStudent
    ? `${foundStudent.firstName[0]}${foundStudent.lastName[0]}`.toUpperCase()
    : '';

  return (
    <div className="relative p-4 sm:p-6 max-w-2xl mx-auto">
      {showConsultModal && foundStudent && (
        <ConsultationModal
          patient={{
            firstName: foundStudent.firstName,
            middleName: foundStudent.mi || '',
            lastName: foundStudent.lastName,
            department: foundStudent.college,
            course: foundStudent.course,
            yearLevel: foundStudent.yearLevel,
            age: foundStudent.age,
            sex: foundStudent.sex,
          }}
          inventoryOptions={inventoryOptions}
          onClose={() => setShowConsultModal(false)}
          onSave={(data, medicines) => {
            void handleConsultSave(data, medicines);
            setShowConsultModal(false);
          }}
        />
      )}

      {showExamModal && foundStudent && (
        <PhysicalExamModal
          studentName={`${foundStudent.firstName} ${foundStudent.lastName}`}
          onClose={() => setShowExamModal(false)}
          onSave={(form) => {
            void handlePhysicalExamSave(form);
            setShowExamModal(false);
          }}
        />
      )}

      <div
        aria-live="polite"
        className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 text-sm font-bold px-4 py-3 rounded-xl shadow-lg transition-all duration-300 ${
          toastType === 'found'
            ? 'bg-white border border-green-200 text-green-600 shadow-green-100'
            : 'bg-red-500 text-white shadow-red-200'
        } ${toastType ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
      >
        {toastType === 'found' ? 'Student Found' : 'Student Not Found'}
      </div>

      <div
        aria-live="polite"
        className={`fixed top-20 right-4 z-50 text-sm font-semibold px-4 py-3 rounded-xl shadow-lg transition-all duration-300 ${
          statusToast?.type === 'success'
            ? 'bg-white border border-teal-200 text-teal-700 shadow-teal-100'
            : 'bg-red-500 text-white shadow-red-200'
        } ${statusToast ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
      >
        {statusToast?.message ?? ''}
      </div>

      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">QR Scanner</h1>
        <p className="text-sm text-gray-500 mt-1">Use the connected QR scanner or search by student number.</p>
      </div>

      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {actionMessage && (
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {actionMessage}
        </div>
      )}

      {status === 'found' && foundStudent ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 max-w-lg mx-auto w-full">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-teal-500 flex items-center justify-center shrink-0 shadow-md shadow-teal-100">
              <span className="text-white text-lg font-bold tracking-wide">{initials}</span>
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                {foundStudent.lastName}, {foundStudent.firstName}{foundStudent.mi ? ` ${foundStudent.mi}.` : ''}
              </h2>
              <p className="text-sm font-semibold text-teal-500 mt-0.5">{foundStudent.studentNumber}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {foundStudent.course}{foundStudent.yearLevel ? ` · ${foundStudent.yearLevel}` : ''}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 mt-4">
            <BloodTypePill bloodType={foundStudent.bloodType} />
            {foundStudent.allergies.length > 0 ? (
              foundStudent.allergies.map((allergy) => <AllergyPill key={allergy} name={allergy} />)
            ) : (
              <span className="text-xs text-gray-400 italic">No known allergies</span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              onClick={() => setShowConsultModal(true)}
              className="bg-teal-500 hover:bg-teal-600 text-white font-semibold text-sm px-4 py-3 rounded-xl transition-colors"
            >
              Consult
            </button>

            <button
              onClick={() => setShowExamModal(true)}
              className="border-2 border-teal-500 text-teal-600 hover:bg-teal-50 font-semibold text-sm px-4 py-3 rounded-xl transition-colors bg-white"
            >
              Physical Exam
            </button>

            <button
              onClick={() => { void handleEmergencyAlert(); }}
              disabled={sendingEmergency}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold text-sm px-4 py-3 rounded-xl transition-colors disabled:opacity-70"
            >
              {sendingEmergency ? 'Sending SMS...' : 'Text Emergency Contact'}
            </button>

            <button
              onClick={() => router.push(`${recordBasePath}/${encodeURIComponent(foundStudent.studentNumber)}`)}
              className="border border-gray-200 text-gray-500 hover:border-teal-300 hover:text-teal-600 font-semibold text-sm px-4 py-3 rounded-xl transition-colors bg-white"
            >
              View Record
            </button>
          </div>

          {certificateStatus && (
            <div className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
              certificateStatus === 'doctor_approved'
                ? 'bg-emerald-100 text-emerald-700'
                : certificateStatus === 'denied'
                  ? 'bg-red-100 text-red-700'
                  : certificateStatus === 'pending_doctor'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-amber-100 text-amber-700'
            }`}>
              Certificate Status: {certificateStatus === 'pending_doctor' ? 'Awaiting Doctor' : certificateStatus === 'doctor_approved' ? 'Approved' : certificateStatus === 'denied' ? 'Denied' : 'Pending'}
            </div>
          )}

          <div className="text-center mt-5">
            <button onClick={handleReset} className="text-xs text-gray-400 hover:text-teal-500 transition-colors">
              Scan another student
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8 max-w-lg mx-auto w-full">
          <div className="mb-5">
            {cameraActive ? (
              <QrScannerInput active={true} onScan={(value) => { void handleQrScan(value); }} />
            ) : (
              <div className="max-w-sm mx-auto">
                <button
                  type="button"
                  onClick={() => {
                    setCameraActive(true);
                    setStatus('idle');
                    setToastType(null);
                  }}
                  className="w-full flex flex-col items-center justify-center aspect-square bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:text-teal-500 hover:border-teal-300 transition-colors"
                >
                  <span className="text-sm font-medium">Tap to enable scanner again</span>
                </button>
              </div>
            )}
          </div>

          <p className="text-center text-sm text-gray-500 mb-6">
            {cameraActive
              ? 'Scan a QR code with the connected scanner device'
              : 'Scanner paused. Restart scanning above or search manually below.'}
          </p>

          <div className="flex items-center gap-3 mb-5">
            <div className="flex-1 border-t border-gray-100" />
            <span className="text-xs text-gray-400 font-medium">Or search manually</span>
            <div className="flex-1 border-t border-gray-100" />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={studentInput}
              onChange={(e) => {
                setStudentInput(e.target.value);
                if (status !== 'idle') setStatus('idle');
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter Student Number"
              className={`flex-1 border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 transition ${
                status === 'not-found'
                  ? 'border-red-300 bg-red-50 text-red-800 placeholder:text-red-300'
                  : 'border-gray-200 bg-white text-gray-800 placeholder:text-gray-400'
              }`}
            />
            <button
              onClick={() => { void handleManualSearch(); }}
              disabled={loading}
              className="bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors shrink-0 disabled:opacity-70"
            >
              {loading ? 'Searching...' : 'Search'}
            </button>
          </div>

          {status === 'not-found' && (
            <div className="mt-3 rounded-xl px-4 py-3 bg-red-50 border border-red-100 text-sm text-red-600">
              Student not found. Check the number or scan the QR code again.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
