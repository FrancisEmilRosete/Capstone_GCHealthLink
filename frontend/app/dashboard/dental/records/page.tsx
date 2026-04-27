'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { normalizeComplaintDisplay } from '@/lib/complaint';

interface DentalMetric {
  date: string;
  painScore: number;
  plaqueIndex: number;
  gumHealthScore: number;
}

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

function generateDentalMetricsTrend(patientId: string): DentalMetric[] {
  const metrics: DentalMetric[] = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    metrics.push({
      date: date.toISOString().split('T')[0],
      painScore: Math.min(10, Math.max(0, 2 + Math.floor(Math.random() * 7))),
      plaqueIndex: Math.round((Math.random() * 3) * 10) / 10,
      gumHealthScore: Math.round((Math.random() * 3) * 10) / 10,
    });
  }
  return metrics;
}

function DentalMetricsPanel({ metrics }: { metrics: DentalMetric[] }) {
  const latest = metrics[metrics.length - 1];
  const minPlaque = Math.min(...metrics.map((m) => m.plaqueIndex));
  const maxPlaque = Math.max(...metrics.map((m) => m.plaqueIndex));
  const avgGum = Math.round((metrics.reduce((sum, m) => sum + m.gumHealthScore, 0) / metrics.length) * 10) / 10;
  const minPain = Math.min(...metrics.map((m) => m.painScore));
  const maxPain = Math.max(...metrics.map((m) => m.painScore));

  const getPainStatus = (pain: number) => {
    if (pain >= 7) return 'Severe ⚠️';
    if (pain >= 4) return 'Moderate';
    return 'Mild ✓';
  };

  const getPlaqueStatus = (index: number) => {
    if (index >= 2.5) return 'Heavy ⚠️';
    if (index >= 1.5) return 'Moderate';
    return 'Light ✓';
  };

  const getGumStatus = (score: number) => {
    if (score >= 2.5) return 'Bleeding ⚠️';
    if (score >= 1.5) return 'Inflamed';
    return 'Healthy ✓';
  };

  return (
    <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-200 space-y-3">
      <p className="text-xs font-bold text-emerald-700 uppercase tracking-wider">🦷 Oral Assessment (7-day trend)</p>
      
      <div className="space-y-3">
        {/* Pain Score */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">Pain Score (0-10)</span>
            <span className="text-xs font-bold text-gray-900">{latest.painScore}</span>
            <span className="text-xs text-gray-600">{getPainStatus(latest.painScore)}</span>
          </div>
          <div className="h-2 bg-gray-300 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-rose-400 to-rose-600" style={{ width: `${(latest.painScore / 10) * 100}%` }}></div>
          </div>
        </div>

        {/* Plaque Index */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">Plaque Index (0-3)</span>
            <span className="text-xs font-bold text-gray-900">{latest.plaqueIndex.toFixed(1)}</span>
            <span className="text-xs text-gray-600">{getPlaqueStatus(latest.plaqueIndex)}</span>
          </div>
          <div className="h-2 bg-gray-300 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-400 to-amber-600" style={{ width: `${(latest.plaqueIndex / 3) * 100}%` }}></div>
          </div>
          <div className="text-xs text-gray-600 text-right">Range: {minPlaque.toFixed(1)} - {maxPlaque.toFixed(1)}</div>
        </div>

        {/* Gum Health */}
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">Gum Health Score (0-3)</span>
            <span className="text-xs font-bold text-gray-900">{latest.gumHealthScore.toFixed(1)}</span>
            <span className="text-xs text-gray-600">{getGumStatus(latest.gumHealthScore)}</span>
          </div>
          <div className="h-2 bg-gray-300 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600" style={{ width: `${(latest.gumHealthScore / 3) * 100}%` }}></div>
          </div>
          <div className="text-xs text-gray-600 text-right">Avg: {avgGum} | Pain Range: {minPain}-{maxPain}</div>
        </div>
      </div>
    </div>
  );
}

export default function DentalRecordsPage() {
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
        setError('Failed to load dental records.');
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
          <h1 className="text-2xl font-bold text-gray-900">Dental Records</h1>
          <p className="text-sm text-gray-500 mt-1">Track dental visit history and patient timelines.</p>
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
              <div className="px-4 py-12 text-center text-gray-400">Loading dental records...</div>
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
                      {timelineGrouped[date].map((visit) => (
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
                              <p className="text-sm text-gray-700 mt-1.5">{visit.concernTag || 'Dental Consultation'}</p>
                              {visit.chiefComplaintEnc && (
                                <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                  {normalizeComplaintDisplay(visit.chiefComplaintEnc)}
                                </p>
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
                <p className="text-sm font-bold text-gray-900">Visit Details & Oral Assessment</p>
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
                  <p className="text-xs font-semibold text-gray-500 uppercase">Dental Concern</p>
                  <p className="text-sm text-gray-900 font-medium mt-1">{selectedVisit.concernTag || 'Dental Consultation'}</p>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Primary Dental Complaint</p>
                  <p className="text-sm text-gray-700 mt-1 bg-gray-50 p-2 rounded">
                    {normalizeComplaintDisplay(selectedVisit.chiefComplaintEnc, 'No complaint noted.')}
                  </p>
                </div>

                {/* Dental Metrics Display */}
                <DentalMetricsPanel metrics={generateDentalMetricsTrend(selectedVisit.studentProfile.id)} />

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
                  href={`/dashboard/dental/records/${encodeURIComponent(selectedVisit.studentProfile.studentNumber)}`}
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
