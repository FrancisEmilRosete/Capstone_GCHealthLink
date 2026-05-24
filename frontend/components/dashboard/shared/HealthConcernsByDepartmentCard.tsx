'use client';

import { useEffect, useMemo, useState } from 'react';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { DEPARTMENT_COURSE_MAP, normalizeDepartmentCode } from '@/constants/departments';

interface ConcernItem {
  tag: string;
  count: number;
}

interface DepartmentConcernGroup {
  department: string;
  concerns: ConcernItem[];
}

interface HealthConcernsResponse {
  success: boolean;
  message: string;
  data: DepartmentConcernGroup[];
}

const DEPARTMENT_NAME_BY_CODE = DEPARTMENT_COURSE_MAP.reduce<Record<string, string>>((map, entry) => {
  map[entry.code] = entry.name;
  return map;
}, {});

function toDisplayDepartment(value: string) {
  const code = normalizeDepartmentCode(value);
  if (code === 'UNSPECIFIED') return 'Unspecified Department';
  return DEPARTMENT_NAME_BY_CODE[code] || value;
}

function toDisplayConcernTag(value: string) {
  const normalized = (value || '').trim();
  if (!normalized) return 'General Consultation';

  return normalized
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

export default function HealthConcernsByDepartmentCard({ className = '' }: { className?: string }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState<DepartmentConcernGroup[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('ALL');

  useEffect(() => {
    let alive = true;

    async function loadConcerns() {
      const token = getToken();
      if (!token) {
        if (alive) {
          setError('Please sign in again to load health concerns.');
          setLoading(false);
        }
        return;
      }

      try {
        if (alive) {
          setLoading(true);
          setError('');
        }

        const response = await api.get<HealthConcernsResponse>('/analytics/health-concerns', token);
        if (alive) {
          setRows(response.data || []);
        }
      } catch (err) {
        if (!alive) return;
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Failed to load health concerns.');
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    }

    void loadConcerns();

    return () => {
      alive = false;
    };
  }, []);

  const departmentOptions = useMemo(() => {
    return rows
      .map((row) => row.department)
      .sort((a, b) => toDisplayDepartment(a).localeCompare(toDisplayDepartment(b)));
  }, [rows]);

  const selectedGroup = useMemo(
    () => rows.find((row) => row.department === selectedDepartment),
    [rows, selectedDepartment],
  );

  const tableRows = useMemo(() => {
    if (selectedDepartment === 'ALL') {
      return rows.map((row) => {
        const topConcern = row.concerns[0];
        return {
          key: `${row.department}-top`,
          department: toDisplayDepartment(row.department),
          concern: topConcern ? toDisplayConcernTag(topConcern.tag) : 'No recorded concerns',
          totalCase: topConcern ? topConcern.count : 0,
        };
      });
    }

    if (!selectedGroup) {
      return [];
    }

    return selectedGroup.concerns.map((concern) => ({
      key: `${selectedGroup.department}-${concern.tag}`,
      department: toDisplayDepartment(selectedGroup.department),
      concern: toDisplayConcernTag(concern.tag),
      totalCase: concern.count,
    }));
  }, [rows, selectedDepartment, selectedGroup]);

  return (
    <section className={`card p-5 ${className}`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h2 className="text-h3 text-[hsl(var(--foreground))]">Health Concerns</h2>
          <p className="text-xs text-[hsl(var(--muted))] mt-1">Top health concerns categorized per department.</p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-xs text-[hsl(var(--muted-foreground))] font-medium flex items-center gap-2">
            Department
            <select
              value={selectedDepartment}
              onChange={(event) => setSelectedDepartment(event.target.value)}
              disabled={loading || !!error}
              className="px-2.5 py-1.5 rounded-[var(--radius-md)] border border-[hsl(var(--input-border))] bg-[hsl(var(--background))] text-xs text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--focus-ring)_/_0.4)]"
            >
              <option value="ALL">ALL</option>
              {departmentOptions.map((department) => (
                <option key={department} value={department}>
                  {toDisplayDepartment(department)}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((item) => (
            <div key={item} className="skeleton h-14" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-[var(--radius-lg)] border border-[hsl(var(--danger)_/_0.3)] bg-[hsl(var(--danger-soft))] px-4 py-3 text-sm text-[hsl(var(--danger))]">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-[hsl(var(--muted))]">No concern data available yet.</p>
      ) : (
        <div className="rounded-[var(--radius-lg)] border border-[hsl(var(--border))] bg-[hsl(var(--surface))] overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-4 py-3 border-b border-[hsl(var(--border))] bg-[hsl(var(--background))]">
            <p className="col-span-4 text-xs font-semibold text-[hsl(var(--muted))] uppercase tracking-wide">Department</p>
            <p className="col-span-6 text-xs font-semibold text-[hsl(var(--muted))] uppercase tracking-wide">Top Health Concern</p>
            <p className="col-span-2 text-xs font-semibold text-[hsl(var(--muted))] uppercase tracking-wide text-right">Total Case</p>
          </div>

          {tableRows.length === 0 ? (
            <div className="px-4 py-5 text-sm text-[hsl(var(--muted))]">No concern data for the selected department.</div>
          ) : (
            <div className="divide-y divide-[hsl(var(--border)_/_0.7)]">
              {tableRows.map((row) => (
                <div key={row.key} className="grid grid-cols-12 gap-3 px-4 py-3">
                  <p className="col-span-4 text-sm font-medium text-[hsl(var(--foreground))]">{row.department}</p>
                  <p className="col-span-6 text-sm text-[hsl(var(--foreground))]">{row.concern}</p>
                  <p className="col-span-2 text-sm font-semibold text-[hsl(var(--primary))] text-right tabular-nums">{row.totalCase}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
