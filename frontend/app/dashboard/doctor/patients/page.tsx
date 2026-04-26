'use client';

import React, { useState, useMemo } from 'react';
import { Search, Filter, UserPlus, GraduationCap, Briefcase, ChevronRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
import AddPatientModal from '@/components/doctor/AddPatientModal';

interface Patient {
  id: string;
  studentNo?: string;
  employeeId?: string;
  firstName: string;
  lastName: string;
  type: 'Student' | 'Personnel';
  department: string;
  lastVisit: string;
}

const MOCK_PATIENTS: Patient[] = [
  { id: '1', studentNo: '2021-00123', firstName: 'Francis Emil', lastName: 'Rosete', type: 'Student', department: 'CITE', lastVisit: '2023-12-10' },
  { id: '2', employeeId: 'EMP-998', firstName: 'Juan', lastName: 'Dela Cruz', type: 'Personnel', department: 'Admin', lastVisit: '2024-01-15' },
  { id: '3', studentNo: '2022-04567', firstName: 'Maria', lastName: 'Clara', type: 'Student', department: 'CAS', lastVisit: '2023-11-20' },
];

const PatientSearchPage = () => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'All' | 'Student' | 'Personnel'>('All');
  const [patients, setPatients] = useState<Patient[]>(MOCK_PATIENTS);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const filteredPatients = useMemo(() => {
    return patients.filter(p => {
      const searchStr = `${p.firstName} ${p.lastName} ${p.studentNo || ''} ${p.employeeId || ''}`.toLowerCase();
      const matchesQuery = searchStr.includes(query.toLowerCase());
      const matchesType = typeFilter === 'All' || p.type === typeFilter;
      return matchesQuery && matchesType;
    });
  }, [query, typeFilter]);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Patient Directory</h1>
          <p className="text-slate-500 text-sm mt-1">Search and manage student and personnel health records.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
        >
          <UserPlus size={18} /> Add Patient
        </button>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, student number, or ID..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex gap-2">
          {(['All', 'Student', 'Personnel'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all border ${
                typeFilter === type
                  ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                  : 'bg-white border-slate-100 text-slate-500 hover:bg-slate-50'
              }`}
            >
              {type === 'All' ? 'All' : type === 'Student' ? 'Students' : 'Personnel'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPatients.map((patient) => (
          <div
            key={patient.id}
            onClick={() => router.push(`/dashboard/doctor/patients/${patient.id}`)}
            className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-200 transition-all cursor-pointer group"
          >
            <div className="flex justify-between items-start mb-4">
              <div className={`p-3 rounded-xl ${patient.type === 'Student' ? 'bg-indigo-50 text-indigo-600' : 'bg-teal-50 text-teal-600'}`}>
                {patient.type === 'Student' ? <GraduationCap size={24} /> : <Briefcase size={24} />}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
                patient.type === 'Student' ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'
              }`}>
                {patient.type}
              </span>
            </div>
            
            <h3 className="text-xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">
              {patient.lastName}, {patient.firstName}
            </h3>
            <p className="text-sm font-medium text-slate-400 mt-1">
              {patient.studentNo || patient.employeeId}
            </p>
            
            <div className="mt-6 pt-6 border-t border-slate-50 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Department</p>
                <p className="text-sm font-bold text-slate-600">{patient.department}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Last Visit</p>
                <p className="text-sm font-bold text-slate-600">{patient.lastVisit}</p>
              </div>
            </div>
            
            <div className="mt-4 flex items-center justify-end text-blue-600 font-bold text-sm gap-1 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
              View Record <ChevronRight size={16} />
            </div>
          </div>
        ))}
      </div>

      {/* Add Patient Modal */}
      <AddPatientModal 
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={(newPatient) => {
          setPatients(prev => [newPatient, ...prev]);
        }}
      />
    </div>
  );
};

export default PatientSearchPage;
