'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

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
}

interface StudentProfileResponse {
  success: boolean;
  data: StudentProfile;
}

interface QrResponse {
  success: boolean;
  data: {
    studentNumber: string;
    qrCodeImage: string;
    qrTokenExpiresAt?: string;
  };
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

function normalizeComplaint(raw?: string | null) {
  if (!raw || !raw.trim()) return 'General Consultation';

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
      return diagnosis || complaint || notes || 'General Consultation';
    }
  } catch {
    // Legacy delimited payload.
  }

  const parts = text.split('|').map((part) => part.trim()).filter(Boolean);
  return parts[0] || text;
}

export default function StudentDashboard() {
  const [profile, setProfile] = useState<StudentProfile | null>(null);
  const [qrImage, setQrImage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadStudentData() {
    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      setLoading(false);
      return;
    }

    try {
      setError('');
      const [profileResponse, qrResponse] = await Promise.all([
        api.get<StudentProfileResponse>('/students/me', token),
        api.get<QrResponse>('/students/qr', token),
      ]);

      setProfile(profileResponse.data);
      setQrImage(qrResponse.data.qrCodeImage || '');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load student dashboard data.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadStudentData();
  }, []);

  const recentVisits = useMemo(() => {
    return [...(profile?.clinicVisits || [])].slice(0, 3);
  }, [profile]);

  const allergyCount = parseAllergyCount(profile?.medicalHistory?.allergyEnc);
  const totalVisits = profile?.clinicVisits?.length || 0;
  const lastVisitDate = profile?.clinicVisits?.[0]?.visitDate;

  return (
    <div className="p-5 space-y-5 max-w-4xl mx-auto">
      <div
        className="relative rounded-2xl overflow-hidden px-6 py-7"
        style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 60%, #134e4a 100%)' }}
      >
        <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 right-16 w-24 h-24 rounded-full bg-white/5" />

        <div className="relative z-10">
          <h1 className="text-xl font-bold text-white">
            {loading
              ? 'Loading your dashboard...'
              : `Welcome back, ${profile?.firstName || 'Student'}!`}
          </h1>
          <p className="text-teal-100 text-sm mt-1.5 max-w-md">
            Your profile and clinic records are now connected to the live backend.
          </p>
          <div className="flex flex-wrap gap-3 mt-4">
            <Link href="/dashboard/student/consultation-request" className="px-4 py-2 border border-white/50 text-white text-sm font-semibold rounded-xl hover:bg-white/10 transition-colors">
              Request Consultation
            </Link>
            <Link href="/dashboard/student/registration" className="px-4 py-2 border border-white/50 text-white text-sm font-semibold rounded-xl hover:bg-white/10 transition-colors">
              Register
            </Link>
            <Link href="/dashboard/student/my-record" className="px-4 py-2 bg-white text-teal-700 text-sm font-semibold rounded-xl hover:bg-teal-50 transition-colors">
              View My Record
            </Link>
            <Link href="/dashboard/student/notifications" className="px-4 py-2 border border-white/50 text-white text-sm font-semibold rounded-xl hover:bg-white/10 transition-colors">
              Advisories
            </Link>
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Student Number</p>
          <p className="text-lg font-bold text-gray-800 mt-1">{loading ? '...' : profile?.studentNumber || '-'}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Total Visits</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{loading ? '...' : totalVisits}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Known Allergies</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{loading ? '...' : allergyCount}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Last Visit</p>
          <p className="text-lg font-bold text-gray-800 mt-1">{loading ? '...' : (lastVisitDate ? formatDate(lastVisitDate) : '-')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-4">Recent Clinic Visits</h2>

          {loading ? (
            <p className="text-sm text-gray-400">Loading visits...</p>
          ) : recentVisits.length === 0 ? (
            <p className="text-sm text-gray-400">No visit records yet.</p>
          ) : (
            <div className="space-y-3">
              {recentVisits.map((visit) => (
                <div key={visit.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {normalizeComplaint(visit.chiefComplaintEnc)}
                    </p>
                    <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(visit.visitDate)}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Handled by: {visit.handledBy?.email || 'Clinic Staff'}</p>
                  {visit.dispensedMedicines.length > 0 && (
                    <p className="text-xs text-teal-600 mt-1">
                      Medicines: {visit.dispensedMedicines.map((item) => `${item.inventory.itemName} x${item.quantity}`).join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col items-center">
          <h2 className="text-sm font-bold text-gray-800 mb-3">My QR Code</h2>

          {loading ? (
            <p className="text-sm text-gray-400">Loading QR...</p>
          ) : qrImage ? (
            <img src={qrImage} alt="Student QR Code" className="w-44 h-44 rounded-xl border border-gray-100" />
          ) : (
            <p className="text-sm text-gray-400 text-center">QR code is not available right now.</p>
          )}

          <p className="text-xs text-gray-500 mt-3 text-center">
            {profile ? `${profile.firstName} ${profile.lastName}` : ''}
            {profile ? ` - ${profile.courseDept}` : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
