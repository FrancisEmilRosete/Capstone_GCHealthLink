'use client';

/**
 * BACK BUTTON
 * ──────────────────────────────────────────────────────────────
 * Client component that calls history.back() when clicked.
 * Used on the 404 page (not-found.tsx) which is a Server Component.
 */

export default function BackButton() {
  return (
    <button
      onClick={() => history.back()}
      className="inline-flex items-center justify-center px-6 py-2.5
                 rounded-lg text-sm font-semibold text-gray-600 bg-gray-100
                 hover:bg-gray-200 transition-colors duration-150 cursor-pointer"
    >
      Go Back
    </button>
  );
}
