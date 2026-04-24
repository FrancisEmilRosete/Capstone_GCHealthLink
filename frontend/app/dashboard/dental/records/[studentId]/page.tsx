'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  User, Clipboard, Activity, Pill, FileCheck, 
  ChevronLeft, Printer, Save, Download 
} from 'lucide-react';

import DentalPatientProfile from '@/components/dental/DentalPatientProfile';
import DentalCharting from '@/components/dental/DentalCharting';
import DentalTreatmentLog from '@/components/dental/DentalTreatmentLog';
import DentalPrescription from '@/components/dental/DentalPrescription';
import DentalClearance from '@/components/dental/DentalClearance';

const DentalRecordPage = () => {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'charting' | 'log' | 'prescription' | 'clearance'>('profile');
  const [isSaving, setIsSaving] = useState(false);

  // MOCK DATA
  const [patient, setPatient] = useState({
    id: params.studentId as string,
    firstName: 'Francis Emil',
    lastName: 'Rosete',
    middleInitial: 'P.',
    dob: '2002-10-12',
    sex: 'Male',
    address: '123 Health St., Olongapo City',
    courseYear: 'BSIT 4A',
    contact: '0912-345-6789',
    history: {
      Diabetes: false,
      'Heart Disease': false,
      Allergies: true,
      Hygiene: true,
    },
    chartData: {} as any,
    treatmentEntries: [
      { id: '1', date: '2024-03-10', treatment: 'Oral Prophylaxis', remarks: 'Good hygiene maintained.', staff: 'Dr. Dela Cruz' },
      { id: '2', date: '2023-10-15', treatment: 'Composite Filling (#14)', remarks: 'Successful restoration.', staff: 'Dr. Dela Cruz' }
    ],
    prescription: '',
    clearance: {
      treatment: '',
      reason: '',
    }
  });

  const handlePatientUpdate = (field: string, value: any) => {
    setPatient(prev => ({ ...prev, [field]: value }));
  };

  const handleChartUpdate = (tooth: number, code: string) => {
    setPatient(prev => ({ ...prev, chartData: { ...prev.chartData, [tooth]: code } }));
  };

  const handleAddTreatment = (entry: any) => {
    setPatient(prev => ({ ...prev, treatmentEntries: [entry, ...prev.treatmentEntries] }));
  };

  const menuItems = [
    { id: 'profile', label: 'Profiling & History', icon: <User size={18} />, color: 'emerald' },
    { id: 'charting', label: 'Dental Charting', icon: <Activity size={18} />, color: 'emerald' },
    { id: 'log', label: 'Treatment Log', icon: <Clipboard size={18} />, color: 'emerald' },
    { id: 'prescription', label: 'Prescription Pad', icon: <Pill size={18} />, color: 'emerald' },
    { id: 'clearance', label: 'Dental Clearance', icon: <FileCheck size={18} />, color: 'blue' },
  ];

  const sidebarColors: any = {
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-100',
    blue: 'text-blue-600 bg-blue-50 border-blue-100',
  };

  const activeColors: any = {
    emerald: 'bg-emerald-600 text-white shadow-emerald-100',
    blue: 'bg-blue-600 text-white shadow-blue-100',
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation & Actions */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col sm:flex-row sm:items-center justify-between sticky top-0 z-20 gap-4 shadow-sm">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-emerald-600 transition-colors"
          >
            <ChevronLeft size={18} /> Back
          </button>
          <div className="hidden sm:block h-8 w-px bg-slate-200"></div>
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">
              {patient.lastName}, {patient.firstName} {patient.middleInitial}
            </h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mt-0.5">
              <span>{patient.courseYear}</span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span>ID: {patient.id.slice(0, 5)}</span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span>{patient.sex}, 21 YRS</span>
            </p>
          </div>
        </div>
        <button 
          onClick={() => setIsSaving(true)}
          className="flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
        >
          <Save size={16} /> {isSaving ? 'Saving...' : 'Save Record'}
        </button>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto w-full p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          
          {/* Horizontal Tabs */}
          <div className="w-full overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-hide">
            <div className="flex w-max min-w-full gap-2 bg-white p-2 rounded-full shadow-sm border border-slate-200">
              {menuItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-full font-bold text-sm transition-all whitespace-nowrap ${
                    activeTab === item.id
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
                  }`}
                >
                  <span className={activeTab === item.id ? 'text-white' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'profile' && <DentalPatientProfile patient={patient} onChange={handlePatientUpdate} />}
            {activeTab === 'charting' && <DentalCharting chartData={patient.chartData} onUpdate={handleChartUpdate} />}
            {activeTab === 'log' && <DentalTreatmentLog entries={patient.treatmentEntries} onAdd={handleAddTreatment} />}
            {activeTab === 'prescription' && (
              <DentalPrescription 
                patient={{ fullName: `${patient.lastName}, ${patient.firstName}`, age: 21, date: new Date().toLocaleDateString() }}
                content={patient.prescription}
                onChange={(v) => handlePatientUpdate('prescription', v)}
                onPrint={() => window.print()}
                onSave={() => alert('Prescription saved to record.')}
              />
            )}
            {activeTab === 'clearance' && (
              <DentalClearance 
                patient={{ fullName: `${patient.lastName}, ${patient.firstName}`, age: 21, courseYear: patient.courseYear, date: new Date().toLocaleDateString() }}
                clearanceData={patient.clearance}
                onUpdate={(f, v) => setPatient(prev => ({ ...prev, clearance: { ...prev.clearance, [f]: v } }))}
                onPrint={() => window.print()}
              />
            )}
          </div>
        </div>
      </main>

      <style jsx>{`
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
};

export default DentalRecordPage;
