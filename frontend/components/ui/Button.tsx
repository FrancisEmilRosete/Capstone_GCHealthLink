import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  children: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading = false, disabled, className = '', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all focus-visible:focus-ring disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none';
    
    const variantStyles = {
      primary: 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] hover:bg-[hsl(var(--primary-hover))] shadow-sm',
      secondary: 'border border-[hsl(var(--border))] bg-transparent text-[hsl(var(--foreground))] hover:bg-[hsl(var(--primary-soft))] hover:border-[hsl(var(--primary))]',
      ghost: 'bg-transparent text-[hsl(var(--foreground))] hover:bg-[hsl(var(--primary-soft))] hover:text-[hsl(var(--primary))]',
      destructive: 'bg-[hsl(var(--danger))] text-white hover:opacity-90 shadow-sm'
    };
    
    const sizeStyles = {
      sm: 'h-9 px-3 text-xs rounded-[var(--radius-md)]',
      md: 'h-10 px-4 text-sm rounded-[var(--radius-md)]',
      lg: 'h-11 px-6 text-base rounded-[var(--radius-md)]'
    };
    
    return (
      <button
        ref={ref}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        disabled={disabled || loading}
        {...props}
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export default Button;
