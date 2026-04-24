import React, { useEffect } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface ToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

const Toast: React.FC<ToastProps> = ({ message, isVisible, onClose, duration = 3000 }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
      <div className="bg-emerald-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3">
        <CheckCircle size={20} className="text-emerald-100" />
        <span className="font-semibold text-sm">{message}</span>
        <button onClick={onClose} className="ml-4 text-emerald-200 hover:text-white transition-colors">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export default Toast;
