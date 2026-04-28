'use client';

import MedicalCertificateRequestPanel from '@/components/dashboard/student/MedicalCertificateRequestPanel';

export default function StudentCertificatesPage() {
  return (
    <div className="p-5 max-w-3xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Medical Certificate</h1>
        <p className="text-sm text-gray-500 mt-1">Submit a request and monitor approval status from the clinic.</p>
      </div>

      <MedicalCertificateRequestPanel initialRequests={[]} />
    </div>
  );
}
