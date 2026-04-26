import React from 'react';
import { User, Clipboard, Heart, Activity } from 'lucide-react';

interface DentalPatientProfileProps {
  patient: any;
  onChange: (field: string, value: any) => void;
}

const conditions = [
  'Tongue', 'Cheeks', 'Kidney', 'Operation Condition', 'Palate', 
  'Allergies', 'Liver', 'Tonsils', 'Heart Disease', 'Others', 
  'Lips', 'Blood Dyscracia', 'Hygiene', 'Floor of Mouth', 'Diabetes'
];

const DentalPatientProfile: React.FC<DentalPatientProfileProps> = ({ patient, onChange }) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Branding */}
      <div className="text-center space-y-2 border-b-4 border-emerald-600 pb-6">
        <h1 className="text-3xl font-black text-slate-800 tracking-tighter">GORDON COLLEGE</h1>
        <p className="text-sm font-bold text-emerald-600 uppercase tracking-[0.3em]">Health Services Unit | Dental Record</p>
      </div>

      {/* Patient Info Grid */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center gap-2 text-emerald-600 mb-2">
          <User size={20} />
          <h3 className="font-bold uppercase tracking-wider text-sm">Personal Information</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1 space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Surname</label>
            <input type="text" value={patient.lastName} onChange={(e) => onChange('lastName', e.target.value)} className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div className="md:col-span-1 space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">First Name</label>
            <input type="text" value={patient.firstName} onChange={(e) => onChange('firstName', e.target.value)} className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div className="md:col-span-1 space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">M.I.</label>
            <input type="text" value={patient.middleInitial} onChange={(e) => onChange('middleInitial', e.target.value)} className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div className="md:col-span-1 space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date of Birth</label>
            <input type="date" value={patient.dob} onChange={(e) => onChange('dob', e.target.value)} className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Home Address</label>
            <input type="text" value={patient.address} onChange={(e) => onChange('address', e.target.value)} className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div className="md:col-span-1 space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Course/Year</label>
            <input type="text" value={patient.courseYear} onChange={(e) => onChange('courseYear', e.target.value)} className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
          <div className="md:col-span-1 space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact No.</label>
            <input type="text" value={patient.contact} onChange={(e) => onChange('contact', e.target.value)} className="w-full p-3 bg-slate-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-emerald-500 outline-none" />
          </div>
        </div>
      </div>

      {/* Medical History Grid */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center gap-2 text-emerald-600 mb-2">
          <Heart size={20} />
          <h3 className="font-bold uppercase tracking-wider text-sm">Medical History Check</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {conditions.map((condition) => (
            <div key={condition} className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl hover:bg-emerald-50 transition-colors cursor-pointer group" onClick={() => onChange('history', { ...patient.history, [condition]: !patient.history?.[condition] })}>
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${patient.history?.[condition] ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300 bg-white group-hover:border-emerald-400'}`}>
                {patient.history?.[condition] && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
              <span className="text-xs font-bold text-slate-600 group-hover:text-emerald-700">{condition}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tooth Count Matrix */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center gap-2 text-blue-600 mb-2">
          <Activity size={20} />
          <h3 className="font-bold uppercase tracking-wider text-sm">Dental Assessment Matrix</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-2">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="p-2">Condition</th>
                <th className="p-2 text-center bg-blue-50 rounded-t-xl text-blue-600">1st Year</th>
                <th className="p-2 text-center">2nd Year</th>
                <th className="p-2 text-center bg-blue-50 rounded-t-xl text-blue-600">3rd Year</th>
                <th className="p-2 text-center">4th Year</th>
              </tr>
            </thead>
            <tbody className="text-sm font-bold text-slate-600">
              {['Age', 'Oral Debris', 'Calculus', 'Gingivitis', 'Periodontal Pocket', 'Dentofacial Anomaly'].map((row) => (
                <tr key={row} className="border-b border-slate-50">
                  <td className="p-2">{row}</td>
                  <td className="p-1 bg-blue-50/50"><input type="text" className="w-full bg-transparent text-center border-none focus:ring-0 outline-none" /></td>
                  <td className="p-1"><input type="text" className="w-full bg-transparent text-center border-none focus:ring-0 outline-none" /></td>
                  <td className="p-1 bg-blue-50/50"><input type="text" className="w-full bg-transparent text-center border-none focus:ring-0 outline-none" /></td>
                  <td className="p-1"><input type="text" className="w-full bg-transparent text-center border-none focus:ring-0 outline-none" /></td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-emerald-600 text-white rounded-xl">
                <td className="p-3 rounded-l-xl">Total DMF (Decayed/Missing/Filled)</td>
                <td className="p-3 text-center"><input type="text" className="w-full bg-transparent text-center border-none focus:ring-0 outline-none font-black" /></td>
                <td className="p-3 text-center"><input type="text" className="w-full bg-transparent text-center border-none focus:ring-0 outline-none font-black" /></td>
                <td className="p-3 text-center"><input type="text" className="w-full bg-transparent text-center border-none focus:ring-0 outline-none font-black" /></td>
                <td className="p-3 text-center rounded-r-xl"><input type="text" className="w-full bg-transparent text-center border-none focus:ring-0 outline-none font-black" /></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DentalPatientProfile;
