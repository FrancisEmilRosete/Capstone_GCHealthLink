/**
 * CERTIFICATES PAGE
 * ──────────────────────────────────────────────────────────────
 * Route: /dashboard/staff/certificates
 *
 * Issues medical excuse letters / clearance slips so students who
 * need to go home early are not marked absent by their teachers.
 *
 * TODO: Replace MOCK_CERTIFICATES with GET/POST /api/certificates
 */

'use client';

import { useState, useMemo, useRef } from 'react';

// ── Types ───────────────────────────────────────────────────
interface Certificate {
  id:         string;
  studentId:  string;
  student:    string;
  course:     string;
  dateIso:    string;
  reason:     string;
  remarks:    string;
  issuedBy:   string;
}

// ── Mock data ─────────────────────────────────────────────────
const INITIAL_CERTS: Certificate[] = [
  { id: 'cert1', studentId: '2023-0001', student: 'Juan Dela Cruz', course: 'BS Civil Engineering', dateIso: '2024-10-15', reason: 'Illness (Fever)',          remarks: 'Student is advised to rest at home for 1-2 days.',       issuedBy: 'Dr. Maria Santos' },
  { id: 'cert2', studentId: '2023-0045', student: 'Ana Santos',     course: 'BS Nursing',          dateIso: '2024-11-02', reason: 'Medical Appointment',    remarks: 'Student has a scheduled check-up at PGH.',              issuedBy: 'Nurse John Reyes' },
  { id: 'cert3', studentId: '2023-0001', student: 'Juan Dela Cruz', course: 'BS Civil Engineering', dateIso: '2025-01-20', reason: 'Injury (Ankle Sprain)', remarks: 'Student is advised to refrain from physical activity.',   issuedBy: 'Nurse John Reyes' },
  { id: 'cert4', studentId: '2024-0010', student: 'Carlos Reyes',   course: 'BS Education',        dateIso: '2025-03-05', reason: 'Illness (Hypertension)',  remarks: 'Blood pressure was elevated. Sent home for monitoring.', issuedBy: 'Dr. Maria Santos' },
];

const REASONS = ['Illness (Fever)','Illness (Colds/Cough)','Illness (Hypertension)','Injury','Medical Appointment','Family Emergency','Other'];

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
}

// ── Issue Certificate Modal ─────────────────────────────────────
function IssueModal({ onClose, onSave }: { onClose: () => void; onSave: (c: Certificate) => void }) {
  const blank = { studentId:'', student:'', course:'', dateIso: new Date().toISOString().slice(0,10), reason: REASONS[0], remarks:'', issuedBy:'Dr. Maria Santos' };
  const [f, setF] = useState(blank);
  const set = (k: keyof typeof blank) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    setF((v) => ({ ...v, [k]: e.target.value }));

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.studentId || !f.student || !f.dateIso) return;
    onSave({ id: `cert${Date.now()}`, ...f });
  }

  const inputCls = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 placeholder-gray-300';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor:'rgba(0,0,0,0.4)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white rounded-t-2xl z-10">
          <h2 className="text-base font-bold text-gray-900">Issue Medical Excuse Letter</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Student ID</label>
              <input value={f.studentId} onChange={set('studentId')} placeholder="e.g. 2023-0001" required className={inputCls}/>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 block mb-1">Full Name</label>
              <input value={f.student} onChange={set('student')} placeholder="Last, First" required className={inputCls}/>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Course / Section</label>
            <input value={f.course} onChange={set('course')} placeholder="e.g. BS Civil Engineering" className={inputCls}/>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Date</label>
            <input type="date" value={f.dateIso} onChange={set('dateIso')} required className={inputCls}/>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Reason</label>
            <select value={f.reason} onChange={set('reason')} className={inputCls}>
              {REASONS.map((r) => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Remarks / Notes</label>
            <textarea value={f.remarks} onChange={set('remarks')} rows={3} placeholder="Additional clinical notes..."
              className={`${inputCls} resize-none`}/>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700 block mb-1">Issued By</label>
            <input value={f.issuedBy} onChange={set('issuedBy')} className={inputCls}/>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-semibold border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50">Cancel</button>
            <button type="submit"
              className="px-5 py-2 text-sm font-semibold bg-teal-500 hover:bg-teal-600 text-white rounded-xl">Issue Certificate</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Certificate preview / print modal ─────────────────────────────
function CertPreviewModal({ cert, onClose }: { cert: Certificate; onClose: () => void }) {
  const printRef = useRef<HTMLDivElement>(null);

  function handlePrint() {
    const win = window.open('', '_blank', 'width=600,height=700');
    if (!win || !printRef.current) return;
    win.document.write(`
      <html><head><title>Medical Excuse Letter</title>
      <style>
        body { font-family: Georgia, serif; padding: 40px; color: #111; }
        h1 { font-size: 20px; text-align: center; margin-bottom: 4px; }
        .sub { text-align: center; font-size: 13px; color: #555; margin-bottom: 30px; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        td { padding: 8px 4px; vertical-align: top; }
        td:first-child { font-weight: bold; width: 160px; }
        .sig { margin-top: 50px; }
        .sig-line { border-top: 1px solid #555; width: 200px; margin-top: 40px; }
        .footer { margin-top: 40px; font-size: 11px; color: #888; text-align: center; border-top: 1px solid #ddd; padding-top: 10px; }
      </style></head><body>
      ${printRef.current.innerHTML}
      <script>window.print(); window.close();<\/script>
      </body></html>`);
    win.document.close();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor:'rgba(0,0,0,0.5)' }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">Certificate Preview</h2>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 text-xs font-semibold bg-teal-500 hover:bg-teal-600 text-white px-3 py-1.5 rounded-lg">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"/></svg>
              Print
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg></button>
          </div>
        </div>

        {/* Printable certificate */}
        <div ref={printRef} className="p-6 font-serif">
          <h1 className="text-lg font-bold text-center text-gray-900 tracking-wide">GORDON COLLEGE HEALTH SERVICES</h1>
          <p className="text-center text-xs text-gray-500 mb-6">Medical Excuse Letter</p>

          <p className="text-sm text-gray-700 mb-4">To Whom It May Concern,</p>
          <p className="text-sm text-gray-700 leading-relaxed mb-4">
            This is to certify that <strong>{cert.student}</strong> ({cert.studentId}), a student of <strong>{cert.course}</strong>,
            was examined at the Health Services Clinic on <strong>{fmtDate(cert.dateIso)}</strong> and
            was found to be unfit to continue classes due to: <strong>{cert.reason}</strong>.
          </p>
          {cert.remarks && (
            <p className="text-sm text-gray-700 leading-relaxed mb-4">
              <em>Clinical Notes: {cert.remarks}</em>
            </p>
          )}
          <p className="text-sm text-gray-700 mb-8">
            The student is hereby excused from classes on the said date and should not be marked absent.
          </p>

          <div className="flex justify-end">
            <div className="text-center">
              <div className="border-t border-gray-400 pt-2 w-48">
                <p className="text-sm font-bold text-gray-800">{cert.issuedBy}</p>
                <p className="text-xs text-gray-500">Examining Physician / Nurse</p>
                <p className="text-xs text-gray-500">GC Health Services Clinic</p>
              </div>
            </div>
          </div>

          <p className="text-[10px] text-gray-400 text-center mt-6 border-t border-gray-100 pt-3">
            Issued on {fmtDate(cert.dateIso)} &bull; Gordon College Health Services &bull; Certificate ID: {cert.id}
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────
export default function CertificatesPage() {
  const [certs,     setCerts]     = useState<Certificate[]>(INITIAL_CERTS);
  const [search,    setSearch]    = useState('');
  const [showIssue, setShowIssue] = useState(false);
  const [preview,   setPreview]   = useState<Certificate | null>(null);

  const q = search.toLowerCase();
  const filtered = useMemo(() =>
    q ? certs.filter((c) => c.student.toLowerCase().includes(q) || c.studentId.includes(q) || c.reason.toLowerCase().includes(q))
      : certs
  , [certs, q]);

  function downloadCSV() {
    const headers = ['ID','Student ID','Student','Course','Date','Reason','Remarks','Issued By'];
    const lines = certs.map((c) => [c.id,c.studentId,c.student,c.course,fmtDate(c.dateIso),c.reason,c.remarks,c.issuedBy].map((v)=>`"${v}"`).join(','));
    const blob = new Blob([[headers.join(','), ...lines].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'certificates.csv'; a.click();
  }

  return (
    <div className="p-4 sm:p-6 space-y-5">
      {showIssue && <IssueModal onClose={() => setShowIssue(false)} onSave={(c) => { setCerts((prev) => [c, ...prev]); setShowIssue(false); }} />}
      {preview   && <CertPreviewModal cert={preview} onClose={() => setPreview(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Medical Certificates</h1>
          <p className="text-xs text-gray-400 mt-0.5">Issue excuse letters for students going home early</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={downloadCSV}
            className="flex items-center gap-1.5 text-xs font-semibold border border-gray-200 text-gray-600 hover:border-teal-300 hover:text-teal-600 px-3 py-2 rounded-xl transition-colors bg-white">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[['Total Issued', certs.length, 'text-teal-500'], ['This Month', certs.filter((c) => { const d=new Date(c.dateIso); const n=new Date(); return d.getMonth()===n.getMonth()&&d.getFullYear()===n.getFullYear(); }).length, 'text-blue-500'], ['Unique Students', new Set(certs.map((c)=>c.studentId)).size, 'text-purple-500']].map(([l,v,col]) => (
          <div key={l as string} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <p className="text-xs text-gray-400 font-medium">{l}</p>
            <p className={`text-2xl font-bold mt-1 ${col}`}>{v}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-50">
          <div className="relative max-w-xs">
            <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z"/></svg>
            <input type="text" placeholder="Search by student, reason..." value={search} onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-2 text-xs border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-300 placeholder-gray-300"/>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400">
                <th className="text-left px-4 py-3 font-semibold">Date</th>
                <th className="text-left px-4 py-3 font-semibold">Student</th>
                <th className="text-left px-4 py-3 font-semibold">Student ID</th>
                <th className="text-left px-4 py-3 font-semibold">Reason</th>
                <th className="text-left px-4 py-3 font-semibold">Issued By</th>
                <th className="text-left px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-gray-300">No certificates found.</td></tr>
              ) : filtered.map((c) => (
                <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60 transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-gray-700">{fmtDate(c.dateIso)}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{c.student}</td>
                  <td className="px-4 py-3 text-teal-500 font-medium">{c.studentId}</td>
                  <td className="px-4 py-3 text-gray-600">{c.reason}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{c.issuedBy}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setPreview(c)} className="text-teal-500 font-semibold hover:underline">View / Print</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-gray-50 text-[11px] text-gray-400">Showing {filtered.length} of {certs.length} certificates</div>
      </div>
    </div>
  );
}
