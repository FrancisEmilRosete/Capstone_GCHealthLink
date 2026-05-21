/**
 * Automated Insights Generator for Reports
 * Consumes Table 1 (temporal summary) and Table 2 (complaints/findings summary)
 * and produces a natural-language interpretation block.
 */

function percent(n, total) {
  if (!total) return '0%';
  return ((n / total) * 100).toFixed(1) + '%';
}

function topN(arr, n = 3) {
  return arr.slice(0, n);
}

function generateInsights({ table1, table2, meta }) {
  if (!Array.isArray(table1) || !Array.isArray(table2) || !meta) return '';
  const totalVisits = table1.reduce((a, r) => a + (r.total || 0), 0);
  if (!totalVisits) return 'No data available for this period.';

  // Peak period(s)
  const maxTotal = Math.max(...table1.map(r => r.total || 0));
  const peakPeriods = table1.filter(r => r.total === maxTotal).map(r => r.period || r.label || r.date || '');

  // Top complaints/findings
  const sortedComplaints = [...table2].sort((a, b) => (b.total || 0) - (a.total || 0));
  const topComplaints = topN(sortedComplaints, 3);

  // Gender distribution
  const male = table1.reduce((a, r) => a + (r.male || 0), 0);
  const female = table1.reduce((a, r) => a + (r.female || 0), 0);
  const malePct = percent(male, totalVisits);
  const femalePct = percent(female, totalVisits);

  let text = `During the selected period (${meta.range}), a total of ${totalVisits} patient visits were recorded.`;
  if (peakPeriods.length) {
    text += ` The busiest period${peakPeriods.length > 1 ? 's were' : ' was'} ${peakPeriods.join(', ')} with ${maxTotal} visit${maxTotal > 1 ? 's' : ''}.`;
  }
  if (topComplaints.length) {
    text += ` The most common complaints or findings were: ` +
      topComplaints.map(c => `${c.complaint || c.condition || c.reason || c.label} (${c.total}, ${percent(c.total, totalVisits)})`).join('; ') + '.';
  }
  text += ` Gender distribution: ${male} male (${malePct}), ${female} female (${femalePct}).`;
  if (Math.abs(male - female) / totalVisits > 0.2) {
    text += ` Notable gender disparity observed.`;
  }
  return text;
}

module.exports = { generateInsights };
