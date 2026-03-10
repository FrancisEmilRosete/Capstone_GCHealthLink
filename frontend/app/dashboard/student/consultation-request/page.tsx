'use client';

import { useState } from 'react';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';

interface AppointmentResponse {
  success: boolean;
  message: string;
  data: {
    id: string;
    preferredDate: string;
    preferredTime: string;
    symptoms: string;
    status: string;
    createdAt: string;
  };
}

function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

export default function ConsultationRequestPage() {
  const [serviceType, setServiceType] = useState<'Consultation' | 'Dental Check-up'>('Consultation');
  const [preferredDate, setPreferredDate] = useState(todayDateString());
  const [preferredTime, setPreferredTime] = useState('09:00 AM');
  const [symptoms, setSymptoms] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function submitRequest(e: React.FormEvent) {
    e.preventDefault();

    const token = getToken();
    if (!token) {
      setError('You are not logged in. Please sign in again.');
      return;
    }

    if (!symptoms.trim()) {
      setError('Please provide your symptoms or reason for visit.');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const payload = {
        preferredDate,
        preferredTime,
        symptoms: `[${serviceType}] ${symptoms.trim()}`,
      };

      const response = await api.post<AppointmentResponse>('/appointments/book', payload, token);

      setSuccess(
        `${response.message} Schedule: ${new Date(response.data.preferredDate).toLocaleDateString('en-US')} at ${response.data.preferredTime}.`,
      );
      setSymptoms('');
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to submit consultation request.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-5 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Consultation Request</h1>
        <p className="text-sm text-gray-500 mt-1">
          Book a clinic consultation or dental check-up to avoid queue congestion.
        </p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          {success}
        </div>
      )}

      <form onSubmit={submitRequest} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Service Type</label>
          <select
            value={serviceType}
            onChange={(event) => setServiceType(event.target.value as 'Consultation' | 'Dental Check-up')}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-teal-300"
          >
            <option value="Consultation">Consultation</option>
            <option value="Dental Check-up">Dental Check-up</option>
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Preferred Date</label>
            <input
              type="date"
              min={todayDateString()}
              value={preferredDate}
              onChange={(event) => setPreferredDate(event.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Preferred Time</label>
            <input
              type="text"
              placeholder="e.g. 09:00 AM"
              value={preferredTime}
              onChange={(event) => setPreferredTime(event.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Symptoms / Reason</label>
          <textarea
            rows={4}
            value={symptoms}
            onChange={(event) => setSymptoms(event.target.value)}
            placeholder="Describe your symptoms or the concern you want checked."
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-300"
          />
        </div>

        <div className="pt-1">
          <button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-600 text-white text-sm font-semibold disabled:opacity-70"
          >
            {submitting ? 'Submitting...' : 'Submit Request'}
          </button>
        </div>
      </form>
    </div>
  );
}
