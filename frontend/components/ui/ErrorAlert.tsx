import React from 'react';
import { AlertTriangle, XCircle, Info } from 'lucide-react';
import Button from './Button';

interface ErrorAlertProps {
  title?: string;
  message: string;
  variant?: 'error' | 'warning' | 'info';
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

const alertConfig = {
  error:   { Icon: XCircle,       strip: 'bg-[hsl(var(--danger))]',  iconColor: 'text-[hsl(var(--danger))]',  bg: 'bg-[hsl(var(--danger-soft))]',  border: 'border-[hsl(var(--danger)_/_0.2)]',  text: 'text-[hsl(var(--danger))]'  },
  warning: { Icon: AlertTriangle, strip: 'bg-[hsl(var(--warning))]', iconColor: 'text-[hsl(var(--warning))]', bg: 'bg-[hsl(var(--warning-soft))]', border: 'border-[hsl(var(--warning)_/_0.2)]', text: 'text-[hsl(var(--warning))]' },
  info:    { Icon: Info,          strip: 'bg-[hsl(var(--info))]',    iconColor: 'text-[hsl(var(--info))]',    bg: 'bg-[hsl(var(--info-soft))]',    border: 'border-[hsl(var(--info)_/_0.2)]',    text: 'text-[hsl(var(--info))]'    },
};

/** Converts technical backend errors into user-friendly messages. */
function toFriendlyMessage(msg: string): string {
  if (msg.includes('Invalid database request') || msg.includes('Invalid `prisma'))
    return 'Unable to load data. Please try again or contact support if the problem persists.';
  if (msg.includes('Network') || msg.includes('fetch'))
    return 'Network connection issue. Please check your connection and try again.';
  if (msg.includes('Unauthorized') || msg.includes('401'))
    return 'Your session has expired. Please log in again.';
  if (msg.includes('Forbidden') || msg.includes('403'))
    return "You don't have permission to access this resource.";
  if (msg.includes('Not found') || msg.includes('404'))
    return 'The requested resource was not found.';
  if (msg.includes('Server error') || msg.includes('500'))
    return 'A server error occurred. Our team has been notified.';
  return msg;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  title,
  message,
  variant = 'error',
  onRetry,
  onDismiss,
  className = '',
}) => {
  const { Icon, strip, iconColor, bg, border, text } = alertConfig[variant];
  const friendlyMessage = toFriendlyMessage(message);

  return (
    <div
      className={`flex items-stretch overflow-hidden rounded-[var(--radius-lg)] border ${bg} ${border} ${className}`}
      role="alert"
    >
      {/* Left colour strip */}
      <div className={`w-1 shrink-0 ${strip}`} aria-hidden="true" />

      <div className="flex gap-3 px-4 py-3.5 flex-1">
        <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${iconColor}`} aria-hidden="true" />

        <div className="flex-1 space-y-1 min-w-0">
          {title && (
            <h3 className={`text-sm font-semibold ${text}`}>{title}</h3>
          )}
          <p className={`text-sm leading-snug ${text} opacity-90`}>{friendlyMessage}</p>

          {(onRetry || onDismiss) && (
            <div className="flex gap-2 mt-3">
              {onRetry && (
                <Button size="sm" variant="secondary" onClick={onRetry}>
                  Try Again
                </Button>
              )}
              {onDismiss && (
                <Button size="sm" variant="ghost" onClick={onDismiss}>
                  Dismiss
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorAlert;

