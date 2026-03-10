'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import PhysicalExamModal from '@/components/modals/PhysicalExamModal';
import ConsultationModal from '@/components/modals/ConsultationModal';

const QrCameraScanner = dynamic(() => import('@/components/scanner/QrCameraScanner'), {
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
  courseDept: string;
  age: number | null;
  sex: string | null;
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

interface InventoryItem {
  id: string;
  itemName: string;
}

interface InventoryResponse {
  success: boolean;
  data: InventoryItem[];
}

interface EmergencyAlertResponse {
  success: boolean;
  message: string;
  data?: {
    recipient?: string;
    status?: string;
    timestamp?: string;
  };
}

interface UiStudent {
  userId: string;
  studentProfileId: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  course: string;
  college: string;
  age: string;
  sex: string;
  allergies: string[];
  bloodType: string;
}

interface PhysicalExamFormData {
  yearLevel: string;
  dateOfExam: string;
  examinedBy: string;
  bp: string;
  heartRate: string;
  respRate: string;
  temperature: string;
  weight: string;
  height: string;
  visualAcuity: string;
  skin: string;
  heent: string;
  chestLungs: string;
  heart: string;
  abdomen: string;
  extremities: string;
  remarks: string;
  hgb: string;
  hct: string;
  wbc: string;
  cbcBldType: string;
  urineGlucose: string;
  urineProtein: string;
  chestXray: 'normal' | 'abnormal' | '';
  chestXrayFindings: string;
  labOthers: string;
}

type SearchStatus = 'idle' | 'found' | 'not-found';

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
    course: profile.courseDept || 'N/A',
    college: profile.courseDept || 'N/A',
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

export default function ScannerPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
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
  const [sendingEmergency, setSendingEmergency] = useState(false);

  const [toastType, setToastType] = useState<'found' | 'not-found' | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const previousStudentIdParam = useRef(studentIdParam);

  const [inventoryByName, setInventoryByName] = useState<Record<string, string>>({});

  useEffect(() => {
    if (toastType) {
      toastTimer.current = setTimeout(() => setToastType(null), 2500);
    }

    return () => {
      if (toastTimer.current) clearTimeout(toastTimer.current);
    };
  }, [toastType]);

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
        const mapped: Record<string, string> = {};

        for (const item of response.data || []) {
          mapped[item.itemName.trim().toLowerCase()] = item.id;
        }

        setInventoryByName(mapped);
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
      symptoms: string;
      bp: string;
      temperature: string;
      treatmentProvided: string;
    },
    medicines: Array<{ medicine: string; qty: string }>,
  ) {
    if (!foundStudent) return;

    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      return;
    }

    const dispensedMedicines = medicines
      .map((medicine) => {
        const inventoryId = inventoryByName[medicine.medicine.trim().toLowerCase()];
        if (!inventoryId) return null;

        const qty = Number(medicine.qty);
        return {
          inventoryId,
          quantity: Number.isFinite(qty) && qty > 0 ? qty : 1,
        };
      })
      .filter((entry): entry is { inventoryId: string; quantity: number } => entry !== null);

    const normalizedSymptoms = form.symptoms?.trim() || '';
    const normalizedTreatment = form.treatmentProvided?.trim() || '';

    const structuredComplaint = {
      symptoms: normalizedSymptoms,
      chiefComplaint: normalizedSymptoms,
      diagnosis: normalizedSymptoms,
      treatmentProvided: normalizedTreatment,
      treatmentManagement: normalizedTreatment,
      vitals: {
        bp: form.bp?.trim() || null,
        temperature: form.temperature?.trim() || null,
      },
      notes: [normalizedSymptoms, normalizedTreatment]
        .map((part) => part?.trim())
        .filter(Boolean)
        .join(' | ') || 'General consultation',
    };

    try {
      await api.post(
        '/clinic/visits',
        {
          studentProfileId: foundStudent.studentProfileId,
          visitDate: new Date().toISOString(),
          visitTime: new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
          chiefComplaintEnc: JSON.stringify(structuredComplaint),
          dispensedMedicines,
        },
        token,
      );

      const skipped = medicines.length - dispensedMedicines.length;
      if (skipped > 0) {
        setActionMessage(`Consultation saved. ${skipped} medicine item(s) were not in inventory and were skipped.`);
      } else {
        setActionMessage('Consultation saved successfully.');
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

      const response = await api.post<EmergencyAlertResponse>(
        '/clinic/emergency-alert',
        {
          studentProfileId: foundStudent.studentProfileId,
          incidentDetails: 'Urgent health concern detected during clinic screening.',
        },
        token,
      );

      const recipient = response.data?.recipient || 'the emergency contact';
      setActionMessage(`Guardian alert sent successfully to ${recipient}.`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to send guardian emergency alert.');
      }
    } finally {
      setSendingEmergency(false);
    }
  }

  async function handlePhysicalExamSave(form: PhysicalExamFormData) {
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

  const initials = foundStudent
    ? `${foundStudent.firstName[0]}${foundStudent.lastName[0]}`.toUpperCase()
    : '';

  return (
    <div className="relative p-4 sm:p-6 max-w-2xl mx-auto">
      {showConsultModal && foundStudent && (
        <ConsultationModal
          patient={{
            name: `${foundStudent.firstName} ${foundStudent.lastName}`,
            department: foundStudent.college,
            course: foundStudent.course,
          }}
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
            void handlePhysicalExamSave(form as PhysicalExamFormData);
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

      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">QR Code Scanner</h1>
        <p className="text-sm text-gray-500 mt-1">Scan a student QR code or search by student number.</p>
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
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-teal-500 flex items-center justify-center shrink-0 shadow-md shadow-teal-100">
              <span className="text-white text-lg font-bold tracking-wide">{initials}</span>
            </div>

            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                {foundStudent.lastName}, {foundStudent.firstName}
              </h2>
              <p className="text-sm font-semibold text-teal-500 mt-0.5">{foundStudent.studentNumber}</p>
              <p className="text-xs text-gray-500 mt-0.5">{foundStudent.course}</p>
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

          <div className="flex flex-col sm:flex-row gap-3 mt-6">
            <button
              onClick={() => setShowConsultModal(true)}
              className="flex-1 bg-teal-500 hover:bg-teal-600 text-white font-semibold text-sm px-5 py-3 rounded-xl transition-colors"
            >
              Consult
            </button>

            <button
              onClick={() => setShowExamModal(true)}
              className="flex-1 border-2 border-teal-500 text-teal-600 hover:bg-teal-50 font-semibold text-sm px-5 py-3 rounded-xl transition-colors bg-white"
            >
              Physical Exam
            </button>

            <button
              onClick={() => { void handleEmergencyAlert(); }}
              disabled={sendingEmergency}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold text-sm px-5 py-3 rounded-xl transition-colors disabled:opacity-70"
            >
              {sendingEmergency ? 'Sending Alert...' : 'Alert Guardian'}
            </button>

            <button
              onClick={() => router.push(`/dashboard/staff/record/${encodeURIComponent(foundStudent.studentNumber)}`)}
              className="flex-1 border border-gray-200 text-gray-500 hover:border-teal-300 hover:text-teal-600 font-semibold text-sm px-5 py-3 rounded-xl transition-colors bg-white"
            >
              View Record
            </button>
          </div>

          <div className="text-center mt-5">
            <button onClick={handleReset} className="text-xs text-gray-400 hover:text-teal-500 transition-colors">
              Scan another student
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-8">
          <div className="mb-5">
            {cameraActive ? (
              <QrCameraScanner active={true} onScan={(value) => { void handleQrScan(value); }} />
            ) : (
              <div className="max-w-xs mx-auto">
                <button
                  type="button"
                  onClick={() => {
                    setCameraActive(true);
                    setStatus('idle');
                    setToastType(null);
                  }}
                  className="w-full flex flex-col items-center justify-center h-52 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 text-gray-400 hover:text-teal-500 hover:border-teal-300 transition-colors"
                >
                  <span className="text-sm font-medium">Tap to scan again</span>
                </button>
              </div>
            )}
          </div>

          <p className="text-center text-sm text-gray-500 mb-6">
            {cameraActive
              ? 'Hold the QR code steady within the camera frame'
              : 'Camera paused. Restart scan above or search manually below.'}
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
