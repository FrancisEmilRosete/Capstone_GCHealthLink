'use client';

import React, { useRef, useState } from 'react';
import { Plus, History, Edit2, Save, X } from 'lucide-react';
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
  const [isEditing, setIsEditing] = useState(false);
  const [snapshot, setSnapshot] = useState<typeof data | null>(null);

  const handleUpdateClick = () => {
    setSnapshot(data);
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    if (snapshot) {
      Object.keys(snapshot).forEach(key => {
        onChange(key, snapshot[key as keyof typeof data]);
      });
    }
    setIsEditing(false);
  };

  const handleSaveClick = () => {
    setIsEditing(false);
  };

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
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 border-b pb-2 inline-block border-slate-200">Medical Consultation</h2>
          <div className="text-xs text-slate-400 italic mt-2">
            Last Updated: {new Date().toLocaleDateString()} by Current Staff
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowHistory(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <History size={16} /> History
          </button>
          {!isEditing ? (
            <button 
              onClick={handleUpdateClick}
              className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <Edit2 size={16} /> Update
            </button>
          ) : (
            <>
              <button 
                onClick={handleCancelClick}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={16} /> Cancel
              </button>
              <button 
                onClick={handleSaveClick}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
              >
                <Save size={16} /> Save
              </button>
            </>
          )}
        </div>
      </div>

      {/* Findings Card */}
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wider">
          Findings
        </label>
        <textarea
          value={data.findings}
          onChange={(e) => onChange('findings', e.target.value)}
          placeholder={isEditing ? "Enter clinical observations and findings..." : ""}
          readOnly={!isEditing}
          className={`w-full px-4 py-3 rounded-md focus:outline-none min-h-[120px] resize-none text-sm transition-all ${
            isEditing 
              ? 'bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500' 
              : 'bg-transparent border-transparent cursor-default px-0'
          }`}
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
          placeholder={isEditing ? "Enter professional evaluation and diagnosis..." : ""}
          readOnly={!isEditing}
          className={`w-full px-4 py-3 rounded-md focus:outline-none min-h-[120px] resize-none text-sm transition-all ${
            isEditing 
              ? 'bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500' 
              : 'bg-transparent border-transparent cursor-default px-0'
          }`}
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
                  disabled={!isEditing}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${
                  data.noFollowUp 
                    ? `bg-green-500 border-green-500 ${!isEditing && 'opacity-80'}` 
                    : `bg-white border-slate-300 ${!isEditing && 'opacity-60'}`
                }`}>
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
                readOnly={!isEditing}
                className={`w-full px-4 py-2 rounded-md focus:outline-none text-sm transition-all ${
                  isEditing 
                    ? 'bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500' 
                    : 'bg-transparent border-transparent cursor-default px-0 appearance-none'
                }`}
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
