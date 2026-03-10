'use client';

import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function QrScannerCompatibilityRoute() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const studentId = (searchParams.get('studentId') || '').trim();
    const target = studentId
      ? `/dashboard/staff/scanner?studentId=${encodeURIComponent(studentId)}`
      : '/dashboard/staff/scanner';

    router.replace(target);
  }, [router, searchParams]);

  return (
    <div className="min-h-[40vh] flex items-center justify-center text-sm text-gray-500">
      Redirecting to scanner...
    </div>
  );
}
