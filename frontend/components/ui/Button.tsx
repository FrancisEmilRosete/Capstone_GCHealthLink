import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  loading?: boolean;
  /** Icon rendered to the left of children */
  leftIcon?: React.ReactNode;
  /** Icon rendered to the right of children */
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      className = '',
      children,
      ...props
    },
    ref,
  ) => {
    const base = [
      'inline-flex items-center justify-center gap-2 font-semibold select-none',
      'transition-all duration-[var(--transition-fast)]',
      'focus-visible:outline-none focus-visible:ring-2',
      'focus-visible:ring-[hsl(var(--focus-ring)_/_0.5)]',
      'focus-visible:ring-offset-2',
      'active:scale-[0.97]',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
    ].join(' ');

    const variants: Record<string, string> = {
      primary: [
        'text-[hsl(var(--primary-foreground))]',
        'shadow-sm',
        'hover:shadow-md hover:brightness-105',
      ].join(' '),
      secondary: [
        'border border-[hsl(var(--border))] bg-[hsl(var(--surface))]',
        'text-[hsl(var(--foreground))]',
        'hover:bg-[hsl(var(--primary-soft))] hover:border-[hsl(var(--primary))] hover:text-[hsl(var(--primary))]',
        'shadow-[var(--shadow-sm)]',
      ].join(' '),
      outline: [
        'border border-[hsl(var(--primary))] bg-transparent',
        'text-[hsl(var(--primary))]',
        'hover:bg-[hsl(var(--primary-soft))]',
      ].join(' '),
      ghost: [
        'bg-transparent text-[hsl(var(--foreground))]',
        'hover:bg-[hsl(var(--primary-soft))] hover:text-[hsl(var(--primary))]',
      ].join(' '),
      destructive: [
        'bg-[hsl(var(--danger))] text-white',
        'shadow-sm hover:shadow-md hover:bg-[hsl(0_72%_44%)]',
      ].join(' '),
    };

    const sizes: Record<string, string> = {
      sm:   'h-8 px-3 text-xs rounded-[var(--radius-md)]',
      md:   'h-9 px-4 text-sm rounded-[var(--radius-md)]',
      lg:   'h-11 px-6 text-base rounded-[var(--radius-lg)]',
      icon: 'h-9 w-9 rounded-[var(--radius-md)]',
    };

    /* Primary uses a gradient background for depth */
    const primaryBg = variant === 'primary'
      ? { background: 'linear-gradient(135deg, hsl(var(--primary-gradient-from)), hsl(var(--primary-gradient-to)))' }
      : undefined;

    return (
      <button
        ref={ref}
        style={primaryBg}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {/* Spinner replaces leftIcon while loading */}
        {loading
          ? <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
          : leftIcon && <span className="shrink-0" aria-hidden="true">{leftIcon}</span>
        }
        {children}
        {rightIcon && !loading && (
          <span className="shrink-0" aria-hidden="true">{rightIcon}</span>
        )}
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;
