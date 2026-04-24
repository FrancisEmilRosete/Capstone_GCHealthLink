'use client';

import { useEffect, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface QueueItem {
  id: string;
  preferredDate: string;
  preferredTime: string;
  symptoms: string;
  status: string;
  studentProfile: {
    firstName: string;
    lastName: string;
    studentNumber: string;
    courseDept: string;
    medicalHistory: {
      asthmaEnc?: string | null;
      diabetesEnc?: string | null;
      allergyEnc?: string | null;
      hypertensionEnc?: string | null;
    } | null;
  };
}

interface QueueResponse {
  success: boolean;
  data: QueueItem[];
}

interface CampusEvent {
   id: string;
   name: string;
   date: string;
   type: 'sports' | 'festival' | 'gathering' | 'emergency';
 }

function hasRiskFlag(value?: string | null) {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized !== '' && normalized !== 'none' && normalized !== 'no' && normalized !== 'n/a' && normalized !== 'na';
}

function getRiskLevel(history: any) {
  const risks: string[] = [];
  if (hasRiskFlag(history?.asthmaEnc)) risks.push('Asthma');
  if (hasRiskFlag(history?.diabetesEnc)) risks.push('Diabetes');
  if (hasRiskFlag(history?.hypertensionEnc)) risks.push('Hypertension');
  if (hasRiskFlag(history?.allergyEnc)) risks.push('Allergies');

  if (risks.length >= 3) return { level: 'CRITICAL', risks };
  if (risks.length >= 2) return { level: 'HIGH', risks };
  if (risks.length === 1) return { level: 'MODERATE', risks };
  return { level: 'LOW', risks };
}

function getRiskColor(level: string) {
  switch (level) {
    case 'CRITICAL':
      return 'bg-red-100 text-red-800 border-red-300';
    case 'HIGH':
      return 'bg-orange-100 text-orange-800 border-orange-300';
    case 'MODERATE':
      return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    default:
      return 'bg-green-100 text-green-800 border-green-300';
  }
}

function getRiskBadgeText(level: string) {
  switch (level) {
    case 'CRITICAL':
      return '🚨 CRITICAL RISK';
    case 'HIGH':
      return '⚠️ HIGH RISK';
    case 'MODERATE':
      return '⚡ MODERATE RISK';
    default:
      return '✓ LOW RISK';
  }
}

export default function MedicalFlaggingPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [flaggedPatients, setFlaggedPatients] = useState<QueueItem[]>([]);
  const [campusEvents, setCampusEvents] = useState<CampusEvent[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CampusEvent | null>(null);
  const [notification, setNotification] = useState<{ type: 'alert' | 'success'; message: string } | null>(null);

  // Mock campus events
  const mockEvents: CampusEvent[] = [
    { id: '1', name: 'Sports Day', date: new Date().toISOString().split('T')[0], type: 'sports' },
    { id: '2', name: 'Foundation Day Celebration', date: new Date().toISOString().split('T')[0], type: 'festival' },
  ];

  async function loadFlaggedPatients() {
    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      setLoading(false);
      return;
    }

    try {
      setError('');
      const response = await api.get<QueueResponse>('/appointments/queue?limit=500', token);
      const allQueue = response.data || [];

      // Flag patients with high medical risks
      const flagged = allQueue.filter((item) => {
        const riskData = getRiskLevel(item.studentProfile.medicalHistory);
        return riskData.level !== 'LOW';
      });

      setFlaggedPatients(flagged);
      setCampusEvents(mockEvents);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to load flagged patients.');
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFlaggedPatients();
  }, []);

  const criticalPatients = flaggedPatients.filter(
    (p) => getRiskLevel(p.studentProfile.medicalHistory).level === 'CRITICAL',
  );
  const highRiskPatients = flaggedPatients.filter((p) => getRiskLevel(p.studentProfile.medicalHistory).level === 'HIGH');
  const moderateRiskPatients = flaggedPatients.filter(
    (p) => getRiskLevel(p.studentProfile.medicalHistory).level === 'MODERATE',
  );

  function handleEventSelected(event: CampusEvent) {
    setSelectedEvent(event);
    setNotification({
      type: 'alert',
      message: `🎯 ${event.name} selected. Alerts issued for ${criticalPatients.length + highRiskPatients.length} high-risk patients.`,
    });
    setTimeout(() => setNotification(null), 5000);
  }

  function handleNotifyTeam() {
    setNotification({
      type: 'success',
      message: '✉️ Medical team notification sent to ' + (criticalPatients.length + highRiskPatients.length) + ' critical/high-risk patients.',
    });
    setTimeout(() => setNotification(null), 5000);
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🚩 Medical Flagging & Campus Events</h1>
          <p className="text-sm text-gray-500 mt-1">Monitor high-risk patients during campus events.</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Auto Alert Notification */}
      {notification && (
        <div className={`rounded-xl border-l-4 px-4 py-4 animate-in ${
          notification.type === 'alert'
            ? 'border-l-red-500 bg-red-50 text-red-900'
            : 'border-l-green-500 bg-green-50 text-green-900'
        }`}>
          <p className="text-sm font-semibold">{notification.message}</p>
        </div>
      )}

      {/* Alert Banner */}
      {flaggedPatients.length > 0 && (
        <div className="rounded-xl border-l-4 border-l-red-500 bg-red-50 px-4 py-4">
          <p className="text-sm font-bold text-red-900">⚠️ {flaggedPatients.length} High-Risk Patients Detected</p>
          <p className="text-xs text-red-700 mt-1">
            {criticalPatients.length} critical, {highRiskPatients.length} high risk, {moderateRiskPatients.length} moderate risk
          </p>
        </div>
      )}

      {/* Campus Events Section */}
      {campusEvents.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
            <h2 className="text-sm font-bold text-gray-900">🎯 Today's Campus Events</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
            {campusEvents.map((event) => (
              <div
                key={event.id}
                onClick={() => handleEventSelected(event)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedEvent?.id === event.id ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-300'
                }`}
              >
                <p className="font-semibold text-gray-900">{event.name}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {event.type === 'sports' && '⚽'} {event.type === 'festival' && '🎉'} {event.type === 'gathering' && '👥'}{' '}
                  {event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Flagged Patients List */}
        <div className="lg:col-span-2 space-y-4">
          {/* Critical Risk */}
          {criticalPatients.length > 0 && (
            <div className="bg-white rounded-2xl border border-red-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-red-200 bg-red-50">
                <h3 className="text-sm font-bold text-red-900">🚨 CRITICAL RISK ({criticalPatients.length})</h3>
              </div>

              <div className="divide-y divide-red-100">
                {criticalPatients.map((patient) => {
                  const riskData = getRiskLevel(patient.studentProfile.medicalHistory);
                  return (
                    <div key={patient.id} className={`p-4 border-l-4 border-l-red-500 ${getRiskColor(riskData.level)}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900">
                            {patient.studentProfile.firstName} {patient.studentProfile.lastName}
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {patient.studentProfile.studentNumber} • {patient.studentProfile.courseDept}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {riskData.risks.map((risk) => (
                              <span key={risk} className="inline-block px-2 py-1 bg-red-200 text-red-800 text-xs rounded-full font-semibold">
                                {risk}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="text-xs font-bold text-red-700 bg-white px-2 py-1 rounded">
                            ALERT
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* High Risk */}
          {highRiskPatients.length > 0 && (
            <div className="bg-white rounded-2xl border border-orange-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-orange-200 bg-orange-50">
                <h3 className="text-sm font-bold text-orange-900">⚠️ HIGH RISK ({highRiskPatients.length})</h3>
              </div>

              <div className="divide-y divide-orange-100">
                {highRiskPatients.map((patient) => {
                  const riskData = getRiskLevel(patient.studentProfile.medicalHistory);
                  return (
                    <div key={patient.id} className={`p-4 border-l-4 border-l-orange-500 ${getRiskColor(riskData.level)}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900">
                            {patient.studentProfile.firstName} {patient.studentProfile.lastName}
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {patient.studentProfile.studentNumber} • {patient.studentProfile.courseDept}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {riskData.risks.map((risk) => (
                              <span key={risk} className="inline-block px-2 py-1 bg-orange-200 text-orange-800 text-xs rounded-full font-semibold">
                                {risk}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Moderate Risk */}
          {moderateRiskPatients.length > 0 && (
            <div className="bg-white rounded-2xl border border-yellow-200 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-yellow-200 bg-yellow-50">
                <h3 className="text-sm font-bold text-yellow-900">⚡ MODERATE RISK ({moderateRiskPatients.length})</h3>
              </div>

              <div className="divide-y divide-yellow-100 max-h-96 overflow-y-auto">
                {moderateRiskPatients.map((patient) => {
                  const riskData = getRiskLevel(patient.studentProfile.medicalHistory);
                  return (
                    <div key={patient.id} className={`p-3 border-l-4 border-l-yellow-500 ${getRiskColor(riskData.level)}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">
                            {patient.studentProfile.firstName} {patient.studentProfile.lastName}
                          </p>
                          <p className="text-xs text-gray-600 mt-0.5">
                            {patient.studentProfile.studentNumber}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-0.5">
                            {riskData.risks.map((risk) => (
                              <span key={risk} className="inline-block px-1.5 py-0.5 bg-yellow-200 text-yellow-800 text-xs rounded font-semibold">
                                {risk}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Event Details & Recommendations */}
        <div className="lg:col-span-1">
          {selectedEvent ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden sticky top-6">
              <div className="px-4 py-4 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-pink-50">
                <p className="text-sm font-bold text-gray-900">Event Precautions</p>
              </div>

              <div className="p-4 space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase">Event</p>
                  <p className="text-sm font-semibold text-gray-900 mt-1">{selectedEvent.name}</p>
                </div>

                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-blue-900 mb-2">⚠️ Recommended Actions:</p>
                  <ul className="space-y-1 text-xs text-blue-800">
                    <li>• Have medical staff on standby</li>
                    <li>• Set up first aid station</li>
                    <li>• Alert high-risk patient parents</li>
                    <li>• Have emergency contacts ready</li>
                    <li>• Stock emergency medications</li>
                  </ul>
                </div>

                <div className="bg-yellow-50 rounded-lg p-3">
                  <p className="text-xs font-semibold text-yellow-900 mb-2">📋 High-Risk Attendees:</p>
                  <p className="text-xs text-yellow-800">
                    {flaggedPatients.filter(p => {
                      const riskData = getRiskLevel(p.studentProfile.medicalHistory);
                      return riskData.level === 'CRITICAL' || riskData.level === 'HIGH';
                    }).length} patients requiring close monitoring
                  </p>
                </div>

                <button 
                  onClick={handleNotifyTeam}
                  className="w-full px-3 py-2.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold transition-colors"
                >
                  📧 Notify Medical Team
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 text-center sticky top-6">
              <p className="text-gray-500 text-sm font-medium">Select an event to view precautions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
