'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface VisitMedicine {
  quantity: number;
  inventory: {
    itemName: string;
    unit: string;
  };
}

interface ClinicVisit {
  id: string;
  visitDate: string;
  visitTime: string | null;
  chiefComplaintEnc: string | null;
  handledBy: {
    email: string;
  };
  dispensedMedicines: VisitMedicine[];
}

interface StudentProfile {
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
  clinicVisits: ClinicVisit[];
}

interface StudentProfileResponse {
  success: boolean;
  data: StudentProfile;
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

function normalizeComplaint(raw?: string | null) {
  if (!raw || !raw.trim()) return 'General consultation';

  const text = raw.trim();
  try {
    const parsed = JSON.parse(text) as {
      chiefComplaint?: string;
      diagnosis?: string;
      notes?: string;
    };

    if (parsed && typeof parsed === 'object') {
      const diagnosis = typeof parsed.diagnosis === 'string' ? parsed.diagnosis.trim() : '';
      const complaint = typeof parsed.chiefComplaint === 'string' ? parsed.chiefComplaint.trim() : '';
      const notes = typeof parsed.notes === 'string' ? parsed.notes.trim() : '';
      return diagnosis || complaint || notes || 'General consultation';
    }
  } catch {
    // Legacy notes fallback.
  }

  const firstPart = text.split('|').map((part) => part.trim()).filter(Boolean)[0];
  return firstPart || text;
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

function splitCsv(value?: string | null): string[] {
  if (!value) return [];
  const normalized = value.trim().toLowerCase();
  if (!normalized || ['none', 'no', 'n/a', 'na'].includes(normalized)) return [];
  return value.split(',').map((entry) => entry.trim()).filter(Boolean);
}

function pickConditions(history: StudentProfile['medicalHistory']) {
  if (!history) return [];

  const conditions: string[] = [];
  if (history.asthmaEnc && !['none', 'no', 'n/a', 'na'].includes(history.asthmaEnc.toLowerCase().trim())) {
    conditions.push('Asthma');
  }
  if (history.diabetesEnc && !['none', 'no', 'n/a', 'na'].includes(history.diabetesEnc.toLowerCase().trim())) {
    conditions.push('Diabetes');
  }
  if (history.hypertensionEnc && !['none', 'no', 'n/a', 'na'].includes(history.hypertensionEnc.toLowerCase().trim())) {
    conditions.push('Hypertension');
  }
  if (history.anxietyDisorderEnc && !['none', 'no', 'n/a', 'na'].includes(history.anxietyDisorderEnc.toLowerCase().trim())) {
    conditions.push('Anxiety Disorder');
  }

  return conditions;
}

function downloadCsv(profile: StudentProfile) {
  const rows: string[][] = [
    ['Field', 'Value'],
    ['Student Number', profile.studentNumber],
    ['Name', `${profile.lastName}, ${profile.firstName}`],
    ['Course/Dept', profile.courseDept],
    ['Age', profile.age ? String(profile.age) : 'N/A'],
    ['Sex', toLabel(profile.sex)],
    ['Birthday', formatDate(profile.birthday)],
    ['Contact', toLabel(profile.telNumber)],
    ['Address', toLabel(profile.presentAddress)],
    ['Emergency Contact', toLabel(profile.emergencyContactName)],
    ['Emergency Relationship', toLabel(profile.emergencyRelationship)],
    ['Emergency Number', toLabel(profile.emergencyContactTelNumber)],
    ['Allergies', splitCsv(profile.medicalHistory?.allergyEnc).join('; ') || 'None'],
    ['Blood Type', toLabel(profile.medicalHistory?.bloodType)],
    ['Immunizations', (profile.medicalHistory?.immunizations || []).join('; ') || 'None'],
    ['Conditions', pickConditions(profile.medicalHistory).join('; ') || 'None'],
    [],
    ['Visit Date', 'Visit Time', 'Complaint', 'Handled By', 'Medicines'],
  ];

  for (const visit of profile.clinicVisits) {
    rows.push([
      formatDate(visit.visitDate),
      visit.visitTime || 'N/A',
      normalizeComplaint(visit.chiefComplaintEnc),
      visit.handledBy?.email || 'Clinic Staff',
      visit.dispensedMedicines.map((item) => `${item.inventory.itemName} x${item.quantity}`).join('; ') || 'None',
    ]);
  }

  const csv = rows.map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `my_record_${profile.studentNumber}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function MyRecordPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState('');
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
        setDocumentsError('Unable to load your medical documents.');
      }
    } finally {
      setDocumentsLoading(false);
    }
  }

  useEffect(() => {
    async function loadProfile() {
      const token = getToken();
      if (!token) {
        setError('You are not logged in. Please sign in again.');
        setLoading(false);
        return;
      }

      try {
        const response = await api.get<StudentProfileResponse>('/students/me', token);
        setProfile(response.data);
        if (response.data?.id) {
          await loadDocuments(response.data.id, token);
        }
        setError('');
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Unable to load your health record.');
        }
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, []);

  const allergies = useMemo(() => splitCsv(profile?.medicalHistory?.allergyEnc), [profile]);
  const conditions = useMemo(() => pickConditions(profile?.medicalHistory || null), [profile]);

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

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">My Health Record</h1>
          <p className="text-sm text-gray-500 mt-1">Live clinic profile and consultation history.</p>
        </div>
        {profile && (
          <button
            onClick={() => downloadCsv(profile)}
            className="text-xs font-semibold border border-gray-200 px-3 py-2 rounded-xl text-gray-600 hover:border-teal-300 hover:text-teal-600"
          >
            Export CSV
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-gray-100 bg-white px-4 py-8 text-center text-sm text-gray-400">
          Loading your record...
        </div>
      ) : profile ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <h2 className="text-sm font-bold text-gray-800">Personal Information</h2>
              <p className="text-sm text-gray-700"><span className="font-semibold">Name:</span> {profile.lastName}, {profile.firstName}</p>
              <p className="text-sm text-gray-700"><span className="font-semibold">Student Number:</span> {profile.studentNumber}</p>
              <p className="text-sm text-gray-700"><span className="font-semibold">Course/Dept:</span> {profile.courseDept}</p>
              <p className="text-sm text-gray-700"><span className="font-semibold">Birthday:</span> {formatDate(profile.birthday)}</p>
              <p className="text-sm text-gray-700"><span className="font-semibold">Age/Sex:</span> {profile.age || 'N/A'} / {toLabel(profile.sex)}</p>
              <p className="text-sm text-gray-700"><span className="font-semibold">Civil Status:</span> {toLabel(profile.civilStatus)}</p>
              <p className="text-sm text-gray-700"><span className="font-semibold">Contact:</span> {toLabel(profile.telNumber)}</p>
              <p className="text-sm text-gray-700"><span className="font-semibold">Address:</span> {toLabel(profile.presentAddress)}</p>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              <h2 className="text-sm font-bold text-gray-800">Emergency & Medical Profile</h2>
              <p className="text-sm text-gray-700"><span className="font-semibold">Emergency Contact:</span> {toLabel(profile.emergencyContactName)}</p>
              <p className="text-sm text-gray-700"><span className="font-semibold">Relationship:</span> {toLabel(profile.emergencyRelationship)}</p>
              <p className="text-sm text-gray-700"><span className="font-semibold">Emergency Number:</span> {toLabel(profile.emergencyContactTelNumber)}</p>
              <p className="text-sm text-gray-700"><span className="font-semibold">Emergency Address:</span> {toLabel(profile.emergencyContactAddress)}</p>
              <p className="text-sm text-gray-700"><span className="font-semibold">Allergies:</span> {allergies.join(', ') || 'None'}</p>
              <p className="text-sm text-gray-700"><span className="font-semibold">Blood Type:</span> {toLabel(profile.medicalHistory?.bloodType)}</p>
              <p className="text-sm text-gray-700"><span className="font-semibold">Immunizations:</span> {(profile.medicalHistory?.immunizations || []).join(', ') || 'None'}</p>
              <p className="text-sm text-gray-700"><span className="font-semibold">Conditions:</span> {conditions.join(', ') || 'None'}</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-gray-800">Consultation History</h2>
              <Link href="/dashboard/student" className="text-xs text-teal-600 font-semibold hover:underline">
                Back to Dashboard
              </Link>
            </div>

            {profile.clinicVisits.length === 0 ? (
              <p className="text-sm text-gray-400">No clinic visits on record yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[720px]">
                  <thead>
                    <tr className="text-xs uppercase tracking-wide text-gray-400 border-b border-gray-100">
                      <th className="text-left py-2 pr-3">Date</th>
                      <th className="text-left py-2 pr-3">Time</th>
                      <th className="text-left py-2 pr-3">Complaint</th>
                      <th className="text-left py-2 pr-3">Medicines</th>
                      <th className="text-left py-2">Handled By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.clinicVisits.map((visit) => (
                      <tr key={visit.id} className="border-b border-gray-50 align-top">
                        <td className="py-2 pr-3 text-gray-700">{formatDate(visit.visitDate)}</td>
                        <td className="py-2 pr-3 text-gray-600">{visit.visitTime || 'N/A'}</td>
                        <td className="py-2 pr-3 text-gray-700">{normalizeComplaint(visit.chiefComplaintEnc)}</td>
                        <td className="py-2 pr-3 text-gray-600">
                          {visit.dispensedMedicines.length > 0
                            ? visit.dispensedMedicines.map((item) => `${item.inventory.itemName} x${item.quantity}`).join(', ')
                            : 'None'}
                        </td>
                        <td className="py-2 text-gray-600">{visit.handledBy?.email || 'Clinic Staff'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-800 mb-4">Medical Documents</h2>

            {documentsError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 mb-3">
                {documentsError}
              </div>
            )}

            {documentsLoading ? (
              <p className="text-sm text-gray-400">Loading documents...</p>
            ) : documents.length === 0 ? (
              <p className="text-sm text-gray-400">No uploaded documents available yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[620px]">
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
                      <tr key={document.id} className="border-b border-gray-50 align-top">
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
        </>
      ) : null}
    </div>
  );
}
