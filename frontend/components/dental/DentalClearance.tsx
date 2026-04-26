import React from 'react';
import { FileCheck, Printer, FileDown } from 'lucide-react';

interface DentalClearanceProps {
  patient: {
    fullName: string;
    age: number;
    courseYear: string;
    date: string;
  };
  clearanceData: {
    treatment: string;
    reason: string;
  };
  onUpdate: (field: string, value: string) => void;
  onPrint: () => void;
}

const DentalClearance: React.FC<DentalClearanceProps> = ({ 
  patient, clearanceData, onUpdate, onPrint 
}) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto">
      <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm px-8">
        <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">Dental Clearance Generator</h3>
        <button 
          onClick={onPrint}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
        >
          <Printer size={18} /> Generate & Print PDF
        </button>
      </div>

      {/* Certificate Paper */}
      <div className="bg-white p-16 sm:p-24 rounded-[2rem] shadow-2xl border border-slate-100 relative overflow-hidden print:shadow-none print:p-0">
        {/* OSWS Header */}
        <div className="text-center space-y-4 mb-20">
          <h1 className="text-2xl font-black text-slate-800 tracking-tighter">GORDON COLLEGE</h1>
          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-500 uppercase tracking-[0.2em]">Office of Student Welfare & Services</p>
            <p className="text-sm font-black text-blue-600 uppercase tracking-[0.3em]">Health Services Unit</p>
          </div>
          <div className="w-48 h-1 bg-blue-600 mx-auto mt-6" />
          <h2 className="text-3xl font-black text-slate-800 mt-10 tracking-widest uppercase">Dental Certificate</h2>
        </div>

        {/* Content */}
        <div className="space-y-12 text-lg leading-[3rem] text-slate-700 font-medium">
          <p className="font-black text-slate-800 italic underline underline-offset-8">To Whom It May Concern:</p>
          
          <div className="indent-12 text-justify">
            This is to certify that the bearer <span className="font-black text-slate-900 border-b-2 border-slate-300 px-4">{patient.fullName}</span>, 
            <span className="font-black text-slate-900 border-b-2 border-slate-300 px-4">{patient.age}</span> age from 
            <span className="font-black text-slate-900 border-b-2 border-slate-300 px-4">{patient.courseYear}</span> had undergone 
            <input 
              type="text" 
              value={clearanceData.treatment}
              onChange={(e) => onUpdate('treatment', e.target.value)}
              placeholder="[Input: treatment description]"
              className="font-black text-slate-900 border-b-2 border-blue-400 px-4 focus:ring-0 outline-none w-64 bg-blue-50/50 print:bg-transparent print:border-slate-300" 
            /> in the clinic on 
            <span className="font-black text-slate-900 border-b-2 border-slate-300 px-4">{patient.date}</span> because of 
            <input 
              type="text" 
              value={clearanceData.reason}
              onChange={(e) => onUpdate('reason', e.target.value)}
              placeholder="[Input: reason]"
              className="font-black text-slate-900 border-b-2 border-blue-400 px-4 focus:ring-0 outline-none w-full bg-blue-50/50 print:bg-transparent print:border-slate-300" 
            />.
          </div>

          <p className="indent-12">
            This certificate is issued for whatever purpose it may serve.
          </p>
        </div>

        {/* Signature Line */}
        <div className="mt-32 flex flex-col items-end space-y-4">
          <div className="text-center w-64">
            <div className="border-b-2 border-slate-800 pb-1 font-black text-lg">Dr. Juan Dela Cruz, DMD</div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Dental Physician</p>
          </div>
          <div className="text-right space-y-1">
            <p className="text-xs font-bold text-slate-400">PRC Lic. #: <span className="text-slate-800">1234567</span></p>
            <p className="text-xs font-bold text-slate-400">Date Issued: <span className="text-slate-800">{patient.date}</span></p>
          </div>
        </div>

        {/* Watermark/Logo placeholder */}
        <div className="absolute -bottom-10 -left-10 opacity-5 pointer-events-none">
          <FileCheck size={300} />
        </div>
      </div>
    </div>
  );
};

export default DentalClearance;
