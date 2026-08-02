import React from 'react';

type BadgeVariant =
  | 'default'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'triage-green'
  | 'triage-yellow'
  | 'triage-orange'
  | 'triage-red';

interface BadgeProps {
  variant?: BadgeVariant;
  /** Show a leading coloured dot */
  dot?: boolean;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, { pill: string; dot: string }> = {
  default:        { pill: 'bg-[hsl(var(--border))] text-[hsl(var(--foreground))]',                dot: 'bg-[hsl(var(--muted))]'           },
  success:        { pill: 'bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]',             dot: 'bg-[hsl(var(--success))]'         },
  warning:        { pill: 'bg-[hsl(var(--warning-soft))] text-[hsl(var(--warning))]',             dot: 'bg-[hsl(var(--warning))]'         },
  danger:         { pill: 'bg-[hsl(var(--danger-soft))] text-[hsl(var(--danger))]',               dot: 'bg-[hsl(var(--danger))]'          },
  info:           { pill: 'bg-[hsl(var(--info-soft))] text-[hsl(var(--info))]',                   dot: 'bg-[hsl(var(--info))]'            },
  'triage-green':  { pill: 'bg-[hsl(var(--success-soft))] text-[hsl(var(--triage-green))]',       dot: 'bg-[hsl(var(--triage-green))]'    },
  'triage-yellow': { pill: 'bg-[hsl(var(--warning-soft))] text-[hsl(var(--triage-yellow))]',     dot: 'bg-[hsl(var(--triage-yellow))]'   },
  'triage-orange': { pill: 'bg-[hsl(25_95%_95%)] text-[hsl(var(--triage-orange))]',              dot: 'bg-[hsl(var(--triage-orange))]'   },
  'triage-red':    { pill: 'bg-[hsl(var(--danger-soft))] text-[hsl(var(--triage-red))]',         dot: 'bg-[hsl(var(--triage-red))]'      },
};

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', dot = false, children, className = '' }) => {
  const styles = variantStyles[variant];

  return (
    <span
      className={[
        'inline-flex items-center gap-1.5',
        'px-2 py-0.5 rounded-[var(--radius-full)]',
        'text-xs font-semibold leading-none',
        styles.pill,
        className,
      ].join(' ')}
    >
      {dot && (
        <span
          className={`w-1.5 h-1.5 rounded-full shrink-0 ${styles.dot}`}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
};

export default Badge;
