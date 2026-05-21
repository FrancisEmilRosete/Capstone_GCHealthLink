'use client';

import ReportsModule from '@/components/dashboard/ReportsModule';

export default function DentalReportsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-bold text-[hsl(var(--foreground))] tracking-tight">Dental Reports</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
          Generate dental consultation and examination summaries.
        </p>
      </div>
      <ReportsModule staffRole="DENTIST" />
    </div>
  );
}
