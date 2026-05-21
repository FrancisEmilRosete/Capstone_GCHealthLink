import React, { useEffect } from 'react';
import { CheckCircle, X, AlertCircle, Info } from 'lucide-react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
  variant?: 'success' | 'error' | 'info';
}

const Toast: React.FC<ToastProps> = ({
  message,
  isVisible,
  onClose,
  duration = 4000,
  variant = 'success'
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (variant) {
      case 'success':
        return <CheckCircle size={20} />;
      case 'error':
        return <AlertCircle size={20} />;
      case 'info':
        return <Info size={20} />;
      default:
        return <CheckCircle size={20} />;
    }
  };

  const getStyles = () => {
    switch (variant) {
      case 'success':
        return 'bg-[hsl(var(--success))] text-white';
      case 'error':
        return 'bg-[hsl(var(--danger))] text-white';
      case 'info':
        return 'bg-[hsl(var(--info))] text-white';
      default:
        return 'bg-[hsl(var(--success))] text-white';
    }
  };

  return (
    <div className="fixed top-4 right-4 z-50 animate-slide-down">
      <div className={`px-4 py-3 rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] flex items-center gap-3 min-w-[320px] max-w-md ${getStyles()}`}>
        {getIcon()}
        <span className="font-medium text-sm flex-1">{message}</span>
        <button
          onClick={onClose}
          className="ml-2 opacity-80 hover:opacity-100 transition-opacity"
          aria-label="Close"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default Toast;
