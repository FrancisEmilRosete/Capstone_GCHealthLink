import React from 'react';
import { User, Activity, ShieldAlert, Heart, Clipboard } from 'lucide-react';
import PhysicalExamForm from './PhysicalExamForm';

interface EmployeeFormProps {
  data: any;
  onChange: (section: string, field: string, value: any) => void;
}

const EmployeeForm: React.FC<EmployeeFormProps> = ({ data, onChange }) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Section 0: Employee Personal Information (Manual Input) */}
      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 text-slate-800 mb-6 border-b border-slate-50 pb-4">
          <User size={20} className="text-blue-500" />
          <h3 className="font-bold uppercase tracking-wider text-sm">Employee Personal Information</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Position / Designation</label>
            <input
              type="text"
              value={data.personal?.position || ''}
              onChange={(e) => onChange('personal', 'position', e.target.value)}
              placeholder="e.g. Associate Professor"
              className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Employment Status</label>
            <select
              value={data.personal?.status || ''}
              onChange={(e) => onChange('personal', 'status', e.target.value)}
              className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold appearance-none cursor-pointer"
            >
              <option value="">Select Status</option>
              <option value="Permanent">Permanent</option>
              <option value="Casual">Casual</option>
              <option value="Contractual">Contractual</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Civil Status</label>
            <input
              type="text"
              value={data.personal?.civilStatus || ''}
              onChange={(e) => onChange('personal', 'civilStatus', e.target.value)}
              placeholder="Single, Married, etc."
              className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
            />
          </div>
        </div>
      </div>

      {/* Section 1: Personal & Medical History */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-blue-600 mb-4">
            <Clipboard size={20} />
            <h3 className="font-bold uppercase tracking-wider text-sm">Past Medical History</h3>
          </div>
          <textarea
            value={data.pastMedicalHistory}
            onChange={(e) => onChange('history', 'pastMedicalHistory', e.target.value)}
            placeholder="Hospitalizations, major illnesses, operations..."
            className="w-full p-4 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-40 resize-none text-sm"
          />
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-indigo-600 mb-4">
            <Activity size={20} />
            <h3 className="font-bold uppercase tracking-wider text-sm">Review of Systems</h3>
          </div>
          <textarea
            value={data.reviewOfSystems}
            onChange={(e) => onChange('history', 'reviewOfSystems', e.target.value)}
            placeholder="General, cardiovascular, respiratory, gastrointestinal..."
            className="w-full p-4 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-40 resize-none text-sm"
          />
        </div>
      </div>

      {/* Section 2: Allergy & Social History */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-rose-600 mb-4">
            <ShieldAlert size={20} />
            <h3 className="font-bold uppercase tracking-wider text-sm">Allergies</h3>
          </div>
          <input
            type="text"
            value={data.allergies}
            onChange={(e) => onChange('history', 'allergies', e.target.value)}
            placeholder="Drugs, food, environmental..."
            className="w-full p-4 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-teal-600 mb-4">
            <User size={20} />
            <h3 className="font-bold uppercase tracking-wider text-sm">Social History</h3>
          </div>
          <input
            type="text"
            value={data.socialHistory}
            onChange={(e) => onChange('history', 'socialHistory', e.target.value)}
            placeholder="Smoking, drinking, exercise, diet..."
            className="w-full p-4 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
          />
        </div>
      </div>

      {/* Section 3: Physical Examination */}
      <PhysicalExamForm 
        data={data.physicalExam} 
        onChange={(field, value) => onChange('physicalExam', field, value)} 
      />
    </div>
  );
};

export default EmployeeForm;
