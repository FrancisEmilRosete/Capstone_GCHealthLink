import React, { useEffect } from 'react';
import { CheckCircle, X, AlertCircle, Info } from 'lucide-react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
  variant?: 'success' | 'error' | 'info';
}

const toastConfig = {
  success: {
    icon: CheckCircle,
    strip: 'bg-[hsl(var(--success))]',
    iconColor: 'text-[hsl(var(--success))]',
    label: 'Success',
  },
  error: {
    icon: AlertCircle,
    strip: 'bg-[hsl(var(--danger))]',
    iconColor: 'text-[hsl(var(--danger))]',
    label: 'Error',
  },
  info: {
    icon: Info,
    strip: 'bg-[hsl(var(--info))]',
    iconColor: 'text-[hsl(var(--info))]',
    label: 'Info',
  },
};

const Toast: React.FC<ToastProps> = ({
  message,
  isVisible,
  onClose,
  duration = 4000,
  variant = 'success',
}) => {
  useEffect(() => {
    if (!isVisible) return;
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const { icon: Icon, strip, iconColor, label } = toastConfig[variant];

  return (
    <div
      className="fixed top-4 right-4 z-50 animate-slide-down"
      role="alert"
      aria-live="polite"
      aria-label={label}
    >
      <div
        className="flex items-stretch overflow-hidden rounded-[var(--radius-lg)] bg-[hsl(var(--surface))] border border-[hsl(var(--border))]"
        style={{ boxShadow: 'var(--shadow-lg)', minWidth: '320px', maxWidth: '420px' }}
      >
        {/* Left colour strip */}
        <div className={`w-1 shrink-0 ${strip}`} aria-hidden="true" />

        <div className="flex items-start gap-3 px-4 py-3.5 flex-1 min-w-0">
          <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${iconColor}`} aria-hidden="true" />
          <span className="text-sm font-medium text-[hsl(var(--foreground))] flex-1 leading-snug">
            {message}
          </span>
          <button
            onClick={onClose}
            className="shrink-0 ml-1 p-0.5 rounded text-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))] hover:bg-[hsl(var(--border))] transition-colors"
            aria-label="Dismiss notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;
