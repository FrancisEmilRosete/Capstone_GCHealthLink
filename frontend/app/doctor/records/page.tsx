'use client';

import React, { useState } from 'react';
import PatientHeader from '@/components/doctor/PatientHeader';
import MedicalHistoryForm from '@/components/doctor/MedicalHistoryForm';
import PhysicalExamForm from '@/components/doctor/PhysicalExamForm';
import DiagnosticsSection from '@/components/doctor/DiagnosticsSection';
import SystemSpecificNotes from '@/components/doctor/SystemSpecificNotes';
import HistoryTable from '@/components/doctor/HistoryTable';
import PrescriptionPad from '@/components/doctor/PrescriptionPad';
import ActionBar from '@/components/doctor/ActionBar';

// Types
interface RecordEntry {
  id: string;
  date: string;
  complaint: string;
  treatment: string;
  remarks: string;
}

interface MedicineEntry {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

const DoctorRecordsPage = () => {
  // Mock Patient Data
  const [patient] = useState({
    firstName: 'Francis Emil',
    middleName: 'P.',
    lastName: 'Rosete',
    age: 21,
    sex: 'Male',
    dob: 'October 12, 2002',
    address: '123 Health St., Quezon City, Metro Manila',
    contactNumber: '0912-345-6789',
    department: 'College of Information Technology',
    status: 'Student' as const,
  });

  // Form State
  const [medicalHistory, setMedicalHistory] = useState({
    pastMedicalHistory: '',
    reviewOfSystem: '',
    allergies: '',
    personalSocialHistory: '',
  });

  const [physicalExam, setPhysicalExam] = useState({
    bp: '',
    pr: '',
    rr: '',
    temperature: '',
    height: '',
    weight: '',
    bmi: '',
    visualAcuity: '',
    isNormal: true,
    abnormalFindings: '',
  });

  const [diagnostics, setDiagnostics] = useState({
    chestXray: '',
    laboratoryTest: '',
    others: '',
  });

  const [systemNotes, setSystemNotes] = useState({
    heent: '',
    chestLungs: '',
    abdomen: '',
    extremities: '',
    others: '',
  });

  const [historyRecords, setHistoryRecords] = useState<RecordEntry[]>([]);
  const [medicines, setMedicines] = useState<MedicineEntry[]>([
    {
      id: Math.random().toString(36).slice(2, 11),
      name: '',
      dosage: '',
      frequency: '',
      duration: '',
    },
  ]);
  const [isSaving, setIsSaving] = useState(false);

  // Handlers
  const handleMedicalHistoryChange = (field: string, value: string) => {
    setMedicalHistory(prev => ({ ...prev, [field]: value }));
  };

  const handlePhysicalExamChange = (field: string, value: string | boolean) => {
    setPhysicalExam(prev => ({ ...prev, [field]: value }));
  };

  const handleDiagnosticsChange = (field: string, value: string) => {
    setDiagnostics(prev => ({ ...prev, [field]: value }));
  };

  const handleSystemNotesChange = (field: string, value: string) => {
    setSystemNotes(prev => ({ ...prev, [field]: value }));
  };

  const addHistoryRecord = () => {
    const newRecord: RecordEntry = {
      id: Math.random().toString(36).substr(2, 9),
      date: new Date().toISOString().split('T')[0],
      complaint: '',
      treatment: '',
      remarks: '',
    };
    setHistoryRecords(prev => [...prev, newRecord]);
  };

  const updateHistoryRecord = (id: string, field: keyof RecordEntry, value: string) => {
    setHistoryRecords(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const deleteHistoryRecord = (id: string) => {
    setHistoryRecords(prev => prev.filter(r => r.id !== id));
  };

  const addMedicine = () => {
    const newMedicine: MedicineEntry = {
      id: Math.random().toString(36).slice(2, 11),
      name: '',
      dosage: '',
      frequency: '',
      duration: '',
    };

    setMedicines((prev) => [...prev, newMedicine]);
  };

  const updateMedicine = (id: string, field: keyof MedicineEntry, value: string) => {
    setMedicines((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)));
  };

  const deleteMedicine = (id: string) => {
    setMedicines((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSave = () => {
    setIsSaving(true);
    // Simulate API call
    setTimeout(() => {
      setIsSaving(false);
      alert('Record saved successfully!');
    }, 1500);
  };

  const handleClear = () => {
    if (confirm('Are you sure you want to clear all fields? This action cannot be undone.')) {
      setMedicalHistory({ pastMedicalHistory: '', reviewOfSystem: '', allergies: '', personalSocialHistory: '' });
      setPhysicalExam({ bp: '', pr: '', rr: '', temperature: '', height: '', weight: '', bmi: '', visualAcuity: '', isNormal: true, abnormalFindings: '' });
      setDiagnostics({ chestXray: '', laboratoryTest: '', others: '' });
      setSystemNotes({ heent: '', chestLungs: '', abdomen: '', extremities: '', others: '' });
      setMedicines([
        {
          id: Math.random().toString(36).slice(2, 11),
          name: '',
          dosage: '',
          frequency: '',
          duration: '',
        },
      ]);
      setHistoryRecords([]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Header Navigation Placeholder */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 mb-6">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">G</div>
            <span className="font-bold text-slate-800 tracking-tight">GC-HealthLink</span>
          </div>
          <div className="text-sm font-medium text-slate-500">Doctor Portal</div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 space-y-12">
        {/* Patient Profile */}
        <section>
          <PatientHeader patient={patient} />
        </section>

        {/* Medical History */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <MedicalHistoryForm 
            data={medicalHistory} 
            onChange={handleMedicalHistoryChange} 
          />
        </section>

        {/* Physical Examination */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-75">
          <PhysicalExamForm 
            data={physicalExam} 
            onChange={handlePhysicalExamChange} 
          />
        </section>

        {/* System Specific Notes */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
          <SystemSpecificNotes 
            data={systemNotes} 
            onChange={handleSystemNotesChange} 
          />
        </section>

        {/* Diagnostic & Lab Section */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-150">
          <DiagnosticsSection 
            data={diagnostics} 
            onChange={handleDiagnosticsChange} 
          />
        </section>

        {/* Family/Medical History Table */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
          <HistoryTable 
            records={historyRecords}
            onAdd={addHistoryRecord}
            onUpdate={updateHistoryRecord}
            onDelete={deleteHistoryRecord}
          />
        </section>

        {/* Prescription Pad */}
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-300">
          <PrescriptionPad 
            patient={{
              fullName: `${patient.lastName}, ${patient.firstName} ${patient.middleName}`,
              age: patient.age,
              date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
            }}
            medicines={medicines}
            onAddMedicine={addMedicine}
            onUpdateMedicine={updateMedicine}
            onDeleteMedicine={deleteMedicine}
            onPrint={() => window.print()}
            onDownload={() => alert('Downloading PDF...')}
            onSave={() => alert('Prescription saved!')}
          />
        </section>
      </main>

      {/* Sticky Action Bar */}
      <ActionBar 
        onSave={handleSave}
        onUpdate={() => alert('Record updated!')}
        onPrint={() => window.print()}
        onClear={handleClear}
        isSaving={isSaving}
      />
    </div>
  );
};

export default DoctorRecordsPage;
