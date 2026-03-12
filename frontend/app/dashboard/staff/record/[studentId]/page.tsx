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
  examDate: string;
  bp: string | null;
  temp: string | null;
  weight: string | null;
  bmi: string | null;
  examinedBy: string | null;
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
    asthmaEnc?: string | null;
    diabetesEnc?: string | null;
    hypertensionEnc?: string | null;
    anxietyDisorderEnc?: string | null;
    bloodType?: string | null;
    immunizations?: string[] | null;
  } | null;
  physicalExaminations: PhysicalExam[];
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

interface EmergencyAlertResponse {
  success: boolean;
  message: string;
  data?: {
    recipient?: string;
    status?: string;
    timestamp?: string;
  };
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

function findConditions(history: ScanProfile['medicalHistory']) {
  if (!history) return [];

  const conditions: string[] = [];
  if (history.asthmaEnc && !['none', 'no', 'n/a', 'na'].includes(history.asthmaEnc.toLowerCase().trim())) conditions.push('Asthma');
  if (history.diabetesEnc && !['none', 'no', 'n/a', 'na'].includes(history.diabetesEnc.toLowerCase().trim())) conditions.push('Diabetes');
  if (history.hypertensionEnc && !['none', 'no', 'n/a', 'na'].includes(history.hypertensionEnc.toLowerCase().trim())) conditions.push('Hypertension');
  if (history.anxietyDisorderEnc && !['none', 'no', 'n/a', 'na'].includes(history.anxietyDisorderEnc.toLowerCase().trim())) conditions.push('Anxiety Disorder');

  return conditions;
}

export default function StudentRecordPage() {
  const params = useParams();
  const router = useRouter();

  const studentNumberParam = typeof params.studentId === 'string' ? decodeURIComponent(params.studentId) : '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  async function loadDocuments(studentProfileId: string, token: string) {
    try {
      setDocumentsLoading(true);
      const response = await api.get<DocumentsResponse>(`/documents/${studentProfileId}`, token);
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
  const conditions = useMemo(() => findConditions(record?.medicalHistory || null), [record]);
  const latestExam = record?.physicalExaminations?.[0] || null;

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

      const response = await api.post<EmergencyAlertResponse>(
        '/clinic/emergency-alert',
        {
          studentProfileId: record.id,
          incidentDetails: 'Urgent health concern detected during on-site clinic assessment.',
        },
        token,
      );

      const recipient = response.data?.recipient || 'the emergency contact';
      setEmergencyMessage(`Guardian alert sent successfully to ${recipient}.`);
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
            {sendingEmergency ? 'Sending Alert...' : 'One-Click Guardian Alert'}
          </button>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2">
          <h2 className="text-sm font-bold text-gray-800 mb-2">Personal Information</h2>
          <p className="text-sm text-gray-700"><span className="font-semibold">Age/Sex:</span> {record.age || 'N/A'} / {toLabel(record.sex)}</p>
          <p className="text-sm text-gray-700"><span className="font-semibold">Birthday:</span> {formatDate(record.birthday)}</p>
          <p className="text-sm text-gray-700"><span className="font-semibold">Civil Status:</span> {toLabel(record.civilStatus)}</p>
          <p className="text-sm text-gray-700"><span className="font-semibold">Contact:</span> {toLabel(record.telNumber)}</p>
          <p className="text-sm text-gray-700"><span className="font-semibold">Address:</span> {toLabel(record.presentAddress)}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2">
          <h2 className="text-sm font-bold text-gray-800 mb-2">Emergency Contact</h2>
          <p className="text-sm text-gray-700"><span className="font-semibold">Name:</span> {toLabel(record.emergencyContactName)}</p>
          <p className="text-sm text-gray-700"><span className="font-semibold">Relationship:</span> {toLabel(record.emergencyRelationship)}</p>
          <p className="text-sm text-gray-700"><span className="font-semibold">Contact:</span> {toLabel(record.emergencyContactTelNumber)}</p>
          <p className="text-sm text-gray-700"><span className="font-semibold">Address:</span> {toLabel(record.emergencyContactAddress)}</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
        <h2 className="text-sm font-bold text-gray-800">Medical Profile</h2>
        <p className="text-sm text-gray-700"><span className="font-semibold">Allergies:</span> {allergies.join(', ') || 'None'}</p>
        <p className="text-sm text-gray-700"><span className="font-semibold">Blood Type:</span> {toLabel(record.medicalHistory?.bloodType)}</p>
        <p className="text-sm text-gray-700"><span className="font-semibold">Immunizations:</span> {(record.medicalHistory?.immunizations || []).join(', ') || 'None'}</p>
        <p className="text-sm text-gray-700"><span className="font-semibold">Conditions:</span> {conditions.join(', ') || 'None'}</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-2">
        <h2 className="text-sm font-bold text-gray-800">Latest Physical Examination</h2>
        {latestExam ? (
          <>
            <p className="text-sm text-gray-700"><span className="font-semibold">Date:</span> {formatDate(latestExam.examDate)}</p>
            <p className="text-sm text-gray-700"><span className="font-semibold">Blood Pressure:</span> {toLabel(latestExam.bp)}</p>
            <p className="text-sm text-gray-700"><span className="font-semibold">Temperature:</span> {toLabel(latestExam.temp)}</p>
            <p className="text-sm text-gray-700"><span className="font-semibold">Weight:</span> {toLabel(latestExam.weight)}</p>
            <p className="text-sm text-gray-700"><span className="font-semibold">BMI:</span> {toLabel(latestExam.bmi)}</p>
            <p className="text-sm text-gray-700"><span className="font-semibold">Examined By:</span> {toLabel(latestExam.examinedBy)}</p>
          </>
        ) : (
          <p className="text-sm text-gray-400">No physical examination records available.</p>
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
    </div>
  );
}
