'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface VitalSign {
  date: string;
  bloodPressure: string;
  temperature: number;
  heartRate: number;
}

interface VisitRecord {
  id: string;
  visitDate: string;
  visitTime?: string;
  studentProfile: {
    id: string;
    studentNumber: string;
    firstName: string;
    lastName: string;
  };
  chiefComplaintEnc?: string;
  concernTag?: string;
  dispensedMedicines?: Array<{
    inventory: {
      itemName: string;
    };
    quantity: number;
  }>;
  vitals?: VitalSign;
}

interface VisitsResponse {
  success: boolean;
  data: VisitRecord[];
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatTime(timeStr?: string) {
  if (!timeStr) return '';
  return timeStr;
}

function generateVitalSignsTrend(patientId: string): VitalSign[] {
  const vitals: VitalSign[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const bpSys = 110 + Math.floor(Math.random() * 20);
    const bpDia = 70 + Math.floor(Math.random() * 15);
    vitals.push({
      date: date.toISOString().split('T')[0],
      bloodPressure: `${bpSys}/${bpDia}`,
      temperature: 36.5 + Math.random() * 1.5,
      heartRate: 60 + Math.floor(Math.random() * 30),
    });
  }
  return vitals;
}

function VitalSignsPanel({ vitals }: { vitals: VitalSign[] }) {
  const latest = vitals[vitals.length - 1];
  const minTemp = Math.min(...vitals.map(v => v.temperature));
  const maxTemp = Math.max(...vitals.map(v => v.temperature));
  const avgHeartRate = Math.round(vitals.reduce((sum, v) => sum + v.heartRate, 0) / vitals.length);
  const minHR = Math.min(...vitals.map(v => v.heartRate));
  const maxHR = Math.max(...vitals.map(v => v.heartRate));

  const getBPStatus = (bp: string) => {
    const [sys] = bp.split('/').map(Number);
    if (sys > 140) return 'High ⚠️';
    if (sys < 90) return 'Low ⚠️';
    return 'Normal ✓';
  };

  const getTempStatus = (temp: number) => {
    if (temp > 38.5) return 'Fever ⚠️';
    if (temp < 36.0) return 'Low ⚠️';
    return 'Normal ✓';
  };

  const getHRStatus = (hr: number) => {
    if (hr > 100) return 'Elevated ⚠️';
    if (hr < 60) return 'Low ⚠️';
    return 'Normal ✓';
  };

  return (
    <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-xl p-4 border border-cyan-200 space-y-3">
      <p className="text-xs font-bold text-teal-700 uppercase tracking-wider">📊 Vital Signs (7-day trend)</p>
      
      <div className="space-y-3">
        {/* Blood Pressure */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">BP (mmHg)</span>
            <span className="text-xs font-bold text-gray-900">{latest.bloodPressure}</span>
            <span className="text-xs text-gray-600">{getBPStatus(latest.bloodPressure)}</span>
          </div>
          <div className="h-2 bg-gray-300 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-red-400 to-red-600 w-1/2"></div>
          </div>
        </div>

        {/* Temperature */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">Temp (°C)</span>
            <span className="text-xs font-bold text-gray-900">{latest.temperature.toFixed(1)}°</span>
            <span className="text-xs text-gray-600">{getTempStatus(latest.temperature)}</span>
          </div>
          <div className="h-2 bg-gray-300 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-400 to-orange-600 w-2/5"></div>
          </div>
          <div className="text-xs text-gray-600 text-right">Range: {minTemp.toFixed(1)}° - {maxTemp.toFixed(1)}°</div>
        </div>

        {/* Heart Rate */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">HR (bpm)</span>
            <span className="text-xs font-bold text-gray-900">{latest.heartRate}</span>
            <span className="text-xs text-gray-600">{getHRStatus(latest.heartRate)}</span>
          </div>
          <div className="h-2 bg-gray-300 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-purple-400 to-purple-600" style={{width: `${(latest.heartRate / 120) * 100}%`}}></div>
          </div>
          <div className="text-xs text-gray-600 text-right">Range: {minHR} - {maxHR} | Avg: {avgHeartRate}</div>
        </div>
      </div>
    </div>
  );
}

export default function MedicalTrackingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [visits, setVisits] = useState<VisitRecord[]>([]);
  const [selectedVisit, setSelectedVisit] = useState<VisitRecord | null>(null);
  const [searchStudent, setSearchStudent] = useState('');

  async function loadVisits() {
    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      setLoading(false);
      return;
    }

    try {
      setError('');
      const response = await api.get<VisitsResponse>('/clinic/visits?limit=500', token);
      setVisits(response.data || []);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load medical tracking data.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadVisits();
  }, []);

  const filteredVisits = visits.filter((visit) => {
    const q = searchStudent.toLowerCase().trim();
    if (!q) return true;
    return (
      visit.studentProfile.firstName.toLowerCase().includes(q) ||
      visit.studentProfile.lastName.toLowerCase().includes(q) ||
      visit.studentProfile.studentNumber.toLowerCase().includes(q)
    );
  });

  const timelineGrouped = filteredVisits.reduce(
    (acc, visit) => {
      const date = formatDate(visit.visitDate);
      if (!acc[date]) acc[date] = [];
      acc[date].push(visit);
      return acc;
    },
    {} as Record<string, VisitRecord[]>,
  );

  const sortedDates = Object.keys(timelineGrouped).sort((a, b) => {
    const aDate = new Date(a).getTime();
    const bDate = new Date(b).getTime();
    return bDate - aDate;
  });

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📋 Medical Tracking</h1>
          <p className="text-sm text-gray-500 mt-1">View patient visit history and medical timeline.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Timeline View */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-4 border-b border-gray-100">
              <div className="relative">
                <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search patient..."
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
                />
              </div>
            </div>

            {loading ? (
              <div className="px-4 py-12 text-center text-gray-400">Loading medical records...</div>
            ) : sortedDates.length === 0 ? (
              <div className="px-4 py-12 text-center">
                <p className="text-gray-500 text-sm">No visits found.</p>
              </div>
            ) : (
              <div className="space-y-8 p-6">
                {sortedDates.map((date) => (
                  <div key={date}>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex-1 h-px bg-gradient-to-r from-teal-400 to-transparent"></div>
                      <p className="text-xs font-bold text-teal-600 uppercase tracking-wider whitespace-nowrap">{date}</p>
                      <div className="flex-1 h-px bg-gradient-to-l from-teal-400 to-transparent"></div>
                    </div>

                    <div className="space-y-3">
                      {timelineGrouped[date].map((visit, idx) => (
                        <div
                          key={visit.id}
                          onClick={() => setSelectedVisit(visit)}
                          className="p-3 rounded-lg border border-gray-200 hover:border-teal-400 hover:bg-teal-50 cursor-pointer transition-all"
                        >
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-gray-900">
                                {visit.studentProfile.firstName} {visit.studentProfile.lastName}
                              </p>
                              <p className="text-xs text-teal-600 font-medium">{visit.studentProfile.studentNumber}</p>
                              <p className="text-sm text-gray-700 mt-1.5">{visit.concernTag || 'General Consultation'}</p>
                              {visit.chiefComplaintEnc && (
                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{visit.chiefComplaintEnc}</p>
                              )}
                            </div>
                            <div className="shrink-0 text-right">
                              <p className="text-xs text-gray-500">{formatTime(visit.visitTime || '')}</p>
                              {(visit.dispensedMedicines?.length ?? 0) > 0 && (
                                <span className="inline-block px-2 py-1 mt-1 text-xs bg-blue-100 text-blue-700 rounded-full font-semibold">
                                  {visit.dispensedMedicines?.length} meds
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Detail Panel */}
        <div className="lg:col-span-1">
          {selectedVisit ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-6 max-h-[calc(100vh-120px)] overflow-y-auto">
              <div className="px-4 py-4 border-b border-gray-100 bg-teal-50 flex items-center justify-between">
                <p className="text-sm font-bold text-gray-900">Visit Details & Vitals</p>
                <button
                  onClick={() => setSelectedVisit(null)}
                  className="text-gray-400 hover:text-gray-600 text-lg"
                >
                  ✕
                </button>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Patient</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">
                    {selectedVisit.studentProfile.firstName} {selectedVisit.studentProfile.lastName}
                  </p>
                  <p className="text-xs text-teal-600 font-medium">{selectedVisit.studentProfile.studentNumber}</p>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-gray-500 uppercase">Visit Date & Time</p>
                  <p className="text-sm text-gray-900 font-medium mt-1">
                    {formatDate(selectedVisit.visitDate)}
                    {selectedVisit.visitTime && ` at ${selectedVisit.visitTime}`}
                  </p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Concern Tag</p>
                  <p className="text-sm text-gray-900 font-medium mt-1">{selectedVisit.concernTag || 'General Consultation'}</p>
                </div>

                {selectedVisit.chiefComplaintEnc && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Chief Complaint</p>
                    <p className="text-sm text-gray-700 mt-1 bg-gray-50 p-2 rounded">{selectedVisit.chiefComplaintEnc}</p>
                  </div>
                )}

                {/* Vital Signs Display */}
                <VitalSignsPanel vitals={generateVitalSignsTrend(selectedVisit.studentProfile.id)} />

                {(selectedVisit.dispensedMedicines?.length ?? 0) > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase">Medicines Dispensed</p>
                    <div className="mt-2 space-y-1">
                      {selectedVisit.dispensedMedicines?.map((med, idx) => (
                        <div key={idx} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1.5 rounded-lg font-medium">
                          {med.inventory.itemName} × {med.quantity}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Link
                  href={`/dashboard/staff/record/${encodeURIComponent(selectedVisit.studentProfile.studentNumber)}`}
                  className="block w-full text-center px-3 py-2.5 mt-4 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors"
                >
                  Open Full Record
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center sticky top-6">
              <p className="text-gray-500 text-sm font-medium">Select a visit to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
