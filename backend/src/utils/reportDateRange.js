/**
 * REPORT DATE RANGE UTILITY
 * ─────────────────────────────────────────────────────────────
 * Converts a (range, date) pair into an ordered array of
 * { label, start, end } period objects that are consumed by
 * every report aggregation query.
 *
 * Ranges:
 *   daily        → 1 period  (the target day 00:00–23:59)
 *   weekly       → 1 period  (Mon 00:00 – Sun 23:59 of target week)
 *   monthly      → 1 period  (first–last day of target month)
 *   quarterly    → 4 periods (Q1–Q4 of target year)
 *   semi-annually→ 2 periods (H1 Jan–Jun, H2 Jul–Dec of target year)
 *   yearly       → 12 periods (each calendar month of target year)
 *
 * Returning an array of periods for quarterly/semi-annual/yearly lets
 * period-based reports (physical_examination, dental_*) produce one
 * data row per period while medical_consultation still uses
 * periods[0].start → periods[N-1].end as its full date window.
 */

'use strict';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const VALID_RANGES = new Set([
  'daily', 'weekly', 'monthly', 'quarterly', 'semi-annually', 'yearly',
]);

/** Returns a Date clamped to 00:00:00.000 in local time. */
function startOfDay(d) {
  const n = new Date(d);
  n.setHours(0, 0, 0, 0);
  return n;
}

/** Returns a Date clamped to 23:59:59.999 in local time. */
function endOfDay(d) {
  const n = new Date(d);
  n.setHours(23, 59, 59, 999);
  return n;
}

/**
 * Parses `dateStr` into a valid Date.
 * Falls back to today when dateStr is absent or invalid.
 */
function parseBase(dateStr) {
  if (!dateStr) return new Date();
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return new Date();
  return d;
}

/**
 * Returns an ordered array of period objects based on `range` and `date`.
 *
 * @param {string} range  - One of the VALID_RANGES values.
 * @param {string} [dateStr] - ISO date string (YYYY-MM-DD) or Date-parseable
 *                             string. Defaults to today.
 * @returns {{ label: string, start: Date, end: Date }[]}
 */
function getDateBoundaries(range, dateStr) {
  if (!VALID_RANGES.has(range)) {
    throw new Error(
      `Unknown range "${range}". Valid values: ${[...VALID_RANGES].join(', ')}`
    );
  }

  const base = parseBase(dateStr);
  const year  = base.getFullYear();
  const month = base.getMonth(); // 0-based

  switch (range) {
    // ── DAILY ───────────────────────────────────────────────
    case 'daily': {
      return [{
        label: base.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' }),
        start: startOfDay(base),
        end:   endOfDay(base),
      }];
    }

    // ── WEEKLY ──────────────────────────────────────────────
    case 'weekly': {
      const dow  = base.getDay(); // 0=Sun … 6=Sat
      const diff = dow === 0 ? -6 : 1 - dow; // shift to Monday
      const mon  = new Date(base);
      mon.setDate(base.getDate() + diff);
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);
      return [{
        label: `Week of ${MONTH_NAMES[mon.getMonth()]} ${mon.getDate()}, ${mon.getFullYear()}`,
        start: startOfDay(mon),
        end:   endOfDay(sun),
      }];
    }

    // ── MONTHLY ─────────────────────────────────────────────
    case 'monthly': {
      return [{
        label: `${MONTH_NAMES[month]} ${year}`,
        start: new Date(year, month, 1, 0, 0, 0, 0),
        end:   new Date(year, month + 1, 0, 23, 59, 59, 999),
      }];
    }

    // ── QUARTERLY ───────────────────────────────────────────
    case 'quarterly': {
      return [
        { label: 'Q1 (Jan–Mar)', start: new Date(year, 0,  1,  0, 0, 0, 0), end: new Date(year, 2,  31, 23, 59, 59, 999) },
        { label: 'Q2 (Apr–Jun)', start: new Date(year, 3,  1,  0, 0, 0, 0), end: new Date(year, 5,  30, 23, 59, 59, 999) },
        { label: 'Q3 (Jul–Sep)', start: new Date(year, 6,  1,  0, 0, 0, 0), end: new Date(year, 8,  30, 23, 59, 59, 999) },
        { label: 'Q4 (Oct–Dec)', start: new Date(year, 9,  1,  0, 0, 0, 0), end: new Date(year, 11, 31, 23, 59, 59, 999) },
      ];
    }

    // ── SEMI-ANNUALLY ────────────────────────────────────────
    case 'semi-annually': {
      return [
        { label: 'H1 (Jan–Jun)', start: new Date(year, 0, 1, 0, 0, 0, 0), end: new Date(year, 5,  30, 23, 59, 59, 999) },
        { label: 'H2 (Jul–Dec)', start: new Date(year, 6, 1, 0, 0, 0, 0), end: new Date(year, 11, 31, 23, 59, 59, 999) },
      ];
    }

    // ── YEARLY (12 monthly sub-periods) ─────────────────────
    case 'yearly': {
      return MONTH_NAMES.map((name, i) => ({
        label: `${name} ${year}`,
        start: new Date(year, i,     1,  0, 0, 0, 0),
        end:   new Date(year, i + 1, 0, 23, 59, 59, 999),
      }));
    }

    default:
      throw new Error(`Unhandled range: "${range}"`);
  }
}

module.exports = { getDateBoundaries, VALID_RANGES };
