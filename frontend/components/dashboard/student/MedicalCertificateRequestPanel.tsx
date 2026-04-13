'use client';

import { useState } from 'react';

export interface StudentCertificateRequest {
  id: string;
  reason: string;
  requestedDateIso: string;
  proofFileName?: string;
  status: 'pending' | 'approved' | 'denied';
}

interface MedicalCertificateRequestPanelProps {
  initialRequests?: StudentCertificateRequest[];
  onSubmitRequest?: (request: StudentCertificateRequest) => void;
  className?: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function MedicalCertificateRequestPanel({
  initialRequests = [],
  onSubmitRequest,
  className,
}: MedicalCertificateRequestPanelProps) {
  const [requests, setRequests] = useState<StudentCertificateRequest[]>(initialRequests);
  const [reason, setReason] = useState('');
  const [requestedDateIso, setRequestedDateIso] = useState(new Date().toISOString().slice(0, 10));
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  function submit(event: React.FormEvent) {
    event.preventDefault();

    if (!reason.trim()) {
      setError('Reason is required.');
      return;
    }

    const request: StudentCertificateRequest = {
      id: `req-${Date.now()}`,
      reason: reason.trim(),
      requestedDateIso,
      proofFileName: proofFile?.name,
      status: 'pending',
    };

    setRequests((current) => [request, ...current]);
    onSubmitRequest?.(request);
    setReason('');
    setProofFile(null);
    setError('');
  }

  return (
    <section className={`space-y-4 ${className ?? ''}`.trim()}>
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-900">Medical Certificate Request</h2>
        <p className="mt-1 text-xs text-gray-500">Submit your request with reason, date, and optional proof attachment.</p>

        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Reason</label>
            <textarea
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="State why you are requesting a medical certificate."
              className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Requested Date</label>
              <input
                type="date"
                value={requestedDateIso}
                onChange={(event) => setRequestedDateIso(event.target.value)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-gray-600">Proof (optional)</label>
              <input
                type="file"
                onChange={(event) => setProofFile(event.target.files?.[0] || null)}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-teal-50 file:px-2 file:py-1 file:text-teal-700"
              />
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            className="rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
          >
            Submit Request
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-gray-900">Request Status</h3>
        <p className="mt-1 text-xs text-gray-500">Track whether your request is pending, approved, or denied.</p>

        {requests.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-400">
            No certificate requests submitted yet.
          </div>
        ) : (
          <div className="mt-4 space-y-2">
            {requests.map((request) => (
              <div key={request.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-gray-900">{request.reason}</p>
                  <span
                    className={`ml-auto inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      request.status === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : request.status === 'denied'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {request.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-600">Date: {formatDate(request.requestedDateIso)}</p>
                <p className="mt-1 text-xs text-gray-600">Proof: {request.proofFileName || 'None'}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
