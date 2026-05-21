'use client';

/**
 * REPORTS MODULE — Shared component used by Doctor, Nurse (Staff), and Dental dashboards.
 */

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { FileDown, Printer, BarChart2, Loader2, RefreshCw } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

export type ReportStaffRole = 'DOCTOR' | 'NURSE' | 'DENTIST';

interface ReportMeta {
  type: string;
  range: string;
  date: string;
  periods: string[];
}

interface MedConsultRow    { complaint: string; male: number; female: number; total: number; }
interface PhysExamRow      { period: string; male: number; female: number; totalCertified: number; }
interface DentalConsultRow { period: string; category: 'Students' | 'Employees'; service: string; male: number; female: number; total: number; }
interface DentalConsultData { students: DentalConsultRow[]; employees: DentalConsultRow[]; }
interface DentalExamCondition { condition: string; male: number; female: number; total: number; }
interface DentalExamRow    { period: string; conditions: DentalExamCondition[]; }

type ReportData =
  | MedConsultRow[]
  | PhysExamRow[]
  | DentalConsultData
  | DentalExamRow[];

interface ReportResponse {
  success: boolean;
  meta: ReportMeta;
  data: ReportData;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_REPORT_TYPES = [
  { value: 'medical_consultation', label: 'Medical Consultation', roles: ['DOCTOR', 'NURSE'] },
  { value: 'physical_examination', label: 'Physical Examination', roles: ['DOCTOR', 'NURSE'] },
  { value: 'dental_consultation',  label: 'Dental Consultation',  roles: ['NURSE', 'DENTIST'] },
  { value: 'dental_examination',   label: 'Dental Examination',   roles: ['NURSE', 'DENTIST'] },
] as const;

const TYPE_LABELS: Record<string, string> = {
  medical_consultation: 'Medical Consultation',
  physical_examination: 'Physical Examination',
  dental_consultation:  'Dental Consultation',
  dental_examination:   'Dental Examination',
};

const RANGE_OPTIONS = [
  { value: 'daily',         label: 'Daily'         },
  { value: 'weekly',        label: 'Weekly'        },
  { value: 'monthly',       label: 'Monthly'       },
  { value: 'quarterly',     label: 'Quarterly'     },
  { value: 'semi-annually', label: 'Semi-Annually' },
  { value: 'yearly',        label: 'Yearly'        },
] as const;

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function escCsv(v: string | number): string {
  return `"${String(v).replace(/"/g, '""')}"`;
}

function buildCsv(type: string, data: ReportData): string {
  const lines: string[] = [];

  if (type === 'medical_consultation') {
    const rows = data as MedConsultRow[];
    lines.push(['COMPLAINTS', 'SEX (M)', 'SEX (F)', 'TOTAL #'].map(escCsv).join(','));
    rows.forEach((r) => lines.push([r.complaint, r.male, r.female, r.total].map(escCsv).join(',')));
    const totM = rows.reduce((a, r) => a + r.male, 0);
    const totF = rows.reduce((a, r) => a + r.female, 0);
    lines.push(['TOTAL', totM, totF, totM + totF].map(escCsv).join(','));
  } else if (type === 'physical_examination') {
    const rows = data as PhysExamRow[];
    lines.push(['MONTH / PERIOD', 'SEX (MALE)', 'SEX (FEMALE)', 'TOTAL CERTIFIED'].map(escCsv).join(','));
    rows.forEach((r) => lines.push([r.period, r.male, r.female, r.totalCertified].map(escCsv).join(',')));
    const totM = rows.reduce((a, r) => a + r.male, 0);
    const totF = rows.reduce((a, r) => a + r.female, 0);
    lines.push(['TOTAL', totM, totF, totM + totF].map(escCsv).join(','));
  } else if (type === 'dental_consultation') {
    const { students, employees } = data as DentalConsultData;
    lines.push('TABLE 1. EMPLOYEES');
    lines.push(['MONTH / PERIOD', 'SERVICE', 'SEX (M)', 'SEX (F)', 'TOTAL'].map(escCsv).join(','));
    employees.forEach((r) => lines.push([r.period, r.service, r.male, r.female, r.total].map(escCsv).join(',')));
    lines.push('');
    lines.push('TABLE 2. STUDENTS');
    lines.push(['MONTH / PERIOD', 'SERVICE', 'SEX (M)', 'SEX (F)', 'TOTAL'].map(escCsv).join(','));
    students.forEach((r) => lines.push([r.period, r.service, r.male, r.female, r.total].map(escCsv).join(',')));
    const totM = students.reduce((a, r) => a + r.male, 0);
    const totF = students.reduce((a, r) => a + r.female, 0);
    lines.push(['TOTAL', '', totM, totF, totM + totF].map(escCsv).join(','));
  } else if (type === 'dental_examination') {
    const rows = data as DentalExamRow[];
    lines.push(['MONTH / PERIOD', 'DIAGNOSED DENTAL PROBLEM', 'SEX (M)', 'SEX (F)', 'TOTAL'].map(escCsv).join(','));
    rows.forEach((r) =>
      r.conditions.forEach((c) =>
        lines.push([r.period, c.condition, c.male, c.female, c.total].map(escCsv).join(','))
      )
    );
  }

  return lines.join('\n');
}

function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Primitive table components ───────────────────────────────────────────────

function TableWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[hsl(var(--border))]">
      <table className="w-full text-sm text-left border-collapse">{children}</table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-[hsl(var(--muted-foreground))] bg-[hsl(var(--surface))] border-b border-[hsl(var(--border))] whitespace-nowrap">
      {children}
    </th>
  );
}

function Td({ children, bold }: { children: React.ReactNode; bold?: boolean }) {
  return (
    <td className={`px-4 py-2.5 border-b border-[hsl(var(--border))] text-[hsl(var(--foreground))] ${bold ? 'font-semibold' : ''}`}>
      {children}
    </td>
  );
}

function TotalRow({ cells }: { cells: (string | number)[] }) {
  return (
    <tr className="bg-[hsl(var(--primary-soft))]">
      {cells.map((c, i) => (
        <td key={i} className="px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary))] uppercase">{c}</td>
      ))}
    </tr>
  );
}

// ─── Table renderers ──────────────────────────────────────────────────────────

function MedicalConsultationTable({ rows }: { rows: MedConsultRow[] }) {
  const totM = rows.reduce((a, r) => a + r.male, 0);
  const totF = rows.reduce((a, r) => a + r.female, 0);
  return (
    <TableWrapper>
      <thead><tr><Th>Complaints</Th><Th>Sex (M)</Th><Th>Sex (F)</Th><Th>Total #</Th></tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="hover:bg-[hsl(var(--surface))] transition-colors">
            <Td>{r.complaint}</Td><Td>{r.male}</Td><Td>{r.female}</Td><Td bold>{r.total}</Td>
          </tr>
        ))}
        <TotalRow cells={['TOTAL', totM, totF, totM + totF]} />
      </tbody>
    </TableWrapper>
  );
}

function PhysicalExaminationTable({ rows }: { rows: PhysExamRow[] }) {
  const totM = rows.reduce((a, r) => a + r.male, 0);
  const totF = rows.reduce((a, r) => a + r.female, 0);
  return (
    <TableWrapper>
      <thead><tr><Th>Month / Period</Th><Th>Sex (Male)</Th><Th>Sex (Female)</Th><Th>Total Certified</Th></tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="hover:bg-[hsl(var(--surface))] transition-colors">
            <Td>{r.period}</Td><Td>{r.male}</Td><Td>{r.female}</Td><Td bold>{r.totalCertified}</Td>
          </tr>
        ))}
        <TotalRow cells={['TOTAL', totM, totF, totM + totF]} />
      </tbody>
    </TableWrapper>
  );
}

function DentalConsultationTables({ data }: { data: DentalConsultData }) {
  const renderTable = (rows: DentalConsultRow[], title: string) => {
    const totM = rows.reduce((a, r) => a + r.male, 0);
    const totF = rows.reduce((a, r) => a + r.female, 0);
    return (
      <div key={title}>
        <h3 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-widest mb-2">{title}</h3>
        <TableWrapper>
          <thead><tr><Th>Month / Period</Th><Th>Service</Th><Th>Sex (M)</Th><Th>Sex (F)</Th><Th>Total</Th></tr></thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-[hsl(var(--surface))] transition-colors">
                <Td>{r.period}</Td><Td>{r.service}</Td><Td>{r.male}</Td><Td>{r.female}</Td><Td bold>{r.total}</Td>
              </tr>
            ))}
            <TotalRow cells={['TOTAL', '', totM, totF, totM + totF]} />
          </tbody>
        </TableWrapper>
      </div>
    );
  };
  return (
    <div className="flex flex-col gap-6">
      {renderTable(data.employees, 'Table 1. Employees')}
      {renderTable(data.students,  'Table 2. Students')}
    </div>
  );
}

function DentalExaminationTable({ rows }: { rows: DentalExamRow[] }) {
  return (
    <div className="flex flex-col gap-4">
      {rows.map((r, pi) => {
        if (r.conditions.length === 0) return null;
        const totM = r.conditions.reduce((a, c) => a + c.male, 0);
        const totF = r.conditions.reduce((a, c) => a + c.female, 0);
        return (
          <div key={pi}>
            <p className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase mb-1">{r.period}</p>
            <TableWrapper>
              <thead><tr><Th>Diagnosed Dental Problem</Th><Th>Sex (M)</Th><Th>Sex (F)</Th><Th>Total</Th></tr></thead>
              <tbody>
                {r.conditions.map((c, ci) => (
                  <tr key={ci} className="hover:bg-[hsl(var(--surface))] transition-colors">
                    <Td>{c.condition}</Td><Td>{c.male}</Td><Td>{c.female}</Td><Td bold>{c.total}</Td>
                  </tr>
                ))}
                <TotalRow cells={['TOTAL', totM, totF, totM + totF]} />
              </tbody>
            </TableWrapper>
          </div>
        );
      })}
    </div>
  );
}

function renderSingleTable(meta: ReportMeta, data: ReportData) {
  if (meta.type === 'medical_consultation') return <MedicalConsultationTable rows={data as MedConsultRow[]} />;
  if (meta.type === 'physical_examination') return <PhysicalExaminationTable rows={data as PhysExamRow[]} />;
  if (meta.type === 'dental_consultation')  return <DentalConsultationTables data={data as DentalConsultData} />;
  if (meta.type === 'dental_examination')   return <DentalExaminationTable   rows={data as DentalExamRow[]} />;
  return null;
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ReportsModuleProps {
  /** The staff sub-type that drives which report types are shown. */
  staffRole: ReportStaffRole;
}

export default function ReportsModule({ staffRole }: ReportsModuleProps) {
  const availableTypes = ALL_REPORT_TYPES.filter((t) =>
    (t.roles as readonly string[]).includes(staffRole)
  );

  // 'all' is a virtual client-side value — not sent to the backend directly.
  const [reportType, setReportType] = useState<string>('all');
  const [range,      setRange]      = useState<string>('yearly');
  const [dateInput,  setDateInput]  = useState(new Date().toISOString().slice(0, 10));
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState('');
  // Always an array so 'all' mode and single-type mode share the same state.
  const [results,    setResults]    = useState<ReportResponse[]>([]);

  // ─ Fetch ──────────────────────────────────────────────────
  async function handleGenerate() {
    const token = getToken();
    if (!token) { setError('Not authenticated.'); return; }

    setLoading(true);
    setError('');
    setResults([]);

    const typesToFetch = reportType === 'all'
      ? availableTypes.map((t) => t.value as string)
      : [reportType];

    try {
      const fetched = await Promise.all(
        typesToFetch.map((type) => {
          const params = new URLSearchParams({ type, range, date: dateInput });
          return api.get<ReportResponse>(`/reports/generate?${params}`, token);
        })
      );
      setResults(fetched);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Failed to generate report.');
    } finally {
      setLoading(false);
    }
  }

  // ─ Export CSV ─────────────────────────────────────────────
  function handleExportCsv() {
    if (results.length === 0) return;
    const sections = results.map((r) => {
      const heading = `=== ${TYPE_LABELS[r.meta.type] ?? r.meta.type} ===\n`;
      return heading + buildCsv(r.meta.type, r.data);
    });
    const tag = reportType === 'all' ? 'all-reports' : reportType;
    downloadCsv(sections.join('\n\n'), `gc-healthlink-${tag}-${dateInput}.csv`);
  }

  // ─ Print ──────────────────────────────────────────────────
  function handlePrint() { window.print(); }

  const hasData = results.length > 0;

  return (
    <>
      {/*
        Print isolation using visibility (not display:none) so that:
        • All page chrome (sidebar, topbar, controls) disappears.
        • #print-report-area and all its descendants remain visible.
        • Multi-section "All Reports" content spans multiple pages naturally.
        • position:absolute lets content reflow across pages (unlike fixed).
      */}
      <style>{`
        @media print {
          * { visibility: hidden !important; }
          #print-report-area {
            visibility: visible !important;
            position: absolute;
            top: 0; left: 0; width: 100%;
            background: #fff;
            padding: 20px 28px;
            font-family: sans-serif;
            font-size: 12px;
            color: #111;
          }
          #print-report-area * { visibility: visible !important; }
          #print-report-area .print-hide { visibility: hidden !important; }
          #print-report-area table { width: 100%; border-collapse: collapse; margin-top: 6px; }
          #print-report-area th,
          #print-report-area td { border: 1px solid #bbb; padding: 4px 8px; text-align: left; font-size: 11px; }
          #print-report-area th { background: #efefef; font-weight: 700; text-transform: uppercase; }
          .print-school-header { display: block !important; text-align: center; margin-bottom: 14px; border-bottom: 1px solid #ccc; padding-bottom: 10px; }
          .print-school-header h1 { font-size: 14px; font-weight: 700; margin: 0 0 2px; }
          .print-school-header p  { font-size: 10px; color: #555; margin: 0; }
          @page { margin: 15mm; size: A4 portrait; }
        }
      `}</style>

      <div className="flex flex-col gap-6">

        {/* ── Controls ────────────────────────────────────────── */}
        <div className="print-hide bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-[var(--radius-lg)] p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-[hsl(var(--primary))]" />
            <h2 className="text-base font-semibold text-[hsl(var(--foreground))]">Generate Report</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">

            {/* Report Type */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Report Type</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="h-9 px-3 rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              >
                <option value="all">All Reports</option>
                {availableTypes.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Date Range</label>
              <select
                value={range}
                onChange={(e) => setRange(e.target.value)}
                className="h-9 px-3 rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              >
                {RANGE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            {/* Reference Date */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-[hsl(var(--muted-foreground))]">Reference Date</label>
              <input
                type="date"
                value={dateInput}
                onChange={(e) => setDateInput(e.target.value)}
                className="h-9 px-3 rounded-[var(--radius-md)] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] text-sm text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))]"
              />
            </div>

            {/* Generate */}
            <div className="flex flex-col justify-end">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="h-9 px-4 flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[hsl(var(--primary))] text-white text-sm font-medium hover:opacity-90 disabled:opacity-60 transition-opacity"
              >
                {loading
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Generating…</>
                  : <><RefreshCw className="w-4 h-4" /> Generate</>}
              </button>
            </div>
          </div>
        </div>

        {/* ── Error ───────────────────────────────────────────── */}
        {error && (
          <div className="print-hide px-4 py-3 rounded-[var(--radius-md)] bg-[hsl(var(--danger-soft))] border border-[hsl(var(--danger))] text-sm text-[hsl(var(--danger))]">
            {error}
          </div>
        )}

        {/* ── Results ─────────────────────────────────────────── */}
        {hasData && (
          <div id="print-report-area" className="flex flex-col gap-8">

            {/* School header — hidden on screen, visible only when printing */}
            <div className="print-school-header hidden">
              <h1>Gordon College — Health Services Unit</h1>
              <p>
                Clinic Report · 
                {RANGE_OPTIONS.find((r) => r.value === range)?.label ?? range}
                 · Reference: 
                {new Date(dateInput).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                 · Printed: 
                {new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
            </div>

            {/* Action buttons — hidden during print */}
            <div className="print-hide flex items-center justify-between gap-3 flex-wrap">
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                Range: <span className="font-medium capitalize">{range}</span>
                 · 
                Generated: {new Date().toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCsv}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] border border-[hsl(var(--border))] text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface))] transition-colors"
                >
                  <FileDown className="w-4 h-4" /> Export CSV
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-[var(--radius-md)] border border-[hsl(var(--border))] text-sm font-medium text-[hsl(var(--foreground))] hover:bg-[hsl(var(--surface))] transition-colors"
                >
                  <Printer className="w-4 h-4" /> Print
                </button>
              </div>
            </div>

            {/* One section per fetched report type */}
            {results.map((res, idx) => (
              <div key={idx} className={`flex flex-col gap-3 ${idx > 0 ? 'border-t border-[hsl(var(--border))] pt-6' : ''}`}>
                <div>
                  <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">
                    {TYPE_LABELS[res.meta.type] ?? res.meta.type}
                  </h3>
                  <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                    Reference date: <span className="font-medium">{res.meta.date}</span>
                     · 
                    {RANGE_OPTIONS.find((r) => r.value === res.meta.range)?.label ?? res.meta.range}
                  </p>
                </div>
                {renderSingleTable(res.meta, res.data)}
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ─────────────────────────────────────── */}
        {!hasData && !loading && !error && (
          <div className="print-hide flex flex-col items-center justify-center py-16 text-center text-[hsl(var(--muted-foreground))]">
            <BarChart2 className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm font-medium">No report generated yet.</p>
            <p className="text-xs mt-1 opacity-70">Select a type and range, then click Generate.</p>
          </div>
        )}

      </div>
    </>
  );
}
