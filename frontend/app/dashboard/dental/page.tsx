'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UserPlus, Clock, Activity, Search, ChevronRight } from 'lucide-react';
import PredictiveInsightsCard from '@/components/dashboard/shared/PredictiveInsightsCard';

import Toast from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface QueueItem {
  id: string;
  preferredDate: string;
  preferredTime: string;
  serviceType: string;
  symptoms: string;
  status: 'WAITING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  studentProfile: {
    studentNumber: string;
    firstName: string;
    lastName: string;
    courseDept: string;
  };
}

interface QueueResponse {
  success: boolean;
  data: QueueItem[];
}

export default function DentalDashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState('');
  const [error, setError] = useState('');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [toastConfig, setToastConfig] = useState({ isVisible: false, message: '' });
  const [searchQuery, setSearchQuery] = useState('');

  function showToast(message: string) {
    setToastConfig({ isVisible: true, message });
    setTimeout(() => setToastConfig({ isVisible: false, message: '' }), 2500);
  }

  async function loadQueue() {
    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await api.get<QueueResponse>(
        '/appointments/queue?limit=500&serviceType=Dental%20Check-up',
        token,
      );
      setQueue(response.data || []);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load dental queue.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadQueue();
  }, []);

  async function handleStatusChange(appointmentId: string, status: QueueItem['status']) {
    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      return;
    }

    try {
      setUpdatingId(appointmentId);
      setError('');
      await api.put(`/appointments/queue/${appointmentId}`, { status }, token);
      await loadQueue();
      showToast(`Queue item moved to ${status.replace('_', ' ')}`);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to update queue status.');
      }
    } finally {
      setUpdatingId('');
    }
  }

  const filteredQueue = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return queue;

    return queue.filter((item) => {
      const fullName = `${item.studentProfile.firstName} ${item.studentProfile.lastName}`.toLowerCase();
      return (
        fullName.includes(q)
        || item.studentProfile.studentNumber.toLowerCase().includes(q)
        || (item.symptoms || '').toLowerCase().includes(q)
      );
    });
  }, [queue, searchQuery]);

  const waitingCount = queue.filter((item) => item.status === 'WAITING').length;
  const inProgressCount = queue.filter((item) => item.status === 'IN_PROGRESS').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      <header className="bg-white border-b border-slate-200 px-8 py-5 sticky top-0 z-30 shadow-sm flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-800 tracking-tight">Dental Clinic Dashboard</h1>
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Dental queue from live backend data</p>
        </div>

        <button
          onClick={() => router.push('/dashboard/dental/scanner')}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition-all active:scale-95"
        >
          <UserPlus size={18} />
          Open QR Scanner
        </button>
      </header>

      <main className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-7xl mx-auto space-y-6">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-emerald-50 text-emerald-600 rounded-2xl">
                  <UserPlus size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total In Queue</p>
                  <p className="text-2xl font-black text-slate-800">{queue.length}</p>
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
                  <p className="text-2xl font-black text-slate-800">{waitingCount}</p>
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
                  <p className="text-2xl font-black text-slate-800">{inProgressCount}</p>
                </div>
              </div>
            </div>
          </div>

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
              {loading ? (
                <div className="px-6 py-12 text-center text-slate-400 font-bold">Loading queue...</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white shadow-sm z-10">
                    <tr>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Schedule</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Patient</th>
                      <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Department</th>
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
                      filteredQueue.map((patient) => (
                        <tr key={patient.id} className="hover:bg-slate-50/50 transition-colors group">
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-slate-600">{new Date(patient.preferredDate).toLocaleDateString()} {patient.preferredTime}</span>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-black text-slate-800">{patient.studentProfile.firstName} {patient.studentProfile.lastName}</p>
                              <p className="text-xs font-semibold text-slate-400">{patient.studentProfile.studentNumber}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <p className="text-xs font-semibold text-slate-500">{patient.studentProfile.courseDept || 'N/A'}</p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm font-bold text-slate-600">{patient.symptoms || 'N/A'}</span>
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={patient.status}
                              disabled={updatingId === patient.id}
                              onChange={(e) => handleStatusChange(patient.id, e.target.value as QueueItem['status'])}
                              className={`text-xs font-black uppercase tracking-wider px-3 py-1.5 rounded-lg border-0 cursor-pointer appearance-none ${
                                patient.status === 'WAITING' ? 'bg-amber-100 text-amber-700'
                                  : patient.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700'
                                    : patient.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700'
                                      : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              <option value="WAITING">Waiting</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="COMPLETED">Completed</option>
                              <option value="CANCELLED">Cancelled</option>
                            </select>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => router.push(`/dashboard/dental/records/${encodeURIComponent(patient.studentProfile.studentNumber)}/history`)}
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
              )}
            </div>
          </div>
        </div>
      </main>

      <Toast
        isVisible={toastConfig.isVisible}
        message={toastConfig.message}
        onClose={() => setToastConfig({ isVisible: false, message: '' })}
      />

      <PredictiveInsightsCard role="dental" className="mx-8 mb-8" />
    </div>
  );
}
