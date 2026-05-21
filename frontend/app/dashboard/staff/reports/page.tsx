'use client';

import ReportsModule from '@/components/dashboard/ReportsModule';

export default function NurseReportsPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-xl font-bold text-[hsl(var(--foreground))] tracking-tight">Reports</h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-0.5">
          Generate consultation, physical examination, and dental report summaries.
        </p>
      </div>
      <ReportsModule staffRole="NURSE" />
    </div>
  );
}
