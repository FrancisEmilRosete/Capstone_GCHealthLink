import React, { useState } from 'react';
import { Save, Printer, History, PenTool, Lock } from 'lucide-react';
import AuditHistoryModal from './AuditHistoryModal';

interface DentalPrescriptionProps {
  patient: {
    fullName: string;
    age: number;
    date: string;
  };
  content: string;
  onChange: (value: string) => void;
  onPrint: () => void;
  onSave: () => void;
}

const DentalPrescription: React.FC<DentalPrescriptionProps> = ({ 
  patient, content, onChange, onPrint, onSave 
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-3xl mx-auto">
      <AuditHistoryModal 
        moduleName="Dental Prescription" 
        isOpen={isHistoryModalOpen} 
        onClose={() => setIsHistoryModalOpen(false)} 
      />

      <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm px-8">
        <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">Dental Prescription Pad</h3>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => setIsHistoryModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors"
          >
            <History size={14} /> History
          </button>
          
          <button onClick={onPrint} className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs hover:bg-slate-200 transition-all">
            <Printer size={14} /> Print
          </button>
          
          {isEditing ? (
            <button 
              onClick={() => {
                onSave();
                setIsEditing(false);
              }} 
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all animate-in zoom-in-95"
            >
              <Save size={14} /> Save to Record
            </button>
          ) : (
            <button 
              onClick={() => setIsEditing(true)} 
              className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 text-white rounded-xl font-bold text-xs hover:bg-slate-700 shadow-md transition-all"
            >
              <PenTool size={14} /> Update
            </button>
          )}
        </div>
      </div>

      <div className={`bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden ring-1 ring-slate-100 transition-all ${!isEditing && 'opacity-90'}`}>
        {/* Pad Header */}
        <div className="p-10 border-b-2 border-dashed border-emerald-100 bg-emerald-50/20">
          <div className="flex justify-between items-start mb-12">
            <div className="space-y-2">
              <h1 className="text-3xl font-black text-emerald-900 tracking-tighter">GORDON COLLEGE</h1>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em]">Health Services Unit | Dental Clinic</p>
            </div>
            <div className="text-right space-y-0.5">
              <p className="text-sm font-black text-slate-800">Dr. Juan Dela Cruz, DMD</p>
              <p className="text-[10px] font-bold text-slate-400">License No: 123456</p>
              <p className="text-[10px] font-bold text-slate-400">PTR No: 7890123</p>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-6 items-end">
            <div className="col-span-8 space-y-1">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Patient Name</label>
              <div className="border-b-2 border-slate-200 pb-2 font-serif text-2xl text-slate-800 italic">
                {patient.fullName}
              </div>
            </div>
            <div className="col-span-2 space-y-1 text-center">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Age</label>
              <div className="border-b-2 border-slate-200 pb-2 font-serif text-2xl text-slate-800">
                {patient.age}
              </div>
            </div>
            <div className="col-span-2 space-y-1 text-right">
              <label className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Date</label>
              <div className="border-b-2 border-slate-200 pb-2 font-serif text-lg text-slate-800 pt-1">
                {patient.date}
              </div>
            </div>
          </div>
        </div>

        {/* Rx Body */}
        <div className={`p-10 min-h-[400px] relative flex flex-col transition-colors ${isEditing ? 'bg-emerald-50/10' : 'bg-white'}`}>
          <div className="absolute top-10 left-10 text-7xl font-serif italic text-emerald-100/50 select-none pointer-events-none">
            Rx
          </div>
          <textarea
            readOnly={!isEditing}
            value={content}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type prescriptions, dosage, and frequency here..."
            className={`flex-1 w-full bg-transparent border-none focus:ring-0 outline-none font-serif text-xl leading-relaxed text-slate-700 placeholder:text-slate-200 z-10 min-h-[300px] resize-none ${!isEditing && 'cursor-not-allowed'}`}
          />
        </div>

        {/* Pad Footer */}
        <div className="px-10 py-8 bg-emerald-50/20 border-t-2 border-dashed border-emerald-100 flex justify-between items-center">
          <div className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest max-w-[200px]">
            * NOT VALID WITHOUT OFFICIAL SEAL. VALID FOR 30 DAYS FROM ISSUE.
          </div>
          <div className="text-right">
             <div className="w-40 border-b-2 border-slate-300 mb-1 ml-auto" />
             <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Physician Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DentalPrescription;
