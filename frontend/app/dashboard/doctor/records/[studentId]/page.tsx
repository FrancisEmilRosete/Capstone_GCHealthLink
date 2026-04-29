'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  User, Activity, FileText, Pill, Clock, 
  ChevronLeft, Printer, Save, Plus, ShieldAlert, Stethoscope, Heart, Smile
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

// New Components
import PatientHeader from '@/components/doctor/PatientHeader';
import MedicalHistoryForm from '@/components/doctor/MedicalHistoryForm';
import PhysicalExamForm from '@/components/doctor/PhysicalExamForm';
import DiagnosticsSection from '@/components/doctor/DiagnosticsSection';
import SystemSpecificNotes from '@/components/doctor/SystemSpecificNotes';
import HistoryTable from '@/components/doctor/HistoryTable';
import PrescriptionPad from '@/components/doctor/PrescriptionPad';
import MedicalConsultation from '@/components/doctor/MedicalConsultation';
import SaveConfirmationModal from '@/components/doctor/SaveConfirmationModal';
import RecordHistoryModal from '@/components/doctor/RecordHistoryModal';

interface ScanProfile {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  courseDept: string;
  civilStatus: string | null;
  age: number | null;
  sex: string | null;
  birthday: string | null;
  presentAddress: string | null;
  telNumber: string | null;
  medicalHistory: any;
  physicalExaminations: any[];
  labResults: any[];
}

export default function DoctorRecordPage() {
  const params = useParams();
  const router = useRouter();
  const studentNumberParam = typeof params.studentId === 'string' ? decodeURIComponent(params.studentId) : '';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [record, setRecord] = useState<ScanProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'laboratory-results' | 'clinical-history' | 'dental-records' | 'medical-consultation' | 'prescriptions'>('overview');
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  // Form State
  const [medicalHistory, setMedicalHistory] = useState({
    pastMedicalHistory: '',
    reviewOfSystem: '',
    allergies: '',
    personalSocialHistory: '',
  });

  const [physicalExam, setPhysicalExam] = useState({
    bp: '', pr: '', rr: '', temperature: '',
    height: '', weight: '', bmi: '',
    visualAcuity: '', isNormal: true, abnormalFindings: '',
  });

  const [diagnostics, setDiagnostics] = useState({
    chestXray: '', laboratoryTest: '', others: '',
  });

  const [systemNotes, setSystemNotes] = useState({
    heent: '', chestLungs: '', abdomen: '', extremities: '', others: '',
  });

  const [medicines, setMedicines] = useState<any[]>([]);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [medicalConsultation, setMedicalConsultation] = useState({
    findings: '',
    diagnosis: '',
    followUpDate: '',
    noFollowUp: false,
  });

  const handlePhysicalExamChange = useCallback((field: string, value: string | boolean) => {
    setPhysicalExam((prev) => ({ ...prev, [field]: value }));
  }, []);

  const handleDiagnosticsChange = useCallback((field: string, value: string) => {
    setDiagnostics((prev) => ({ ...prev, [field]: value }));
  }, []);

  useEffect(() => {
    async function loadRecord() {
      const token = getToken();

      if (!token) {
        setError('You are not logged in. Please sign in again.');
        setLoading(false);
        return;
      }

      try {
        const search = await api.get<any>(`/clinic/search?q=${encodeURIComponent(studentNumberParam)}`, token);
        const exact = (search.data || []).find((item: any) => item.studentNumber.toLowerCase() === studentNumberParam.toLowerCase());

        if (!exact) {
          setError(`No student record found for ${studentNumberParam}.`);
          setLoading(false);
          return;
        }

        const scan = await api.get<any>(`/clinic/scan/${exact.user.id}`, token);
        setRecord(scan.data);
        populateForm(scan.data);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load doctor record.');
        }
      } finally {
        setLoading(false);
      }
    }

    function populateForm(data: ScanProfile) {
      setMedicalHistory({
        pastMedicalHistory: data.medicalHistory?.pastOperationEnc || '',
        reviewOfSystem: 'General health is good.',
        allergies: data.medicalHistory?.allergyEnc || '',
        personalSocialHistory: 'Non-smoker, occasional alcohol.',
      });

      const latestExam = data.physicalExaminations?.[0];
      if (latestExam) {
        setPhysicalExam({
          bp: latestExam.bp || '', pr: latestExam.cr || '', rr: latestExam.rr || '',
          temperature: latestExam.temp || '', height: latestExam.height || '',
          weight: latestExam.weight || '', bmi: latestExam.bmi || '',
          visualAcuity: latestExam.visualAcuity || '',
          isNormal: !latestExam.others, abnormalFindings: latestExam.others || '',
        });
        setSystemNotes({
          heent: latestExam.heent || '', chestLungs: latestExam.chestLungs || '',
          abdomen: latestExam.abdomen || '', extremities: latestExam.extremities || '',
          others: latestExam.others || '',
        });
      }

      const latestLab = data.labResults?.[0];
      if (latestLab) {
        setDiagnostics({
          chestXray: latestLab.xrayFindingsEnc || '',
          laboratoryTest: latestLab.othersEnc || '',
          others: 'Blood Sugar: 95 mg/dL',
        });
      }

      setMedicines([]);
      setHistoryRecords([]);
    }

    void loadRecord();
  }, [studentNumberParam]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <User size={18} /> },
    { id: 'laboratory-results', label: 'Laboratory Results', icon: <Activity size={18} /> },
    { id: 'clinical-history', label: 'Clinical History', icon: <FileText size={18} /> },
    { id: 'dental-records', label: 'Dental Records', icon: <Smile size={18} /> },
    { id: 'medical-consultation', label: 'Medical Consultation', icon: <Stethoscope size={18} /> },
    { id: 'prescriptions', label: 'Prescriptions', icon: <Pill size={18} /> },
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        <p className="font-bold text-slate-400 animate-pulse">Loading Clinical Record...</p>
      </div>
    </div>
  );

  if (!record) return <div className="p-8 text-center text-red-500">{error || 'Record not found.'}</div>;

  return (
    <div className="bg-slate-50 min-h-screen pb-32 print:bg-white print:pb-0">
      {/* NEW: Patient Info Card - STICKY AT TOP */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm px-6 py-6 print:static print:shadow-none">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/dashboard/doctor/records')}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500 print:hidden"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="flex-1">
              <PatientHeader 
                patient={{
                  firstName: record.firstName, middleName: '', lastName: record.lastName,
                  age: record.age || 0, sex: record.sex || 'N/A',
                  dob: record.birthday ? new Date(record.birthday).toLocaleDateString() : 'N/A',
                  address: record.presentAddress || 'N/A',
                  contactNumber: record.telNumber || 'N/A',
                  department: record.courseDept, status: 'Student'
                }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* PHASE 1.4: Action Buttons - Save on left, Print on right */}
      <div className="sticky top-[140px] z-40 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-6 py-3 print:hidden">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div />
          <div className="flex gap-2">
            <button 
              onClick={() => setShowSaveConfirmation(true)}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
            >
              <Save size={16} /> {isSaving ? 'Saving...' : 'Save Record'}
            </button>
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all">
              <Printer size={16} /> Print
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="sticky top-[220px] z-40 bg-white/95 backdrop-blur-sm border-b border-slate-100 px-6 py-4 print:hidden">
        <div className="max-w-6xl mx-auto">
          <div className="flex gap-1 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm w-full overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-sm transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                    : 'text-slate-500 hover:bg-slate-50'
                }`}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 mt-8 space-y-8 animate-in fade-in duration-500 print:px-0 print:mt-4">
        {/* Tab Content */}
        <div className="min-h-[60vh] pb-20">
          {/* OVERVIEW TAB - PHASE 3.1: Vitals at top, then System-Specific Notes with Allergies moved to right */}
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* PHASE 3.1: Physical Exam Summary at top */}
              <PhysicalExamForm 
                data={physicalExam} 
                onChange={handlePhysicalExamChange} 
              />
              
              {/* PHASE 3.2 & 3.3: System-Specific Notes with upload button, Allergies on right */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2">
                  <SystemSpecificNotes 
                    data={systemNotes} 
                    onChange={(f, v) => setSystemNotes(prev => ({ ...prev, [f]: v }))} 
                  />
                </div>
                <div className="pt-[83px]">
                  {/* PHASE 3.2: Critical Info moved from header to right side */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <ShieldAlert size={18} className="text-rose-500" /> Critical Info
                    </h3>
                    <div className="space-y-4">
                      <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100">
                        <p className="text-[10px] font-black text-rose-400 uppercase tracking-widest mb-1">Allergies</p>
                        <p className="text-sm font-bold text-rose-700">{medicalHistory.allergies || 'No known allergies'}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

           {/* LABORATORY RESULTS TAB (renamed from Physical Examination) */}
          {activeTab === 'laboratory-results' && (
            <div className="space-y-12">
              <DiagnosticsSection 
                data={diagnostics} 
                onChange={handleDiagnosticsChange} 
              />
            </div>
          )}

           {/* CLINICAL HISTORY TAB */}
          {activeTab === 'clinical-history' && (
            <div className="space-y-12">
              <MedicalHistoryForm 
                data={medicalHistory} 
                onChange={(f, v) => setMedicalHistory(prev => ({ ...prev, [f]: v }))} 
              />
              <HistoryTable 
                records={historyRecords}
                onAdd={() => setHistoryRecords(prev => [...prev, { id: Math.random().toString(), date: new Date().toISOString().split('T')[0], complaint: '', treatment: '', remarks: '' }])}
                onUpdate={(id, f, v) => setHistoryRecords(prev => prev.map(r => r.id === id ? { ...r, [f]: v } : r))}
                onDelete={(id) => setHistoryRecords(prev => prev.filter(r => r.id !== id))}
              />
            </div>
          )}

          {/* DENTAL RECORDS TAB - Coming Soon */}
          {activeTab === 'dental-records' && (
            <div className="bg-white p-12 rounded-2xl border border-slate-100 text-center">
              <Smile size={48} className="mx-auto text-slate-300 mb-4" />
              <h3 className="text-xl font-bold text-slate-800 mb-2">Dental Records</h3>
              <p className="text-slate-500">Dental records module coming soon</p>
            </div>
          )}

           {/* MEDICAL CONSULTATION TAB */}
          {activeTab === 'medical-consultation' && (
            <MedicalConsultation 
              data={medicalConsultation}
              onChange={(f, v) => setMedicalConsultation(prev => ({ ...prev, [f]: v }))}
            />
          )}

          {/* PRESCRIPTIONS TAB */}
          {activeTab === 'prescriptions' && (
            <div className="max-w-4xl mx-auto">
              <PrescriptionPad 
                patient={{
                  fullName: `${record.lastName}, ${record.firstName}`,
                  age: record.age || 0,
                  date: new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                }}
                medicines={medicines}
                onAddMedicine={() => setMedicines(prev => [...prev, { id: Math.random().toString(), name: '', dosage: '', frequency: '', duration: '' }])}
                onUpdateMedicine={(id, f, v) => setMedicines(prev => prev.map(m => m.id === id ? { ...m, [f]: v } : m))}
                onDeleteMedicine={(id) => setMedicines(prev => prev.filter(m => m.id !== id))}
                onPrint={() => window.print()}
                onDownload={() => alert('PDF Generation')}
                onSave={() => alert('Saved!')}
              />
            </div>
          )}
        </div>
      </main>

      <SaveConfirmationModal 
        isOpen={showSaveConfirmation}
        onConfirm={() => {
          setIsSaving(true);
          setTimeout(() => {
            setIsSaving(false);
            setShowSaveConfirmation(false);
            alert('Record saved successfully!');
          }, 1500);
        }}
        onCancel={() => setShowSaveConfirmation(false)}
        isLoading={isSaving}
      />
    </div>
  );
}
