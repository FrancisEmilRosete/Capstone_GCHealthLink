import React from 'react';

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
  const systems = [
    { id: 'heent', label: 'HEENT', placeholder: 'Head, Eyes, Ears, Nose, Throat findings...' },
    { id: 'chestLungs', label: 'Chest / Lungs', placeholder: 'Breath sounds, symmetry, percussion...' },
    { id: 'abdomen', label: 'Abdomen', placeholder: 'Bowel sounds, tenderness, masses...' },
    { id: 'extremities', label: 'Extremities', placeholder: 'ROM, pulses, edema, deformities...' },
    { id: 'others', label: 'Others', placeholder: 'Neurological, Skin, Lymph nodes...' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-800 border-b pb-2">System-Specific Notes</h2>
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
              className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none text-sm"
              placeholder={system.placeholder}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SystemSpecificNotes;
