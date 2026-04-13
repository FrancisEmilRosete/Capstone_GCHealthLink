'use client';

import { useMemo, useState } from 'react';

export interface MedicalTrackingEvent {
  id: string;
  dateIso: string;
  title: string;
  description: string;
  type: 'intervention' | 'treatment' | 'follow-up';
  status?: 'completed' | 'scheduled' | 'pending';
  actor?: string;
}

interface MedicalTrackingTimelineProps {
  events: MedicalTrackingEvent[];
  title?: string;
  subtitle?: string;
  className?: string;
}

function typeLabel(type: MedicalTrackingEvent['type']) {
  if (type === 'follow-up') return 'Follow-up';
  if (type === 'intervention') return 'Intervention';
  return 'Treatment';
}

function typeColor(type: MedicalTrackingEvent['type']) {
  if (type === 'follow-up') return 'bg-indigo-100 text-indigo-700 border-indigo-200';
  if (type === 'intervention') return 'bg-teal-100 text-teal-700 border-teal-200';
  return 'bg-amber-100 text-amber-700 border-amber-200';
}

function statusColor(status?: MedicalTrackingEvent['status']) {
  if (status === 'completed') return 'bg-green-100 text-green-700';
  if (status === 'scheduled') return 'bg-blue-100 text-blue-700';
  if (status === 'pending') return 'bg-yellow-100 text-yellow-700';
  return 'bg-slate-100 text-slate-600';
}

function formatDate(dateIso: string) {
  return new Date(dateIso).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function MedicalTrackingTimeline({
  events,
  title = 'Medical Tracking Timeline',
  subtitle = 'Interventions, treatments, and follow-up schedule',
  className,
}: MedicalTrackingTimelineProps) {
  const [filter, setFilter] = useState<'all' | MedicalTrackingEvent['type']>('all');

  const timelineRows = useMemo(() => {
    const sorted = [...events].sort((a, b) => new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime());
    if (filter === 'all') return sorted;
    return sorted.filter((event) => event.type === filter);
  }, [events, filter]);

  return (
    <section className={`rounded-2xl border border-gray-100 bg-white p-5 shadow-sm ${className ?? ''}`.trim()}>
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <p className="mt-1 text-xs text-gray-500">{subtitle}</p>
        </div>

        <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
          {(['all', 'intervention', 'treatment', 'follow-up'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`rounded-lg px-2.5 py-1 text-xs font-medium capitalize transition ${
                filter === key
                  ? 'bg-teal-600 text-white'
                  : 'text-gray-600 hover:bg-white hover:text-teal-700'
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </header>

      {timelineRows.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center text-sm text-gray-400">
          No tracking records available for this filter.
        </div>
      ) : (
        <ol className="relative ml-2 border-l border-gray-200 pl-5">
          {timelineRows.map((event) => (
            <li key={event.id} className="mb-5 last:mb-0">
              <span className="absolute -left-[7px] mt-1.5 h-3.5 w-3.5 rounded-full border-2 border-white bg-teal-500" />
              <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold ${typeColor(event.type)}`}>
                    {typeLabel(event.type)}
                  </span>
                  <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusColor(event.status)}`}>
                    {event.status || 'logged'}
                  </span>
                  <span className="ml-auto text-[11px] text-gray-500">{formatDate(event.dateIso)}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-gray-800">{event.title}</p>
                <p className="mt-1 text-sm text-gray-600">{event.description}</p>
                {event.actor && <p className="mt-1.5 text-xs text-gray-500">Handled by: {event.actor}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
