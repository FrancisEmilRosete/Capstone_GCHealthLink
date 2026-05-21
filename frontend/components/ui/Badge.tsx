import React from 'react';

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'triage-green' | 'triage-yellow' | 'triage-orange' | 'triage-red';
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ variant = 'default', children, className = '' }) => {
  const baseStyles = 'inline-flex items-center px-2.5 py-0.5 rounded-[var(--radius-full)] text-xs font-semibold';
  
  const variantStyles = {
    default: 'bg-[hsl(var(--border))] text-[hsl(var(--foreground))]',
    success: 'bg-[hsl(var(--success-soft))] text-[hsl(var(--success))]',
    warning: 'bg-[hsl(var(--warning-soft))] text-[hsl(var(--warning))]',
    danger: 'bg-[hsl(var(--danger-soft))] text-[hsl(var(--danger))]',
    info: 'bg-[hsl(var(--info-soft))] text-[hsl(var(--info))]',
    'triage-green': 'bg-[hsl(var(--success-soft))] text-[hsl(var(--triage-green))]',
    'triage-yellow': 'bg-[hsl(var(--warning-soft))] text-[hsl(var(--triage-yellow))]',
    'triage-orange': 'bg-[hsl(25_95%_95%)] text-[hsl(var(--triage-orange))]',
    'triage-red': 'bg-[hsl(var(--danger-soft))] text-[hsl(var(--triage-red))]'
  };
  
  return (
    <span className={`${baseStyles} ${variantStyles[variant]} ${className}`}>
      {children}
    </span>
  );
};

export default Badge;
