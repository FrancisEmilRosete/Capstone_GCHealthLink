'use client';

import { useEffect, useState } from 'react';
import CertificateApprovalTable, { type PendingCertificateRequest } from '@/components/dashboard/staff/CertificateApprovalTable';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface BackendCertificate {
  id: string;
  studentId: string;
  student: string;
  course: string;
  dateIso: string;
  reason: string;
}

interface CertificatesResponse {
  success: boolean;
  data: BackendCertificate[];
}

export default function AdminCertificatesPage() {
  const [requests, setRequests] = useState<PendingCertificateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function fetchCertificates() {
      const token = getToken();
      if (!token) {
        setError('You are not logged in. Please sign in again.');
        setLoading(false);
        return;
      }

      try {
        const res = await api.get<CertificatesResponse>('/certificates', token);
        const mapped: PendingCertificateRequest[] = (res.data || []).map((cert) => ({
          id: cert.id,
          studentName: cert.student,
          studentNumber: cert.studentId,
          courseDept: cert.course,
          reason: cert.reason || 'Medical Concern',
          requestedDateIso: cert.dateIso,
          status: 'doctor_approved',
        }));
        setRequests(mapped);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load certificates.');
        }
      } finally {
        setLoading(false);
      }
    }

    void fetchCertificates();
  }, []);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Medical Certificates</h1>
        <p className="text-sm text-gray-500 mt-1">Admin view of issued medical certificates.</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-2xl border border-gray-100 bg-white px-4 py-10 text-center text-sm text-gray-400 shadow-sm">
          Loading certificates...
        </div>
      ) : (
        <CertificateApprovalTable initialRequests={requests} />
      )}
    </div>
  );
}
