'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface MedicalHistory {
  asthmaEnc?: string | null;
  diabetesEnc?: string | null;
  hypertensionEnc?: string | null;
  allergyEnc?: string | null;
}

interface PatientRecord {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  medicalHistory: MedicalHistory | null;
}

interface StudentResponse {
  success: boolean;
  data: PatientRecord[];
}

interface Condition {
  id: string;
  name: string;
  field: keyof MedicalHistory;
  icon: string;
  color: string;
  riskLevel: 'critical' | 'high' | 'medium' | 'low';
}

const CONDITIONS: Condition[] = [
  {
    id: 'asthma',
    name: 'Asthma',
    field: 'asthmaEnc',
    icon: '🫁',
    color: 'blue',
    riskLevel: 'high',
  },
  {
    id: 'diabetes',
    name: 'Diabetes',
    field: 'diabetesEnc',
    icon: '🩺',
    color: 'amber',
    riskLevel: 'high',
  },
  {
    id: 'hypertension',
    name: 'Hypertension',
    field: 'hypertensionEnc',
    icon: '❤️',
    color: 'red',
    riskLevel: 'critical',
  },
  {
    id: 'allergy',
    name: 'Allergies',
    field: 'allergyEnc',
    icon: '🤧',
    color: 'purple',
    riskLevel: 'medium',
  },
];

function hasCondition(value?: string | null): boolean {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized !== '' && normalized !== 'none' && normalized !== 'no' && normalized !== 'n/a' && normalized !== 'na';
}

function getConditionMonitoringStatus(history: MedicalHistory | null): Condition[] {
  if (!history) return [];
  return CONDITIONS.filter((cond) => hasCondition(history[cond.field]));
}

function getRiskColor(riskLevel: string): string {
  const colors: Record<string, string> = {
    critical: 'text-red-700 bg-red-50 border-red-200',
    high: 'text-amber-700 bg-amber-50 border-amber-200',
    medium: 'text-purple-700 bg-purple-50 border-purple-200',
    low: 'text-blue-700 bg-blue-50 border-blue-200',
  };
  return colors[riskLevel] || colors.low;
}

export default function ConditionsChecklistPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCondition, setFilterCondition] = useState<string>('all');
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);

  async function loadPatients() {
    const token = getToken();
    if (!token) {
      setError('You are not logged in.');
      setLoading(false);
      return;
    }

    try {
      setError('');
      const response = await api.get<StudentResponse>('/students/all?limit=500', token);
      setPatients(response.data || []);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load patient data.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPatients();
  }, []);

  const filteredPatients = patients.filter((patient) => {
    const q = searchTerm.toLowerCase().trim();
    const matchesSearch = !q || 
      patient.firstName.toLowerCase().includes(q) ||
      patient.lastName.toLowerCase().includes(q) ||
      patient.studentNumber.toLowerCase().includes(q);
    
    if (filterCondition === 'all') return matchesSearch;
    
    const conditions = getConditionMonitoringStatus(patient.medicalHistory);
    return matchesSearch && conditions.some((cond) => cond.id === filterCondition);
  });

  const stats = {
    total: patients.length,
    withConditions: patients.filter((p) => getConditionMonitoringStatus(p.medicalHistory).length > 0).length,
    critical: patients.filter((p) => 
      getConditionMonitoringStatus(p.medicalHistory).some((c) => c.riskLevel === 'critical')
    ).length,
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">📋 Conditions Monitoring</h1>
          <p className="text-sm text-gray-500 mt-1">Track and monitor students with chronic medical conditions.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 font-semibold uppercase">Total Students</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.total}</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 font-semibold uppercase">With Conditions</p>
          <p className="text-3xl font-bold text-amber-600 mt-2">{stats.withConditions}</p>
        </div>
        <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-4">
          <p className="text-xs text-gray-400 font-semibold uppercase">🚨 Critical Risk</p>
          <p className="text-3xl font-bold text-red-600 mt-2">{stats.critical}</p>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or student number..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
          </div>
          
          <select
            value={filterCondition}
            onChange={(e) => setFilterCondition(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
          >
            <option value="all">All Conditions</option>
            {CONDITIONS.map((cond) => (
              <option key={cond.id} value={cond.id}>
                {cond.icon} {cond.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Patient List */}
      <div className="space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading patient conditions...</div>
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-2xl">
            <p className="text-gray-500 text-sm">No students match your criteria.</p>
          </div>
        ) : (
          filteredPatients.map((patient) => {
            const conditions = getConditionMonitoringStatus(patient.medicalHistory);
            const hasHighRisk = conditions.some((c) => c.riskLevel === 'critical');
            const isExpanded = expandedPatient === patient.id;

            return (
              <div
                key={patient.id}
                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all hover:border-teal-300"
              >
                <button
                  onClick={() => setExpandedPatient(isExpanded ? null : patient.id)}
                  className="w-full text-left px-4 py-4 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      {hasHighRisk && <span className="text-lg">🚨</span>}
                      <div>
                        <p className="font-semibold text-gray-900">
                          {patient.firstName} {patient.lastName}
                        </p>
                        <p className="text-xs text-teal-600 font-medium">{patient.studentNumber}</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 ml-4 shrink-0">
                    <div className="flex gap-1">
                      {conditions.length === 0 ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">
                          ✓ Clear
                        </span>
                      ) : (
                        conditions.slice(0, 2).map((cond) => (
                          <span
                            key={cond.id}
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold border ${getRiskColor(cond.riskLevel)}`}
                          >
                            {cond.icon} {cond.name}
                          </span>
                        ))
                      )}
                      {conditions.length > 2 && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                          +{conditions.length - 2} more
                        </span>
                      )}
                    </div>
                    <svg
                      className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                    </svg>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-gray-100 px-4 py-4 bg-gray-50 space-y-4">
                    {conditions.length === 0 ? (
                      <p className="text-sm text-gray-600">No chronic conditions recorded.</p>
                    ) : (
                      <div className="space-y-3">
                        {CONDITIONS.map((cond) => {
                          const isActive = hasCondition(patient.medicalHistory?.[cond.field]);
                          return (
                            <div
                              key={cond.id}
                              className={`p-3 rounded-lg border-2 ${
                                isActive
                                  ? `border-${cond.color}-300 bg-${cond.color}-50`
                                  : 'border-gray-200 bg-white'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <span className="text-2xl">{cond.icon}</span>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between">
                                    <p className="font-semibold text-gray-900">{cond.name}</p>
                                    {isActive && (
                                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${getRiskColor(cond.riskLevel)}`}>
                                        {cond.riskLevel === 'critical' && '🚨'}
                                        {cond.riskLevel === 'high' && '⚠️'}
                                        {cond.riskLevel === 'medium' && '⚡'}
                                        {cond.riskLevel === 'low' && 'ℹ️'}
                                        {cond.riskLevel.toUpperCase()}
                                      </span>
                                    )}
                                  </div>
                                  {isActive && (
                                    <p className="text-xs text-gray-600 mt-1">
                                      Status: {patient.medicalHistory?.[cond.field]}
                                    </p>
                                  )}
                                  {!isActive && (
                                    <p className="text-xs text-gray-500 mt-1">Not reported</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <Link
                      href={`/dashboard/staff/record/${encodeURIComponent(patient.studentNumber)}`}
                      className="inline-block w-full text-center px-3 py-2.5 mt-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors"
                    >
                      Open Full Medical Record
                    </Link>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
