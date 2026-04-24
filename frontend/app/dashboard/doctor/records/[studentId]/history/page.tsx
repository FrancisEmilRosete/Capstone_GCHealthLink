'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { normalizeComplaintDisplay } from '@/lib/complaint';
import MedicalTrackingTimeline, { type MedicalTrackingEvent } from '@/components/dashboard/staff/MedicalTrackingTimeline';

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
  examinedBy: string | null;
  bp: string | null;
  temp: string | null;
  weight: string | null;
  bmi: string | null;
}

interface ScanResponse {
  success: boolean;
  data: {
    id: string;
    studentNumber: string;
    physicalExaminations: PhysicalExam[];
  };
}

interface VisitItem {
  id: string;
  visitDate: string;
  chiefComplaintEnc: string | null;
  handledBy: {
    email: string;
  };
  studentProfile: {
    id: string;
  };
}

interface VisitResponse {
  success: boolean;
  data: VisitItem[];
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

function formatDate(value: string) {
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

export default function DoctorHistoryPage() {
  const params = useParams();
  const router = useRouter();

  const studentNumber = typeof params.studentId === 'string' ? decodeURIComponent(params.studentId) : '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<'all' | 'exams' | 'consultations' | 'documents'>('all');
  const [exams, setExams] = useState<PhysicalExam[]>([]);
  const [consultations, setConsultations] = useState<VisitItem[]>([]);
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [downloadingDocumentId, setDownloadingDocumentId] = useState('');

  useEffect(() => {
    async function loadHistory() {
      const token = getToken();
      if (!token) {
        setError('You are not logged in. Please sign in again.');
        setLoading(false);
        return;
      }

      try {
        const search = await api.get<SearchResponse>(`/clinic/search?q=${encodeURIComponent(studentNumber)}`, token);
        const exact = (search.data || []).find((item) => item.studentNumber.toLowerCase() === studentNumber.toLowerCase());

        if (!exact) {
          setError(`No student found for ${studentNumber}.`);
          return;
        }

        const scan = await api.get<ScanResponse>(`/clinic/scan/${exact.user.id}`, token);
        const visits = await api.get<VisitResponse>(`/clinic/visits?studentProfileId=${encodeURIComponent(scan.data.id)}&limit=500`, token);
        const docs = await api.get<DocumentsResponse>(`/documents/${scan.data.id}?limit=200`, token);

        setExams(scan.data.physicalExaminations || []);
        setConsultations(visits.data || []);
        setDocuments(docs.data || []);
        setError('');
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Unable to load student history.');
        }
      } finally {
        setLoading(false);
      }
    }

    if (studentNumber) {
      void loadHistory();
    } else {
      setLoading(false);
      setError('Missing student number in route.');
    }
  }, [studentNumber]);

  const years = useMemo(() => {
    const examYears = exams.map((exam) => new Date(exam.examDate).getFullYear());
    const consultYears = consultations.map((visit) => new Date(visit.visitDate).getFullYear());
    const documentYears = documents.map((document) => new Date(document.uploadedAt).getFullYear());
    return Array.from(new Set([...examYears, ...consultYears, ...documentYears])).sort((a, b) => b - a);
  }, [consultations, documents, exams]);

  const trackingEvents = useMemo<MedicalTrackingEvent[]>(() => {
    const examEvents = exams.map((exam) => ({
      id: `exam-${exam.id}`,
      dateIso: exam.examDate,
      title: 'Physical Examination Recorded',
      description: `BP ${exam.bp || 'N/A'} | Temp ${exam.temp || 'N/A'} | BMI ${exam.bmi || 'N/A'}`,
      type: 'intervention' as const,
      status: 'completed' as const,
      actor: exam.examinedBy || undefined,
    }));

    const consultationEvents = consultations.map((visit) => ({
      id: `consult-${visit.id}`,
      dateIso: visit.visitDate,
      title: 'Consultation Logged',
      description: normalizeComplaintDisplay(visit.chiefComplaintEnc),
      type: 'treatment' as const,
      status: 'completed' as const,
      actor: visit.handledBy?.email || undefined,
    }));

    const documentEvents = documents.map((document) => ({
      id: `doc-${document.id}`,
      dateIso: document.uploadedAt,
      title: `Medical Document Uploaded (${formatDocumentType(document.documentType)})`,
      description: document.fileName,
      type: 'follow-up' as const,
      status: 'scheduled' as const,
    }));

    return [...examEvents, ...consultationEvents, ...documentEvents]
      .sort((a, b) => new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime());
  }, [consultations, documents, exams]);

  async function handleDownloadDocument(document: MedicalDocument) {
    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
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
        setError(err.message);
      } else {
        setError('Unable to download medical document.');
      }
    } finally {
      setDownloadingDocumentId('');
    }
  }

  if (loading) {
    return (
      <div className="p-4 sm:p-6 max-w-3xl mx-auto">
        <div className="rounded-xl border border-gray-100 bg-white px-4 py-8 text-center text-sm text-gray-400">
          Loading history...
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-teal-500">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Health History</h1>
          <p className="text-xs text-teal-500 font-semibold">{studentNumber}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([
          ['all', 'All'],
          ['exams', 'Physical Exams'],
          ['consultations', 'Consultations'],
          ['documents', 'Documents'],
        ] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold ${
              tab === key ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <MedicalTrackingTimeline events={trackingEvents} />

      {years.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center text-gray-400 text-sm">
          No history on record for this student.
        </div>
      ) : (
        years.map((year) => {
          const yearExams = exams.filter((exam) => new Date(exam.examDate).getFullYear() === year);
          const yearConsultations = consultations.filter((visit) => new Date(visit.visitDate).getFullYear() === year);
          const yearDocuments = documents.filter((document) => new Date(document.uploadedAt).getFullYear() === year);

          const showExams = tab === 'all' || tab === 'exams';
          const showConsultations = tab === 'all' || tab === 'consultations';
          const showDocuments = tab === 'all' || tab === 'documents';

          if ((showExams && yearExams.length === 0) && (showConsultations && yearConsultations.length === 0) && (showDocuments && yearDocuments.length === 0)) {
            return null;
          }

          return (
            <div key={year} className="space-y-3">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-xs font-bold text-white bg-teal-500 px-3 py-1 rounded-full">{year}</span>
                <div className="flex-1 border-t border-gray-100" />
              </div>

              {showExams && yearExams.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-400 pl-1">Physical Exams</p>
                  {yearExams.map((exam) => (
                    <div key={exam.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                      <div className="flex items-center justify-between text-xs mb-2">
                        <span className="font-semibold text-gray-700">{formatDate(exam.examDate)}</span>
                        <span className="text-gray-400">by {exam.examinedBy || 'Clinic Staff'}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                          <p className="text-[10px] text-teal-500 font-medium">BP</p>
                          <p className="text-xs font-bold text-gray-800">{exam.bp || 'N/A'}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                          <p className="text-[10px] text-teal-500 font-medium">Temp</p>
                          <p className="text-xs font-bold text-gray-800">{exam.temp || 'N/A'}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                          <p className="text-[10px] text-teal-500 font-medium">Weight</p>
                          <p className="text-xs font-bold text-gray-800">{exam.weight || 'N/A'}</p>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-2 text-center">
                          <p className="text-[10px] text-teal-500 font-medium">BMI</p>
                          <p className="text-xs font-bold text-gray-800">{exam.bmi || 'N/A'}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {showConsultations && yearConsultations.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-400 pl-1">Consultations</p>
                  {yearConsultations.map((visit) => (
                    <div key={visit.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-semibold text-gray-700">{formatDate(visit.visitDate)}</span>
                        <span className="text-gray-400">{visit.handledBy?.email || 'Clinic Staff'}</span>
                      </div>
                      <p className="text-sm text-gray-600">{normalizeComplaintDisplay(visit.chiefComplaintEnc)}</p>
                    </div>
                  ))}
                </div>
              )}

              {showDocuments && yearDocuments.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-500 pl-1">Medical Documents</p>
                  {yearDocuments.map((document) => (
                    <div key={document.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{document.fileName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {formatDocumentType(document.documentType)} - {formatDateTime(document.uploadedAt)}
                        </p>
                      </div>
                      <button
                        onClick={() => { void handleDownloadDocument(document); }}
                        disabled={downloadingDocumentId === document.id}
                        className="text-xs font-semibold border border-gray-200 px-3 py-1.5 rounded-lg text-gray-600 hover:border-teal-300 hover:text-teal-600 disabled:opacity-70"
                      >
                        {downloadingDocumentId === document.id ? 'Downloading...' : 'Download'}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
