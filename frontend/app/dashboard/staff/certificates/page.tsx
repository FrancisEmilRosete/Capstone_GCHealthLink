'use client';

import CertificateApprovalTable from '@/components/dashboard/staff/CertificateApprovalTable';
import { staffCertificateRequestsMock } from '@/lib/mock/staffCertificateRequests';

export default function StaffCertificatesPage() {
  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Medical Certificate Requests</h1>
        <p className="text-sm text-gray-500 mt-1">Approval workflow for pending certificate requests.</p>
      </div>

      <CertificateApprovalTable
        initialRequests={staffCertificateRequestsMock}
        approverName="Campus Physician"
      />
    </div>
  );
}
