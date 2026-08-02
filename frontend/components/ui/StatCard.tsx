import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  delta?: {
    value: number;
    label?: string;
  };
  icon?: React.ReactNode;
  trend?: 'up' | 'down' | 'neutral';
  loading?: boolean;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  delta,
  icon,
  trend,
  loading = false,
  className = '',
}) => {
  const trendConfig = {
    up:      { icon: TrendingUp,   color: 'text-[hsl(var(--success))]', bg: 'bg-[hsl(var(--success-soft))]' },
    down:    { icon: TrendingDown, color: 'text-[hsl(var(--danger))]',  bg: 'bg-[hsl(var(--danger-soft))]'  },
    neutral: { icon: Minus,        color: 'text-[hsl(var(--muted))]',   bg: 'bg-[hsl(var(--border))]'       },
  };

  const trendMeta = trend ? trendConfig[trend] : null;
  const TrendIcon = trendMeta?.icon;

  /* Loading skeleton */
  if (loading) {
    return (
      <div className={`card card-hover ${className}`}>
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div className="skeleton h-3 w-20 rounded-[var(--radius-sm)]" />
            <div className="skeleton h-7 w-14 rounded-[var(--radius-sm)]" />
            <div className="skeleton h-3 w-28 rounded-[var(--radius-sm)]" />
          </div>
          <div className="skeleton h-10 w-10 rounded-[var(--radius-md)] shrink-0" />
        </div>
      </div>
    );
  }

  return (
    <div className={`card card-hover ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-[hsl(var(--muted))] uppercase tracking-[0.07em] truncate">
            {label}
          </p>
          <p className="text-2xl font-bold text-[hsl(var(--foreground))] mt-1.5 tabular-nums leading-none">
            {value}
          </p>
          {delta && trendMeta && TrendIcon && (
            <div className="flex items-center gap-1.5 mt-2">
              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[var(--radius-sm)] text-[10px] font-bold tabular-nums ${trendMeta.color} ${trendMeta.bg}`}>
                <TrendIcon className="h-3 w-3" aria-hidden="true" />
                {delta.value > 0 ? '+' : ''}{delta.value}%
              </span>
              {delta.label && (
                <span className="text-[11px] text-[hsl(var(--muted))]">{delta.label}</span>
              )}
            </div>
          )}
        </div>

        {icon && (
          /* Icon container uses gradient background for visual depth */
          <div
            className="shrink-0 flex items-center justify-center w-10 h-10 rounded-[var(--radius-lg)] text-white"
            style={{ background: 'linear-gradient(135deg, hsl(var(--primary-gradient-from)), hsl(var(--primary-gradient-to)))' }}
            aria-hidden="true"
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
