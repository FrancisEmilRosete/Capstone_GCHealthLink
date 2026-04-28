'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import MedicalTrackingTimeline, { type MedicalTrackingEvent } from '@/components/dashboard/staff/MedicalTrackingTimeline';

interface StudentProfile {
  studentNumber: string;
  firstName: string;
  lastName: string;
  courseDept?: string | null;
  clinicVisits?: Array<{
    id: string;
    visitDate?: string | null;
    visitTime?: string | null;
    chiefComplaintEnc?: string | null;
    concernTag?: string | null;
  }>;
  appointments?: Array<{
    id: string;
    preferredDate?: string | null;
    preferredTime?: string | null;
    serviceType?: string | null;
    symptoms?: string | null;
    status?: string | null;
  }>;
  physicalExaminations?: Array<{
    id: string;
    examDate?: string | null;
    yearLevel?: string | null;
    bp?: string | null;
    weight?: string | null;
    height?: string | null;
    bmi?: string | null;
    examinedBy?: string | null;
  }>;
}

interface StudentProfileResponse {
  success: boolean;
  data: StudentProfile;
}

function normalizeDate(value?: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function normalizeLabel(value?: string | null, fallback = 'General consultation') {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed) return fallback;
  return trimmed;
}

function formatYearLevel(value?: string | null) {
  if (!value) return '';
  return value.replace('YR_', 'Year ').replace(/_/g, ' ');
}

function mapToTimelineEvents(student: StudentProfile | null): MedicalTrackingEvent[] {
  if (!student) return [];
  const events: MedicalTrackingEvent[] = [];

  for (const visit of student.clinicVisits || []) {
    const dateIso = normalizeDate(visit.visitDate);
    if (!dateIso) continue;
    events.push({
      id: `visit-${visit.id}`,
      dateIso,
      title: normalizeLabel(visit.chiefComplaintEnc, visit.concernTag || 'Clinic visit'),
      description: normalizeLabel(visit.concernTag, 'Clinic consultation completed'),
      type: 'treatment',
      status: 'completed',
      actor: 'Clinic staff',
    });
  }

  for (const appointment of student.appointments || []) {
    if ((appointment.status || '').toUpperCase() !== 'COMPLETED') continue;
    const dateIso = normalizeDate(appointment.preferredDate);
    if (!dateIso) continue;
    events.push({
      id: `appointment-${appointment.id}`,
      dateIso,
      title: normalizeLabel(appointment.serviceType, 'Dental appointment'),
      description: normalizeLabel(appointment.symptoms, 'Appointment completed'),
      type: 'consultation',
      status: 'completed',
      actor: 'Dental clinic',
    });
  }

  for (const exam of student.physicalExaminations || []) {
    const dateIso = normalizeDate(exam.examDate);
    if (!dateIso) continue;
    const details = [
      exam.bp && `BP: ${exam.bp}`,
      exam.weight && `Weight: ${exam.weight}`,
      exam.height && `Height: ${exam.height}`,
      exam.bmi && `BMI: ${exam.bmi}`,
    ].filter(Boolean).join(' · ') || 'Physical examination completed';
    events.push({
      id: `exam-${exam.id}`,
      dateIso,
      title: `Physical Examination${exam.yearLevel ? ` — ${formatYearLevel(exam.yearLevel)}` : ''}`,
      description: details,
      type: 'examination',
      status: 'completed',
      actor: exam.examinedBy || 'Clinic physician',
    });
  }

  return events.sort((a, b) => +new Date(b.dateIso) - +new Date(a.dateIso));
}

export default function DentalHistoryPage() {
  const params = useParams();
  const studentNumber = typeof params.studentId === 'string' ? decodeURIComponent(params.studentId) : '';

  const [student, setStudent] = useState<StudentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadProfile() {
      const token = getToken();
      if (!token || !studentNumber) {
        setError('Unable to load student history.');
        setLoading(false);
        return;
      }

      try {
        setError('');
        const response = await api.get<StudentProfileResponse>(`/students/by-number/${encodeURIComponent(studentNumber)}`, token);
        setStudent(response.data);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load student history.');
        }
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, [studentNumber]);

  const timelineEvents = useMemo(() => mapToTimelineEvents(student), [student]);
  const visitCount = student?.clinicVisits?.length || 0;
  const examCount = student?.physicalExaminations?.length || 0;
  const pendingApptCount = (student?.appointments || []).filter(
    (a) => !['COMPLETED', 'CANCELLED'].includes((a.status || '').toUpperCase())
  ).length;

  return (
    <div className="p-5 space-y-5 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Health History</h1>
          <p className="text-sm text-gray-500 mt-1">
            {loading
              ? 'Loading student history...'
              : `${student?.lastName || ''}, ${student?.firstName || ''} • ${student?.studentNumber || studentNumber}`}
          </p>
        </div>
        <Link
          href={`/dashboard/dental/records/${encodeURIComponent(studentNumber)}`}
          className="px-3 py-2 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:border-teal-300 hover:text-teal-600"
        >
          Back to Record
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Clinic Visits</p>
          <p className="text-2xl font-bold text-teal-600 mt-1">{loading ? '...' : visitCount}</p>
          <p className="text-xs text-gray-400 mt-0.5">Recorded consultations</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Physical Exams</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{loading ? '...' : examCount}</p>
          <p className="text-xs text-gray-400 mt-0.5">Annual exam records</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">Pending Appointments</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{loading ? '...' : pendingApptCount}</p>
          <p className="text-xs text-gray-400 mt-0.5">Awaiting or in progress</p>
        </div>
      </div>

      {!loading && timelineEvents.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 bg-white px-5 py-12 text-center text-sm text-gray-500">
          No medical history records available.
        </div>
      ) : (
        <MedicalTrackingTimeline events={timelineEvents} />
      )}
    </div>
  );
}
