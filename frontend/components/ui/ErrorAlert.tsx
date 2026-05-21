import React from 'react';
import { AlertCircle, AlertTriangle, XCircle, Info } from 'lucide-react';
import Button from './Button';

interface ErrorAlertProps {
  title?: string;
  message: string;
  variant?: 'error' | 'warning' | 'info';
  onRetry?: () => void;
  onDismiss?: () => void;
  className?: string;
}

export const ErrorAlert: React.FC<ErrorAlertProps> = ({
  title,
  message,
  variant = 'error',
  onRetry,
  onDismiss,
  className = ''
}) => {
  const getIcon = () => {
    const iconClass = "h-5 w-5 flex-shrink-0";
    switch (variant) {
      case 'error':
        return <XCircle className={`${iconClass} text-[hsl(var(--danger))]`} />;
      case 'warning':
        return <AlertTriangle className={`${iconClass} text-[hsl(var(--warning))]`} />;
      case 'info':
        return <Info className={`${iconClass} text-[hsl(var(--info))]`} />;
      default:
        return <AlertCircle className={`${iconClass} text-[hsl(var(--danger))]`} />;
    }
  };

  const getStyles = () => {
    switch (variant) {
      case 'error':
        return 'bg-[hsl(var(--danger-soft))] border-[hsl(var(--danger))] text-[hsl(var(--danger))]';
      case 'warning':
        return 'bg-[hsl(var(--warning-soft))] border-[hsl(var(--warning))] text-[hsl(var(--warning))]';
      case 'info':
        return 'bg-[hsl(var(--info-soft))] border-[hsl(var(--info))] text-[hsl(var(--info))]';
      default:
        return 'bg-[hsl(var(--danger-soft))] border-[hsl(var(--danger))] text-[hsl(var(--danger))]';
    }
  };

  // Convert backend error messages to friendly ones
  const getFriendlyMessage = (msg: string) => {
    if (msg.includes('Invalid database request') || msg.includes('Invalid `prisma')) {
      return 'Unable to load data. Please try again or contact support if the problem persists.';
    }
    if (msg.includes('Network') || msg.includes('fetch')) {
      return 'Network connection issue. Please check your connection and try again.';
    }
    if (msg.includes('Unauthorized') || msg.includes('401')) {
      return 'Your session has expired. Please log in again.';
    }
    if (msg.includes('Forbidden') || msg.includes('403')) {
      return 'You don\'t have permission to access this resource.';
    }
    if (msg.includes('Not found') || msg.includes('404')) {
      return 'The requested resource was not found.';
    }
    if (msg.includes('Server error') || msg.includes('500')) {
      return 'A server error occurred. Our team has been notified.';
    }
    return msg;
  };

  const friendlyMessage = getFriendlyMessage(message);

  return (
    <div className={`rounded-[var(--radius-lg)] border p-4 ${getStyles()} ${className}`}>
      <div className="flex gap-3">
        {getIcon()}
        <div className="flex-1 space-y-1">
          {title && (
            <h3 className="text-sm font-semibold">{title}</h3>
          )}
          <p className="text-sm opacity-90">{friendlyMessage}</p>
          {(onRetry || onDismiss) && (
            <div className="flex gap-2 mt-3">
              {onRetry && (
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onRetry}
                  className="h-8"
                >
                  Try Again
                </Button>
              )}
              {onDismiss && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={onDismiss}
                  className="h-8"
                >
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
