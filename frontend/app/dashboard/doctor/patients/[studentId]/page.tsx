'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  User, FileText, Pill, Clock, 
  ChevronLeft, Printer, Save
} from 'lucide-react';

import PatientHeader from '@/components/doctor/PatientHeader';
import EmployeeForm from '@/components/doctor/EmployeeForm';
import HealthRecordForm from '@/components/doctor/HealthRecordForm';
import PrescriptionPad from '@/components/doctor/PrescriptionPad';
import DiagnosticsSection from '@/components/doctor/DiagnosticsSection';
import SystemSpecificNotes from '@/components/doctor/SystemSpecificNotes';
import ActionBar from '@/components/doctor/ActionBar';

const PatientProfilePage = () => {
  const params = useParams();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'records' | 'prescriptions'>('overview');
  const [isSaving, setIsSaving] = useState(false);

  interface ConsultationEntry {
    id: string;
    date: string;
    complaint: string;
    treatment: string;
    remarks: string;
  }

  // Mock Patient Data (Normally fetched via params.studentId)
  const [patient] = useState({
    id: params.studentId as string,
    firstName: 'Francis Emil',
    middleName: 'P.',
    lastName: 'Rosete',
    age: 21,
    sex: 'Male',
    dob: '2002-10-12',
    address: '123 Health St., Quezon City',
    contactNumber: '0912-345-6789',
    department: 'CITE',
    status: 'Student' as 'Student' | 'Personnel',
  });

  // State for forms
  const [formData, setFormData] = useState({
    history: {
      pastMedicalHistory: '',
      reviewOfSystems: '',
      allergies: '',
      socialHistory: '',
    },
    personal: {
      position: '',
      status: '',
      civilStatus: '',
    },
    general: {
      medicalHistory: '',
      familyHistory: '',
    },
    emergencyContact: {
      name: '',
      relationship: '',
      phone: '',
      address: '',
    },
    physicalExam: {
      bp: '', pr: '', rr: '', temperature: '',
      height: '', weight: '', bmi: '',
      visualAcuity: '', isNormal: true, abnormalFindings: ''
    },
    diagnostics: { chestXray: '', laboratoryTest: '', others: '' },
    systemNotes: { heent: '', chestLungs: '', abdomen: '', extremities: '', others: '' },
    consultations: [] as ConsultationEntry[],
    medicines: [] as any[],
  });

  const handleFormChange = (section: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: typeof prev[section as keyof typeof prev] === 'object' 
        ? { ...(prev[section as keyof typeof prev] as any), [field]: value }
        : value
    }));
  };

  const addConsultation = () => {
    const newEntry: ConsultationEntry = {
      id: Math.random().toString(36).slice(2, 11),
      date: new Date().toISOString().split('T')[0],
      complaint: '',
      treatment: '',
      remarks: '',
    };

    setFormData(prev => ({ ...prev, consultations: [...prev.consultations, newEntry] }));
  };

  const updateConsultation = (id: string, field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      consultations: prev.consultations.map(entry => entry.id === id ? { ...entry, [field as keyof ConsultationEntry]: value } : entry)
    }));
  };

  const deleteConsultation = (id: string) => {
    setFormData(prev => ({
      ...prev,
      consultations: prev.consultations.filter(entry => entry.id !== id)
    }));
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <User size={18} /> },
    { id: 'records', label: 'Medical Records', icon: <FileText size={18} /> },
    { id: 'prescriptions', label: 'Prescriptions', icon: <Pill size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 pb-32 print:bg-white print:pb-0">
      {/* Sticky Top Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm px-6 py-4 print:static print:shadow-none print:bg-white">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 print:hidden"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="h-10 w-px bg-slate-100 mx-2 hidden sm:block" />
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                {patient.lastName}, {patient.firstName}
              </h1>
              <div className="flex items-center gap-3 mt-0.5">
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                  patient.status === 'Student' ? 'bg-indigo-100 text-indigo-700' : 'bg-teal-100 text-teal-700'
                }`}>
                  {patient.status}
                </span>
                <span className="text-xs font-bold text-slate-400">{patient.age}Y • {patient.sex}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2 print:hidden">
            <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all active:scale-95">
              <Printer size={16} /> Print
            </button>
            <button 
              onClick={() => setIsSaving(true)}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95"
            >
              <Save size={16} /> {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 mt-8 space-y-8 print:px-0 print:mt-4">
        {/* Navigation Tabs */}
        <div className="flex gap-1 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm w-fit print:hidden">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="min-h-[60vh]">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <PatientHeader patient={patient} />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <SystemSpecificNotes 
                    data={formData.systemNotes} 
                    onChange={(f, v) => handleFormChange('systemNotes', f, v)} 
                  />
                </div>
                <div className="space-y-8">
                  <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Clock size={18} className="text-blue-500" /> Recent Activity
                    </h3>
                    <div className="space-y-4">
                      <div className="flex gap-3 items-start">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5" />
                        <div>
                          <p className="text-sm font-bold text-slate-700">General Consultation</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Jan 12, 2024</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'records' && (
            <div className="space-y-12">
              {patient.status === 'Personnel' ? (
                <EmployeeForm 
                  data={{ ...formData.history, personal: formData.personal, physicalExam: formData.physicalExam }} 
                  onChange={handleFormChange} 
                />
              ) : (
                <HealthRecordForm 
                  data={{ 
                    ...formData.general, 
                    emergencyContact: formData.emergencyContact,
                    consultations: formData.consultations 
                  }} 
                  onChange={handleFormChange}
                  onAddConsultation={addConsultation}
                  onUpdateConsultation={updateConsultation}
                  onDeleteConsultation={deleteConsultation}
                />
              )}
              <DiagnosticsSection 
                data={formData.diagnostics} 
                onChange={(f, v) => handleFormChange('diagnostics', f, v)} 
              />
            </div>
          )}

          {activeTab === 'prescriptions' && (
            <div className="space-y-8">
              <PrescriptionPad 
                patient={{
                  fullName: `${patient.lastName}, ${patient.firstName}`,
                  age: patient.age,
                  date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                }}
                medicines={formData.medicines}
                onAddMedicine={() => {
                  const newMed = { id: Math.random().toString(), name: '', dosage: '', frequency: '', duration: '' };
                  setFormData(prev => ({ ...prev, medicines: [...prev.medicines, newMed] }));
                }}
                onUpdateMedicine={(id, f, v) => {
                  setFormData(prev => ({
                    ...prev,
                    medicines: prev.medicines.map(m => m.id === id ? { ...m, [f]: v } : m)
                  }));
                }}
                onDeleteMedicine={(id) => {
                  setFormData(prev => ({
                    ...prev,
                    medicines: prev.medicines.filter(m => m.id !== id)
                  }));
                }}
                onPrint={() => window.print()}
                onDownload={() => {}}
                onSave={() => {}}
              />
            </div>
          )}
        </div>
      </main>

      <ActionBar 
        onSave={() => setIsSaving(true)}
        onUpdate={() => {}}
        onPrint={() => window.print()}
        onClear={() => window.location.reload()}
        isSaving={isSaving}
      />
    </div>
  );
};

export default PatientProfilePage;
