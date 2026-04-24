import React, { useState } from 'react';
import { Plus, Clock, Search, ChevronRight, PenTool } from 'lucide-react';

interface Entry {
  id: string;
  date: string;
  treatment: string;
  remarks: string;
  staff: string;
}

interface DentalTreatmentLogProps {
  entries: Entry[];
  onAdd: (entry: Entry) => void;
}

const DentalTreatmentLog: React.FC<DentalTreatmentLogProps> = ({ entries, onAdd }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEntry, setNewEntry] = useState({ treatment: '', remarks: '', staff: 'Dr. Dela Cruz' });

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">OSWS | Treatment Log</h2>
          <p className="text-xs font-bold text-slate-400">View and manage dental procedure history.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all active:scale-95"
        >
          <Plus size={18} /> Add New Entry
        </button>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Treatment / Procedure</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Remarks / Signature</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3 text-slate-300">
                      <Clock size={48} strokeWidth={1.5} />
                      <p className="font-bold">No treatment entries recorded yet.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="px-8 py-6">
                      <span className="text-sm font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">{entry.date}</span>
                    </td>
                    <td className="px-8 py-6">
                      <p className="text-sm font-black text-slate-800">{entry.treatment}</p>
                    </td>
                    <td className="px-8 py-6">
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-slate-600">{entry.remarks}</p>
                        <div className="flex items-center gap-2 text-emerald-600">
                          <PenTool size={12} />
                          <span className="text-[10px] font-black uppercase tracking-widest">{entry.staff}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <button className="p-2 text-slate-300 hover:text-emerald-600 transition-colors">
                        <ChevronRight size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Entry Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-slate-50 bg-slate-50/50">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">New Treatment Entry</h3>
              <p className="text-xs font-bold text-slate-400">Record today&apos;s procedure for the patient.</p>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Treatment Description</label>
                <textarea 
                  value={newEntry.treatment}
                  onChange={(e) => setNewEntry({ ...newEntry, treatment: e.target.value })}
                  placeholder="e.g. Oral Prophylaxis and Cavity Filling..."
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold h-32 resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Remarks</label>
                <input 
                  type="text" 
                  value={newEntry.remarks}
                  onChange={(e) => setNewEntry({ ...newEntry, remarks: e.target.value })}
                  placeholder="Patient tolerated the procedure well..."
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dentist Signature</label>
                <select 
                  value={newEntry.staff}
                  onChange={(e) => setNewEntry({ ...newEntry, staff: e.target.value })}
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-bold appearance-none cursor-pointer"
                >
                  <option>Dr. Juan Dela Cruz</option>
                  <option>Dr. Maria Santos</option>
                </select>
              </div>
            </div>
            <div className="p-8 bg-slate-50/50 border-t border-slate-50 flex gap-4">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-4 text-sm font-black text-slate-400 hover:text-slate-600 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  onAdd({ ...newEntry, id: Math.random().toString(), date: new Date().toLocaleDateString() });
                  setIsModalOpen(false);
                  setNewEntry({ treatment: '', remarks: '', staff: 'Dr. Dela Cruz' });
                }}
                className="flex-1 py-4 bg-emerald-600 text-white rounded-2xl font-black text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-100 transition-all"
              >
                Save Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DentalTreatmentLog;
