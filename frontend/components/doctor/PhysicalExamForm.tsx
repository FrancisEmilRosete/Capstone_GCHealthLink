import React, { useEffect } from 'react';
import { Activity, Thermometer, Ruler, Weight, Eye } from 'lucide-react';

interface PhysicalExamFormProps {
  data: {
    bp: string;
    pr: string;
    rr: string;
    temperature: string;
    height: string; // in cm
    weight: string; // in kg
    bmi: string;
    visualAcuity: string;
    isNormal: boolean;
    abnormalFindings: string;
  };
  onChange: (field: string, value: string | boolean) => void;
}

const PhysicalExamForm: React.FC<PhysicalExamFormProps> = ({ data, onChange }) => {
  
  useEffect(() => {
    const h = parseFloat(data.height) / 100; // to meters
    const w = parseFloat(data.weight);
    if (h > 0 && w > 0) {
      const bmiValue = (w / (h * h)).toFixed(1);
      onChange('bmi', bmiValue);
    } else {
      onChange('bmi', '');
    }
  }, [data.height, data.weight, onChange]);

  const vitals = [
    { id: 'bp', label: 'BP', icon: <Activity size={18} />, placeholder: '120/80', unit: 'mmHg' },
    { id: 'pr', label: 'PR', icon: <Activity size={18} />, placeholder: '80', unit: 'bpm' },
    { id: 'rr', label: 'RR', icon: <Activity size={18} />, placeholder: '16', unit: 'bpm' },
    { id: 'temperature', label: 'Temp', icon: <Thermometer size={18} />, placeholder: '36.5', unit: '°C' },
    { id: 'height', label: 'Height', icon: <Ruler size={18} />, placeholder: '170', unit: 'cm' },
    { id: 'weight', label: 'Weight', icon: <Weight size={18} />, placeholder: '70', unit: 'kg' },
    { id: 'visualAcuity', label: 'Visual Acuity', icon: <Eye size={18} />, placeholder: '20/20', unit: '' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-slate-800 border-b pb-2">Physical Examination</h2>
        {/* PHASE 5: Last Updated Indicator */}
        <div className="text-xs text-slate-400 italic mt-2">
          Last Updated: {new Date().toLocaleDateString()} by Current Staff
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {vitals.map((vital) => (
            <div key={vital.id} className="space-y-1">
              <label className="text-xs font-bold text-slate-500 flex items-center gap-1 uppercase tracking-wider">
                {vital.icon} {vital.label}
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={data[vital.id as keyof typeof data] as string}
                  onChange={(e) => onChange(vital.id, e.target.value)}
                  className="w-full pl-3 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                  placeholder={vital.placeholder}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">
                  {vital.unit}
                </span>
              </div>
            </div>
          ))}
          
          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">BMI</label>
            <div className="w-full px-3 py-2 bg-blue-50 border border-blue-100 rounded-md font-bold text-blue-700">
              {data.bmi || '--'}
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6 space-y-4">
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={data.isNormal}
                  onChange={(e) => onChange('isNormal', e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${data.isNormal ? 'bg-green-500 border-green-500' : 'bg-white border-slate-300'}`}>
                  {data.isNormal && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </div>
              <span className={`text-sm font-bold ${data.isNormal ? 'text-green-600' : 'text-slate-600'}`}>Normal</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={!data.isNormal}
                  onChange={(e) => onChange('isNormal', !e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${!data.isNormal ? 'bg-red-500 border-red-500' : 'bg-white border-slate-300'}`}>
                  {!data.isNormal && <div className="w-2 h-2 bg-white rounded-full" />}
                </div>
              </div>
              <span className={`text-sm font-bold ${!data.isNormal ? 'text-red-600' : 'text-slate-600'}`}>Abnormal Findings</span>
            </label>
          </div>

          {!data.isNormal && (
            <div className="animate-in fade-in slide-in-from-top-2 duration-300">
              <textarea
                placeholder="Specify abnormal findings..."
                value={data.abnormalFindings}
                onChange={(e) => onChange('abnormalFindings', e.target.value)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-md focus:ring-2 focus:ring-red-500 outline-none min-h-[100px]"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PhysicalExamForm;
