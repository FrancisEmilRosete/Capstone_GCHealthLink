import React, { useState } from 'react';
import { X, UserPlus, GraduationCap, Briefcase, Save } from 'lucide-react';

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (patient: any) => void;
}

const AddPatientModal: React.FC<AddPatientModalProps> = ({ isOpen, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    idNumber: '',
    type: 'Student' as 'Student' | 'Personnel',
    department: '',
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      id: Math.random().toString(36).substr(2, 9),
      studentNo: formData.type === 'Student' ? formData.idNumber : undefined,
      employeeId: formData.type === 'Personnel' ? formData.idNumber : undefined,
      lastVisit: 'New Patient'
    });
    setFormData({ firstName: '', lastName: '', idNumber: '', type: 'Student', department: '' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-100">
              <UserPlus size={20} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Add New Patient</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-slate-200 text-slate-400 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Type Selection */}
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'Student' })}
              className={`flex items-center justify-center gap-3 p-4 rounded-2xl font-bold transition-all border-2 ${
                formData.type === 'Student' 
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md ring-4 ring-indigo-50' 
                : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
              }`}
            >
              <GraduationCap size={20} /> Student
            </button>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, type: 'Personnel' })}
              className={`flex items-center justify-center gap-3 p-4 rounded-2xl font-bold transition-all border-2 ${
                formData.type === 'Personnel' 
                ? 'border-teal-600 bg-teal-50 text-teal-700 shadow-md ring-4 ring-teal-50' 
                : 'border-slate-100 bg-white text-slate-400 hover:border-slate-200'
              }`}
            >
              <Briefcase size={20} /> Personnel
            </button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">First Name</label>
              <input
                required
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700"
                placeholder="e.g. John"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Last Name</label>
              <input
                required
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700"
                placeholder="e.g. Doe"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">
              {formData.type === 'Student' ? 'Student Number' : 'Employee ID'}
            </label>
            <input
              required
              type="text"
              value={formData.idNumber}
              onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
              className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700"
              placeholder={formData.type === 'Student' ? '2024-XXXXX' : 'EMP-XXXX'}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Department / Course</label>
            <input
              required
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              className="w-full p-4 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-sm font-bold text-slate-700"
              placeholder="e.g. CITE"
            />
          </div>

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl font-bold text-slate-500 bg-slate-50 hover:bg-slate-100 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-4 rounded-2xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all flex items-center justify-center gap-2"
            >
              <Save size={18} /> Register Patient
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddPatientModal;
