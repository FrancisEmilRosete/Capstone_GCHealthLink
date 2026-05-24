import React from 'react';
import { Clock, X } from 'lucide-react';

interface AuditHistoryModalProps {
  moduleName: string;
  isOpen: boolean;
  onClose: () => void;
}

const mockAuditData = [
  { id: 1, action: 'Updated Record', staff: 'Dr. Juan Dela Cruz', timestamp: '2026-05-20 10:30 AM' },
  { id: 2, action: 'Initial Entry', staff: 'Staff Maria Santos', timestamp: '2025-08-15 02:15 PM' },
];

const AuditHistoryModal: React.FC<AuditHistoryModalProps> = ({ moduleName, isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex justify-between items-start">
          <div>
            <h3 className="text-xl font-black text-slate-800 tracking-tight">{moduleName} History</h3>
            <p className="text-xs font-bold text-slate-400">Audit trail of modifications.</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-800 transition-colors hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-slate-200">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-8 max-h-[60vh] overflow-y-auto">
          <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
            {mockAuditData.map((audit) => (
              <div key={audit.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-white bg-slate-100 text-slate-400 group-[.is-active]:bg-emerald-500 group-[.is-active]:text-emerald-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                  <Clock size={16} />
                </div>
                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-2xl border border-slate-100 bg-white shadow-sm space-y-1">
                  <div className="flex items-center justify-between space-x-2">
                    <div className="font-black text-sm text-slate-800">{audit.staff}</div>
                    <time className="font-bold text-[10px] text-slate-400">{audit.timestamp}</time>
                  </div>
                  <div className="font-bold text-xs text-slate-600">{audit.action}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-slate-50/50 border-t border-slate-50">
          <button 
            onClick={onClose}
            className="w-full py-4 bg-slate-200 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-300 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditHistoryModal;
