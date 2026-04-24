import React from 'react';
import { Heart, Users, MapPin, Phone, History } from 'lucide-react';
import HistoryTable from './HistoryTable';

interface HealthRecordFormProps {
  data: any;
  onChange: (section: string, field: string, value: any) => void;
  onAddConsultation: () => void;
  onUpdateConsultation: (id: string, field: string, value: string) => void;
  onDeleteConsultation: (id: string) => void;
}

const HealthRecordForm: React.FC<HealthRecordFormProps> = ({ 
  data, 
  onChange, 
  onAddConsultation, 
  onUpdateConsultation, 
  onDeleteConsultation 
}) => {
  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Basic Info & Family History */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 text-rose-500 mb-6 border-b border-slate-50 pb-4">
              <Heart size={20} />
              <h3 className="font-bold uppercase tracking-wider text-sm">Medical History</h3>
            </div>
            <textarea
              value={data.medicalHistory}
              onChange={(e) => onChange('general', 'medicalHistory', e.target.value)}
              placeholder="Significant past medical events..."
              className="w-full p-4 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none text-sm"
            />
          </div>

          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-2 text-blue-500 mb-6 border-b border-slate-50 pb-4">
              <Users size={20} />
              <h3 className="font-bold uppercase tracking-wider text-sm">Family History</h3>
            </div>
            <textarea
              value={data.familyHistory}
              onChange={(e) => onChange('general', 'familyHistory', e.target.value)}
              placeholder="Hereditary diseases (Diabetes, Hypertension, etc.)..."
              className="w-full p-4 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none text-sm"
            />
          </div>
        </div>

        {/* Emergency Contact */}
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2 text-orange-500 mb-6 border-b border-slate-50 pb-4">
            <ShieldAlert size={20} />
            <h3 className="font-bold uppercase tracking-wider text-sm">Emergency Contact</h3>
          </div>
          
          <div className="space-y-5">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Full Name</label>
              <input
                type="text"
                value={data.emergencyContact.name}
                onChange={(e) => onChange('emergency', 'name', e.target.value)}
                className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Relationship</label>
              <input
                type="text"
                value={data.emergencyContact.relationship}
                onChange={(e) => onChange('emergency', 'relationship', e.target.value)}
                className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contact No.</label>
                <div className="relative">
                  <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={data.emergencyContact.phone}
                    onChange={(e) => onChange('emergency', 'phone', e.target.value)}
                    className="w-full pl-9 pr-3 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                  />
                </div>
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Address</label>
                <div className="relative">
                  <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={data.emergencyContact.address}
                    onChange={(e) => onChange('emergency', 'address', e.target.value)}
                    className="w-full pl-9 pr-3 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Consultation Table (Dynamic) */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="flex items-center gap-2 text-teal-600 mb-6 border-b border-slate-50 pb-4">
          <History size={20} />
          <h3 className="font-bold uppercase tracking-wider text-sm">Consultation History</h3>
        </div>
        <HistoryTable 
          records={data.consultations}
          onAdd={onAddConsultation}
          onUpdate={(id, f, v) => onUpdateConsultation(id, f, v)}
          onDelete={onDeleteConsultation}
        />
      </div>
    </div>
  );
};

// Simple icon wrapper
const ShieldAlert = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
);

export default HealthRecordForm;
