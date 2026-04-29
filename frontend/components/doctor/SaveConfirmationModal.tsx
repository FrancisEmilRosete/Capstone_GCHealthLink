'use client';

import React from 'react';
import { AlertCircle, X } from 'lucide-react';

interface SaveConfirmationModalProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const SaveConfirmationModal: React.FC<SaveConfirmationModalProps> = ({ 
  isOpen, 
  onConfirm, 
  onCancel,
  isLoading = false
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Blurred backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={!isLoading ? onCancel : undefined} />

      <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4">
        <div className="border-b border-slate-200 px-6 py-4 flex items-center gap-3">
          <AlertCircle size={24} className="text-blue-600" />
          <h2 className="text-lg font-bold text-slate-800">Confirm Save</h2>
        </div>

        <div className="px-6 py-6">
          <p className="text-slate-700 mb-2">
            Are you sure you want to save these changes?
          </p>
          <p className="text-sm text-slate-500">
            All changes will be archived and timestamped for audit purposes.
          </p>
        </div>

        <div className="border-t border-slate-200 px-6 py-4 flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={isLoading}
            className="px-6 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={isLoading}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Confirm'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SaveConfirmationModal;
