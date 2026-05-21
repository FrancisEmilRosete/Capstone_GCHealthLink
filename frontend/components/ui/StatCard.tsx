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
  className = ''
}) => {
  const getTrendIcon = () => {
    if (!trend) return null;
    const iconClass = "h-4 w-4";
    if (trend === 'up') return <TrendingUp className={`${iconClass} text-[hsl(var(--success))]`} />;
    if (trend === 'down') return <TrendingDown className={`${iconClass} text-[hsl(var(--danger))]`} />;
    return <Minus className={`${iconClass} text-[hsl(var(--muted))]`} />;
  };

  const getTrendColor = () => {
    if (trend === 'up') return 'text-[hsl(var(--success))]';
    if (trend === 'down') return 'text-[hsl(var(--danger))]';
    return 'text-[hsl(var(--muted))]';
  };

  if (loading) {
    return (
      <div className={`card ${className}`}>
        <div className="space-y-3">
          <div className="skeleton h-4 w-24"></div>
          <div className="skeleton h-8 w-16"></div>
          <div className="skeleton h-3 w-32"></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`card ${className}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-xs font-medium text-[hsl(var(--muted))] uppercase tracking-wide">
            {label}
          </p>
          <p className="text-2xl font-bold text-[hsl(var(--foreground))] mt-2 tabular-nums">
            {value}
          </p>
          {delta && (
            <div className="flex items-center gap-1 mt-2">
              {getTrendIcon()}
              <span className={`text-xs font-semibold tabular-nums ${getTrendColor()}`}>
                {delta.value > 0 ? '+' : ''}{delta.value}%
              </span>
              {delta.label && (
                <span className="text-xs text-[hsl(var(--muted))]">{delta.label}</span>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 p-2 bg-[hsl(var(--primary-soft))] rounded-[var(--radius-md)] text-[hsl(var(--primary))]">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
