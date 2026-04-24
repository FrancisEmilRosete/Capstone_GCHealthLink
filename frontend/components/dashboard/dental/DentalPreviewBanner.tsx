'use client';

interface DentalPreviewBannerProps {
  show: boolean;
}

export default function DentalPreviewBanner({ show }: DentalPreviewBannerProps) {
  if (!show) return null;

  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-700">
      Preview mode: showing sample dental queue data.
    </div>
  );
}
