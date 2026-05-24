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
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl mx-auto print-wrapper">
      <style>{`
        @media print {
          @page {
            size: A5 portrait;
            margin: 12mm;
          }
          body {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            background: white !important;
          }
          
          /* ISOLATE PRINT VIEW: Hide everything by default */
          body * {
            visibility: hidden;
          }
          
          /* Only show the certificate and its children */
          .print-certificate-container, .print-certificate-container * {
            visibility: visible;
          }
          
          /* Position the certificate at the top left of the printed page */
          .print-certificate-container {
            position: absolute;
            left: 0;
            top: 0;
            margin: 0 !important;
            padding: 0 !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100vw !important;
            width: 100% !important;
            background: white !important;
          }
        }
      `}</style>
      <div className="flex justify-between items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm px-8 print:hidden">
        <h3 className="font-black text-slate-800 uppercase tracking-tight text-sm">Dental Clearance Generator</h3>
        <button 
          onClick={onPrint}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
        >
          <Printer size={18} /> Generate & Print PDF
        </button>
      </div>

      {/* Certificate Paper (A5 Aspect Ratio Mimic) */}
      <div 
        className="bg-white p-10 sm:p-14 md:p-20 rounded-[2rem] shadow-2xl border border-slate-100 relative overflow-hidden mx-auto print-certificate-container flex flex-col justify-between"
        style={{ aspectRatio: '148 / 210', maxWidth: '800px', width: '100%' }}
      >
        <div>
          {/* OSWS Header */}
          <div className="text-center space-y-4 print:space-y-2 mb-10 print:mb-8">
            <h1 className="text-2xl print:text-xl font-black text-slate-800 tracking-tighter">GORDON COLLEGE</h1>
            <div className="space-y-1">
              <p className="text-sm print:text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">Office of Student Welfare & Services</p>
              <p className="text-sm print:text-[10px] font-black text-blue-600 uppercase tracking-[0.3em]">Health Services Unit</p>
            </div>
            <div className="w-48 print:w-32 h-1 bg-blue-600 mx-auto mt-6 print:mt-3" />
            <h2 className="text-3xl print:text-xl font-black text-slate-800 mt-10 print:mt-6 tracking-widest uppercase">Dental Certificate</h2>
          </div>

        {/* Content */}
        <div className="space-y-12 print:space-y-6 text-lg print:text-[12px] leading-[3rem] print:leading-[2rem] text-slate-700 font-medium">
          <p className="font-black text-slate-800 italic underline underline-offset-8 print:underline-offset-4">To Whom It May Concern:</p>
          
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

        </div>

        {/* Signature Line */}
        <div className="mt-12 print:mt-16 flex flex-col items-end space-y-4 print:space-y-2">
          <div className="text-center w-64 print:w-48">
            <div className="border-b-2 border-slate-800 pb-1 font-black text-lg print:text-sm">Dr. Juan Dela Cruz, DMD</div>
            <p className="text-[10px] print:text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">Dental Physician</p>
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
