'use client';

import React, { useRef, useState } from 'react';
import { Plus, History } from 'lucide-react';
import RecordHistoryModal from './RecordHistoryModal';

interface MedicalConsultationProps {
  data: {
    findings: string;
    diagnosis: string;
    followUpDate: string;
    noFollowUp: boolean;
  };
  onChange: (field: string, value: string | boolean) => void;
}

const MedicalConsultation: React.FC<MedicalConsultationProps> = ({ data, onChange }) => {
  const [showHistory, setShowHistory] = useState(false);

  const mockHistory = [
    {
      timestamp: new Date().toISOString(),
      staffName: 'Dr. Smith',
      changes: ['Findings updated', 'Diagnosis assessment modified'],
      version: 2,
    },
    {
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      staffName: 'Dr. Johnson',
      changes: ['Initial consultation recorded'],
      version: 1,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 border-b pb-2">Medical Consultation</h2>
          <div className="text-xs text-slate-400 italic mt-2">
            Last Updated: {new Date().toLocaleDateString()} by Current Staff
          </div>
        </div>
        <button
          onClick={() => setShowHistory(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <History size={16} /> History
        </button>
      </div>

      {/* Findings Card */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">
          Findings
        </label>
        <textarea
          value={data.findings}
          onChange={(e) => onChange('findings', e.target.value)}
          placeholder="Enter clinical observations and findings..."
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none min-h-[120px] resize-none text-sm"
        />
      </div>

      {/* Diagnosis Assessment Card */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">
          Diagnosis Assessment
        </label>
        <textarea
          value={data.diagnosis}
          onChange={(e) => onChange('diagnosis', e.target.value)}
          placeholder="Enter professional evaluation and diagnosis..."
          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none min-h-[120px] resize-none text-sm"
        />
      </div>

      {/* Follow-Up Card */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={data.noFollowUp}
                  onChange={(e) => onChange('noFollowUp', e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${data.noFollowUp ? 'bg-green-500 border-green-500' : 'bg-white border-slate-300'}`}>
                  {data.noFollowUp && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </div>
              <span className={`text-sm font-bold ${data.noFollowUp ? 'text-green-600' : 'text-slate-600'}`}>
                No Follow-Up Required
              </span>
            </label>
          </div>

          {!data.noFollowUp && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">
                Follow-Up Date
              </label>
              <input
                type="date"
                value={data.followUpDate}
                onChange={(e) => onChange('followUpDate', e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none text-sm"
              />
            </div>
          )}
        </div>
      </div>

      <RecordHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        sectionName="Medical Consultation"
        history={mockHistory}
      />
    </div>
  );
};

export default MedicalConsultation;
