import React, { useState } from 'react';
import { User, Clipboard, Heart, Activity, History, PenTool, Lock } from 'lucide-react';
import AuditHistoryModal from './AuditHistoryModal';

interface DentalPatientProfileProps {
  patient: any;
  onChange: (field: string, value: any) => void;
}

const conditions = [
  'Tongue', 'Cheeks', 'Kidney', 'Operation Condition', 'Palate', 
  'Allergies', 'Liver', 'Tonsils', 'Heart Disease', 'Others', 
  'Lips', 'Blood Dyscracia', 'Hygiene', 'Floor of Mouth', 'Diabetes'
];

const matrixRows = ['Age', 'Oral Debris', 'Calculus', 'Gingivitis', 'Periodontal Pocket', 'Dentofacial Anomaly'];
const matrixYears = ['1st Year', '2nd Year', '3rd Year', '4th Year'];

const DentalPatientProfile: React.FC<DentalPatientProfileProps> = ({ patient, onChange }) => {
  const [isEditingHistory, setIsEditingHistory] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Matrix State: lift up to parent via onChange
  const matrixData = patient.matrixData || {};
  const matrixDMF = patient.matrixDMF || ['', '', '', ''];
  const lockedYears = patient.lockedYears || [false, false, false, false];

  const handleMatrixChange = (row: string, yearIndex: number, value: string) => {
    if (lockedYears[yearIndex]) return;
    const newData = {
      ...matrixData,
      [row]: {
        ...(matrixData[row] || {}),
        [yearIndex]: value
      }
    };
    onChange('matrixData', newData);
  };

  const handleDMFChange = (yearIndex: number, value: string) => {
    if (lockedYears[yearIndex]) return;
    const newDMF = [...matrixDMF];
    newDMF[yearIndex] = value;
    onChange('matrixDMF', newDMF);
  };

  const lockYear = (yearIndex: number) => {
    const newLocks = [...lockedYears];
    newLocks[yearIndex] = true;
    onChange('lockedYears', newLocks);
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <AuditHistoryModal 
        moduleName="Medical History" 
        isOpen={isHistoryModalOpen} 
        onClose={() => setIsHistoryModalOpen(false)} 
      />

      {/* Header Branding */}
      <div className="text-center space-y-2 border-b-4 border-emerald-600 pb-6">
        <h1 className="text-3xl font-black text-slate-800 tracking-tighter">GORDON COLLEGE</h1>
        <p className="text-sm font-bold text-emerald-600 uppercase tracking-[0.3em]">Health Services Unit | Dental Record</p>
      </div>

      {/* Patient Info Grid - STRICTLY STATIC */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6 opacity-90">
        <div className="flex items-center gap-2 text-emerald-600 mb-2">
          <User size={20} />
          <h3 className="font-bold uppercase tracking-wider text-sm">Personal Information</h3>
          <span className="ml-auto text-[10px] font-black tracking-widest uppercase bg-slate-100 text-slate-500 px-3 py-1 rounded-full flex items-center gap-1">
            <Lock size={12} /> Read Only
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pointer-events-none">
          <div className="md:col-span-1 space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Surname</label>
            <input type="text" readOnly value={patient.lastName} className="w-full p-3 bg-slate-50/50 border border-slate-100 rounded-xl text-sm font-bold text-slate-600 outline-none cursor-not-allowed" />
          </div>
          <div className="md:col-span-1 space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">First Name</label>
            <input type="text" readOnly value={patient.firstName} className="w-full p-3 bg-slate-50/50 border border-slate-100 rounded-xl text-sm font-bold text-slate-600 outline-none cursor-not-allowed" />
          </div>
          <div className="md:col-span-1 space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">M.I.</label>
            <input type="text" readOnly value={patient.middleInitial} className="w-full p-3 bg-slate-50/50 border border-slate-100 rounded-xl text-sm font-bold text-slate-600 outline-none cursor-not-allowed" />
          </div>
          <div className="md:col-span-1 space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date of Birth</label>
            <input type="date" readOnly value={patient.dob} className="w-full p-3 bg-slate-50/50 border border-slate-100 rounded-xl text-sm font-bold text-slate-600 outline-none cursor-not-allowed" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 pointer-events-none">
          <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Home Address</label>
            <input type="text" readOnly value={patient.address} className="w-full p-3 bg-slate-50/50 border border-slate-100 rounded-xl text-sm font-bold text-slate-600 outline-none cursor-not-allowed" />
          </div>
          <div className="md:col-span-1 space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Course/Year</label>
            <input type="text" readOnly value={patient.courseYear} className="w-full p-3 bg-slate-50/50 border border-slate-100 rounded-xl text-sm font-bold text-slate-600 outline-none cursor-not-allowed" />
          </div>
          <div className="md:col-span-1 space-y-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact No.</label>
            <input type="text" readOnly value={patient.contact} className="w-full p-3 bg-slate-50/50 border border-slate-100 rounded-xl text-sm font-bold text-slate-600 outline-none cursor-not-allowed" />
          </div>
        </div>
      </div>

      {/* Medical History Grid */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-emerald-600">
            <Heart size={20} />
            <h3 className="font-bold uppercase tracking-wider text-sm">Medical History Check</h3>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsHistoryModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-xs hover:bg-slate-200 transition-colors"
            >
              <History size={14} /> History
            </button>
            <button 
              onClick={() => setIsEditingHistory(!isEditingHistory)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-colors ${isEditingHistory ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {isEditingHistory ? <><Lock size={14} /> Save</> : <><PenTool size={14} /> Update</>}
            </button>
          </div>
        </div>
        <div className={`grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 transition-opacity ${!isEditingHistory && 'opacity-70'}`}>
          {conditions.map((condition) => (
            <div 
              key={condition} 
              className={`flex items-center gap-3 p-3 rounded-2xl transition-colors ${isEditingHistory ? 'bg-slate-50 hover:bg-emerald-50 cursor-pointer group' : 'bg-slate-50/50 cursor-not-allowed'}`} 
              onClick={() => {
                if (isEditingHistory) {
                  onChange('history', { ...patient.history, [condition]: !patient.history?.[condition] });
                }
              }}
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${patient.history?.[condition] ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300 bg-white group-hover:border-emerald-400'}`}>
                {patient.history?.[condition] && <div className="w-2 h-2 bg-white rounded-full" />}
              </div>
              <span className={`text-xs font-bold ${isEditingHistory ? 'text-slate-600 group-hover:text-emerald-700' : 'text-slate-500'}`}>{condition}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Tooth Count Matrix with Cascading Locks */}
      <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-blue-600">
            <Activity size={20} />
            <h3 className="font-bold uppercase tracking-wider text-sm">Dental Assessment Matrix</h3>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-separate border-spacing-2">
            <thead>
              <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="p-2">Condition</th>
                {matrixYears.map((year, i) => (
                  <th key={year} className={`p-2 text-center rounded-t-xl ${lockedYears[i] ? 'bg-slate-100 text-slate-500' : (i % 2 === 0 ? 'bg-blue-50 text-blue-600' : 'text-slate-600')}`}>
                    <div className="flex items-center justify-center gap-2">
                      {lockedYears[i] && <Lock size={12} />}
                      {year}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-sm font-bold text-slate-600">
              {matrixRows.map((row) => (
                <tr key={row} className="border-b border-slate-50">
                  <td className="p-2">{row}</td>
                  {matrixYears.map((year, i) => {
                    const isLocked = lockedYears[i];
                    // Prevent editing if this year is locked OR if the PREVIOUS year is NOT locked (cascading lock logic)
                    const canEdit = !isLocked && (i === 0 || lockedYears[i - 1]);
                    return (
                      <td key={year} className={`p-1 ${i % 2 === 0 ? 'bg-slate-50/50' : ''}`}>
                        <input 
                          type="text" 
                          readOnly={!canEdit}
                          value={matrixData[row]?.[i] || ''}
                          onChange={(e) => handleMatrixChange(row, i, e.target.value)}
                          className={`w-full bg-transparent text-center border-none focus:ring-0 outline-none ${!canEdit ? 'cursor-not-allowed text-slate-400' : 'cursor-text focus:bg-blue-50/50 rounded-lg'}`} 
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-emerald-600 text-white rounded-t-xl">
                <td className="p-3 rounded-tl-xl font-black">Total DMF</td>
                {matrixYears.map((year, i) => {
                  const isLocked = lockedYears[i];
                  const canEdit = !isLocked && (i === 0 || lockedYears[i - 1]);
                  return (
                    <td key={year} className="p-3 text-center">
                      <input 
                        type="text" 
                        readOnly={!canEdit}
                        value={matrixDMF[i] || ''}
                        onChange={(e) => handleDMFChange(i, e.target.value)}
                        className={`w-full bg-transparent text-center border-none focus:ring-0 outline-none font-black ${!canEdit ? 'cursor-not-allowed text-emerald-200' : 'cursor-text'}`} 
                      />
                    </td>
                  );
                })}
              </tr>
              {/* Lock Buttons Row */}
              <tr>
                <td className="p-3"></td>
                {matrixYears.map((year, i) => {
                  const isLocked = lockedYears[i];
                  const canEdit = !isLocked && (i === 0 || lockedYears[i - 1]);
                  return (
                    <td key={year} className="p-2 text-center">
                      {canEdit && (
                        <button 
                          onClick={() => lockYear(i)}
                          className="px-4 py-1.5 bg-slate-800 text-white text-[10px] font-black uppercase tracking-widest rounded-lg hover:bg-slate-700 transition-colors shadow-sm"
                        >
                          Save & Lock
                        </button>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DentalPatientProfile;
