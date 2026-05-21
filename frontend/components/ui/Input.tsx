import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, containerClassName = '', className = '', ...props }, ref) => {
    const inputId = props.id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;
    
    return (
      <div className={`space-y-1.5 ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[hsl(var(--foreground))]"
          >
            {label}
            {props.required && <span className="text-[hsl(var(--danger))] ml-1">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full h-10 px-3 rounded-[var(--radius-md)]
            border border-[hsl(var(--input-border))]
            bg-[hsl(var(--surface))]
            text-sm text-[hsl(var(--foreground))]
            placeholder:text-[hsl(var(--muted))]
            transition-all
            focus:outline-none focus:ring-2 focus:ring-[hsl(var(--focus-ring)_/_0.4)] focus:border-[hsl(var(--primary))]
            disabled:opacity-50 disabled:cursor-not-allowed
            ${error ? 'border-[hsl(var(--danger))] focus:ring-[hsl(var(--danger)_/_0.4)]' : ''}
            ${className}
          `}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-[hsl(var(--danger))] flex items-center gap-1">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>
        )}
        {helperText && !error && (
          <p id={`${inputId}-helper`} className="text-xs text-[hsl(var(--muted))]">
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
