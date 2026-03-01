/**
 * STUDENT HEALTH HISTORY PAGE
 * ─────────────────────────────────────────────────────────────
 * Route: /dashboard/staff/record/[studentId]/history
 *
 * Shows all physical examinations and consultations for a
 * specific student, grouped by year with a timeline layout.
 *
 * TODO: Replace mock data with:
 *   GET /api/students/:id/history  → { exams: [...], consultations: [...] }
 */

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

// ── Types ─────────────────────────────────────────────────────
interface PhysicalExam {
  id:         string;
  date:       string;
  examinedBy: string;
  bp:         string;
  temp:       string;
  weight:     string;
  bmi:        string;
  year:       number;
}

interface Consultation {
  id:           string;
  date:         string;
  complaint:    string;
  diagnosis:    string;
  treatment:    string;
  attendedBy:   string;
  year:         number;
}

// ── Mock history data ─────────────────────────────────────────
const MOCK_EXAMS: Record<string, PhysicalExam[]> = {
  '2023-0001': [
    { id: 'ex3', date: '2024-08-05', examinedBy: 'Dr. Maria Santos', bp: '112/72', temp: '36.4', weight: '61kg', bmi: '22.8', year: 2024 },
    { id: 'ex2', date: '2023-08-10', examinedBy: 'Dr. Maria Santos', bp: '110/70', temp: '36.5', weight: '60kg', bmi: '22.5', year: 2023 },
    { id: 'ex1', date: '2022-08-15', examinedBy: 'Dr. Jose Reyes',   bp: '108/68', temp: '36.6', weight: '58kg', bmi: '21.7', year: 2022 },
  ],
  '2023-0002': [
    { id: 'ex2', date: '2024-01-15', examinedBy: 'Dr. Maria Santos', bp: '120/80', temp: '36.8', weight: '55kg', bmi: '21.0', year: 2024 },
    { id: 'ex1', date: '2023-08-20', examinedBy: 'Dr. Maria Santos', bp: '118/78', temp: '36.7', weight: '54kg', bmi: '20.6', year: 2023 },
  ],
  '2024-0010': [],
};

const MOCK_CONSULTATIONS: Record<string, Consultation[]> = {
  '2023-0001': [
    { id: 'c4', date: '2024-09-12', complaint: 'Headache and dizziness',  diagnosis: 'Tension headache',     treatment: 'Paracetamol 500mg, rest',         attendedBy: 'Dr. Maria Santos', year: 2024 },
    { id: 'c3', date: '2024-03-05', complaint: 'Asthma attack',           diagnosis: 'Asthma exacerbation',  treatment: 'Salbutamol nebulization',         attendedBy: 'Dr. Maria Santos', year: 2024 },
    { id: 'c2', date: '2023-11-20', complaint: 'Cough and colds',         diagnosis: 'Viral URI',            treatment: 'OTC antihistamine, hydration',     attendedBy: 'Dr. Jose Reyes',   year: 2023 },
    { id: 'c1', date: '2022-10-08', complaint: 'Abdominal pain',          diagnosis: 'Gastritis',            treatment: 'Omeprazole, bland diet',          attendedBy: 'Dr. Jose Reyes',   year: 2022 },
  ],
  '2023-0002': [
    { id: 'c2', date: '2024-06-10', complaint: 'Allergic reaction',       diagnosis: 'Drug allergy (Aspirin)', treatment: 'Antihistamine, avoid Aspirin',  attendedBy: 'Dr. Maria Santos', year: 2024 },
    { id: 'c1', date: '2023-09-14', complaint: 'Fever',                   diagnosis: 'Viral fever',          treatment: 'Paracetamol, rest, hydration',    attendedBy: 'Dr. Maria Santos', year: 2023 },
  ],
  '2024-0010': [],
};

// ── Helpers ───────────────────────────────────────────────────
function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Sub-components ────────────────────────────────────────────
function ExamCard({ exam }: { exam: PhysicalExam }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-teal-400 shrink-0" />
          <p className="text-xs font-semibold text-gray-700">{formatDate(exam.date)}</p>
        </div>
        <span className="text-[11px] text-gray-400">by {exam.examinedBy}</span>
      </div>
      <div className="grid grid-cols-4 gap-2">
        {[['BP', exam.bp], ['Temp', `${exam.temp}°C`], ['Weight', exam.weight], ['BMI', exam.bmi]].map(([label, val]) => (
          <div key={label} className="bg-gray-50 rounded-lg p-2 text-center">
            <p className="text-[10px] text-teal-500 font-medium mb-0.5">{label}</p>
            <p className="text-xs font-bold text-gray-800">{val}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConsultationCard({ c }: { c: Consultation }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 text-left"
      >
        <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-gray-700">{formatDate(c.date)}</p>
          <p className="text-xs text-gray-500 truncate">{c.complaint}</p>
        </div>
        <svg
          className={`w-4 h-4 text-gray-300 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="mt-3 pl-5 space-y-2 text-xs text-gray-600 border-l-2 border-blue-100">
          <p><span className="font-semibold text-gray-700">Diagnosis:</span> {c.diagnosis}</p>
          <p><span className="font-semibold text-gray-700">Treatment:</span> {c.treatment}</p>
          <p className="text-gray-400">Attended by {c.attendedBy}</p>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function StudentHistoryPage() {
  const params    = useParams();
  const router    = useRouter();
  const studentId = typeof params.studentId === 'string' ? params.studentId : '';
  const [tab, setTab] = useState<'all' | 'exams' | 'consultations'>('all');

  const exams         = MOCK_EXAMS[studentId]         ?? [];
  const consultations = MOCK_CONSULTATIONS[studentId] ?? [];

  // Collect all unique years across both
  const years = Array.from(
    new Set([...exams.map((e) => e.year), ...consultations.map((c) => c.year)])
  ).sort((a, b) => b - a); // newest first

  const showExams  = tab === 'all' || tab === 'exams';
  const showConsult = tab === 'all' || tab === 'consultations';

  return (
    <div className="p-4 sm:p-6 max-w-2xl mx-auto space-y-4">

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-teal-500 transition-colors shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Health History</h1>
          <p className="text-xs text-teal-500 font-semibold">{studentId}</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([['all','All'], ['exams','Physical Exams'], ['consultations','Consultations']] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              tab === key
                ? 'bg-white text-teal-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {years.length === 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
          <p className="text-gray-400 text-sm">No history on record for this student.</p>
        </div>
      )}

      {/* Timeline grouped by year */}
      {years.map((year) => {
        const yearExams   = showExams   ? exams.filter((e) => e.year === year)         : [];
        const yearConsult = showConsult ? consultations.filter((c) => c.year === year) : [];
        if (yearExams.length === 0 && yearConsult.length === 0) return null;

        return (
          <div key={year}>
            {/* Year badge */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-bold text-white bg-teal-500 px-3 py-1 rounded-full">
                {year}
              </span>
              <div className="flex-1 border-t border-gray-100" />
            </div>

            <div className="space-y-3">
              {/* Physical exam entries for this year */}
              {yearExams.map((exam) => (
                <div key={exam.id}>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-teal-400 mb-1.5 pl-1">
                    Physical Exam
                  </p>
                  <ExamCard exam={exam} />
                </div>
              ))}

              {/* Consultation entries for this year */}
              {yearConsult.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-400 mb-1.5 pl-1">
                    Consultations
                  </p>
                  <div className="space-y-2">
                    {yearConsult.map((c) => (
                      <ConsultationCard key={c.id} c={c} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      {years.length > 0 && (
        <div className="flex gap-4 text-[11px] text-gray-400 pt-1">
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-400" /> Physical Exam</span>
          <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-400" /> Consultation</span>
        </div>
      )}
    </div>
  );
}
