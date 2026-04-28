'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

type TabId = 'medicalHistory' | 'physicalExams' | 'labResults' | 'visits';

interface HealthDetailResponse {
  success: boolean;
  data: {
    studentProfile: {
      id: string;
      firstName: string;
      middleName?: string | null;
      lastName: string;
      studentNumber: string;
      courseDept: string;
      email: string;
      dateOfBirth?: string | null;
      sex?: string | null;
      contactNumber?: string | null;
    };
    medicalHistory: {
      bloodType?: string | null;
      allergies?: string | null;
      maintenanceMeds?: string | null;
      pastMedicalHistory?: string | null;
      familyHistory?: string | null;
    } | null;
    physicalExaminations: {
      id: string;
      examDate: string;
      height?: number | null;
      weight?: number | null;
      bmi?: number | null;
      bloodPressure?: string | null;
      temperature?: number | null;
      heartRate?: number | null;
      oxygenSat?: number | null;
      visualAcuityOD?: string | null;
      visualAcuityOS?: string | null;
      findings?: string | null;
    }[];
    labResults: {
      id: string;
      testName: string;
      result?: string | null;
      remarks?: string | null;
      testDate?: string | null;
    }[];
    clinicVisits: {
      id: string;
      visitDate?: string | null;
      createdAt: string;
      chiefComplaint?: string | null;
      disposition?: string | null;
      handler?: { firstName?: string | null; lastName?: string | null } | null;
    }[];
  };
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'medicalHistory', label: 'Medical History' },
  { id: 'physicalExams',  label: 'Physical Exams' },
  { id: 'labResults',     label: 'Lab Results' },
  { id: 'visits',         label: 'Clinic Visits' },
];

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex gap-2 py-0.5">
      <span className="text-xs text-gray-400 w-36 shrink-0">{label}</span>
      <span className="text-sm text-gray-800">{value ?? '—'}</span>
    </div>
  );
}

export default function AdminStudentDetailPage() {
  const { studentProfileId } = useParams<{ studentProfileId: string }>();
  const router = useRouter();
  const [data,    setData]    = useState<HealthDetailResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const [tab,     setTab]     = useState<TabId>('medicalHistory');

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) { setError('Not authenticated.'); setLoading(false); return; }
    try {
      const res = await api.get<HealthDetailResponse>(`/admin/records/${studentProfileId}`, token);
      setData(res.data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to load student record.');
    } finally {
      setLoading(false);
    }
  }, [studentProfileId]);

  useEffect(() => { void load(); }, [load]);

  if (loading) return <div className="p-8 text-center text-gray-400">Loading...</div>;
  if (error) return (
    <div className="p-8 space-y-3">
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      <button onClick={() => router.back()} className="text-sm text-teal-600 hover:underline">← Back to Records</button>
    </div>
  );
  if (!data) return null;

  const p = data.studentProfile;
  const mi = p.middleName ? ` ${p.middleName.charAt(0)}.` : '';
  const fullName = `${p.firstName}${mi} ${p.lastName}`;

  return (
    <div className="p-6 space-y-5 max-w-5xl mx-auto">
      <button onClick={() => router.back()} className="text-sm text-teal-600 hover:underline">
        ← Back to Records
      </button>

      {/* Student card */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-lg shrink-0">
            {p.firstName.charAt(0)}{p.lastName.charAt(0)}
          </div>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-gray-900">{fullName}</h1>
            <p className="text-sm text-gray-500">{p.email}</p>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-y-1">
              <InfoRow label="Student No." value={p.studentNumber} />
              <InfoRow label="Department"  value={p.courseDept} />
              <InfoRow label="Sex"         value={p.sex} />
              <InfoRow label="Contact"     value={p.contactNumber} />
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? 'border-teal-500 text-teal-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab panels */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">

        {tab === 'medicalHistory' && (
          data.medicalHistory ? (
            <div className="space-y-2">
              <InfoRow label="Blood Type"       value={data.medicalHistory.bloodType} />
              <InfoRow label="Allergies"        value={data.medicalHistory.allergies} />
              <InfoRow label="Maintenance Meds" value={data.medicalHistory.maintenanceMeds} />
              <InfoRow label="Past Medical Hx"  value={data.medicalHistory.pastMedicalHistory} />
              <InfoRow label="Family History"   value={data.medicalHistory.familyHistory} />
            </div>
          ) : <p className="text-sm text-gray-400">No medical history on file.</p>
        )}

        {tab === 'physicalExams' && (
          data.physicalExaminations.length === 0
            ? <p className="text-sm text-gray-400">No physical examination records.</p>
            : (
              <div className="space-y-4">
                {data.physicalExaminations.map((ex) => (
                  <div key={ex.id} className="border border-gray-100 rounded-xl p-4 space-y-3">
                    <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide">
                      {new Date(ex.examDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-1">
                      <InfoRow label="Height (cm)"    value={ex.height} />
                      <InfoRow label="Weight (kg)"    value={ex.weight} />
                      <InfoRow label="BMI"            value={ex.bmi} />
                      <InfoRow label="Blood Pressure" value={ex.bloodPressure} />
                      <InfoRow label="Temperature"    value={ex.temperature} />
                      <InfoRow label="Heart Rate"     value={ex.heartRate} />
                      <InfoRow label="O₂ Saturation"  value={ex.oxygenSat} />
                      <InfoRow label="Vision OD"      value={ex.visualAcuityOD} />
                      <InfoRow label="Vision OS"      value={ex.visualAcuityOS} />
                    </div>
                    {ex.findings && (
                      <div className="mt-2">
                        <p className="text-xs text-gray-400 mb-0.5">Findings</p>
                        <p className="text-sm text-gray-800">{ex.findings}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
        )}

        {tab === 'labResults' && (
          data.labResults.length === 0
            ? <p className="text-sm text-gray-400">No lab results on file.</p>
            : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 pr-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Test</th>
                      <th className="text-left py-2 pr-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Result</th>
                      <th className="text-left py-2 pr-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">Remarks</th>
                      <th className="text-left py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {data.labResults.map((lr) => (
                      <tr key={lr.id}>
                        <td className="py-2 pr-3 font-medium text-gray-800">{lr.testName}</td>
                        <td className="py-2 pr-3 text-gray-600">{lr.result ?? '—'}</td>
                        <td className="py-2 pr-3 text-gray-500 text-xs">{lr.remarks ?? '—'}</td>
                        <td className="py-2 text-gray-400 text-xs whitespace-nowrap">
                          {lr.testDate ? new Date(lr.testDate).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        )}

        {tab === 'visits' && (
          data.clinicVisits.length === 0
            ? <p className="text-sm text-gray-400">No clinic visits recorded.</p>
            : (
              <div className="space-y-3">
                {data.clinicVisits.map((v) => (
                  <div key={v.id} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-gray-400">
                          {new Date(v.visitDate ?? v.createdAt).toLocaleDateString('en-US', {
                            weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                          })}
                        </p>
                        <p className="text-sm text-gray-800 mt-0.5 font-medium">
                          {v.chiefComplaint ?? 'Walk-in'}
                        </p>
                      </div>
                      {v.disposition && (
                        <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-semibold shrink-0">
                          {v.disposition}
                        </span>
                      )}
                    </div>
                    {v.handler && (
                      <p className="text-xs text-gray-400 mt-1">
                        Attended by: {v.handler.firstName} {v.handler.lastName}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )
        )}
      </div>
    </div>
  );
}
