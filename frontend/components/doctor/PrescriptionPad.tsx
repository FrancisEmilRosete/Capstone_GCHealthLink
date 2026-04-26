import React from 'react';
import { Save, Printer, Download, Plus, Trash2 } from 'lucide-react';

interface Medicine {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

interface PrescriptionPadProps {
  patient: {
    fullName: string;
    age: number;
    date: string;
  };
  medicines: Medicine[];
  onAddMedicine: () => void;
  onUpdateMedicine: (id: string, field: keyof Medicine, value: string) => void;
  onDeleteMedicine: (id: string) => void;
  onPrint: () => void;
  onDownload: () => void;
  onSave: () => void;
}

const PrescriptionPad: React.FC<PrescriptionPadProps> = ({ 
  patient, medicines, onAddMedicine, onUpdateMedicine, onDeleteMedicine,
  onPrint, onDownload, onSave 
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Prescription Pad</h2>
          <p className="text-sm text-slate-400 font-medium">Create and manage patient prescriptions.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onPrint}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all"
          >
            <Printer size={18} /> Print Rx
          </button>
          <button
            onClick={onSave}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
          >
            <Save size={18} /> Save & Send
          </button>
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden max-w-3xl mx-auto ring-1 ring-slate-100">
        {/* Rx Header */}
        <div className="p-10 border-b-2 border-dashed border-slate-200 bg-slate-50/30">
          <div className="flex justify-between items-start mb-12">
            <div className="space-y-1">
              <h3 className="text-3xl font-black text-blue-900 tracking-tighter">GC-HEALTHLINK</h3>
              <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.2em]">Medical Clinic & Wellness</p>
            </div>
            <div className="text-right space-y-0.5">
              <p className="text-sm font-black text-slate-800">Dr. Juan Dela Cruz, MD</p>
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
        <div className="p-10 min-h-[500px] relative bg-white">
          <div className="absolute top-10 left-10 text-6xl font-serif italic text-blue-100/50 select-none pointer-events-none">
            Rx
          </div>
          
          <div className="mt-12 space-y-6">
            <div className="grid grid-cols-12 gap-4 px-2 mb-2">
              <div className="col-span-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Medicine Name</div>
              <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dosage</div>
              <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Freq.</div>
              <div className="col-span-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">Duration</div>
              <div className="col-span-1"></div>
            </div>

            {medicines.map((med) => (
              <div key={med.id} className="grid grid-cols-12 gap-4 items-center group animate-in fade-in slide-in-from-left-2 duration-300">
                <div className="col-span-5">
                  <input
                    type="text"
                    value={med.name}
                    onChange={(e) => onUpdateMedicine(med.id, 'name', e.target.value)}
                    placeholder="Amoxicillin..."
                    className="w-full bg-slate-50/50 border-none rounded-xl p-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="text"
                    value={med.dosage}
                    onChange={(e) => onUpdateMedicine(med.id, 'dosage', e.target.value)}
                    placeholder="500mg"
                    className="w-full bg-slate-50/50 border-none rounded-xl p-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="text"
                    value={med.frequency}
                    onChange={(e) => onUpdateMedicine(med.id, 'frequency', e.target.value)}
                    placeholder="TID"
                    className="w-full bg-slate-50/50 border-none rounded-xl p-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <input
                    type="text"
                    value={med.duration}
                    onChange={(e) => onUpdateMedicine(med.id, 'duration', e.target.value)}
                    placeholder="7 Days"
                    className="w-full bg-slate-50/50 border-none rounded-xl p-3 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="col-span-1 text-center">
                  <button
                    onClick={() => onDeleteMedicine(med.id)}
                    className="p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            <button
              onClick={onAddMedicine}
              className="flex items-center gap-2 px-6 py-3 border-2 border-dashed border-slate-100 rounded-2xl text-slate-400 font-bold text-sm hover:border-blue-200 hover:text-blue-500 hover:bg-blue-50 transition-all w-full justify-center group"
            >
              <Plus size={18} className="group-hover:scale-110 transition-transform" /> Add Medicine
            </button>
          </div>
        </div>

        {/* Rx Footer */}
        <div className="px-10 py-8 bg-slate-50/30 border-t-2 border-dashed border-slate-200 flex justify-between items-center">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest max-w-[200px]">
            * VALID FOR 30 DAYS FROM DATE OF ISSUE. KEEP FOR YOUR RECORDS.
          </div>
          <div className="text-right">
             <div className="w-40 border-b-2 border-slate-300 mb-1" />
             <p className="text-[10px] font-black text-slate-800 uppercase tracking-widest pr-4">Physician Signature</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrescriptionPad;
