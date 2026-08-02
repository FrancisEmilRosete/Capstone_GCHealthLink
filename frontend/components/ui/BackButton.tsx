'use client';

import { ChevronLeft } from 'lucide-react';

/**
 * BACK BUTTON
 * A client component that calls history.back() when clicked.
 * Used on the 404 page (not-found.tsx) which is a Server Component.
 */
export default function BackButton() {
  return (
    <button
      onClick={() => history.back()}
      className="inline-flex items-center gap-1.5 px-4 py-2.5
        rounded-[var(--radius-md)] text-sm font-semibold
        text-[hsl(var(--muted-foreground))] bg-[hsl(var(--border))]
        hover:bg-[hsl(var(--primary-soft))] hover:text-[hsl(var(--primary))]
        transition-all duration-[var(--transition-fast)] cursor-pointer
        active:scale-[0.97]"
    >
      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      Go Back
    </button>
  );
}
