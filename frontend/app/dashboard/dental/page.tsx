'use client';

import React, { useState, useMemo } from 'react';
import { Bell, UserPlus, Clock, Activity, Search, ChevronRight } from 'lucide-react';
import CheckInPatientModal from '@/components/dashboard/shared/CheckInPatientModal';
import Toast from '@/components/ui/Toast';

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

export default function DentalDashboardPage() {
  // Mock State
  const [mockUser] = useState({ name: "Dr. Fernandez", role: "Campus Dentist" });
  
  const [mockNotifications, setMockNotifications] = useState<Notification[]>([
    { id: '1', message: "Student 2024-0120 ready for oral prophylaxis", time: "5m ago", read: false },
    { id: '2', message: "Supply low: Amalgam Capsules", time: "2h ago", read: true }
  ]);

  const [mockQueue, setMockQueue] = useState<QueueItem[]>([
    {
      id: '1', studentId: '2023-1122', name: 'Mark Bautista', patientType: 'Student',
      courseDept: 'BS Computer Science', department: 'Dental', reason: 'Dental Clearance', timeIn: '08:30 AM', status: 'IN_PROGRESS'
    },
    {
      id: '2', studentId: 'EMP-045', name: 'Prof. Ricardo Gomez', patientType: 'Employee',
      courseDept: 'CBA Faculty', department: 'Dental', reason: 'Toothache', timeIn: '09:05 AM', status: 'WAITING'
    },
    {
      id: '3', studentId: '2024-0551', name: 'Samantha Dizon', patientType: 'Student',
      courseDept: 'BS Tourism', department: 'Dental', reason: 'Consultation', timeIn: '09:45 AM', status: 'WAITING'
    }
  ]);

  // Modal & Toast State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastConfig, setToastConfig] = useState({ isVisible: false, message: '' });
  const [searchQuery, setSearchQuery] = useState('');

  const unreadCount = mockNotifications.filter(n => !n.read).length;

  const handleAdmitPatient = (patient: QueueItem) => {
    setMockQueue(prev => [patient, ...prev]);
    setIsModalOpen(false);
    showToast("Patient successfully added to dental queue");
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
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Dental Clinic Dashboard</h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Welcome back, {mockUser.name}</p>
        </div>

        <div className="flex items-center gap-6">
          {/* Notifications */}
          <button className="relative p-2 text-slate-400 hover:text-emerald-600 transition-colors">
            <Bell size={24} />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>

          <div className="h-8 w-px bg-slate-200"></div>

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
              <h2 className="text-lg font-black text-slate-800 tracking-tight">Active Dental Queue</h2>
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
                          <button className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors inline-flex items-center gap-1 text-xs font-bold uppercase tracking-wider">
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

      {/* Modals & Toasts */}
      <CheckInPatientModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAdmit={handleAdmitPatient}
        defaultDepartment="Dental"
      />
      
      <Toast 
        isVisible={toastConfig.isVisible} 
        message={toastConfig.message} 
        onClose={() => setToastConfig({ isVisible: false, message: '' })} 
      />
    </div>
  );
}
