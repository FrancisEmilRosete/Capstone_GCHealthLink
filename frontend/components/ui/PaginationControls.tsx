'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationControlsProps {
  page: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  itemLabel?: string;
  className?: string;
}

export default function PaginationControls({
  page,
  totalPages,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 20, 50],
  onPageChange,
  onPageSizeChange,
  itemLabel = 'items',
  className = '',
}: PaginationControlsProps) {
  if (totalItems <= 0) return null;

  const safePage  = Math.min(Math.max(page, 1), Math.max(totalPages, 1));
  const start     = (safePage - 1) * pageSize + 1;
  const end       = Math.min(totalItems, safePage * pageSize);
  const maxPages  = Math.max(totalPages, 1);

  /* Build a compact page-number window: [prev-1, current, next+1] clamped */
  function buildPageWindow(): number[] {
    const window: number[] = [];
    for (let p = Math.max(1, safePage - 1); p <= Math.min(maxPages, safePage + 1); p++) {
      window.push(p);
    }
    return window;
  }

  const pageWindow = buildPageWindow();

  const btnBase = [
    'inline-flex items-center justify-center h-8 min-w-[32px] px-2',
    'rounded-[var(--radius-md)] text-xs font-semibold',
    'border border-[hsl(var(--border))] bg-[hsl(var(--surface))]',
    'transition-all duration-[var(--transition-fast)]',
    'disabled:opacity-40 disabled:cursor-not-allowed',
  ].join(' ');

  const btnActive = 'border-[hsl(var(--primary))] bg-[hsl(var(--primary-soft))] text-[hsl(var(--primary))]';
  const btnIdle   = 'text-[hsl(var(--foreground))] hover:bg-[hsl(var(--primary-soft))] hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]';

  return (
    <div
      className={[
        'flex flex-col gap-3 border-t border-[hsl(var(--border))]',
        'px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
        className,
      ].join(' ')}
    >
      {/* Item count summary */}
      <p className="text-xs text-[hsl(var(--muted))]">
        Showing{' '}
        <span className="font-semibold text-[hsl(var(--foreground))]">{start}&ndash;{end}</span>
        {' '}of{' '}
        <span className="font-semibold text-[hsl(var(--foreground))]">{totalItems}</span>{' '}
        {itemLabel}
      </p>

      <div className="flex flex-wrap items-center gap-2">
        {/* Per-page selector */}
        <label className="flex items-center gap-1.5 text-xs text-[hsl(var(--muted))]">
          Per page
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className={[
              'rounded-[var(--radius-md)] border border-[hsl(var(--border))]',
              'bg-[hsl(var(--surface))] px-2 py-1 text-xs',
              'text-[hsl(var(--foreground))]',
              'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--focus-ring)_/_0.35)]',
              'focus:border-[hsl(var(--primary))]',
            ].join(' ')}
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </label>

        {/* Prev */}
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className={`${btnBase} ${btnIdle}`}
          aria-label="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
        </button>

        {/* Page number pills */}
        {pageWindow.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPageChange(p)}
            className={`${btnBase} ${p === safePage ? btnActive : btnIdle}`}
            aria-label={`Page ${p}`}
            aria-current={p === safePage ? 'page' : undefined}
          >
            {p}
          </button>
        ))}

        {/* Next */}
        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= maxPages}
          className={`${btnBase} ${btnIdle}`}
          aria-label="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
