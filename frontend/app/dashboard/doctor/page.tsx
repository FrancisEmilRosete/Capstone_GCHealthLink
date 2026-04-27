'use client';

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Clock, Activity, Search, ChevronRight, FileCheck } from 'lucide-react';
import CheckInPatientModal from '@/components/dashboard/shared/CheckInPatientModal';
import Toast from '@/components/ui/Toast';
import type { PendingCertificateRequest } from '@/components/dashboard/staff/CertificateApprovalTable';

// Mock Data Interfaces
interface QueueItem {
  id: string;
  studentId: string;
  name: string;
  patientType: 'Student' | 'Employee';
  courseDept: string;
  department: string;
  reason: string;
  remarks?: string;
  timeIn: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'DONE';
}

interface Notification {
  id: string;
  message: string;
  time: string;
  read: boolean;
}

const STORAGE_KEY = 'gchl_cert_requests';
const CERT_POPUP_MS = 5000;

export default function DoctorDashboardPage() {
  const router = useRouter();

  // Mock State
  const [mockUser] = useState({ name: "Dr. Dela Cruz", role: "Campus Physician" });
  
  const [mockNotifications, setMockNotifications] = useState<Notification[]>([
    { id: '1', message: "Pending medical review for Student 2024-00123", time: "10m ago", read: false },
    { id: '2', message: "Supply low: Paracetamol 500mg", time: "1h ago", read: false }
  ]);

  const [mockQueue, setMockQueue] = useState<QueueItem[]>([
    {
      id: '1', studentId: '2023-1045', name: 'Juan Dela Cruz', patientType: 'Student',
      courseDept: 'BSIT 3', department: 'Medical', reason: 'Fever / Flu', timeIn: '09:00 AM', status: 'IN_PROGRESS'
    },
    {
      id: '2', studentId: 'EMP-001', name: 'Dr. Maria Santos', patientType: 'Employee',
      courseDept: 'CCS Faculty', department: 'Medical', reason: 'Routine Checkup', timeIn: '09:15 AM', status: 'WAITING'
    },
    {
      id: '3', studentId: '2022-0891', name: 'Alyssa Reyes', patientType: 'Student',
      courseDept: 'BS Nursing 4', department: 'Medical', reason: 'Medical Certificate', timeIn: '09:30 AM', status: 'WAITING'
    }
  ]);

  // Certificate approval state
  const [pendingCerts, setPendingCerts] = useState<PendingCertificateRequest[]>([]);
  const [showCertPanel, setShowCertPanel] = useState(false);
  const certPopupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPendingIds = useRef<string>('');

  const showCertPanelNow = useCallback(() => {
    setShowCertPanel(true);
    if (certPopupTimer.current) {
      clearTimeout(certPopupTimer.current);
    }
    certPopupTimer.current = setTimeout(() => setShowCertPanel(false), CERT_POPUP_MS);
  }, []);

  useEffect(() => {
    function loadPendingCerts() {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) { setPendingCerts([]); return; }
        const all: PendingCertificateRequest[] = JSON.parse(raw);
        setPendingCerts(all.filter((r) => r.status === 'pending_doctor'));
      } catch {
        setPendingCerts([]);
      }
    }
    loadPendingCerts();
    // Poll for changes (e.g. staff requests approval in another tab)
    const interval = setInterval(loadPendingCerts, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (pendingCerts.length === 0) {
      setShowCertPanel(false);
      lastPendingIds.current = '';
      return;
    }

    const nextIds = pendingCerts.map((cert) => cert.id).sort().join('|');
    if (nextIds !== lastPendingIds.current) {
      showCertPanelNow();
      lastPendingIds.current = nextIds;
    }
  }, [pendingCerts, showCertPanelNow]);

  useEffect(() => {
    return () => {
      if (certPopupTimer.current) {
        clearTimeout(certPopupTimer.current);
      }
    };
  }, []);

  function handleDoctorApprove(cert: PendingCertificateRequest) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const all: PendingCertificateRequest[] = JSON.parse(raw);
      const updated = all.map((r) =>
        r.id === cert.id
          ? { ...r, status: 'doctor_approved' as const, doctorName: mockUser.name }
          : r
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setPendingCerts((prev) => prev.filter((r) => r.id !== cert.id));
      showToast(`Certificate approved for ${cert.studentName}`);
    } catch { /* ignore */ }
  }

  function handleDoctorDeny(cert: PendingCertificateRequest) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const all: PendingCertificateRequest[] = JSON.parse(raw);
      const updated = all.map((r) =>
        r.id === cert.id ? { ...r, status: 'denied' as const } : r
      );
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setPendingCerts((prev) => prev.filter((r) => r.id !== cert.id));
      showToast(`Certificate request denied for ${cert.studentName}`);
    } catch { /* ignore */ }
  }

  // Modal & Toast State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastConfig, setToastConfig] = useState({ isVisible: false, message: '' });
  const [searchQuery, setSearchQuery] = useState('');


  const handleAdmitPatient = (patient: QueueItem) => {
    setMockQueue(prev => [patient, ...prev]);
    setIsModalOpen(false);
    showToast("Patient successfully added to queue");
  };

  const showToast = (message: string) => {
    setToastConfig({ isVisible: true, message });
    setTimeout(() => setToastConfig({ isVisible: false, message: '' }), 3000);
  };

  const handleStatusChange = (id: string, newStatus: QueueItem['status']) => {
    setMockQueue(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
  };

  const filteredQueue = useMemo(() => {
    return mockQueue.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.studentId.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [mockQueue, searchQuery]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      
      {/* Global Header */}
      <header className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-30 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Medical Clinic Dashboard</h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Welcome back, {mockUser.name}</p>
        </div>

        <div className="flex items-center gap-6">
          {/* Check In Button */}
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
          >
            <UserPlus size={18} />
            Check In Patient
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <UserPlus size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Today</p>
                  <p className="text-2xl font-black text-slate-800">{mockQueue.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-amber-50 text-amber-600 rounded-2xl">
                  <Clock size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Waiting</p>
                  <p className="text-2xl font-black text-slate-800">{mockQueue.filter(p => p.status === 'WAITING').length}</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                  <Activity size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">In Progress</p>
                  <p className="text-2xl font-black text-slate-800">{mockQueue.filter(p => p.status === 'IN_PROGRESS').length}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Patient Queue Section */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[600px]">
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <h2 className="text-lg font-black text-slate-800 tracking-tight">Active Patient Queue</h2>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search queue..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 w-64 transition-all"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-white shadow-sm z-10">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Time In</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Patient</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Type & Dept</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Reason</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredQueue.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-bold">No patients found.</td>
                    </tr>
                  ) : (
                    filteredQueue.map(patient => (
                      <tr key={patient.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-slate-600">{patient.timeIn}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm font-black text-slate-800">{patient.name}</p>
                            <p className="text-xs font-semibold text-slate-400">{patient.studentId}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider mb-1 ${patient.patientType === 'Employee' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                              {patient.patientType}
                            </span>
                            <p className="text-xs font-semibold text-slate-500">{patient.courseDept}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm font-bold text-slate-600">{patient.reason}</span>
                          {patient.remarks && <p className="text-xs text-slate-400 truncate max-w-[200px]">{patient.remarks}</p>}
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={patient.status}
                            onChange={(e) => handleStatusChange(patient.id, e.target.value as any)}
                            className={`text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border-0 cursor-pointer appearance-none ${
                              patient.status === 'WAITING' ? 'bg-amber-100 text-amber-700' : 
                              patient.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' : 
                              'bg-emerald-100 text-emerald-700'
                            }`}
                          >
                            <option value="WAITING">Waiting</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="DONE">Done</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => router.push(`/dashboard/doctor/records/${encodeURIComponent(patient.studentId)}`)}
                            className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider"
                          >
                            Open <ChevronRight size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Certificate Approval Panel */}
      {pendingCerts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-20 w-full max-w-md">
          {showCertPanel ? (
            <div className="bg-white rounded-3xl border border-emerald-200 shadow-2xl shadow-emerald-100/50 overflow-hidden transition-all duration-300">
              <div className="px-5 py-4 bg-emerald-50 border-b border-emerald-100 flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-xl">
                  <FileCheck size={18} className="text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-black text-slate-800">Pending Certificate Approvals</p>
                  <p className="text-xs text-slate-500">{pendingCerts.length} request{pendingCerts.length > 1 ? 's' : ''} awaiting your approval</p>
                </div>
              </div>
              <div className="max-h-72 overflow-y-auto divide-y divide-slate-50">
                {pendingCerts.map((cert) => (
                  <div key={cert.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-slate-800 truncate">{cert.studentName}</p>
                        <p className="text-xs text-teal-600 font-semibold">{cert.studentNumber} • {cert.courseDept}</p>
                        <p className="text-xs text-slate-500 mt-1">Reason: <span className="font-semibold text-slate-700">{cert.reason}</span></p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => handleDoctorApprove(cert)}
                          className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-colors"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleDoctorDeny(cert)}
                          className="px-3 py-1.5 border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold rounded-xl transition-colors"
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex justify-end">
              <button
                onClick={showCertPanelNow}
                className="rounded-2xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
              >
                Pending Certificate Approvals ({pendingCerts.length})
              </button>
            </div>
          )}
        </div>
      )}

      {/* Modals & Toasts */}
      <CheckInPatientModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAdmit={handleAdmitPatient}
        defaultDepartment="Medical"
      />
      
      <Toast 
        isVisible={toastConfig.isVisible} 
        message={toastConfig.message} 
        onClose={() => setToastConfig({ isVisible: false, message: '' })} 
      />
    </div>
  );
}
