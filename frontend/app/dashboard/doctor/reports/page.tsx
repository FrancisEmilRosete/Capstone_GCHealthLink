'use client';

import ReportsModule from '@/components/dashboard/ReportsModule';

export default function DoctorReportsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <ReportsModule staffRole="DOCTOR" />
    </div>
  );
}
