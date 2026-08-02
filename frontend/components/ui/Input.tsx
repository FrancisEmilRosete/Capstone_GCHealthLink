import React from 'react';

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  error?: string;
  helperText?: string;
  /** Icon or element rendered inside the left edge of the input */
  prefix?: React.ReactNode;
  /** Icon or element rendered inside the right edge of the input */
  suffix?: React.ReactNode;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      prefix,
      suffix,
      containerClassName = '',
      className = '',
      ...props
    },
    ref,
  ) => {
    const inputId = props.id || `input-${label?.toLowerCase().replace(/\s+/g, '-')}`;
    const hasError = !!error;

    return (
      <div className={`space-y-1.5 ${containerClassName}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-[hsl(var(--foreground))]"
          >
            {label}
            {props.required && (
              <span className="text-[hsl(var(--danger))] ml-1" aria-hidden="true">*</span>
            )}
          </label>
        )}

        {/* Input wrapper — needed to position prefix/suffix absolutely */}
        <div className="relative flex items-center">
          {prefix && (
            <span className="absolute left-3 flex items-center text-[hsl(var(--muted))] pointer-events-none">
              {prefix}
            </span>
          )}

          <input
            ref={ref}
            id={inputId}
            className={[
              'w-full h-10 rounded-[var(--radius-md)]',
              'border bg-[hsl(var(--surface))]',
              'text-sm text-[hsl(var(--foreground))]',
              'placeholder:text-[hsl(var(--muted))]',
              'transition-all duration-[var(--transition-fast)]',
              'focus:outline-none focus:ring-2 focus:ring-[hsl(var(--focus-ring)_/_0.35)]',
              'focus:border-[hsl(var(--primary))]',
              'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-[hsl(var(--primary-soft))]',
              hasError
                ? 'border-[hsl(var(--danger))] focus:ring-[hsl(var(--danger)_/_0.3)]'
                : 'border-[hsl(var(--input-border))] hover:border-[hsl(var(--border-hover))]',
              prefix ? 'pl-9' : 'px-3',
              suffix ? 'pr-9' : 'pr-3',
              className,
            ].join(' ')}
            aria-invalid={hasError ? 'true' : 'false'}
            aria-describedby={
              hasError
                ? `${inputId}-error`
                : helperText
                  ? `${inputId}-helper`
                  : undefined
            }
            {...props}
          />

          {suffix && (
            <span className="absolute right-3 flex items-center text-[hsl(var(--muted))] pointer-events-auto">
              {suffix}
            </span>
          )}
        </div>

        {hasError && (
          <p
            id={`${inputId}-error`}
            className="text-xs text-[hsl(var(--danger))] flex items-center gap-1"
            role="alert"
          >
            <svg className="h-3 w-3 shrink-0" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            {error}
          </p>
        )}
        {helperText && !hasError && (
          <p id={`${inputId}-helper`} className="text-xs text-[hsl(var(--muted))]">
            {helperText}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

export default Input;
