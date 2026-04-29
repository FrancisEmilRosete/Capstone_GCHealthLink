'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Clock } from 'lucide-react';

interface HistoryEntry {
  timestamp: string;
  staffName: string;
  changes: string[];
  version: number;
}

interface RecordHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  sectionName: string;
  history: HistoryEntry[];
}

const RecordHistoryModal: React.FC<RecordHistoryModalProps> = ({ isOpen, onClose, sectionName, history }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="border-b border-slate-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Clock size={20} className="text-blue-600" />
            <h2 className="text-lg font-bold text-slate-800">{sectionName} — Update History</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          {history.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-500">No update history available</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry, index) => (
                <div key={index} className="border border-slate-200 rounded-lg p-4 hover:border-blue-200 transition-colors">
                  <div className="mb-3">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Version {entry.version}</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">
                      {new Date(entry.timestamp).toLocaleDateString()} at {new Date(entry.timestamp).toLocaleTimeString()}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">By {entry.staffName}</p>
                  </div>
                  <div className="bg-slate-50 rounded p-3 text-xs space-y-1">
                    {entry.changes.map((change, i) => (
                      <p key={i} className="text-slate-600">• {change}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border-t border-slate-200 px-6 py-4 flex justify-end flex-shrink-0">
          <button onClick={onClose} className="px-6 py-2 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors">
            Close
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RecordHistoryModal;
