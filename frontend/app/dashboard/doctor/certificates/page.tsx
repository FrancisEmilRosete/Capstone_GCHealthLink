'use client';

import React, { useEffect, useRef, useState, Fragment, useMemo } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { FileText, Search, Printer, PlusCircle, X, ClipboardList, Stethoscope } from 'lucide-react';
import UseQrLookupModal, { type QrResolvedStudent } from '@/components/scanner/UseQrLookupModal';
import PaginationControls from '@/components/ui/PaginationControls';
import { printCertificate, printCertificatesBatch } from '@/lib/printCertificate';
import toast from 'react-hot-toast';

interface IssueForm {
  studentIdentifier: string;
  certificateType: 'CONSULTATION' | 'PHYSICAL_EXAM';
  diagnosisFindings: string;
  recommendationsRemarks: string;
  dateIssued: string;
}

interface Certificate {
  id: string;
  studentId: string;
  student: string;
  course: string;
  certificateType: string;
  diagnosisFindings: string;
  recommendationsRemarks: string;
  remarks: string;
  issuedAt: string;
  issuedBy: string;
}

export default function CertificatesPage() {
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CONSULTATION' | 'PHYSICAL_EXAM'>('ALL');
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // QR State
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Batch Print Modal State
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchTypeFilter, setBatchTypeFilter] = useState<'CONSULTATION' | 'PHYSICAL_EXAM'>('CONSULTATION');
  const [batchSearch, setBatchSearch] = useState('');
  const [selectedCerts, setSelectedCerts] = useState<Set<string>>(new Set());

  // Batch Print Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');

  // Issue Certificate modal
  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueLoading, setIssueLoading] = useState(false);
  const [issueQrOpen, setIssueQrOpen] = useState(false);
  const [issueForm, setIssueForm] = useState<IssueForm>({
    studentIdentifier: '',
    certificateType: 'CONSULTATION',
    diagnosisFindings: '',
    recommendationsRemarks: '',
    dateIssued: new Date().toISOString().split('T')[0],
  });

  const isMounted = useRef(false);

  useEffect(() => {
    if (!isMounted.current) {
      isMounted.current = true;
      return;
    }
    loadCertificates(search);
  }, [typeFilter]);

  async function loadCertificates(q = '') {
    try {
      const token = getToken();
      if (!token) return;
      setLoading(true);
      const res = await api.get<{ data: any[] }>(`/certificates?q=${encodeURIComponent(q)}`, token);
      
      const mapped = res.data.map(cert => {
         const studentName = cert.studentProfile 
            ? `${cert.studentProfile.firstName} ${cert.studentProfile.lastName}`
            : (cert.student || 'Unknown Student');
            
         const studentId = cert.studentProfile 
            ? cert.studentProfile.studentNumber 
            : (cert.studentId || 'Unknown ID');
            
         const course = cert.studentProfile
            ? (cert.studentProfile.course || cert.studentProfile.courseDept || 'N/A')
            : (cert.course || 'N/A');

         return {
            id: cert.id,
            studentId: studentId,
            student: studentName,
            course: course,
            certificateType: cert.certificateType,
            diagnosisFindings: cert.diagnosisFindings,
            recommendationsRemarks: cert.recommendationsRemarks,
            remarks: cert.remarks,
            issuedAt: cert.issuedAt,
            issuedBy: typeof cert.issuedBy === 'string' 
                ? cert.issuedBy 
                : (cert.issuedBy?.email || cert.issuedByRole || 'Unknown'),
         };
      });
      
      setCertificates(mapped);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
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

  const openIssueModal = () => {
    setIssueForm({
      studentIdentifier: '',
      certificateType: 'CONSULTATION',
      diagnosisFindings: '',
      recommendationsRemarks: '',
      dateIssued: new Date().toISOString().split('T')[0],
    });
    setIssueModalOpen(true);
  };

  const handleIssueCertificate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!issueForm.studentIdentifier.trim()) { toast.error('Student ID is required.'); return; }
    if (!issueForm.diagnosisFindings.trim()) { toast.error('Diagnosis / Findings are required.'); return; }
    setIssueLoading(true);
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
      toast.success('Certificate issued successfully.');
      loadCertificates(search);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error('Failed to issue certificate.');
    } finally {
      setIssueLoading(false);
    }
  };

  const isConsultationType = issueForm.certificateType === 'CONSULTATION';

  // Filtering Logic for main table
  const filtered = useMemo(() => certificates.filter(c => {
    if (typeFilter !== 'ALL' && c.certificateType !== typeFilter) return false;
    return true;
  }), [certificates, typeFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, typeFilter, certificates.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedCertificates = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // Filtering Logic for batch modal
  const batchFiltered = certificates.filter(c => {
    if (c.certificateType !== batchTypeFilter) return false;
    if (batchSearch && !c.student.toLowerCase().includes(batchSearch.toLowerCase()) && !c.studentId.includes(batchSearch)) return false;
    
    if (dateFrom && new Date(c.issuedAt) < new Date(dateFrom)) return false;
    if (dateTo) {
        const toDate = new Date(dateTo);
        toDate.setDate(toDate.getDate() + 1); // include end of day
        if (new Date(c.issuedAt) >= toDate) return false;
    }
    
    if (timeFrom || timeTo) {
      const dateObj = new Date(c.issuedAt);
      const hours = dateObj.getHours().toString().padStart(2, '0');
      const mins = dateObj.getMinutes().toString().padStart(2, '0');
      const timeStr = `${hours}:${mins}`;
      
      if (timeFrom && timeStr < timeFrom) return false;
      if (timeTo && timeStr > timeTo) return false;
    }
    
    return true;
  }).sort((a, b) => new Date(b.issuedAt).getTime() - new Date(a.issuedAt).getTime());

  const [batchPage, setBatchPage] = useState(1);
  const BATCH_PAGE_SIZE = 15;

  useEffect(() => {
    setBatchPage(1);
  }, [batchTypeFilter, batchSearch, dateFrom, dateTo, timeFrom, timeTo]);

  const totalBatchPages = Math.max(1, Math.ceil(batchFiltered.length / BATCH_PAGE_SIZE));
  const batchPaginated = batchFiltered.slice((batchPage - 1) * BATCH_PAGE_SIZE, batchPage * BATCH_PAGE_SIZE);

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedCerts(new Set(batchFiltered.map(c => c.id)));
    } else {
      setSelectedCerts(new Set());
    }
  };

  const handleSelectOne = (id: string) => {
    const newSet = new Set(selectedCerts);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedCerts(newSet);
  };

  const executeBatchPrint = () => {
    if (selectedCerts.size === 0) {
      toast.error('Please select at least one certificate to print.');
      return;
    }
    const certsToPrint = batchFiltered.filter(c => selectedCerts.has(c.id));
    printCertificatesBatch(certsToPrint);
  };

  return (
    <div className="p-4 sm:p-6 space-y-5">

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Certificates</h1>
          <p className="text-sm text-gray-500 mt-1">Manage and print medical and consultation certificates.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={() => setBatchModalOpen(true)} 
            className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors"
          >
            <Printer size={16} /> Batch Print
          </button>
          <button
            onClick={openIssueModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors"
          >
            <PlusCircle size={16} /> Issue Certificate
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-wrap sm:flex-nowrap items-center gap-3 bg-white">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input 
              type="text" 
              placeholder="Search by student name or ID..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all"
            />
          </div>
          <select 
             value={typeFilter}
             onChange={e => setTypeFilter(e.target.value as any)}
             className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 outline-none transition-all min-w-[160px]"
          >
             <option value="ALL">All Certificates</option>
             <option value="CONSULTATION">Consultation</option>
             <option value="PHYSICAL_EXAM">Physical Exam</option>
          </select>
          <button
            type="button"
            onClick={() => setQrModalOpen(true)}
            className="text-sm font-semibold border border-teal-200 text-teal-700 hover:bg-teal-50 px-4 py-2 rounded-xl transition-colors ml-auto sm:ml-0"
          >
            Use QR
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
              <tr>
                <th className="px-4 py-3">Student</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Issued By</th>
                <th className="px-4 py-3">Date Issued</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No certificates found.</td></tr>
              ) : (
                pagedCertificates.map(cert => {
                  const isConsult = cert.certificateType === 'CONSULTATION';
                  let rowClasses = 'transition-colors hover:bg-gray-50/80';
                  if (typeFilter === 'ALL') {
                    rowClasses = isConsult 
                      ? 'bg-blue-50/40 hover:bg-blue-50/80 transition-colors' 
                      : 'bg-emerald-50/30 hover:bg-emerald-50/70 transition-colors';
                  }

                  return (
                    <tr key={cert.id} className={rowClasses}>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-900">{cert.student}</div>
                        <div className="text-xs text-gray-500">{cert.studentId}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${isConsult ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {isConsult ? 'Consultation' : 'Physical Exam'}
                        </span>
                      </td>
                      <td className="px-4 py-3">{cert.course}</td>
                      <td className="px-4 py-3">{cert.issuedBy}</td>
                      <td className="px-4 py-3">{new Date(cert.issuedAt).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => handlePrint(cert)} className="text-teal-600 hover:text-teal-800 font-semibold text-xs border border-teal-200 px-3 py-1 rounded-lg bg-white">Print</button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length > 0 && (
          <div className="border-t border-gray-100 p-3">
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
          </div>
        )}
      </div>
      
      <UseQrLookupModal
        open={qrModalOpen}
        onClose={() => setQrModalOpen(false)}
        onResolved={(student: QrResolvedStudent) => {
          setSearch(student.studentNumber);
        }}
        onNotFound={() => {
          toast.error('Student not found. Please try another QR.');
        }}
      />

      {batchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Printer className="text-teal-600" size={24} />
                Batch Print Certificates
              </h2>
              <button onClick={() => setBatchModalOpen(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={24} />
              </button>
            </div>

            <div className="p-4 sm:p-6 border-b border-gray-100 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Certificate Type</label>
                  <select
                    value={batchTypeFilter}
                    onChange={(e) => setBatchTypeFilter(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                  >
                    <option value="CONSULTATION">Consultation</option>
                    <option value="PHYSICAL_EXAM">Physical Exam</option>
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Search Student</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                      type="text"
                      placeholder="Name or ID..."
                      value={batchSearch}
                      onChange={(e) => setBatchSearch(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4 items-end">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Date From</label>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Date To</label>
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Time From</label>
                  <input type="time" value={timeFrom} onChange={e => setTimeFrom(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1.5">Time To</label>
                  <input type="time" value={timeTo} onChange={e => setTimeTo(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm" />
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-auto bg-gray-50/30 p-4 sm:p-6">
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 w-12">
                        <input
                          type="checkbox"
                          checked={batchFiltered.length > 0 && selectedCerts.size === batchFiltered.length}
                          onChange={handleSelectAll}
                          className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3">Student</th>
                      <th className="px-4 py-3">Department</th>
                      <th className="px-4 py-3">Date Issued</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {batchPaginated.length === 0 ? (
                      <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No certificates match filters.</td></tr>
                    ) : (
                      (() => {
                        let lastDateStr = '';
                        return batchPaginated.map(cert => {
                          const dateStr = new Date(cert.issuedAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                          const showHeader = dateStr !== lastDateStr;
                          if (showHeader) lastDateStr = dateStr;

                          return (
                            <Fragment key={cert.id}>
                              {showHeader && (
                                <tr className="bg-gray-100/50 border-t border-gray-200">
                                  <td colSpan={4} className="px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                    {dateStr}
                                  </td>
                                </tr>
                              )}
                              <tr className="hover:bg-gray-50/50 transition-colors cursor-pointer" onClick={() => handleSelectOne(cert.id)}>
                                <td className="px-4 py-3">
                                  <input
                                    type="checkbox"
                                    checked={selectedCerts.has(cert.id)}
                                    onChange={() => handleSelectOne(cert.id)}
                                    className="w-4 h-4 text-teal-600 border-gray-300 rounded focus:ring-teal-500 pointer-events-none"
                                  />
                                </td>
                                <td className="px-4 py-3">
                                  <div className="font-semibold text-gray-900">{cert.student}</div>
                                  <div className="text-xs text-gray-500">{cert.studentId}</div>
                                </td>
                                <td className="px-4 py-3">{cert.course}</td>
                                <td className="px-4 py-3">{new Date(cert.issuedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td>
                              </tr>
                            </Fragment>
                          );
                        });
                      })()
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 sm:p-6 border-t border-gray-100 bg-white flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600 font-medium">
                  {selectedCerts.size} selected
                </div>
                {totalBatchPages > 1 && (
                  <div className="flex items-center gap-2 text-sm">
                    <button 
                      disabled={batchPage === 1} 
                      onClick={() => setBatchPage(p => Math.max(1, p - 1))}
                      className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                    >Prev</button>
                    <span className="text-gray-500">Page {batchPage} of {totalBatchPages}</span>
                    <button 
                      disabled={batchPage === totalBatchPages} 
                      onClick={() => setBatchPage(p => Math.min(totalBatchPages, p + 1))}
                      className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:hover:bg-transparent transition-colors"
                    >Next</button>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setBatchModalOpen(false)}
                  className="px-5 py-2.5 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeBatchPrint}
                  disabled={selectedCerts.size === 0}
                  className="px-5 py-2.5 text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center gap-2 shadow-sm"
                >
                  <Printer size={16} /> Print Selected
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
        onNotFound={() => toast.error('Student not found. Please try another QR.')}
      />
    </div>
  );
}
