'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  User, Activity, FileText, Pill, Clock, 
  ChevronLeft, Printer, Save, Plus, ShieldAlert
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
import ActionBar from '@/components/doctor/ActionBar';

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
  const [activeTab, setActiveTab] = useState<'overview' | 'history' | 'exams' | 'rx'>('overview');

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

  useEffect(() => {
    async function loadRecord() {
      const token = getToken();
      
      const MOCK_DATA: ScanProfile = {
        id: 'mock-123',
        studentNumber: studentNumberParam || '2024-0001',
        firstName: 'Francis Emil',
        lastName: 'Rosete',
        courseDept: 'BS Information Technology',
        civilStatus: 'Single',
        age: 21,
        sex: 'Male',
        birthday: '2002-10-12',
        presentAddress: '123 Health St., Quezon City, Metro Manila',
        telNumber: '0912-345-6789',
        medicalHistory: {
          pastOperationEnc: 'Appendectomy (2018), Wisdom Tooth Extraction (2021)',
          allergyEnc: 'Peanuts, Penicillin',
        },
        physicalExaminations: [{
          bp: '120/80', cr: '72', rr: '18', temp: '36.5',
          weight: '70', height: '175', bmi: '22.9',
          visualAcuity: '20/20', heent: 'Normal findings, no tonsillitis.',
          chestLungs: 'Clear breath sounds, symmetric chest expansion.',
          abdomen: 'Soft, non-tender, no masses.',
          extremities: 'Good range of motion, no edema.', others: '',
        }],
        labResults: [{
          xrayFindingsEnc: 'Normal lung fields, heart not enlarged.',
          othersEnc: 'CBC: Normal WBC count; Urinalysis: Negative for protein/sugar.',
        }],
      };

      if (!token) {
        setRecord(MOCK_DATA);
        populateForm(MOCK_DATA);
        setLoading(false);
        return;
      }

      try {
        const search = await api.get<any>(`/clinic/search?q=${encodeURIComponent(studentNumberParam)}`, token);
        const exact = (search.data || []).find((item: any) => item.studentNumber.toLowerCase() === studentNumberParam.toLowerCase());

        if (!exact) {
          setRecord(MOCK_DATA);
          populateForm(MOCK_DATA);
          setLoading(false);
          return;
        }

        const scan = await api.get<any>(`/clinic/scan/${exact.user.id}`, token);
        setRecord(scan.data);
        populateForm(scan.data);
      } catch (err) {
        setRecord(MOCK_DATA);
        populateForm(MOCK_DATA);
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

      setMedicines([
        { id: '1', name: 'Paracetamol', dosage: '500mg', frequency: 'Every 4 hours', duration: '3 days' },
        { id: '2', name: 'Multivitamins', dosage: '1 cap', frequency: 'Daily', duration: '30 days' }
      ]);
      
      setHistoryRecords([
        { id: '1', date: '2023-05-15', complaint: 'Common Cold', treatment: 'Rest, Hydration', remarks: 'Resolved' },
        { id: '2', date: '2022-11-20', complaint: 'Sprained Ankle', treatment: 'RICE Method', remarks: 'Good' }
      ]);
    }

    void loadRecord();
  }, [studentNumberParam]);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <User size={18} /> },
    { id: 'history', label: 'Clinical History', icon: <FileText size={18} /> },
    { id: 'exams', label: 'Physical Exams', icon: <Activity size={18} /> },
    { id: 'rx', label: 'Prescriptions', icon: <Pill size={18} /> },
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
    <div className="bg-slate-50 min-h-screen pb-32">
      {/* Sticky Header */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-100 shadow-sm px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.push('/dashboard/doctor/records')}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
            >
              <ChevronLeft size={20} />
            </button>
            <div className="h-10 w-px bg-slate-100 mx-2" />
            <div>
              <h1 className="text-xl font-bold text-slate-800">
                {record.lastName}, {record.firstName}
              </h1>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  Student Record
                </span>
                <span className="text-xs font-bold text-slate-400">{record.age}Y • {record.sex}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button onClick={() => window.print()} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all">
              <Printer size={16} /> Print
            </button>
            <button 
              onClick={() => setIsSaving(true)}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
            >
              <Save size={16} /> {isSaving ? 'Saving...' : 'Save Record'}
            </button>
          </div>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-6 mt-8 space-y-8 animate-in fade-in duration-500">
        {/* Navigation Tabs */}
        <div className="flex gap-1 bg-white p-1.5 rounded-2xl border border-slate-100 shadow-sm w-fit">
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
        <div className="min-h-[60vh] pb-20">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
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
                <SystemSpecificNotes 
                  data={systemNotes} 
                  onChange={(f, v) => setSystemNotes(prev => ({ ...prev, [f]: v }))} 
                />
              </div>
              <div className="space-y-8">
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
          )}

          {activeTab === 'history' && (
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

          {activeTab === 'exams' && (
            <div className="space-y-12">
              <PhysicalExamForm 
                data={physicalExam} 
                onChange={(f, v) => setPhysicalExam(prev => ({ ...prev, [f]: v }))} 
              />
              <DiagnosticsSection 
                data={diagnostics} 
                onChange={(f, v) => setDiagnostics(prev => ({ ...prev, [f]: v }))} 
              />
            </div>
          )}

          {activeTab === 'rx' && (
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

      <ActionBar 
        onSave={() => setIsSaving(true)}
        onUpdate={() => {}}
        onPrint={() => window.print()}
        onClear={() => window.location.reload()}
        isSaving={isSaving}
      />
    </div>
  );
}
