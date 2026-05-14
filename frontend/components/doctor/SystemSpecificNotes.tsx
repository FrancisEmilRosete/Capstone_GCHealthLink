import React, { useRef, useState } from 'react';
import { Plus, History, Edit2, Save, X } from 'lucide-react';
import RecordHistoryModal from './RecordHistoryModal';

interface SystemSpecificNotesProps {
  data: {
    heent: string;
    chestLungs: string;
    abdomen: string;
    extremities: string;
    others: string;
  };
  onChange: (field: string, value: string) => void;
}

const SystemSpecificNotes: React.FC<SystemSpecificNotesProps> = ({ data, onChange }) => {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
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
      changes: ['HEENT: Normal findings recorded', 'Chest/Lungs: Clear to auscultation'],
      version: 2,
    },
    {
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      staffName: 'Dr. Johnson',
      changes: ['Initial system examination completed'],
      version: 1,
    },
  ];

  const systems = [
    { id: 'heent', label: 'HEENT', placeholder: 'Head, Eyes, Ears, Nose, Throat findings...' },
    { id: 'chestLungs', label: 'Chest / Lungs', placeholder: 'Breath sounds, symmetry, percussion...' },
    { id: 'abdomen', label: 'Abdomen', placeholder: 'Bowel sounds, tenderness, masses...' },
    { id: 'extremities', label: 'Extremities', placeholder: 'ROM, pulses, edema, deformities...' },
    { id: 'others', label: 'Others', placeholder: 'Neurological, Skin, Lymph nodes...' },
  ];

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const timestamp = new Date().toLocaleString();
      const attachment = `[File uploaded: ${file.name} at ${timestamp}]`;
      onChange('others', data.others ? `${data.others}\n${attachment}` : attachment);
    }
    event.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 border-b pb-2 inline-block border-slate-200">System-Specific Notes</h2>
          {/* PHASE 5: Last Updated Indicator */}
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
                type="button"
                onClick={() => uploadInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 text-sm font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors"
              >
                <Plus size={16} /> Upload File
              </button>
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
        <input
          ref={uploadInputRef}
          type="file"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {systems.map((system) => (
          <div key={system.id} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
            <label htmlFor={system.id} className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wider">
              {system.label}
            </label>
            <textarea
              id={system.id}
              rows={3}
              value={data[system.id as keyof typeof data]}
              onChange={(e) => onChange(system.id, e.target.value)}
              readOnly={!isEditing}
              className={`w-full px-4 py-2 rounded-md outline-none h-24 resize-none text-sm transition-all ${
                isEditing 
                  ? 'bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-500' 
                  : 'bg-transparent border-transparent cursor-default px-0'
              }`}
              placeholder={isEditing ? system.placeholder : ''}
            />
          </div>
        ))}
      </div>

      <RecordHistoryModal
        isOpen={showHistory}
        onClose={() => setShowHistory(false)}
        sectionName="System-Specific Notes"
        history={mockHistory}
      />
    </div>
  );
};

export default SystemSpecificNotes;
