'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X, FileText, CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { useServerEvents } from '@/lib/useServerEvents';
import { normalizeComplaintDisplay } from '@/lib/complaint';
import { formatTime12Hour } from '@/lib/time';
import PersonalWellnessTrendsCard from '@/components/dashboard/student/PersonalWellnessTrendsCard';

interface ClinicVisit {
  id: string;
  visitDate: string;
  visitTime: string | null;
  chiefComplaintEnc: string | null;
  handledBy: {
    email: string;
  };
  dispensedMedicines: Array<{
    quantity: number;
    inventory: {
      itemName: string;
      unit: string;
    };
  }>;
}

interface StudentProfile {
  firstName: string;
  lastName: string;
  studentNumber: string;
  courseDept: string;
  medicalHistory: {
    allergyEnc?: string | null;
  } | null;
  clinicVisits: ClinicVisit[];
  appointments?: any[];
  medicalCertificates?: any[];
}

interface StudentProfileResponse {
  success: boolean;
  data: StudentProfile;
}

interface QrResponse {
  success: boolean;
  data: {
    studentNumber: string;
    qrToken: string;
    qrCodeImage: string;
  };
}

const STUDENT_QR_CACHE_KEY = 'gchl:student:static-qr';

interface CachedQrPayload {
  studentNumber: string;
  qrToken: string;
  qrCodeImage: string;
}

function parseAllergyCount(raw?: string | null): number {
  if (!raw) return 0;
  const normalized = raw.trim().toLowerCase();
  if (!normalized || ['none', 'no', 'n/a', 'na'].includes(normalized)) return 0;
  return raw.split(',').map((value) => value.trim()).filter(Boolean).length;
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function buildMonthlyTrendFromVisits(visits: ClinicVisit[]) {
  const now = new Date();
  const buckets: Array<{ label: string; visits: number; key: string }> = [];

  for (let index = 5; index >= 0; index -= 1) {
    const monthDate = new Date(now.getFullYear(), now.getMonth() - index, 1);
    buckets.push({
      key: `${monthDate.getFullYear()}-${monthDate.getMonth()}`,
      label: monthDate.toLocaleDateString('en-US', { month: 'short' }),
      visits: 0,
    });
  }

  const lookup = new Map(buckets.map((bucket) => [bucket.key, bucket]));
  for (const visit of visits) {
    const date = new Date(visit.visitDate);
    const key = `${date.getFullYear()}-${date.getMonth()}`;
    const hit = lookup.get(key);
    if (hit) {
      hit.visits += 1;
    }
  }

  return buckets.map(({ label, visits }) => ({ label, visits }));
}

function hasCompletedRegistration(profile: StudentProfile | null) {
  return Boolean(profile?.studentNumber?.trim());
}

function formatCertificateType(type?: string) {
  if (!type) return 'Certificate';
  return type
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function formatStatus(status?: string) {
  if (!status) return 'UNKNOWN';
  return status
    .replace(/_/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function parseScheduled(apt: any): Date | null {
  const d = new Date(apt.preferred_date || apt.preferredDate);
  if (isNaN(d.getTime())) return null;
  const raw = ((apt.preferred_time || apt.preferredTime) || '').trim();
  const m12 = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    let h = parseInt(m12[1]); const min = parseInt(m12[2]);
    if (m12[3].toUpperCase() === 'PM' && h < 12) h += 12;
    if (m12[3].toUpperCase() === 'AM' && h === 12) h = 0;
    return new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, min);
  }
  const m24 = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) return new Date(d.getFullYear(), d.getMonth(), d.getDate(), parseInt(m24[1]), parseInt(m24[2]));
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function resolveStatus(apt: any): string {
  const s = apt.status?.toUpperCase();
  if (s === 'WAITING') {
    const sched = parseScheduled(apt);
    return sched && sched.getTime() > Date.now() ? 'INCOMING' : 'WAITING';
  }
  return s || 'UNKNOWN';
}

function readCachedQrPayload(): CachedQrPayload | null {
  if (typeof window === 'undefined') return null;

  try {
    const raw = window.localStorage.getItem(STUDENT_QR_CACHE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as Partial<CachedQrPayload>;
    if (
      typeof parsed?.studentNumber !== 'string'
      || typeof parsed?.qrToken !== 'string'
      || typeof parsed?.qrCodeImage !== 'string'
    ) {
      return null;
    }

    if (!parsed.qrToken.trim() || !parsed.qrCodeImage.trim()) {
      return null;
    }

    return {
      studentNumber: parsed.studentNumber,
      qrToken: parsed.qrToken,
      qrCodeImage: parsed.qrCodeImage,
    };
  } catch {
    return null;
  }
}

function writeCachedQrPayload(payload: CachedQrPayload) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(STUDENT_QR_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore cache write failures (private mode, storage full, etc.).
  }
}

function QrCard({
  loading,
  qrImage,
  profile,
  className = '',
  prominent = false,
}: {
  loading: boolean;
  qrImage: string;
  profile: StudentProfile | null;
  className?: string;
  prominent?: boolean;
}) {
  return (
    <div className={`card p-5 flex flex-col items-center ${className}`}>
      <h2 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-3">My QR Code</h2>

      {loading ? (
        <p className="text-sm text-[hsl(var(--muted))]">Loading QR...</p>
      ) : qrImage ? (
        <img
          src={qrImage}
          alt="Student QR Code"
          className={`${prominent ? 'w-56 h-56 sm:w-60 sm:h-60' : 'w-44 h-44'} rounded-md border border-[hsl(var(--border))]`}
        />
      ) : (
        <p className="text-sm text-[hsl(var(--muted))] text-center">QR code is not available right now.</p>
      )}

      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--success)_/_0.2)] bg-[hsl(var(--success-soft))] px-3 py-1 text-xs text-[hsl(var(--success))]">
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M5 13l4 4L19 7"
          />
        </svg>
        <span>Static QR cached for offline use</span>
      </div>

      <p className="text-xs text-[hsl(var(--muted-foreground))] mt-3 text-center">
        {profile ? `${profile.firstName} ${profile.lastName}` : ''}
        {profile ? ` - ${profile.courseDept}` : ''}
      </p>
    </div>
  );
}

export default function StudentDashboard() {
  const router = useRouter();
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [qrImage, setQrImage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Modals state
  const [selectedCert, setSelectedCert] = useState<any | null>(null);
  const [selectedApt, setSelectedApt] = useState<any | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [editConfirmOpen, setEditConfirmOpen] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  async function handleCancelRequest() {
    if (!selectedApt?.id) return;
    const token = getToken();
    if (!token) return;
    try {
      setCancelling(true);
      await api.del(`/appointments/${selectedApt.id}`, token);
      toast.success("Consultation request cancelled.");
      loadStudentData(false);
    } catch (err) {
      toast.error("Failed to cancel request.");
    } finally {
      setCancelling(false);
      setDeleteConfirmOpen(false);
      setSelectedApt(null);
    }
  }

  function handleEditRequest() {
    setEditConfirmOpen(false);
    setSelectedApt(null);
    router.push('/dashboard/student/consultation-request');
  }

  async function loadStudentData(showLoader = true) {
    const cachedQr = readCachedQrPayload();
    if (cachedQr?.qrCodeImage) {
      setQrImage(cachedQr.qrCodeImage);
    }

    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      setLoading(false);
      return;
    }

    try {
      setError('');
      const [profileResponse, qrResponse] = await Promise.allSettled([
        api.get<StudentProfileResponse>('/students/me', token),
        api.get<QrResponse>('/students/qr', token),
      ]);

      if (profileResponse.status !== 'fulfilled') {
        throw profileResponse.reason;
      }

      setProfile(profileResponse.value.data);

      if (qrResponse.status === 'fulfilled') {
        const qrPayload = qrResponse.value.data;
        setQrImage(qrPayload.qrCodeImage || cachedQr?.qrCodeImage || '');

        if (qrPayload.qrToken && qrPayload.qrCodeImage) {
          writeCachedQrPayload({
            studentNumber: qrPayload.studentNumber || profileResponse.value.data.studentNumber || '',
            qrToken: qrPayload.qrToken,
            qrCodeImage: qrPayload.qrCodeImage,
          });
        }
      } else {
        setQrImage(cachedQr?.qrCodeImage || '');
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load student dashboard data.');
      }
    } finally {
      if (showLoader) setLoading(false);
    }
  }

  useServerEvents(['visits'], () => {
    void loadStudentData(false);
  });

  useEffect(() => {
    void loadStudentData(true);

    // Silent refresh on tab re-focus
    function handleWindowFocus() { void loadStudentData(false); }
    function handleVisibilityChange() {
      if (document.visibilityState === 'visible') void loadStudentData(false);
    }

    window.addEventListener('focus', handleWindowFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('focus', handleWindowFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const recentVisits = useMemo(() => {
    return [...(profile?.clinicVisits || [])].slice(0, 3);
  }, [profile]);

  const allergyCount = parseAllergyCount(profile?.medicalHistory?.allergyEnc);
  const totalVisits = profile?.clinicVisits?.length || 0;
  const lastVisitDate = profile?.clinicVisits?.[0]?.visitDate;
  const registrationCompleted = hasCompletedRegistration(profile);
  const personalTrendData = useMemo(
    () => buildMonthlyTrendFromVisits(profile?.clinicVisits || []),
    [profile?.clinicVisits],
  );
  
  const activeAppointments = useMemo(() => {
    return (profile?.appointments || []).filter(apt => apt.status?.toUpperCase() !== 'CANCELLED');
  }, [profile?.appointments]);
  return (
    <div className="p-5 space-y-5 max-w-4xl mx-auto">
      <div
        className="relative rounded-[var(--radius-xl)] overflow-hidden px-6 py-8 shadow-sm bg-gradient-to-br from-blue-600 to-blue-300"
      >
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 right-16 w-24 h-24 rounded-full bg-white/5" />

        <div className="relative z-10">
          <h1 className="text-2xl font-black !text-white">
            {loading
              ? 'Loading your dashboard...'
              : `Welcome back, ${profile?.firstName || 'Student'}!`}
          </h1>
          <p className="text-white/90 text-sm mt-1.5 max-w-md">
            Your profile and clinic records are now connected to the live backend.
          </p>
          {!loading && !registrationCompleted && (
            <div className="flex flex-wrap gap-3 mt-4">
              <Link href="/dashboard/student/registration" className="px-4 py-2 border border-white/50 text-white text-sm font-semibold rounded-[var(--radius-lg)] hover:bg-white/10 transition-colors">
                Register
              </Link>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="rounded-[var(--radius-lg)] border border-[hsl(var(--danger)_/_0.3)] bg-[hsl(var(--danger-soft))] px-4 py-3 text-sm text-[hsl(var(--danger))]">
          {error}
        </div>
      )}

      <QrCard
        loading={loading}
        qrImage={qrImage}
        profile={profile}
        prominent
        className="lg:hidden mx-auto w-full max-w-sm"
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-5 border-b-4 border-b-teal-500 hover:shadow-md transition-shadow">
          <p className="text-[11px] text-[hsl(var(--muted))] uppercase tracking-wider font-semibold">Student Number</p>
          <p className="text-xl font-bold text-[hsl(var(--foreground))] mt-1 tabular-nums">{loading ? '...' : profile?.studentNumber || '-'}</p>
        </div>

        <div className="card p-5 border-b-4 border-b-amber-500 hover:shadow-md transition-shadow">
          <p className="text-[11px] text-[hsl(var(--muted))] uppercase tracking-wider font-semibold">Total Visits</p>
          <p className="text-2xl font-bold text-[hsl(var(--foreground))] mt-1 tabular-nums">{loading ? '...' : totalVisits}</p>
        </div>

        <div className="card p-5 border-b-4 border-b-rose-500 hover:shadow-md transition-shadow">
          <p className="text-[11px] text-[hsl(var(--muted))] uppercase tracking-wider font-semibold">Known Allergies</p>
          <p className="text-2xl font-bold text-[hsl(var(--foreground))] mt-1 tabular-nums">{loading ? '...' : allergyCount}</p>
        </div>

        <div className="card p-5 border-b-4 border-b-sky-500 hover:shadow-md transition-shadow">
          <p className="text-[11px] text-[hsl(var(--muted))] uppercase tracking-wider font-semibold">Last Visit</p>
          <p className="text-lg font-bold text-[hsl(var(--foreground))] mt-1 tabular-nums">{loading ? '...' : (lastVisitDate ? formatDate(lastVisitDate) : '-')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="card p-5 flex flex-col max-h-[500px]">
            <h2 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">My Consultations</h2>
            <div className="overflow-y-auto space-y-3 pr-2">
              {loading ? (
                <p className="text-sm text-[hsl(var(--muted))]">Loading consultations...</p>
              ) : (activeAppointments.length === 0) ? (
                <p className="text-sm text-[hsl(var(--muted))]">No active consultations found.</p>
              ) : (
                activeAppointments.slice(0, 5).map((apt) => (
                  <div 
                    key={apt.id} 
                    onClick={() => setSelectedApt(apt)}
                    className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 flex flex-col gap-2 cursor-pointer hover:border-teal-500 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-bold text-gray-900">{apt.service_type || apt.serviceType}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                        resolveStatus(apt) === 'INCOMING' ? 'bg-indigo-100 text-indigo-800' :
                        resolveStatus(apt) === 'PENDING' ? 'bg-amber-100 text-amber-800' :
                        resolveStatus(apt) === 'WAITING' ? 'bg-blue-100 text-blue-800' :
                        resolveStatus(apt) === 'IN_PROGRESS' ? 'bg-teal-100 text-teal-800' :
                        resolveStatus(apt) === 'FOR_DISPENSING' || resolveStatus(apt) === 'FOR DISPENSING' ? 'bg-purple-100 text-purple-800' :
                        resolveStatus(apt) === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                        resolveStatus(apt) === 'CANCELLED' ? 'bg-red-100 text-red-800' :
                        'bg-gray-200 text-gray-700'
                      }`}>
                        {formatStatus(resolveStatus(apt))}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium">
                      {formatDate(apt.preferred_date || apt.preferredDate)} at {apt.preferred_time || apt.preferredTime}
                    </p>
                    <p className="text-xs text-gray-700 mt-1 line-clamp-2">{apt.symptoms}</p>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="card p-5 flex flex-col max-h-[500px]">
            <h2 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4">My Certificates</h2>
            <div className="overflow-y-auto space-y-3 pr-2">
              {loading ? (
                <p className="text-sm text-[hsl(var(--muted))]">Loading certificates...</p>
              ) : (!profile?.medicalCertificates || profile.medicalCertificates.length === 0) ? (
                <p className="text-sm text-[hsl(var(--muted))]">No certificates found.</p>
              ) : (
                profile.medicalCertificates.slice(0, 5).map((cert) => (
                  <div 
                    key={cert.id} 
                    onClick={() => setSelectedCert(cert)}
                    className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 flex flex-col gap-2 cursor-pointer hover:border-teal-500 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-start justify-between">
                      <p className="text-sm font-bold text-gray-900">{formatCertificateType(cert.certificate_type || cert.type)} Certificate</p>
                    </div>
                    <p className="text-xs text-gray-500 font-medium">
                      Issued on: {formatDate(cert.issued_at || cert.issuedAt)}
                    </p>
                    {(cert.remarks || cert.recommendations_remarks) && (
                      <p className="text-xs text-gray-700 mt-1 line-clamp-2">{cert.remarks || cert.recommendations_remarks}</p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <QrCard
          loading={loading}
          qrImage={qrImage}
          profile={profile}
          className="hidden lg:flex"
        />
      </div>

      {/* Details Modal - Consultation */}
      {selectedApt && !editConfirmOpen && !deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setSelectedApt(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-800 mb-4">
              Consultation Details
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Service Type</p>
                <p className="text-sm font-medium text-gray-800">{selectedApt.service_type || selectedApt.serviceType}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Status</p>
                <p className="text-sm font-bold text-gray-800">{formatStatus(resolveStatus(selectedApt))}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Preferred Schedule</p>
                <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                  <CalendarClock size={16} className="text-teal-600" />
                  {formatDate(selectedApt.preferred_date || selectedApt.preferredDate)} at {selectedApt.preferred_time || selectedApt.preferredTime}
                </div>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Symptoms / Notes</p>
                <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100 whitespace-pre-wrap">
                  {selectedApt.symptoms || 'None provided'}
                </div>
              </div>
            </div>

            {selectedApt.status?.toUpperCase() === 'PENDING' && (
              <div className="mt-6 flex flex-col gap-2">
                <button
                  onClick={() => setEditConfirmOpen(true)}
                  className="w-full py-2.5 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition"
                >
                  Edit Request
                </button>
                <button
                  onClick={() => setDeleteConfirmOpen(true)}
                  className="w-full py-2.5 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 transition"
                >
                  Cancel Request
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Details Modal - Certificate */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200">
            <button 
              onClick={() => setSelectedCert(null)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 rounded-full transition"
            >
              <X size={20} />
            </button>
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <FileText className="text-teal-600" size={24} />
              Certificate Details
            </h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Certificate Type</p>
                <p className="text-sm font-medium text-gray-800">{formatCertificateType(selectedCert.certificate_type || selectedCert.type)}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Issue Date</p>
                <p className="text-sm font-medium text-gray-800">{formatDate(selectedCert.issued_at || selectedCert.issuedAt)}</p>
              </div>
              {(selectedCert.diagnosis_findings || selectedCert.diagnosisFindings) && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Diagnosis / Findings</p>
                  <p className="text-sm font-medium text-gray-800">{selectedCert.diagnosis_findings || selectedCert.diagnosisFindings}</p>
                </div>
              )}
              {(selectedCert.remarks || selectedCert.recommendations_remarks) && (
                <div>
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-1">Remarks</p>
                  <div className="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100 whitespace-pre-wrap">
                    {selectedCert.remarks || selectedCert.recommendations_remarks}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-in zoom-in duration-200 text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Cancel Request</h3>
            <p className="text-sm text-gray-500 mb-6">Are you sure you want to cancel this consultation request? This action cannot be undone.</p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                disabled={cancelling}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition"
              >
                No, Keep it
              </button>
              <button
                onClick={handleCancelRequest}
                disabled={cancelling}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2"
              >
                {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Confirmation Modal */}
      {editConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-in zoom-in duration-200 text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Edit Request</h3>
            <p className="text-sm text-gray-500 mb-6">You will be redirected to the Consultations page to select a new schedule. Proceed?</p>
            <div className="flex gap-3 w-full">
              <button
                onClick={() => setEditConfirmOpen(false)}
                className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleEditRequest}
                className="flex-1 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl transition"
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
