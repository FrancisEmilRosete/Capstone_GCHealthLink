'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

const DOCUMENT_TYPES = [
  { value: 'PHYSICAL_EXAM', label: 'Physical Exam' },
  { value: 'LAB_RESULT', label: 'Lab Result' },
  { value: 'MED_CERT', label: 'Medical Certificate' },
  { value: 'VACCINATION_RECORD', label: 'Vaccination Record' },
  { value: 'OTHER', label: 'Other' },
] as const;

const CERT_REQUEST_STORAGE_KEY = 'gchl_cert_requests';
type CertificateStatus = 'pending' | 'pending_doctor' | 'doctor_approved' | 'denied';

interface SearchStudent {
  studentNumber: string;
  user: { id: string };
}

interface SearchResponse {
  success: boolean;
  data: SearchStudent[];
}

interface PhysicalExam {
  id: string;
  yearLevel: string | null;
  examDate: string;
  cr: string | null;
  rr: string | null;
  bp: string | null;
  temp: string | null;
  weight: string | null;
  height: string | null;
  bmi: string | null;
  visualAcuity: string | null;
  skin: string | null;
  heent: string | null;
  chestLungs: string | null;
  heart: string | null;
  abdomen: string | null;
  extremities: string | null;
  others: string | null;
  examinedBy: string | null;
}

interface LabResult {
  id: string;
  date: string;
  dateReceived: string | null;
  hgb: string | null;
  hct: string | null;
  wbc: string | null;
  pltCt: string | null;
  bloodType: string | null;
  glucoseSugar: string | null;
  protein: string | null;
  xrayResult: 'NORMAL' | 'ABNORMAL' | null;
  xrayFindingsEnc: string | null;
  othersEnc: string | null;
}

interface ScanProfile {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  courseDept: string;
  civilStatus: string | null;
  age: number | null;
  sex: string | null;
  birthday: string | null;
  presentAddress: string | null;
  telNumber: string | null;
  emergencyContactName: string | null;
  emergencyRelationship: string | null;
  emergencyContactAddress: string | null;
  emergencyContactTelNumber: string | null;
  medicalHistory: {
    allergyEnc?: string | null;
    chickenPoxEnc?: string | null;
    asthmaEnc?: string | null;
    diabetesEnc?: string | null;
    dysmenorrheaEnc?: string | null;
    epilepsySeizureEnc?: string | null;
    heartDisorderEnc?: string | null;
    hepatitisEnc?: string | null;
    hypertensionEnc?: string | null;
    measlesEnc?: string | null;
    mumpsEnc?: string | null;
    anxietyDisorderEnc?: string | null;
    panicAttackHyperventilationEnc?: string | null;
    pneumoniaEnc?: string | null;
    ptbPrimaryComplexEnc?: string | null;
    typhoidFeverEnc?: string | null;
    covid19Enc?: string | null;
    urinaryTractInfectionEnc?: string | null;
    hasPastOperationEnc?: string | null;
    operationNatureAndDateEnc?: string | null;
    bloodType?: string | null;
    immunizations?: string[] | null;
  } | null;
  physicalExaminations: PhysicalExam[];
  labResults: LabResult[];
}

interface ScanResponse {
  success: boolean;
  data: ScanProfile;
  emergencyAlert?: {
    level?: string;
    warning?: string;
    instructions?: string;
  } | null;
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

interface CertificateRequestRow {
  id: string;
  studentName: string;
  studentNumber: string;
  courseDept: string;
  reason: string;
  requestedDateIso: string;
  status: CertificateStatus;
  doctorName?: string;
}

interface MedicalDocument {
  id: string;
  fileName: string;
  fileUrl: string;
  documentType: string;
  uploadedAt: string;
}

interface DocumentsResponse {
  success: boolean;
  data: MedicalDocument[];
}

interface UploadDocumentResponse {
  success: boolean;
  message: string;
  data: MedicalDocument;
}

function toLabel(value?: string | null) {
  return value && value.trim() ? value : 'N/A';
}

function formatDate(value?: string | null) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatDocumentType(value: string) {
  switch (value) {
    case 'PHYSICAL_EXAM':
      return 'Physical Exam';
    case 'LAB_RESULT':
      return 'Lab Result';
    case 'MED_CERT':
      return 'Medical Certificate';
    case 'VACCINATION_RECORD':
      return 'Vaccination Record';
    default:
      return 'Other';
  }
}

function splitCsv(value?: string | null) {
  if (!value) return [];
  const normalized = value.trim().toLowerCase();
  if (!normalized || ['none', 'no', 'n/a', 'na'].includes(normalized)) return [];
  return value.split(',').map((part) => part.trim()).filter(Boolean);
}

function parseBooleanText(value?: string | null) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return ['yes', 'true', '1'].includes(normalized);
}

function parseYesNoChoice(value?: string | null) {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  if (['yes', 'true', '1'].includes(normalized)) return 'YES';
  if (['no', 'false', '0'].includes(normalized)) return 'NO';
  return null;
}

function readCertificateRequests(): CertificateRequestRow[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CERT_REQUEST_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCertificateRequests(rows: CertificateRequestRow[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CERT_REQUEST_STORAGE_KEY, JSON.stringify(rows));
}

const MEDICAL_HISTORY_BOOLEAN_FIELDS: Array<{ key: keyof NonNullable<ScanProfile['medicalHistory']>; label: string }> = [
  { key: 'asthmaEnc', label: 'Asthma' },
  { key: 'chickenPoxEnc', label: 'Chicken Pox' },
  { key: 'diabetesEnc', label: 'Diabetes' },
  { key: 'dysmenorrheaEnc', label: 'Dysmenorrhea' },
  { key: 'epilepsySeizureEnc', label: 'Epilepsy/Seizure' },
  { key: 'heartDisorderEnc', label: 'Heart disorder' },
  { key: 'hepatitisEnc', label: 'Hepatitis' },
  { key: 'hypertensionEnc', label: 'Hypertension' },
  { key: 'measlesEnc', label: 'Measles' },
  { key: 'mumpsEnc', label: 'Mumps' },
  { key: 'anxietyDisorderEnc', label: 'Anxiety disorder' },
  { key: 'panicAttackHyperventilationEnc', label: 'Panic attack/Hyperventilation' },
  { key: 'pneumoniaEnc', label: 'Pneumonia' },
  { key: 'ptbPrimaryComplexEnc', label: 'PTB/Primary Complex' },
  { key: 'typhoidFeverEnc', label: 'Typhoid Fever' },
  { key: 'covid19Enc', label: 'COVID-19' },
  { key: 'urinaryTractInfectionEnc', label: 'Urinary Tract Infection' },
];

export default function StudentRecordPage() {
  const params = useParams();
  const router = useRouter();

  const studentNumberParam = typeof params.studentId === 'string' ? decodeURIComponent(params.studentId) : '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusToast, setStatusToast] = useState<StatusToast | null>(null);
  const [record, setRecord] = useState<ScanProfile | null>(null);
  const [emergencyMessage, setEmergencyMessage] = useState('');
  const [sendingEmergency, setSendingEmergency] = useState(false);
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState('');
  const [uploadingDocument, setUploadingDocument] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<(typeof DOCUMENT_TYPES)[number]['value']>('PHYSICAL_EXAM');
  const [documentFeedback, setDocumentFeedback] = useState('');
  const [downloadingDocumentId, setDownloadingDocumentId] = useState('');
  const [activeClinicalTab, setActiveClinicalTab] = useState<'medicalHistory' | 'physicalExam' | 'labResults'>('medicalHistory');
  const [certificateStatus, setCertificateStatus] = useState<CertificateStatus | null>(null);
  const [requestingCertificate, setRequestingCertificate] = useState(false);

  useEffect(() => {
    if (!statusToast) {
      return;
    }

    const timer = setTimeout(() => {
      setStatusToast(null);
    }, 3000);

    return () => clearTimeout(timer);
  }, [statusToast]);

  async function loadDocuments(studentProfileId: string, token: string) {
    try {
      setDocumentsLoading(true);
      const response = await api.get<DocumentsResponse>(`/documents/${studentProfileId}?limit=200`, token);
      setDocuments(response.data || []);
      setDocumentsError('');
    } catch (err) {
      if (err instanceof ApiError) {
        setDocumentsError(err.message);
      } else {
        setDocumentsError('Unable to load medical documents.');
      }
    } finally {
      setDocumentsLoading(false);
    }
  }

  useEffect(() => {
    async function loadRecord() {
      const token = getToken();
      if (!token) {
        setError('You are not logged in. Please sign in again.');
        setLoading(false);
        return;
      }

      try {
        const search = await api.get<SearchResponse>(`/clinic/search?q=${encodeURIComponent(studentNumberParam)}`, token);
        const exact = (search.data || []).find((item) => item.studentNumber.toLowerCase() === studentNumberParam.toLowerCase());

        if (!exact) {
          setRecord(null);
          setError(`No student found for ${studentNumberParam}.`);
          return;
        }

        const scan = await api.get<ScanResponse>(`/clinic/scan/${exact.user.id}`, token);
        setRecord(scan.data);
        setEmergencyMessage(scan.emergencyAlert?.warning || '');
        await loadDocuments(scan.data.id, token);
        setError('');
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Unable to load student record.');
        }
      } finally {
        setLoading(false);
      }
    }

    if (studentNumberParam) {
      void loadRecord();
    } else {
      setLoading(false);
      setError('Missing student number in route.');
    }
  }, [studentNumberParam]);

  const allergies = useMemo(() => splitCsv(record?.medicalHistory?.allergyEnc), [record]);
  const latestExam = record?.physicalExaminations?.[0] || null;
  const latestLab = record?.labResults?.[0] || null;

  useEffect(() => {
    if (!record) {
      setCertificateStatus(null);
      return;
    }
    const rows = readCertificateRequests();
    const latest = rows
      .filter((item) => item.studentNumber.toLowerCase() === record.studentNumber.toLowerCase())
      .sort((a, b) => new Date(b.requestedDateIso).getTime() - new Date(a.requestedDateIso).getTime())[0];
    setCertificateStatus(latest?.status ?? null);
  }, [record]);

  async function handleRequestMedicalCertificate() {
    if (!record || requestingCertificate || certificateStatus) return;

    setRequestingCertificate(true);
    try {
      const rows = readCertificateRequests();
      const request: CertificateRequestRow = {
        id: `cert-${Date.now()}`,
        studentName: `${record.firstName} ${record.lastName}`,
        studentNumber: record.studentNumber,
        courseDept: record.courseDept || 'N/A',
        reason: 'Medical certificate requested from QR View Record.',
        requestedDateIso: new Date().toISOString(),
        status: 'pending',
      };
      saveCertificateRequests([request, ...rows]);
      setCertificateStatus('pending');
      setStatusToast({
        type: 'success',
        message: 'Medical certificate request submitted. Status: Pending.',
      });
    } finally {
      setRequestingCertificate(false);
    }
  }

  async function handleEmergencyAlert() {
    if (!record) return;

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
          studentProfileId: record.id,
        },
        token,
      );

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

  async function handleDocumentUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!record) {
      setDocumentsError('Student profile is not loaded yet.');
      return;
    }

    if (!selectedFile) {
      setDocumentFeedback('Please select a file before uploading.');
      return;
    }

    const token = getToken();
    if (!token) {
      setDocumentsError('You are not logged in. Please sign in again.');
      return;
    }

    try {
      setUploadingDocument(true);
      setDocumentsError('');
      setDocumentFeedback('');

      const formData = new FormData();
      formData.append('studentProfileId', record.id);
      formData.append('documentType', documentType);
      formData.append('file', selectedFile);

      const response = await api.postForm<UploadDocumentResponse>('/documents/upload', formData, token);
      setSelectedFile(null);
      setDocumentFeedback(response.message || 'Document uploaded successfully.');
      await loadDocuments(record.id, token);
    } catch (err) {
      if (err instanceof ApiError) {
        setDocumentFeedback(err.message);
      } else {
        setDocumentFeedback('Failed to upload document.');
      }
    } finally {
      setUploadingDocument(false);
    }
  }

  async function handleDownloadDocument(document: MedicalDocument) {
    const token = getToken();
    if (!token) {
      setDocumentsError('You are not logged in. Please sign in again.');
      return;
    }

    try {
      setDownloadingDocumentId(document.id);
      const { blob, fileName } = await api.getBlob(`/documents/file/${document.id}`, token);
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = fileName || document.fileName;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      if (err instanceof ApiError) {
        setDocumentsError(err.message);
      } else {
        setDocumentsError('Failed to download document.');
      }
    } finally {
      setDownloadingDocumentId('');
    }
  }

  if (loading) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="rounded-xl border border-gray-100 bg-white px-4 py-8 text-center text-sm text-gray-400">
          Loading student record...
        </div>
      </div>
    );
  }

  if (!record) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center">
          <p className="text-sm text-red-600">{error || 'Student record not found.'}</p>
          <button onClick={() => router.back()} className="mt-3 text-xs font-semibold text-teal-600 hover:underline">
            ← Back to Patient
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
      <div
        aria-live="polite"
        className={`fixed top-4 right-4 z-50 text-sm font-semibold px-4 py-3 rounded-xl shadow-lg transition-all duration-300 ${
          statusToast?.type === 'success'
            ? 'bg-white border border-teal-200 text-teal-700 shadow-teal-100'
            : 'bg-red-500 text-white shadow-red-200'
        } ${statusToast ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
      >
        {statusToast?.message ?? ''}
      </div>

      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-teal-600"
      >
        <span aria-hidden="true">←</span>
        Back to Patient
      </button>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold text-gray-900">{record.lastName}, {record.firstName}</h1>
            <p className="text-xs text-gray-500 mt-1">
              <span className="font-semibold text-teal-600">{record.studentNumber}</span>
              <span className="mx-2 text-gray-300">•</span>
              {record.courseDept}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={() => router.push(`/dashboard/staff/record/${encodeURIComponent(record.studentNumber)}/history`)}
            className="text-xs font-semibold border border-gray-200 px-3 py-2 rounded-xl text-gray-600 hover:border-teal-300 hover:text-teal-600"
          >
            View Full History
          </button>
          <button
            onClick={() => { void handleEmergencyAlert(); }}
            disabled={sendingEmergency}
            className="text-xs font-semibold px-3 py-2 rounded-xl bg-red-500 hover:bg-red-600 text-white disabled:opacity-70"
          >
            {sendingEmergency ? 'Sending SMS...' : 'Text Emergency Contact'}
          </button>
          <button
            onClick={() => { void handleRequestMedicalCertificate(); }}
            disabled={requestingCertificate || !!certificateStatus}
            className="text-xs font-semibold px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white disabled:opacity-70"
          >
            {requestingCertificate ? 'Requesting...' : 'Request Medical Certificate'}
          </button>
          {certificateStatus && (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${
                certificateStatus === 'doctor_approved'
                  ? 'bg-emerald-100 text-emerald-700'
                  : certificateStatus === 'denied'
                    ? 'bg-red-100 text-red-700'
                    : certificateStatus === 'pending_doctor'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-amber-100 text-amber-700'
              }`}
            >
              Certificate Status: {certificateStatus === 'pending_doctor' ? 'Awaiting Doctor' : certificateStatus === 'doctor_approved' ? 'Approved' : certificateStatus === 'denied' ? 'Denied' : 'Pending'}
            </span>
          )}
        </div>
      </div>

      {emergencyMessage && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {emergencyMessage}
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2">
        <h2 className="text-sm font-bold text-gray-800 mb-2">Personal Information</h2>
        <p className="text-sm text-gray-700"><span className="font-semibold">Age/Sex:</span> {record.age || 'N/A'} / {toLabel(record.sex)}</p>
        <p className="text-sm text-gray-700"><span className="font-semibold">Birthday:</span> {formatDate(record.birthday)}</p>
        <p className="text-sm text-gray-700"><span className="font-semibold">Civil Status:</span> {toLabel(record.civilStatus)}</p>
        <p className="text-sm text-gray-700"><span className="font-semibold">Contact:</span> {toLabel(record.telNumber)}</p>
        <p className="text-sm text-gray-700"><span className="font-semibold">Address:</span> {toLabel(record.presentAddress)}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="h-full bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2">
          <h2 className="text-sm font-bold text-gray-800 mb-2">Emergency Contact</h2>
          <p className="text-sm text-gray-700"><span className="font-semibold">Name:</span> {toLabel(record.emergencyContactName)}</p>
          <p className="text-sm text-gray-700"><span className="font-semibold">Relationship:</span> {toLabel(record.emergencyRelationship)}</p>
          <p className="text-sm text-gray-700"><span className="font-semibold">Contact:</span> {toLabel(record.emergencyContactTelNumber)}</p>
          <p className="text-sm text-gray-700"><span className="font-semibold">Address:</span> {toLabel(record.emergencyContactAddress)}</p>
        </div>

        <div className="h-full bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-2">Blood Type</h2>
          <p className="text-2xl font-bold text-blue-600 mt-4">{toLabel(record.medicalHistory?.bloodType)}</p>
          <p className="text-xs text-gray-400 mt-2">Latest declared blood group</p>
        </div>

        <div className="h-full bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-2">Allergies</h2>
          {allergies.length > 0 ? (
            <div className="flex flex-wrap gap-2 mt-2">
              {allergies.map((allergy) => (
                <span key={allergy} className="inline-flex items-center rounded-full border border-rose-100 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-600">
                  {allergy}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 mt-3">No known allergies.</p>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <h2 className="text-sm font-bold text-gray-800">Clinic Record (Paper Form Layout)</h2>

        <div className="flex border-b border-gray-200">
          {([
            ['medicalHistory', 'Medical History', '🩺'],
            ['physicalExam', 'Physical Examination', '🏥'],
            ['labResults', 'Lab Results', '🧪'],
          ] as const).map(([tabKey, tabLabel, icon]) => (
            <button
              key={tabKey}
              type="button"
              onClick={() => setActiveClinicalTab(tabKey)}
              className={`relative flex items-center gap-1.5 px-5 py-3 text-sm font-semibold transition-all duration-200 focus:outline-none ${
                activeClinicalTab === tabKey
                  ? 'text-teal-600 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-teal-600 after:rounded-t'
                  : 'text-gray-500 hover:text-teal-500 hover:bg-teal-50/50'
              }`}
            >
              <span className="text-base leading-none">{icon}</span>
              <span>{tabLabel}</span>
            </button>
          ))}
        </div>

        {activeClinicalTab === 'medicalHistory' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="mb-1 text-xs font-semibold text-gray-600">Allergy</p>
                <input
                  value={toLabel(record.medicalHistory?.allergyEnc)}
                  disabled
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700"
                />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold text-gray-600">Have you had any operation in the past?</p>
                <div className="flex gap-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-700">
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" checked={parseYesNoChoice(record.medicalHistory?.hasPastOperationEnc) === 'YES'} disabled />
                    <span>YES</span>
                  </label>
                  <label className="inline-flex items-center gap-2">
                    <input type="radio" checked={parseYesNoChoice(record.medicalHistory?.hasPastOperationEnc) === 'NO'} disabled />
                    <span>NO</span>
                  </label>
                </div>
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs font-semibold text-gray-600">If yes, state the nature of the operation and date/year</p>
              <textarea
                value={toLabel(record.medicalHistory?.operationNatureAndDateEnc)}
                disabled
                rows={2}
                className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 resize-none"
              />
            </div>

            <div>
              <p className="mb-2 text-xs font-semibold text-gray-600">Medical Conditions</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
                {MEDICAL_HISTORY_BOOLEAN_FIELDS.map((condition) => (
                  <label key={condition.key} className="inline-flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={parseBooleanText(record.medicalHistory?.[condition.key] as string | null | undefined)}
                      disabled
                    />
                    <span>{condition.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeClinicalTab === 'physicalExam' && (
          <div className="space-y-4">
            {!latestExam ? (
              <p className="text-sm text-gray-400">No physical examination records available.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <p className="mb-1 text-xs font-semibold text-gray-600">Year Level</p>
                    <input value={toLabel(latestExam.yearLevel)} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700" />
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold text-gray-600">Date</p>
                    <input value={formatDate(latestExam.examDate)} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700" />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><p className="mb-1 text-xs font-semibold text-gray-600">BP</p><input value={toLabel(latestExam.bp)} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700" /></div>
                  <div><p className="mb-1 text-xs font-semibold text-gray-600">CR</p><input value={toLabel(latestExam.cr)} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700" /></div>
                  <div><p className="mb-1 text-xs font-semibold text-gray-600">RR</p><input value={toLabel(latestExam.rr)} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700" /></div>
                  <div><p className="mb-1 text-xs font-semibold text-gray-600">Temp</p><input value={toLabel(latestExam.temp)} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700" /></div>
                  <div><p className="mb-1 text-xs font-semibold text-gray-600">Weight</p><input value={toLabel(latestExam.weight)} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700" /></div>
                  <div><p className="mb-1 text-xs font-semibold text-gray-600">Height</p><input value={toLabel(latestExam.height)} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700" /></div>
                  <div><p className="mb-1 text-xs font-semibold text-gray-600">BMI</p><input value={toLabel(latestExam.bmi)} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700" /></div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div><p className="mb-1 text-xs font-semibold text-gray-600">Visual Acuity</p><input value={toLabel(latestExam.visualAcuity)} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700" /></div>
                  <div><p className="mb-1 text-xs font-semibold text-gray-600">Skin</p><input value={toLabel(latestExam.skin)} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700" /></div>
                  <div><p className="mb-1 text-xs font-semibold text-gray-600">HEENT</p><input value={toLabel(latestExam.heent)} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700" /></div>
                  <div><p className="mb-1 text-xs font-semibold text-gray-600">Chest/Lungs</p><input value={toLabel(latestExam.chestLungs)} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700" /></div>
                  <div><p className="mb-1 text-xs font-semibold text-gray-600">Heart</p><input value={toLabel(latestExam.heart)} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700" /></div>
                  <div><p className="mb-1 text-xs font-semibold text-gray-600">Abdomen</p><input value={toLabel(latestExam.abdomen)} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700" /></div>
                  <div><p className="mb-1 text-xs font-semibold text-gray-600">Extremities</p><input value={toLabel(latestExam.extremities)} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700" /></div>
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold text-gray-600">Others (specify)</p>
                  <textarea value={toLabel(latestExam.others)} disabled rows={2} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 resize-none" />
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold text-gray-600">Examined by</p>
                  <input value={toLabel(latestExam.examinedBy)} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700" />
                </div>
              </>
            )}
          </div>
        )}

        {activeClinicalTab === 'labResults' && (
          <div className="space-y-4">
            {!latestLab ? (
              <p className="text-sm text-gray-400">No lab results available.</p>
            ) : (
              <>
                <div className="rounded-lg border border-gray-200 p-3 space-y-3">
                  <p className="text-xs font-semibold text-gray-600">CBC</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div><p className="mb-1 text-xs font-semibold text-gray-600">Date</p><input value={formatDate(latestLab.date)} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700" /></div>
                    <div><p className="mb-1 text-xs font-semibold text-gray-600">Hgb</p><input value={toLabel(latestLab.hgb)} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700" /></div>
                    <div><p className="mb-1 text-xs font-semibold text-gray-600">Hct</p><input value={toLabel(latestLab.hct)} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700" /></div>
                    <div><p className="mb-1 text-xs font-semibold text-gray-600">WBC</p><input value={toLabel(latestLab.wbc)} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700" /></div>
                    <div><p className="mb-1 text-xs font-semibold text-gray-600">Plt. Ct.</p><input value={toLabel(latestLab.pltCt)} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700" /></div>
                    <div><p className="mb-1 text-xs font-semibold text-gray-600">Bld. Type</p><input value={toLabel(latestLab.bloodType)} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700" /></div>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-3 space-y-3">
                  <p className="text-xs font-semibold text-gray-600">U/A</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div><p className="mb-1 text-xs font-semibold text-gray-600">Date</p><input value={formatDate(latestLab.date)} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700" /></div>
                    <div><p className="mb-1 text-xs font-semibold text-gray-600">Glucose/Sugar</p><input value={toLabel(latestLab.glucoseSugar)} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700" /></div>
                    <div><p className="mb-1 text-xs font-semibold text-gray-600">Protein</p><input value={toLabel(latestLab.protein)} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700" /></div>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-3 space-y-3">
                  <p className="text-xs font-semibold text-gray-600">Chest X-ray</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div><p className="mb-1 text-xs font-semibold text-gray-600">Date</p><input value={formatDate(latestLab.date)} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700" /></div>
                    <div><p className="mb-1 text-xs font-semibold text-gray-600">Result</p><input value={toLabel(latestLab.xrayResult)} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700" /></div>
                  </div>
                  <div>
                    <p className="mb-1 text-xs font-semibold text-gray-600">Abnormal Findings</p>
                    <textarea value={toLabel(latestLab.xrayFindingsEnc)} disabled rows={2} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 resize-none" />
                  </div>
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold text-gray-600">Others</p>
                  <textarea value={toLabel(latestLab.othersEnc)} disabled rows={2} className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 resize-none" />
                </div>

                <div>
                  <p className="mb-1 text-xs font-semibold text-gray-600">Date Received</p>
                  <input value={formatDate(latestLab.dateReceived)} disabled className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700" />
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div>
          <h2 className="text-sm font-bold text-gray-800">Medical Documents</h2>
          <p className="text-xs text-gray-500 mt-1">Upload and retrieve supporting files (PDF, JPG, PNG).</p>
        </div>

        <form onSubmit={(event) => { void handleDocumentUpload(event); }} className="grid grid-cols-1 md:grid-cols-[180px_1fr_auto] gap-2 items-center">
          <select
            value={documentType}
            onChange={(event) => setDocumentType(event.target.value as (typeof DOCUMENT_TYPES)[number]['value'])}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-300"
          >
            {DOCUMENT_TYPES.map((item) => (
              <option key={item.value} value={item.value}>{item.label}</option>
            ))}
          </select>

          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm file:mr-3 file:border-0 file:bg-teal-50 file:text-teal-700 file:px-2.5 file:py-1.5 file:rounded-lg"
          />

          <button
            type="submit"
            disabled={uploadingDocument || !selectedFile}
            className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold disabled:opacity-70"
          >
            {uploadingDocument ? 'Uploading...' : 'Upload'}
          </button>
        </form>

        {documentFeedback && (
          <p className={`text-xs ${documentFeedback.toLowerCase().includes('failed') || documentFeedback.toLowerCase().includes('required') || documentFeedback.toLowerCase().includes('invalid') ? 'text-red-600' : 'text-teal-600'}`}>
            {documentFeedback}
          </p>
        )}

        {documentsError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {documentsError}
          </div>
        )}

        {documentsLoading ? (
          <p className="text-sm text-gray-400">Loading documents...</p>
        ) : documents.length === 0 ? (
          <p className="text-sm text-gray-400">No documents uploaded for this student yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-sm">
              <thead>
                <tr className="text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                  <th className="text-left py-2 pr-3">File Name</th>
                  <th className="text-left py-2 pr-3">Type</th>
                  <th className="text-left py-2 pr-3">Uploaded</th>
                  <th className="text-left py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((document) => (
                  <tr key={document.id} className="border-b border-gray-50">
                    <td className="py-2 pr-3 text-gray-700">{document.fileName}</td>
                    <td className="py-2 pr-3 text-gray-600">{formatDocumentType(document.documentType)}</td>
                    <td className="py-2 pr-3 text-gray-600">{formatDateTime(document.uploadedAt)}</td>
                    <td className="py-2">
                      <button
                        onClick={() => { void handleDownloadDocument(document); }}
                        disabled={downloadingDocumentId === document.id}
                        className="text-xs font-semibold border border-gray-200 px-3 py-1.5 rounded-lg text-gray-600 hover:border-teal-300 hover:text-teal-600 disabled:opacity-70"
                      >
                        {downloadingDocumentId === document.id ? 'Downloading...' : 'Download'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-500">
        🔒 Access to this medical record is logged for audit purposes (RA 10173).
      </div>
    </div>
  );
}
