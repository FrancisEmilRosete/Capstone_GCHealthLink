'use client';

/**
 * REPORTS MODULE — Shared component used by Doctor, Nurse (Staff), and Dental dashboards.
 */

import { useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { FileDown, Printer, BarChart2, Loader2, RefreshCw, Lightbulb } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';

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

type ReportData = any;

interface ReportResponse {
  success: boolean;
  meta: ReportMeta;
  data: ReportData;
}

interface InventorySummary {
  expired: number;
  expiringSoon: number;
  nearReorder: number;
  outOfStock?: number;
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

function buildCsv(type: string, data: any): string {
  const lines: string[] = [];
  if (!data) return '';

  const table1 = Array.isArray(data.table1) ? data.table1 : [];
  const table2 = Array.isArray(data.table2) ? data.table2 : [];

  if (type === 'medical_consultation') {
    lines.push('TABLE 1. TEMPORAL DISTRIBUTION');
    lines.push(['MONTH / PERIOD', 'SEX (M)', 'SEX (F)', 'TOTAL #'].map(escCsv).join(','));
    table1.forEach((r: any) => lines.push([r.period, r.male, r.female, r.total].map(escCsv).join(',')));
    const totM1 = table1.reduce((a: number, r: any) => a + (r.male || 0), 0);
    const totF1 = table1.reduce((a: number, r: any) => a + (r.female || 0), 0);
    lines.push(['TOTAL', totM1, totF1, totM1 + totF1].map(escCsv).join(','));
    lines.push('');

    lines.push('TABLE 2. COMPLAINTS SUMMARY');
    lines.push(['COMPLAINTS', 'SEX (M)', 'SEX (F)', 'TOTAL #'].map(escCsv).join(','));
    table2.forEach((r: any) => lines.push([r.complaint || r.reason || '', r.male, r.female, r.total].map(escCsv).join(',')));
    const totM2 = table2.reduce((a: number, r: any) => a + (r.male || 0), 0);
    const totF2 = table2.reduce((a: number, r: any) => a + (r.female || 0), 0);
    lines.push(['TOTAL', totM2, totF2, totM2 + totF2].map(escCsv).join(','));
  } else if (type === 'physical_examination') {
    lines.push('TABLE 1. TEMPORAL DISTRIBUTION');
    lines.push(['MONTH / PERIOD', 'SEX (MALE)', 'SEX (FEMALE)', 'TOTAL CERTIFIED'].map(escCsv).join(','));
    table1.forEach((r: any) => lines.push([r.period, r.male, r.female, r.total].map(escCsv).join(',')));
    const totM1 = table1.reduce((a: number, r: any) => a + (r.male || 0), 0);
    const totF1 = table1.reduce((a: number, r: any) => a + (r.female || 0), 0);
    lines.push(['TOTAL', totM1, totF1, totM1 + totF1].map(escCsv).join(','));
    lines.push('');

    lines.push('TABLE 2. FINDINGS / REASONS SUMMARY');
    lines.push(['FINDINGS / REASON', 'SEX (M)', 'SEX (F)', 'TOTAL'].map(escCsv).join(','));
    table2.forEach((r: any) => lines.push([r.reason || r.finding || '', r.male, r.female, r.total].map(escCsv).join(',')));
    const totM2 = table2.reduce((a: number, r: any) => a + (r.male || 0), 0);
    const totF2 = table2.reduce((a: number, r: any) => a + (r.female || 0), 0);
    lines.push(['TOTAL', totM2, totF2, totM2 + totF2].map(escCsv).join(','));
  } else if (type === 'dental_consultation') {
    lines.push('TABLE 1. DENTAL CONSULTATION TEMPORAL DISTRIBUTION (STUDENTS)');
    lines.push(['MONTH / PERIOD', 'SERVICE', 'SEX (M)', 'SEX (F)', 'TOTAL'].map(escCsv).join(','));
    table1.forEach((r: any) => lines.push([r.period, r.service || 'Dental Consultation/Exam', r.male, r.female, r.total].map(escCsv).join(',')));
    const totM1 = table1.reduce((a: number, r: any) => a + (r.male || 0), 0);
    const totF1 = table1.reduce((a: number, r: any) => a + (r.female || 0), 0);
    lines.push(['TOTAL', '', totM1, totF1, totM1 + totF1].map(escCsv).join(','));
    lines.push('');

    lines.push('TABLE 2. DENTAL CONCERNS SUMMARY');
    lines.push(['DENTAL CONCERN', 'SEX (M)', 'SEX (F)', 'TOTAL'].map(escCsv).join(','));
    table2.forEach((r: any) => lines.push([r.reason || r.condition || '', r.male, r.female, r.total].map(escCsv).join(',')));
    const totM2 = table2.reduce((a: number, r: any) => a + (r.male || 0), 0);
    const totF2 = table2.reduce((a: number, r: any) => a + (r.female || 0), 0);
    lines.push(['TOTAL', totM2, totF2, totM2 + totF2].map(escCsv).join(','));
  } else if (type === 'dental_examination') {
    lines.push('TABLE 1. DENTAL EXAMINATION TEMPORAL DISTRIBUTION');
    lines.push(['MONTH / PERIOD', 'SEX (M)', 'SEX (F)', 'TOTAL'].map(escCsv).join(','));
    table1.forEach((r: any) => lines.push([r.period, r.male, r.female, r.total].map(escCsv).join(',')));
    const totM1 = table1.reduce((a: number, r: any) => a + (r.male || 0), 0);
    const totF1 = table1.reduce((a: number, r: any) => a + (r.female || 0), 0);
    lines.push(['TOTAL', totM1, totF1, totM1 + totF1].map(escCsv).join(','));
    lines.push('');

    lines.push('TABLE 2. DIAGNOSED DENTAL PROBLEMS');
    lines.push(['DENTAL PROBLEM', 'SEX (M)', 'SEX (F)', 'TOTAL'].map(escCsv).join(','));
    table2.forEach((r: any) => lines.push([r.condition || r.reason || '', r.male, r.female, r.total].map(escCsv).join(',')));
    const totM2 = table2.reduce((a: number, r: any) => a + (r.male || 0), 0);
    const totF2 = table2.reduce((a: number, r: any) => a + (r.female || 0), 0);
    lines.push(['TOTAL', totM2, totF2, totM2 + totF2].map(escCsv).join(','));
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

// ─── Interpretation Component & Generator ─────────────────────────────────────

function TableInterpretation({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="print-interpretation mt-3 p-3.5 bg-[hsl(var(--primary-soft))] border border-[hsl(var(--primary))/0.15] rounded-[var(--radius-md)] flex gap-2.5 items-start">
      <Lightbulb className="w-4 h-4 text-[hsl(var(--primary))] shrink-0 mt-0.5" />
      <div className="text-xs text-[hsl(var(--foreground))] leading-relaxed text-left">
        <span className="font-semibold text-[hsl(var(--primary))] uppercase tracking-wider text-[10px] block mb-0.5">Clinical & Operational Interpretation</span>
        {text}
      </div>
    </div>
  );
}

function generateTableInterpretation(type: string, tableNumber: 1 | 2, rows: any[]): string {
  if (!Array.isArray(rows) || rows.length === 0) {
    return "No data recorded for this reporting period. A baseline assessment cannot be established. Continuous monitoring is recommended as new records are captured.";
  }

  // Helper for computing totals
  const totalMale = rows.reduce((sum, r) => sum + (Number(r.male) || 0), 0);
  const totalFemale = rows.reduce((sum, r) => sum + (Number(r.female) || 0), 0);
  const totalCombined = totalMale + totalFemale;

  const malePercent = totalCombined > 0 ? Math.round((totalMale / totalCombined) * 100) : 0;
  const femalePercent = totalCombined > 0 ? Math.round((totalFemale / totalCombined) * 100) : 0;

  if (tableNumber === 1) {
    // Temporal Distribution Analysis
    // Find the row with the maximum total
    let peakRow = rows[0];
    let maxTotal = Number(rows[0].total) || 0;
    for (let i = 1; i < rows.length; i++) {
      const t = Number(rows[i].total) || 0;
      if (t > maxTotal) {
        maxTotal = t;
        peakRow = rows[i];
      }
    }
    const peakPeriod = peakRow?.period || "the recorded period";
    const peakCount = Number(peakRow?.total) || 0;

    const genderDominance = totalMale > totalFemale 
      ? `male patients (${malePercent}%) showing higher utilization compared to female patients (${femalePercent}%)`
      : totalFemale > totalMale
      ? `female patients (${femalePercent}%) showing higher utilization compared to male patients (${malePercent}%)`
      : `an equal distribution between male (${malePercent}%) and female (${femalePercent}%) patients`;

    if (type === 'medical_consultation') {
      return `Consultation volume peaked during ${peakPeriod} with ${peakCount} clinical visits. The gender distribution reveals ${genderDominance}. These trends suggest a heightened demand for medical consultation during the peak period, which correlates with academic stress, weather changes, or mid-term seasonal flu outbreaks. Clinic staffing and pharmaceutical supplies should be proactively adjusted to accommodate these cyclical trends.`;
    }
    if (type === 'physical_examination') {
      return `Physical examination clearances reached a peak during ${peakPeriod} with ${peakCount} certified cases. The overall throughput comprises ${genderDominance}. This volume is indicative of enrollment-related medical clearances or routine annual fitness-for-duty evaluations. Implementing staggered scheduling slots during high-volume periods will improve operational efficiency and prevent bottlenecking at vital-signs and diagnostic stations.`;
    }
    if (type === 'dental_consultation') {
      return `Dental consultation frequency was highest during ${peakPeriod} with ${peakCount} student visits recorded. The gender breakdown consists of ${genderDominance}. The steady volume indicates a strong patient awareness of oral health. Providing preemptive online booking options during these peak times can optimize dentist schedules and minimize patient wait times.`;
    }
    if (type === 'dental_examination') {
      return `Comprehensive dental examinations peaked during ${peakPeriod} with ${peakCount} procedures. The sex-disaggregated data shows ${genderDominance}. This indicates robust participation in preventative screening. It is highly recommended to continue promoting annual dental checkups to catch dental carries and malocclusions at early, reversible stages.`;
    }
  } else {
    // Table 2: Category/Findings/Complaints Summary
    // Find the leading item
    let peakRow = rows[0];
    let maxTotal = Number(rows[0].total) || 0;
    for (let i = 1; i < rows.length; i++) {
      const t = Number(rows[i].total) || 0;
      if (t > maxTotal) {
        maxTotal = t;
        peakRow = rows[i];
      }
    }

    const getRowLabel = (r: any) => {
      return r.complaint || r.reason || r.finding || r.condition || "unspecified concerns";
    };

    const leadingLabel = getRowLabel(peakRow);
    const leadingCount = Number(peakRow?.total) || 0;
    const leadingMale = Number(peakRow?.male) || 0;
    const leadingFemale = Number(peakRow?.female) || 0;

    const leadingGenderRatio = leadingMale > leadingFemale
      ? "higher prevalence in male patients"
      : leadingFemale > leadingMale
      ? "higher prevalence in female patients"
      : "an equal prevalence among both genders";

    if (type === 'medical_consultation') {
      return `The primary reason for consultation is "${leadingLabel}", accounting for ${leadingCount} cases (${leadingGenderRatio}). This suggests a high incidence of this specific morbidity in the student and staff population. It is recommended that the health services unit maintains adequate stocks of appropriate therapeutics and designs targeted wellness bulletins highlighting preventative measures for this condition.`;
    }
    if (type === 'physical_examination') {
      return `The most frequent physical examination outcome/finding is "${leadingLabel}", recorded in ${leadingCount} patients, with ${leadingGenderRatio}. These outcomes demonstrate the critical role of screening programs in identifying underlying health conditions. Follow-up counseling and referrals should be offered to patients presenting with abnormal or borderline findings to ensure continuity of care.`;
    }
    if (type === 'dental_consultation') {
      return `The leading dental complaint is "${leadingLabel}", representing ${leadingCount} consultations (${leadingGenderRatio}). This highlights a significant need for targeted educational campaigns on correct tooth brushing techniques, regular flossing, and the impact of dietary choices on dental health.`;
    }
    if (type === 'dental_examination') {
      return `The primary diagnosed dental pathology is "${leadingLabel}", identified in ${leadingCount} examinations, with ${leadingGenderRatio}. These diagnostic results underscore the high prevalence of this oral health issue. Priority should be given to scheduling follow-up restorative treatments, sealants, or scaling/polishing for the affected patients.`;
    }
  }

  return "Statistical analysis of this table suggests consistent operational throughput. Standard health protocols and wellness monitoring should be maintained.";
}

// ─── Table renderers ──────────────────────────────────────────────────────────

function MedicalConsultationTables({ table1, table2 }: { table1: any[]; table2: any[] }) {
  const totM1 = table1.reduce((a, r) => a + (r.male || 0), 0);
  const totF1 = table1.reduce((a, r) => a + (r.female || 0), 0);

  const totM2 = table2.reduce((a, r) => a + (r.male || 0), 0);
  const totF2 = table2.reduce((a, r) => a + (r.female || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h4 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-widest mb-2">Table 1. Temporal Distribution</h4>
        <TableWrapper>
          <thead><tr><Th>Month / Period</Th><Th>Sex (M)</Th><Th>Sex (F)</Th><Th>Total #</Th></tr></thead>
          <tbody>
            {table1.map((r, i) => (
              <tr key={i} className="hover:bg-[hsl(var(--surface))] transition-colors">
                <Td>{r.period}</Td><Td>{r.male}</Td><Td>{r.female}</Td><Td bold>{r.total}</Td>
              </tr>
            ))}
            <TotalRow cells={['TOTAL', totM1, totF1, totM1 + totF1]} />
          </tbody>
        </TableWrapper>
        <TableInterpretation text={generateTableInterpretation('medical_consultation', 1, table1)} />
      </div>

      <div>
        <h4 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-widest mb-2">Table 2. Complaints Summary</h4>
        <TableWrapper>
          <thead><tr><Th>Complaints</Th><Th>Sex (M)</Th><Th>Sex (F)</Th><Th>Total #</Th></tr></thead>
          <tbody>
            {table2.map((r, i) => (
              <tr key={i} className="hover:bg-[hsl(var(--surface))] transition-colors">
                <Td>{r.complaint || r.reason}</Td><Td>{r.male}</Td><Td>{r.female}</Td><Td bold>{r.total}</Td>
              </tr>
            ))}
            <TotalRow cells={['TOTAL', totM2, totF2, totM2 + totF2]} />
          </tbody>
        </TableWrapper>
        <TableInterpretation text={generateTableInterpretation('medical_consultation', 2, table2)} />
      </div>
    </div>
  );
}

function PhysicalExaminationTables({ table1, table2 }: { table1: any[]; table2: any[] }) {
  const totM1 = table1.reduce((a, r) => a + (r.male || 0), 0);
  const totF1 = table1.reduce((a, r) => a + (r.female || 0), 0);

  const totM2 = table2.reduce((a, r) => a + (r.male || 0), 0);
  const totF2 = table2.reduce((a, r) => a + (r.female || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h4 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-widest mb-2">Table 1. Temporal Distribution</h4>
        <TableWrapper>
          <thead><tr><Th>Month / Period</Th><Th>Sex (Male)</Th><Th>Sex (Female)</Th><Th>Total Certified</Th></tr></thead>
          <tbody>
            {table1.map((r, i) => (
              <tr key={i} className="hover:bg-[hsl(var(--surface))] transition-colors">
                <Td>{r.period}</Td><Td>{r.male}</Td><Td>{r.female}</Td><Td bold>{r.total}</Td>
              </tr>
            ))}
            <TotalRow cells={['TOTAL', totM1, totF1, totM1 + totF1]} />
          </tbody>
        </TableWrapper>
        <TableInterpretation text={generateTableInterpretation('physical_examination', 1, table1)} />
      </div>

      <div>
        <h4 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-widest mb-2">Table 2. Findings / Reasons Summary</h4>
        <TableWrapper>
          <thead><tr><Th>Findings / Reason</Th><Th>Sex (M)</Th><Th>Sex (F)</Th><Th>Total</Th></tr></thead>
          <tbody>
            {table2.map((r, i) => (
              <tr key={i} className="hover:bg-[hsl(var(--surface))] transition-colors">
                <Td>{r.reason || r.finding}</Td><Td>{r.male}</Td><Td>{r.female}</Td><Td bold>{r.total}</Td>
              </tr>
            ))}
            <TotalRow cells={['TOTAL', totM2, totF2, totM2 + totF2]} />
          </tbody>
        </TableWrapper>
        <TableInterpretation text={generateTableInterpretation('physical_examination', 2, table2)} />
      </div>
    </div>
  );
}

function DentalConsultationTables({ table1, table2 }: { table1: any[]; table2: any[] }) {
  const totM1 = table1.reduce((a, r) => a + (r.male || 0), 0);
  const totF1 = table1.reduce((a, r) => a + (r.female || 0), 0);

  const totM2 = table2.reduce((a, r) => a + (r.male || 0), 0);
  const totF2 = table2.reduce((a, r) => a + (r.female || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h4 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-widest mb-2">Table 1. Dental Consultation Temporal Distribution (Students)</h4>
        <TableWrapper>
          <thead><tr><Th>Month / Period</Th><Th>Service</Th><Th>Sex (M)</Th><Th>Sex (F)</Th><Th>Total</Th></tr></thead>
          <tbody>
            {table1.map((r, i) => (
              <tr key={i} className="hover:bg-[hsl(var(--surface))] transition-colors">
                <Td>{r.period}</Td><Td>{r.service || 'Dental Consultation/Exam'}</Td><Td>{r.male}</Td><Td>{r.female}</Td><Td bold>{r.total}</Td>
              </tr>
            ))}
            <TotalRow cells={['TOTAL', '', totM1, totF1, totM1 + totF1]} />
          </tbody>
        </TableWrapper>
        <TableInterpretation text={generateTableInterpretation('dental_consultation', 1, table1)} />
      </div>

      <div>
        <h4 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-widest mb-2">Table 2. Dental Concerns Summary</h4>
        <TableWrapper>
          <thead><tr><Th>Dental Concern</Th><Th>Sex (M)</Th><Th>Sex (F)</Th><Th>Total</Th></tr></thead>
          <tbody>
            {table2.map((r, i) => (
              <tr key={i} className="hover:bg-[hsl(var(--surface))] transition-colors">
                <Td>{r.reason || r.condition}</Td><Td>{r.male}</Td><Td>{r.female}</Td><Td bold>{r.total}</Td>
              </tr>
            ))}
            <TotalRow cells={['TOTAL', totM2, totF2, totM2 + totF2]} />
          </tbody>
        </TableWrapper>
        <TableInterpretation text={generateTableInterpretation('dental_consultation', 2, table2)} />
      </div>
    </div>
  );
}

function DentalExaminationTables({ table1, table2 }: { table1: any[]; table2: any[] }) {
  const totM1 = table1.reduce((a, r) => a + (r.male || 0), 0);
  const totF1 = table1.reduce((a, r) => a + (r.female || 0), 0);

  const totM2 = table2.reduce((a, r) => a + (r.male || 0), 0);
  const totF2 = table2.reduce((a, r) => a + (r.female || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h4 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-widest mb-2">Table 1. Dental Examination Temporal Distribution</h4>
        <TableWrapper>
          <thead><tr><Th>Month / Period</Th><Th>Sex (M)</Th><Th>Sex (F)</Th><Th>Total</Th></tr></thead>
          <tbody>
            {table1.map((r, i) => (
              <tr key={i} className="hover:bg-[hsl(var(--surface))] transition-colors">
                <Td>{r.period}</Td><Td>{r.male}</Td><Td>{r.female}</Td><Td bold>{r.total}</Td>
              </tr>
            ))}
            <TotalRow cells={['TOTAL', totM1, totF1, totM1 + totF1]} />
          </tbody>
        </TableWrapper>
        <TableInterpretation text={generateTableInterpretation('dental_examination', 1, table1)} />
      </div>

      <div>
        <h4 className="text-xs font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-widest mb-2">Table 2. Diagnosed Dental Problems</h4>
        <TableWrapper>
          <thead><tr><Th>Dental Problem</Th><Th>Sex (M)</Th><Th>Sex (F)</Th><Th>Total</Th></tr></thead>
          <tbody>
            {table2.map((r, i) => (
              <tr key={i} className="hover:bg-[hsl(var(--surface))] transition-colors">
                <Td>{r.condition || r.reason}</Td><Td>{r.male}</Td><Td>{r.female}</Td><Td bold>{r.total}</Td>
              </tr>
            ))}
            <TotalRow cells={['TOTAL', totM2, totF2, totM2 + totF2]} />
          </tbody>
        </TableWrapper>
        <TableInterpretation text={generateTableInterpretation('dental_examination', 2, table2)} />
      </div>
    </div>
  );
}

function renderSingleTable(meta: ReportMeta, data: any) {
  if (!data) return null;
  const table1 = Array.isArray(data.table1) ? data.table1 : [];
  const table2 = Array.isArray(data.table2) ? data.table2 : [];

  if (meta.type === 'medical_consultation') {
    return <MedicalConsultationTables table1={table1} table2={table2} />;
  }
  if (meta.type === 'physical_examination') {
    return <PhysicalExaminationTables table1={table1} table2={table2} />;
  }
  if (meta.type === 'dental_consultation') {
    return <DentalConsultationTables table1={table1} table2={table2} />;
  }
  if (meta.type === 'dental_examination') {
    return <DentalExaminationTables table1={table1} table2={table2} />;
  }
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
  const inventorySummary = results[0]?.data?.inventorySummary as InventorySummary | undefined;

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
          #print-report-area .print-interpretation {
            border: 1px solid #ddd !important;
            border-left: 3.5px solid hsl(var(--primary)) !important;
            background: hsl(var(--primary-soft)) !important;
            padding: 10px !important;
            margin-top: 8px !important;
            border-radius: 6px !important;
            page-break-inside: avoid;
          }
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
      {inventorySummary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard label="Expired Items" value={inventorySummary.expired} icon={<AlertTriangle className="h-5 w-5" />} />
          <StatCard label="Expiring Soon" value={inventorySummary.expiringSoon} icon={<TrendingUp className="h-5 w-5" />} />
          <StatCard label="Near Reorder" value={inventorySummary.nearReorder} icon={<BarChart2 className="h-5 w-5" />} />
          <StatCard label="Out of Stock" value={inventorySummary.outOfStock ?? 0} icon={<Activity className="h-5 w-5" />} />
        </div>
      )}
    </>
  );
}
