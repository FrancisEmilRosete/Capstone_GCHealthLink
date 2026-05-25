'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { 
  User, Clipboard, Activity, Pill, FileCheck, 
  ChevronLeft, Printer, Save, Download, CheckCircle 
} from 'lucide-react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

import DentalPatientProfile from '@/components/dental/DentalPatientProfile';
import DentalCharting from '@/components/dental/DentalCharting';
import DentalTreatmentLog from '@/components/dental/DentalTreatmentLog';
import DentalPrescription from '@/components/dental/DentalPrescription';
import DentalClearance from '@/components/dental/DentalClearance';

interface StudentByNumberResponse {
  success: boolean;
  data: {
    id: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
    mi?: string | null;
    courseDept?: string | null;
    course?: string | null;
    yearLevel?: 'YR_1' | 'YR_2' | 'YR_3' | 'YR_4' | null;
    age?: number | null;
    sex?: string | null;
    birthday?: string | null;
    presentAddress?: string | null;
    telNumber?: string | null;
    medicalHistory?: {
      allergyEnc?: string | null;
      diabetesEnc?: string | null;
      heartDisorderEnc?: string | null;
      hypertensionEnc?: string | null;
    } | null;
    clinicVisits?: Array<{
      id: string;
      visitDate?: string | null;
      concernTag?: string | null;
      chiefComplaintEnc?: string | null;
    }>;
    appointments?: Array<{
      id: string;
      preferredDate?: string | null;
      serviceType?: string | null;
      symptoms?: string | null;
      status?: string | null;
    }>;
  };
}

interface TreatmentEntry {
  id: string;
  date: string;
  treatment: string;
  remarks: string;
  staff: string;
}

interface DentalPatientState {
  id: string;
  firstName: string;
  lastName: string;
  middleInitial: string;
  dob: string;
  sex: string;
  address: string;
  courseYear: string;
  contact: string;
  history: {
    Diabetes: boolean;
    'Heart Disease': boolean;
    Allergies: boolean;
    Hygiene: boolean;
  };
  chartData: Record<number, string>;
  matrixData?: Record<string, string[]>;
  matrixDMF?: string[];
  lockedYears?: boolean[];
  treatmentEntries: TreatmentEntry[];
  prescription: string;
  clearance: {
    treatment: string;
    reason: string;
  };
  resolvedAge?: number | null;
}

function toDisplayYearLevel(value?: 'YR_1' | 'YR_2' | 'YR_3' | 'YR_4' | null) {
  if (!value) return '';
  return value.replace('YR_', 'Yr. ');
}

function computeAgeFromBirthday(birthday?: string | null) {
  if (!birthday) return null;
  const date = new Date(birthday);
  if (Number.isNaN(date.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - date.getFullYear();
  const monthDiff = today.getMonth() - date.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}

function isPositiveFlag(value?: string | null) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  if (!normalized) return false;
  return !['no', 'none', 'false', 'n/a', 'na'].includes(normalized);
}

function toIsoDateLabel(value?: string | null) {
  if (!value) return '';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toISOString().slice(0, 10);
}

function isDentalText(value?: string | null) {
  if (!value) return false;
  const normalized = value.toLowerCase();
  return normalized.includes('dental') || normalized.includes('tooth') || normalized.includes('oral') || normalized.includes('teeth');
}

const DentalRecordPage = () => {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queueId = searchParams.get('queueId');
  const studentNumber = typeof params.studentId === 'string' ? decodeURIComponent(params.studentId) : '';
  const [activeTab, setActiveTab] = useState<'profile' | 'charting' | 'log' | 'prescription' | 'clearance'>('profile');
  const [isSaving, setIsSaving] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [patient, setPatient] = useState<DentalPatientState & { dbId?: string }>({
    id: studentNumber,
    firstName: '',
    lastName: '',
    middleInitial: '',
    dob: '',
    sex: '',
    address: '',
    courseYear: '',
    contact: '',
    history: {
      Diabetes: false,
      'Heart Disease': false,
      Allergies: false,
      Hygiene: false,
    },
    chartData: {},
    matrixData: {},
    matrixDMF: ['', '', '', ''],
    lockedYears: [false, false, false, false],
    treatmentEntries: [],
    prescription: '',
    clearance: {
      treatment: '',
      reason: '',
    }
  });

  // Handle setting queue item to IN_PROGRESS
  useEffect(() => {
    async function startConsultation() {
      if (!queueId) return;
      const token = getToken();
      if (!token) return;
      try {
        await api.put(`/appointments/queue/${queueId}`, { status: 'IN_PROGRESS' }, token);
      } catch (err) {
        console.error('Failed to update queue status to IN_PROGRESS', err);
      }
    }
    startConsultation();
  }, [queueId]);

  useEffect(() => {
    async function loadStudentRecord() {
      const token = getToken();
      if (!token || !studentNumber) {
        setError('Unable to load student record.');
        setLoading(false);
        return;
      }

      try {
        setError('');
        const response = await api.get<StudentByNumberResponse>(`/students/by-number/${encodeURIComponent(studentNumber)}`, token);
        const profile = response.data;
        const courseText = [profile.course, toDisplayYearLevel(profile.yearLevel)].filter(Boolean).join(' ').trim();
        const resolvedAge = typeof profile.age === 'number' ? profile.age : computeAgeFromBirthday(profile.birthday);
        const history = profile.medicalHistory || {};
        const completedDentalAppointments = (profile.appointments || [])
          .filter((entry) => (entry.status || '').toUpperCase() === 'COMPLETED')
          .filter((entry) => isDentalText(entry.serviceType) || isDentalText(entry.symptoms))
          .map((entry) => ({
            id: `appointment-${entry.id}`,
            date: toIsoDateLabel(entry.preferredDate) || new Date().toISOString().slice(0, 10),
            treatment: entry.serviceType || 'Dental Appointment',
            remarks: entry.symptoms || 'Dental appointment completed.',
            staff: 'Dental clinic',
          }));

        const dentalClinicVisitsRaw = (profile.clinicVisits || [])
          .filter((entry) => isDentalText(entry.concernTag) || isDentalText(entry.chiefComplaintEnc));

        // Load current state from the latest comprehensive record
        let loadedChartData = {};
        let loadedMatrixData = {};
        let loadedMatrixDMF = ['', '', '', ''];
        let loadedLockedYears = [false, false, false, false];
        let loadedPrescription = '';
        let loadedClearance = { treatment: '', reason: '' };
        let loadedHistory = {
          Diabetes: isPositiveFlag(history.diabetesEnc),
          'Heart Disease': isPositiveFlag(history.heartDisorderEnc) || isPositiveFlag(history.hypertensionEnc),
          Allergies: isPositiveFlag(history.allergyEnc),
          Hygiene: false,
        };

        const latestComprehensive = [...dentalClinicVisitsRaw]
          .sort((a, b) => new Date(b.visitDate || 0).getTime() - new Date(a.visitDate || 0).getTime())
          .find(v => v.chiefComplaintEnc?.includes('isComprehensiveDentalRecord'));

        if (latestComprehensive && latestComprehensive.chiefComplaintEnc) {
          try {
            const parsed = JSON.parse(latestComprehensive.chiefComplaintEnc);
            if (parsed.chartData) loadedChartData = parsed.chartData;
            if (parsed.matrixData) loadedMatrixData = parsed.matrixData;
            if (parsed.matrixDMF) loadedMatrixDMF = parsed.matrixDMF;
            if (parsed.lockedYears) loadedLockedYears = parsed.lockedYears;
            if (parsed.prescription) loadedPrescription = parsed.prescription;
            if (parsed.clearance) loadedClearance = parsed.clearance;
            if (parsed.history) loadedHistory = { ...loadedHistory, ...parsed.history };
          } catch (e) {}
        }

        const dentalClinicVisits = dentalClinicVisitsRaw.map((entry) => {
          let remarks = entry.chiefComplaintEnc || 'Dental consultation completed.';
          if (remarks.includes('isComprehensiveDentalRecord')) {
             remarks = 'Comprehensive Dental Record Update';
          }
          return {
            id: `visit-${entry.id}`,
            date: toIsoDateLabel(entry.visitDate) || new Date().toISOString().slice(0, 10),
            treatment: entry.concernTag || 'Dental Consultation',
            remarks,
            staff: 'Clinic staff',
          };
        });

        const treatmentEntries = [...completedDentalAppointments, ...dentalClinicVisits]
          .sort((a, b) => b.date.localeCompare(a.date));

        setPatient((prev) => ({
          ...prev,
          dbId: profile.id,
          id: profile.studentNumber || studentNumber,
          firstName: profile.firstName || prev.firstName,
          lastName: profile.lastName || prev.lastName,
          middleInitial: profile.mi?.trim() || prev.middleInitial,
          dob: profile.birthday ? new Date(profile.birthday).toISOString().slice(0, 10) : prev.dob,
          sex: profile.sex?.trim() || prev.sex,
          address: profile.presentAddress?.trim() || prev.address,
          contact: profile.telNumber?.trim() || prev.contact,
          courseYear: courseText || profile.courseDept || prev.courseYear,
          history: loadedHistory,
          chartData: Object.keys(loadedChartData).length > 0 ? loadedChartData : prev.chartData,
          matrixData: Object.keys(loadedMatrixData).length > 0 ? loadedMatrixData : prev.matrixData,
          matrixDMF: loadedMatrixDMF,
          lockedYears: loadedLockedYears,
          prescription: loadedPrescription || prev.prescription,
          clearance: loadedClearance.treatment ? loadedClearance : prev.clearance,
          treatmentEntries,
          resolvedAge,
        }));
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load student record.');
        }
      } finally {
        setLoading(false);
      }
    }

    void loadStudentRecord();
  }, [studentNumber]);

  const handlePatientUpdate = (field: string, value: any) => {
    setPatient(prev => ({ ...prev, [field]: value }));
  };

  const handleChartUpdate = (tooth: number, code: string) => {
    setPatient(prev => ({ ...prev, chartData: { ...prev.chartData, [tooth]: code } }));
  };

  const handleAddTreatment = (entry: any) => {
    setPatient(prev => ({ ...prev, treatmentEntries: [entry, ...prev.treatmentEntries] }));
  };

  const handleSaveRecord = async () => {
    if (!patient.dbId) {
      setError('Cannot save: Student DB ID is missing.');
      return;
    }
    setIsSaving(true);
    const token = getToken();
    try {
      const payload = {
        studentProfileId: patient.dbId,
        visitDate: new Date().toISOString(),
        concernTag: 'Dental Consultation Update',
        chiefComplaintEnc: JSON.stringify({
          isComprehensiveDentalRecord: true,
          chartData: patient.chartData,
          matrixData: patient.matrixData,
          matrixDMF: patient.matrixDMF,
          lockedYears: patient.lockedYears,
          history: patient.history,
          prescription: patient.prescription,
          clearance: patient.clearance
        }),
      };
      await api.post('/clinic/visits', payload, token);
      alert('Dental record successfully saved to history.');
      window.location.reload();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to save record.');
      }
    } finally {
      setIsSaving(false);
    }
  };

  const completeConsultation = async () => {
    if (!queueId) return;
    setIsCompleting(true);
    const token = getToken();
    try {
      await api.put(`/appointments/queue/${queueId}`, { status: 'COMPLETED' }, token);
      router.push('/dashboard/dental');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to complete consultation.');
      }
      setIsCompleting(false);
    }
  };

  const displayName = loading
    ? 'Loading student record...'
    : `${patient.lastName}, ${patient.firstName} ${patient.middleInitial}`.trim() || 'Student Record';

  const resolvedPatientAge = patient.resolvedAge ?? computeAgeFromBirthday(patient.dob) ?? null;

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
            <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-3">
              {displayName}
              {queueId && (
                <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase tracking-widest flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Active Consultation
                </span>
              )}
            </h2>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2 mt-0.5">
              <span>{patient.courseYear || 'N/A'}</span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span>ID: {patient.id || studentNumber}</span>
              <span className="w-1 h-1 rounded-full bg-slate-300"></span>
              <span>{patient.sex || 'N/A'}, {resolvedPatientAge ?? 'N/A'} YRS</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSaveRecord}
            disabled={isSaving}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save size={16} /> {isSaving ? 'Saving...' : 'Save Record'}
          </button>
          
          {queueId && (
            <button 
              onClick={() => {
                handleSaveRecord().then(() => completeConsultation());
              }}
              disabled={isCompleting || isSaving}
              className="flex items-center justify-center gap-2 px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 shadow-lg shadow-emerald-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckCircle size={16} /> {isCompleting ? 'Completing...' : 'Complete & Release'}
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto w-full p-4 sm:p-6 lg:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {loading && (
            <div className="rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-500">
              Loading student record...
            </div>
          )}
          
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
                patient={{ fullName: `${patient.lastName}, ${patient.firstName}`.trim(), age: resolvedPatientAge ?? 0, date: new Date().toLocaleDateString() }}
                content={patient.prescription}
                onChange={(v) => handlePatientUpdate('prescription', v)}
                onPrint={() => window.print()}
                onSave={() => alert('Prescription saved to record.')}
              />
            )}
            {activeTab === 'clearance' && (
              <DentalClearance 
                patient={{ fullName: `${patient.lastName}, ${patient.firstName}`.trim(), age: resolvedPatientAge ?? 0, courseYear: patient.courseYear, date: new Date().toLocaleDateString() }}
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
