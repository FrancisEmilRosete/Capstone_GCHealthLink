import React, { useState, useEffect } from 'react';
import { X, UserPlus } from 'lucide-react';

interface CheckInPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdmit: (patient: any) => void;
  defaultDepartment: 'Medical' | 'Dental';
}

const CheckInPatientModal: React.FC<CheckInPatientModalProps> = ({ isOpen, onClose, onAdmit, defaultDepartment }) => {
  const [patientId, setPatientId] = useState('');
  const [name, setName] = useState('');
  const [patientType, setPatientType] = useState<'Student' | 'Employee'>('Student');
  const [courseDept, setCourseDept] = useState('');
  const [department, setDepartment] = useState(defaultDepartment);
  const [reason, setReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isAutoFilled, setIsAutoFilled] = useState(false);
  const [departmentLocked, setDepartmentLocked] = useState(false);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setPatientId('');
      setName('');
      setPatientType('Student');
      setCourseDept('');
      setDepartment(defaultDepartment);
      setReason('');
      setRemarks('');
      setIsAutoFilled(false);
      setDepartmentLocked(false);
    }
  }, [isOpen, defaultDepartment]);

  // Simulate auto-lookup
  useEffect(() => {
    if (patientId.startsWith('2023')) {
      setName('Juan Dela Cruz');
      setPatientType('Student');
      setCourseDept('BS Information Technology');
      setIsAutoFilled(true);
      setDepartment(defaultDepartment);
      setDepartmentLocked(true);
    } else if (patientId.toUpperCase().startsWith('EMP')) {
      setName('Dr. Maria Santos');
      setPatientType('Employee');
      setCourseDept('CCS Faculty');
      setIsAutoFilled(true);
      setDepartment(defaultDepartment);
      setDepartmentLocked(true);
    } else {
      setIsAutoFilled(false);
      setDepartment(defaultDepartment);
      setDepartmentLocked(false);
    }
  }, [patientId, defaultDepartment]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Create new queue item
    const newPatient = {
      id: Date.now().toString(), // Simple unique ID
      studentId: patientId || `UNKNOWN-${Math.floor(Math.random() * 1000)}`,
      name: name || 'Unknown Patient',
      patientType,
      courseDept: courseDept || 'N/A',
      department,
      reason: reason || 'Checkup',
      remarks,
      timeIn: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'WAITING'
    };

    onAdmit(newPatient);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-xl">
              <UserPlus size={20} />
            </div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">Check In Patient</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* ID Input */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Patient ID</label>
              <input 
                type="text" 
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                placeholder="e.g. 2023... or EMP..."
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                autoFocus
              />
              <p className="text-[10px] text-slate-400 font-medium">Type "2023" or "EMP" for auto-fill</p>
            </div>

            {/* Patient Type */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Patient Type</label>
              <div className="flex gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPatientType('Student')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${patientType === 'Student' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => setPatientType('Employee')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${patientType === 'Employee' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                >
                  Employee
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
              <input 
                type="text" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                readOnly={isAutoFilled}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm font-semibold transition-all ${isAutoFilled ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-slate-50 border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'}`}
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Course / Dept</label>
              <input 
                type="text" 
                value={courseDept}
                onChange={(e) => setCourseDept(e.target.value)}
                readOnly={isAutoFilled}
                className={`w-full px-4 py-2.5 border rounded-xl text-sm font-semibold transition-all ${isAutoFilled ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-slate-50 border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent'}`}
              />
            </div>
          </div>

          <hr className="border-slate-100" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Clinic Area</label>
              <div className={`w-full px-4 py-2.5 rounded-xl text-sm font-semibold border ${department === 'Dental' ? 'border-emerald-100 bg-emerald-50 text-emerald-700' : 'border-blue-100 bg-blue-50 text-blue-700'}`}>
                {department}
              </div>
              {!departmentLocked && (
                <p className="text-[10px] text-slate-400 font-medium">
                  This is set automatically for the current dashboard.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Reason for Visit</label>
              <select 
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent appearance-none transition-all"
                required
              >
                <option value="" disabled>Select Reason</option>
                {department === 'Medical' ? (
                  <>
                    <option value="Routine Checkup">Routine Checkup</option>
                    <option value="First Aid">First Aid</option>
                    <option value="Medical Certificate">Medical Certificate</option>
                    <option value="Fever / Flu">Fever / Flu</option>
                    <option value="Consultation">Consultation</option>
                  </>
                ) : (
                  <>
                    <option value="Oral Prophylaxis">Oral Prophylaxis</option>
                    <option value="Tooth Extraction">Tooth Extraction</option>
                    <option value="Dental Clearance">Dental Clearance</option>
                    <option value="Toothache">Toothache</option>
                    <option value="Consultation">Consultation</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Urgency / Remarks (Optional)</label>
            <textarea 
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none h-20 transition-all"
              placeholder="Any specific symptoms or urgency notes?"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95 flex items-center gap-2"
            >
              Admit Patient
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};

export default CheckInPatientModal;
