'use client';

import ReportsModule from '@/components/dashboard/ReportsModule';

export default function NurseReportsPage() {
  return (
    <div className="p-4 sm:p-6 space-y-5">
      <ReportsModule staffRole="NURSE" />
    </div>
  );
}
