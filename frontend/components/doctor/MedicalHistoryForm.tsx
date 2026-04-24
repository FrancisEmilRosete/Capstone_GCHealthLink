import React from 'react';

interface MedicalHistoryFormProps {
  data: {
    pastMedicalHistory: string;
    reviewOfSystem: string;
    allergies: string;
    personalSocialHistory: string;
  };
  onChange: (field: string, value: string) => void;
}

const MedicalHistoryForm: React.FC<MedicalHistoryFormProps> = ({ data, onChange }) => {
  const sections = [
    { id: 'pastMedicalHistory', label: 'SECTION A: PAST MEDICAL HISTORY', placeholder: 'Enter past medical conditions, surgeries, hospitalizations...' },
    { id: 'reviewOfSystem', label: 'SECTION B: REVIEW OF SYSTEM', placeholder: 'General, Head, Eyes, Ears, Nose, Throat, Cardiovascular...' },
    { id: 'allergies', label: 'SECTION C: ALLERGIES', placeholder: 'List all drug, food, and environmental allergies...', isSingleLine: true },
    { id: 'personalSocialHistory', label: 'SECTION D: PERSONAL & SOCIAL HISTORY', placeholder: 'Smoking, Alcohol, Exercise, Diet, Occupation...' },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-slate-800 border-b pb-2">Medical History</h2>
      <div className="grid grid-cols-1 gap-6">
        {sections.map((section) => (
          <div key={section.id} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm hover:border-blue-200 transition-colors">
            <label htmlFor={section.id} className="block text-sm font-bold text-slate-700 mb-2">
              {section.label}
            </label>
            {section.isSingleLine ? (
              <input
                type="text"
                id={section.id}
                value={data[section.id as keyof typeof data]}
                onChange={(e) => onChange(section.id, e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                placeholder={section.placeholder}
              />
            ) : (
              <textarea
                id={section.id}
                rows={4}
                value={data[section.id as keyof typeof data]}
                onChange={(e) => onChange(section.id, e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all resize-none"
                placeholder={section.placeholder}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MedicalHistoryForm;
