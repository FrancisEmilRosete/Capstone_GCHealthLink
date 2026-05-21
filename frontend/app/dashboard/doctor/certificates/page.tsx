'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { FileText, Search, Printer, PlusCircle, X, ClipboardList, Stethoscope } from 'lucide-react';
import UseQrLookupModal, { type QrResolvedStudent } from '@/components/scanner/UseQrLookupModal';
import PaginationControls from '@/components/ui/PaginationControls';
import { printCertificate } from '@/lib/printCertificate';

interface IssueForm {
  studentIdentifier: string;
  certificateType: 'CONSULTATION' | 'PHYSICAL_EXAM';
  diagnosisFindings: string;
  recommendationsRemarks: string;
  dateIssued: string;
}

interface Certificate {
  diagnosisFindings: string;
  recommendationsRemarks: string;
  id: string;
  studentId: string;
  student: string;
  course: string;
  certificateType: string;
  remarks: string;
  issuedAt: string;
  issuedBy: string;
}

export default function CertificatesPage() {
  const [activeTab, setActiveTab] = useState<'CONSULTATION' | 'PHYSICAL_EXAM'>('CONSULTATION');
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  
  // QR State
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Batch Print Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');

  // Issue Certificate modal
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueLoading, setIssueLoading] = useState(false);
  const [issueError, setIssueError] = useState('');
  const [issueQrOpen, setIssueQrOpen] = useState(false);
  const [issueForm, setIssueForm] = useState<IssueForm>({
    studentIdentifier: '',
    certificateType: 'CONSULTATION',
    diagnosisFindings: '',
    recommendationsRemarks: '',
    dateIssued: new Date().toISOString().split('T')[0],
  });

  useEffect(() => {
    loadCertificates(search);
  }, [activeTab]);

  async function loadCertificates(q = '') {
    try {
      const token = getToken();
      if (!token) return;
      setLoading(true);
      const res = await api.get<{ data: Certificate[] }>(`/certificates?q=${encodeURIComponent(q)}`, token);
      setCertificates(res.data);
      setError('');
    } catch (err) {
      if (err instanceof ApiError) setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handler = setTimeout(() => {
      loadCertificates(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const handlePrint = (cert: Certificate) => printCertificate(cert);

  const handleBatchPrint = () => {
    if (filtered.length === 0) {
      alert('No certificates match the current filters.');
      return;
    }
    filtered.forEach(cert => printCertificate(cert));
  };

  const openIssueModal = () => {
    setIssueForm({
      studentIdentifier: '',
      certificateType: 'CONSULTATION',
      diagnosisFindings: '',
      recommendationsRemarks: '',
      dateIssued: new Date().toISOString().split('T')[0],
    });
    setIssueError('');
    setIssueModalOpen(true);
  };

  const handleIssueCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueForm.studentIdentifier.trim()) { setIssueError('Student ID is required.'); return; }
    if (!issueForm.diagnosisFindings.trim()) { setIssueError('Diagnosis / Findings are required.'); return; }
    setIssueLoading(true);
    setIssueError('');
    try {
      const token = getToken();
      await api.post<{ data: Certificate }>('/certificates', {
        studentIdentifier: issueForm.studentIdentifier.trim(),
        certificateType: issueForm.certificateType,
        diagnosisFindings: issueForm.diagnosisFindings.trim(),
        recommendationsRemarks: issueForm.recommendationsRemarks.trim(),
        dateIssued: issueForm.dateIssued,
      }, token!);
      setIssueModalOpen(false);
      loadCertificates(search);
    } catch (err) {
      if (err instanceof ApiError) setIssueError(err.message);
      else setIssueError('Failed to issue certificate.');
    } finally {
      setIssueLoading(false);
    }
  };

  const isConsultationType = issueForm.certificateType === 'CONSULTATION';

  // Filtering Logic
  const filtered = useMemo(() => certificates.filter(c => {
    if (c.certificateType !== activeTab) return false;
    
    if (dateFrom && new Date(c.issuedAt) < new Date(dateFrom)) return false;
    if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setDate(toDate.getDate() + 1); // include end of day
        if (new Date(c.issuedAt) >= toDate) return false;
    }
    
    // Time filter logic (basic string comparison for HH:mm)
    if (timeFrom || timeTo) {
      const dateObj = new Date(c.issuedAt);
      const hours = dateObj.getHours().toString().padStart(2, '0');
      const mins = dateObj.getMinutes().toString().padStart(2, '0');
      const timeStr = `${hours}:${mins}`;
      
      if (timeFrom && timeStr < timeFrom) return false;
      if (timeTo && timeStr > timeTo) return false;
    }
    
    return true;
  }), [certificates, activeTab, dateFrom, dateTo, timeFrom, timeTo]);

  useEffect(() => {
    setPage(1);
  }, [search, activeTab, dateFrom, dateTo, timeFrom, timeTo, certificates.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedCertificates = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="text-teal-600" /> Medical Certificates
          </h1>
          <p className="text-sm text-gray-500 mt-1">Issue and manage medical certificates for students.</p>
        </div>
        <button
          onClick={openIssueModal}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors"
        >
          <PlusCircle size={16} /> Issue Certificate
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Batch Print Filters</h2>
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date From</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Date To</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Time From</label>
            <input type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Time To</label>
            <input type="time" value={timeTo} onChange={e => setTimeTo(e.target.value)} className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm" />
          </div>
          <button onClick={handleBatchPrint} className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2">
            <Printer size={16} /> Batch Print
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="flex border-b border-gray-100 bg-gray-50">
          <button
            onClick={() => setActiveTab('CONSULTATION')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'CONSULTATION' ? 'text-teal-700 bg-white border-b-2 border-teal-500' : 'text-gray-500 hover:bg-gray-100/50'}`}
          >
            Consultation Certificates
          </button>
          <button
            onClick={() => setActiveTab('PHYSICAL_EXAM')}
            className={`flex-1 py-3 text-sm font-semibold transition-colors ${activeTab === 'PHYSICAL_EXAM' ? 'text-teal-700 bg-white border-b-2 border-teal-500' : 'text-gray-500 hover:bg-gray-100/50'}`}
          >
            Physical Exam (PE) Certificates
          </button>
        </div>

        <div className="p-4 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search by student name or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
            />
          </div>
          <button
            type="button"
            onClick={() => setQrModalOpen(true)}
            className="text-sm font-semibold border border-teal-200 text-teal-700 hover:bg-teal-50 px-4 py-2 rounded-xl transition-colors"
          >
            Use QR
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Issued By</th>
                <th className="px-4 py-3">Date Issued</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No certificates found.</td></tr>
              ) : (
                pagedCertificates.map(cert => (
                  <tr key={cert.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{cert.student}</div>
                      <div className="text-xs text-gray-500">{cert.studentId}</div>
                    </td>
                    <td className="px-4 py-3">{cert.course}</td>
                    <td className="px-4 py-3">{cert.issuedBy}</td>
                    <td className="px-4 py-3">{new Date(cert.issuedAt).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handlePrint(cert)} className="text-teal-600 hover:text-teal-800 font-semibold text-xs border border-teal-200 px-3 py-1 rounded-lg">Print</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length > 0 && (
          <PaginationControls
            page={currentPage}
            totalPages={totalPages}
            totalItems={filtered.length}
            pageSize={pageSize}
            pageSizeOptions={[8, 12, 20, 30]}
            itemLabel="certificates"
            onPageChange={setPage}
            onPageSizeChange={(next) => {
              setPageSize(next);
              setPage(1);
            }}
          />
        )}
      </div>
      
      <UseQrLookupModal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        onResolved={(student: QrResolvedStudent) => setSearch(student.studentNumber)}
        onNotFound={() => alert('Student not found. Please try another QR.')}
      />

      {/* ── Issue Certificate Modal ── */}
      {issueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <FileText className="text-teal-600" size={20} /> Issue Medical Certificate
              </h2>
              <button onClick={() => setIssueModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleIssueCertificate} className="p-5 space-y-5">
              {/* Certificate Type */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Certificate Type</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setIssueForm(f => ({ ...f, certificateType: 'CONSULTATION' }))}
                    className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                      issueForm.certificateType === 'CONSULTATION' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    <ClipboardList size={22} />
                    Consultation
                    <span className="text-xs font-normal opacity-70">Based on clinic visit</span>
                  </button>
                  <button type="button" onClick={() => setIssueForm(f => ({ ...f, certificateType: 'PHYSICAL_EXAM' }))}
                    className={`flex flex-col items-center gap-1.5 p-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                      issueForm.certificateType === 'PHYSICAL_EXAM' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    }`}>
                    <Stethoscope size={22} />
                    Physical Exam
                    <span className="text-xs font-normal opacity-70">Based on PE result</span>
                  </button>
                </div>
              </div>
              {/* Student */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Student ID / Number</label>
                <div className="flex gap-2">
                  <input type="text" placeholder="e.g. 2024-00001"
                    value={issueForm.studentIdentifier}
                    onChange={e => setIssueForm(f => ({ ...f, studentIdentifier: e.target.value }))}
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none" required />
                  <button type="button" onClick={() => setIssueQrOpen(true)}
                    className="px-3 py-2 border border-teal-200 text-teal-700 hover:bg-teal-50 rounded-xl text-xs font-semibold">QR</button>
                </div>
              </div>
              {/* Diagnosis */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {isConsultationType ? 'Diagnosis / Clinical Findings' : 'Physical Examination Findings'}
                </label>
                <textarea rows={4}
                  placeholder={isConsultationType ? 'Enter diagnosis, chief complaint, or clinical findings...' : 'Enter physical examination findings (e.g. BP, vitals, systems review)...'}
                  value={issueForm.diagnosisFindings}
                  onChange={e => setIssueForm(f => ({ ...f, diagnosisFindings: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 outline-none resize-none ${
                    isConsultationType ? 'border-gray-200 focus:ring-teal-500/20 focus:border-teal-500' : 'border-blue-200 focus:ring-blue-500/20 focus:border-blue-500'
                  }`} required />
              </div>
              {/* Recommendations */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Recommendations / Remarks</label>
                <textarea rows={3}
                  placeholder="Enter recommendations, restrictions, or additional remarks..."
                  value={issueForm.recommendationsRemarks}
                  onChange={e => setIssueForm(f => ({ ...f, recommendationsRemarks: e.target.value }))}
                  className={`w-full px-3 py-2 border rounded-xl text-sm focus:ring-2 outline-none resize-none ${
                    isConsultationType ? 'border-gray-200 focus:ring-teal-500/20 focus:border-teal-500' : 'border-blue-200 focus:ring-blue-500/20 focus:border-blue-500'
                  }`} />
              </div>
              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Date Issued</label>
                <input type="date" value={issueForm.dateIssued}
                  onChange={e => setIssueForm(f => ({ ...f, dateIssued: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none" required />
              </div>
              {issueError && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-3">{issueError}</div>
              )}
              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setIssueModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
                <button type="submit" disabled={issueLoading}
                  className={`flex-1 py-2.5 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${
                    isConsultationType ? 'bg-teal-600 hover:bg-teal-700' : 'bg-blue-600 hover:bg-blue-700'
                  }`}>
                  {issueLoading ? 'Issuing...' : 'Issue Certificate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── QR for issue form ── */}
      <UseQrLookupModal
        open={issueQrOpen}
        onClose={() => setIssueQrOpen(false)}
        onResolved={(student: QrResolvedStudent) => {
          setIssueForm(f => ({ ...f, studentIdentifier: student.studentNumber }));
          setIssueQrOpen(false);
        }}
        onNotFound={() => alert('Student not found. Please try another QR.')}
      />
    </div>
  );
}
