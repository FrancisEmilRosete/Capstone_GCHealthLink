import React from 'react';
import { Save, RefreshCw, Printer, Trash2 } from 'lucide-react';

interface ActionBarProps {
  onSave: () => void;
  onUpdate: () => void;
  onPrint: () => void;
  onClear: () => void;
  isSaving?: boolean;
}

const ActionBar: React.FC<ActionBarProps> = ({ onSave, onUpdate, onPrint, onClear, isSaving }) => {
  return (
    <div className="sticky bottom-6 left-0 right-0 z-50 px-6">
      <div className="max-w-5xl mx-auto bg-white/80 backdrop-blur-md border border-white/20 shadow-2xl rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex gap-2">
          <button
            onClick={onClear}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition-all"
          >
            <Trash2 size={18} /> Clear Form
          </button>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onPrint}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all active:scale-95"
          >
            <Printer size={18} /> Print Record
          </button>
          <button
            onClick={onUpdate}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-700 rounded-xl font-bold hover:bg-indigo-100 border border-indigo-100 transition-all active:scale-95"
          >
            <RefreshCw size={18} /> Update Record
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-8 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={18} /> Save Record
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ActionBar;
