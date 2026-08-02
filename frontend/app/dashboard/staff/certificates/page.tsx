'use client';

import React, { useEffect, useRef, useState, Fragment } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { Search, Printer, X, CheckSquare } from 'lucide-react';
import UseQrLookupModal, { type QrResolvedStudent } from '@/components/scanner/UseQrLookupModal';
import { printCertificate, printCertificatesBatch } from '@/lib/printCertificate';

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
  issuedByRole?: string;
}

export default function CertificatesPage() {
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'CONSULTATION' | 'PHYSICAL_EXAM'>('ALL');
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  
  // QR State
  const [qrModalOpen, setQrModalOpen] = useState(false);

  // Batch Print Filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');

  const isMounted = useRef(false);

  // Fires when typeFilter changes; skip the very first mount since the
  // search debounce effect below handles the initial load.
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
      const res = await api.get<{ data: any[] }>(`/certificates?q=${q}`, token);
      
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

  // Individual Print — opens a formatted popup, hides system nav/sidebar
  const [previewCert, setPreviewCert] = useState<Certificate | null>(null);
  
  // Modal editor states
  const [certDate, setCertDate] = useState('');
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [status, setStatus] = useState('Student');
  const [department, setDepartment] = useState('');
  const [sex, setSex] = useState('Male');
  const [dob, setDob] = useState('');
  const [forReason, setForReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [signatoryName, setSignatoryName] = useState('');
  const [designation, setDesignation] = useState('');
  const [licenseNo, setLicenseNo] = useState('');
  const [controlNo, setControlNo] = useState('');
  const [studentNo, setStudentNo] = useState('');
  
  const [peFindingsOption, setPeFindingsOption] = useState<'NORMAL' | 'DIAGNOSIS'>('NORMAL');
  const [pePurpose, setPePurpose] = useState<'ENROLMENT' | 'OJT' | 'RLE'>('ENROLMENT');

  const handlePrint = (cert: Certificate) => {
    setPreviewCert({ ...cert });
    
    // Initialize editor states
    setCertDate(new Date(cert.issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }));
    setFullName(cert.student);
    setAge('');
    setStatus('Student');
    setDepartment(cert.course || '');
    setSex('Male');
    setDob('');
    setForReason(cert.diagnosisFindings || '');
    setRemarks(cert.recommendationsRemarks || '');
    setSignatoryName(cert.issuedBy || '');
    setDesignation((cert.issuedByRole || '').toUpperCase() === 'NURSE' || (cert.issuedByRole || '').toUpperCase() === 'CLINIC_STAFF' ? 'College Nurse' : 'College Physician');
    setLicenseNo('');
    setControlNo(`PE-${cert.id.slice(0,6).toUpperCase()}`);
    setStudentNo(cert.studentId || '');
    
    setPeFindingsOption('NORMAL');
    setPePurpose('ENROLMENT');
  };

  // Batch Print Modal State
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchTypeFilter, setBatchTypeFilter] = useState<'CONSULTATION' | 'PHYSICAL_EXAM'>('CONSULTATION');
  const [batchSearch, setBatchSearch] = useState('');
  const [selectedCerts, setSelectedCerts] = useState<Set<string>>(new Set());

  // Filtering Logic for main table
  const filtered = certificates.filter(c => {
    if (typeFilter !== 'ALL' && c.certificateType !== typeFilter) return false;
    return true;
  });

  const [page, setPage] = useState(1);
  const pageSize = 10;
  
  useEffect(() => {
    setPage(1);
  }, [typeFilter, search, certificates.length]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedCerts = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

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
      alert('Please select at least one certificate to print.');
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
        <button 
          onClick={() => setBatchModalOpen(true)} 
          className="bg-teal-600 hover:bg-teal-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 shadow-sm transition-colors"
        >
          <Printer size={16} /> Batch Print
        </button>
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
                pagedCerts.map(cert => {
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
        
        {!loading && filtered.length > 0 && totalPages > 1 && (
          <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
            <span className="text-sm text-gray-500">
              Showing {(currentPage - 1) * pageSize + 1} to {Math.min(currentPage * pageSize, filtered.length)} of {filtered.length} entries
            </span>
            <div className="flex gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 transition-colors bg-gray-50 font-medium text-gray-700"
              >Prev</button>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 transition-colors bg-gray-50 font-medium text-gray-700"
              >Next</button>
            </div>
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
          alert('Student not found. Please try another QR.');
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

      {previewCert && (() => {
        const isPE = previewCert.certificateType === 'PHYSICAL_EXAM';

        return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm print:bg-transparent print:p-0 print:backdrop-blur-none">
          <style>{`
            @page {
              size: ${isPE ? 'legal' : 'A5 landscape'};
              margin: 0;
            }
            @media print {
              html, body {
                width: ${isPE ? '8.5in' : '210mm'} !important;
                height: ${isPE ? '14in' : '148mm'} !important;
                overflow: hidden !important;
                margin: 0 !important;
                padding: 0 !important;
                background: white !important;
              }
              body * { visibility: hidden !important; }
              #certificate-print-area, #certificate-print-area * { visibility: visible !important; }
              
              #certificate-print-area {
                position: absolute !important;
                top: 0 !important; 
                left: 0 !important;
                width: ${isPE ? '8.5in' : '210mm'} !important;
                height: ${isPE ? '14in' : '148mm'} !important;
                margin: 0 !important; 
                padding: 0 !important;
                background: white !important;
                display: block !important;
                z-index: 999999 !important;
                transform: none !important;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              
              #certificate-print-area > div { 
                position: absolute !important;
                top: 0 !important;
                left: 0 !important;
                transform: none !important;
                --tw-scale-x: 1 !important;
                --tw-scale-y: 1 !important;
                width: ${isPE ? '8.5in' : '210mm'} !important; 
                height: ${isPE ? '14in' : '148mm'} !important; 
                min-width: ${isPE ? '8.5in' : '210mm'} !important;
                max-width: ${isPE ? '8.5in' : '210mm'} !important;
                min-height: ${isPE ? '14in' : '148mm'} !important;
                max-height: ${isPE ? '14in' : '148mm'} !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: hidden !important;
                box-sizing: border-box !important;
              }
              
              .print-hide { display: none !important; }
            }
          `}</style>
          
          <div className="bg-white border border-gray-200 rounded-3xl shadow-2xl w-full max-w-7xl h-[90vh] flex flex-col overflow-hidden print:overflow-visible print:border-none print:shadow-none print:rounded-none">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white z-10 shrink-0 print:hidden">
              <div className="flex items-center gap-2">
                <div className="bg-teal-50 p-2 rounded-xl text-teal-600">
                  <Printer size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900 leading-tight">
                    Print Medical Certificate ({isPE ? 'Physical Examination' : 'Consultation'})
                  </h2>
                  <p className="text-xs text-gray-500">
                    {isPE 
                      ? 'Preview and print the official Gordon College Physical Examination certificate (Triplicate - Legal Size)'
                      : 'Preview and print the official Gordon College Consultation certificate (Half-Letter Size)'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setPreviewCert(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body: Split Layout */}
            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row print:overflow-visible">
              {/* Left Pane: Editor */}
              <div className="w-full lg:w-[45%] xl:w-[40%] p-6 space-y-4 border-r border-gray-100 bg-gray-50 overflow-y-auto custom-scrollbar print:hidden">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Edit Certificate Fields</h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date</label>
                    <input
                      type="text"
                      value={certDate}
                      onChange={(e) => setCertDate(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>

                  {!isPE ? (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                      <input
                        type="text"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Control No.</label>
                      <input
                        type="text"
                        value={controlNo}
                        onChange={(e) => setControlNo(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Patient Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Age</label>
                    <input
                      type="text"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Sex</label>
                    <select
                      value={sex}
                      onChange={(e) => setSex(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>

                  {isPE ? (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Student No.</label>
                      <input
                        type="text"
                        value={studentNo}
                        onChange={(e) => setStudentNo(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Date of Birth</label>
                      <input
                        type="text"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                      />
                    </div>
                  )}
                </div>

                {!isPE && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Department / College</label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                )}

                {isPE ? (
                  <div className="space-y-3 border-t border-gray-200 pt-3">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Physical Findings</label>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="radio"
                          checked={peFindingsOption === 'NORMAL'}
                          onChange={() => setPeFindingsOption('NORMAL')}
                          className="text-teal-600 focus:ring-teal-500"
                        />
                        <span>Essentially normal physical findings</span>
                      </label>
                      <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                        <input
                          type="radio"
                          checked={peFindingsOption === 'DIAGNOSIS'}
                          onChange={() => setPeFindingsOption('DIAGNOSIS')}
                          className="text-teal-600 focus:ring-teal-500"
                        />
                        <span>Diagnosis / Abnormal findings</span>
                      </label>
                    </div>

                    {peFindingsOption === 'DIAGNOSIS' && (
                      <textarea
                        rows={2}
                        value={forReason}
                        onChange={(e) => setForReason(e.target.value)}
                        placeholder="Enter diagnosis or findings..."
                        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none animate-in fade-in duration-200"
                      />
                    )}
                  </div>
                ) : (
                  <div className="border-t border-gray-200 pt-3">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Seen / Examined For</label>
                    <textarea
                      rows={2}
                      value={forReason}
                      onChange={(e) => setForReason(e.target.value)}
                      placeholder="Details of medical condition..."
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                    />
                  </div>
                )}

                {isPE && (
                  <div className="space-y-2 border-t border-gray-200 pt-3">
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider">Purpose</label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setPePurpose('ENROLMENT')}
                        className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                          pePurpose === 'ENROLMENT' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-500 bg-white'
                        }`}
                      >
                        Enrolment
                      </button>
                      <button
                        type="button"
                        onClick={() => setPePurpose('OJT')}
                        className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                          pePurpose === 'OJT' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-500 bg-white'
                        }`}
                      >
                        OJT/Internship
                      </button>
                      <button
                        type="button"
                        onClick={() => setPePurpose('RLE')}
                        className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                          pePurpose === 'RLE' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-500 bg-white'
                        }`}
                      >
                        R.L.E
                      </button>
                    </div>
                  </div>
                )}

                <div className="border-t border-gray-200 pt-3">
                  <label className="block text-xs font-medium text-gray-700 mb-1">Remarks</label>
                  <textarea
                    rows={2}
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Recommendations (e.g. Fit to resume classes)..."
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 border-t border-gray-200 pt-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Signatory Name</label>
                    <input
                      type="text"
                      value={signatoryName}
                      onChange={(e) => setSignatoryName(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">License No.</label>
                    <input
                      type="text"
                      value={licenseNo}
                      onChange={(e) => setLicenseNo(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Designation</label>
                  <input
                    type="text"
                    value={designation}
                    onChange={(e) => setDesignation(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Right Pane: Live Visual Preview */}
              <div id="certificate-print-area" className="flex-grow bg-gray-200 flex items-center justify-center overflow-auto print:max-h-none print:p-0 print:bg-white print:overflow-visible">
                {isPE ? (
                  /* Physical Exam Preview (Triplicate on Legal size) */
                  <div className="flex flex-col gap-[0.25in] bg-white print:gap-0 print:border-none print:shadow-none print:rounded-none w-[8.5in] h-[14in] shrink-0 print:w-full print:h-full print:transform-none transform scale-[0.45] sm:scale-[0.5] md:scale-[0.55] lg:scale-[0.6] origin-center my-[-30%] print:my-0">
                    <style>{`
                       @media print {
                         .pe-triplicate-item { 
                           height: 33.333% !important; 
                           margin-bottom: 0 !important; 
                           border-bottom: 1px dashed #ccc; 
                         }
                         .pe-triplicate-item:last-child { border-bottom: none; }
                       }
                    `}</style>
                    {['STUDENT\'S COPY', 'COORDINATOR\'S COPY', 'REGISTRAR\'S COPY'].map((copyLabel) => (
                      <div key={copyLabel} className="pe-triplicate-item flex-1 bg-white border border-gray-300 shadow-sm p-6 text-black font-serif relative select-none print:shadow-none print:border-none">
                        <div className="absolute top-6 right-6 border border-black px-1.5 py-0.5 text-[8px] font-sans font-black tracking-widest uppercase">
                          {copyLabel}
                        </div>
                        <div className="flex items-start gap-4 border-b border-black pb-2">
                          <div className="flex gap-1 shrink-0">
                            <img src="/icons/gc-logo.png" alt="GC Logo" className="w-12 h-12" />
                          </div>
                          <div className="flex-1 text-center font-sans tracking-tight">
                            <h4 className="text-[12px] font-bold uppercase leading-none">Gordon College</h4>
                            <p className="text-[8px] text-gray-600 mt-1 leading-none">Olongapo City Sports Complex, Donor Street, East Tapinac, Olongapo City</p>
                            <p className="text-[8px] text-gray-600 mt-1 leading-none">Tel. No.: (047) 222-4080</p>
                            <p className="text-[9px] font-bold uppercase text-gray-700 mt-1 leading-none">Office of Student Welfare and Services</p>
                            <p className="text-[10px] font-black uppercase text-teal-800 tracking-wide leading-none mt-1">Health Services Unit</p>
                          </div>
                          <img src="/icons/clinic-logo.png" alt="Clinic Logo" className="w-12 h-12 shrink-0" />
                        </div>
                        <div className="text-center my-4">
                          <h3 className="text-[14px] font-bold uppercase tracking-[0.3em] text-black leading-tight">M E D I C A L &nbsp; C E R T I F I C A T E</h3>
                        </div>
                        <p className="text-[11px] leading-relaxed">
                          This is to certify that Mr./Ms. <span className="font-bold underline px-1">{fullName || '__________________________'}</span> 
                          Age <span className="font-bold underline px-1">{age || '___'}</span> 
                          Sex <span className="font-bold underline px-1">{sex || '______'}</span> 
                          has submitted all required medical requirements and upon physical examination.
                        </p>
                        <div className="text-[11px] space-y-1.5 mt-4">
                          <p className="font-bold">Findings:</p>
                          <div className="pl-4 space-y-1">
                            <p>({peFindingsOption === 'NORMAL' ? 'x' : ' '}) Essentially normal physical findings at the time of evaluation</p>
                            <p>({peFindingsOption === 'DIAGNOSIS' ? 'x' : ' '}) Diagnosis: <span className="underline px-1">{peFindingsOption === 'DIAGNOSIS' ? forReason : '____________________________________________________'}</span></p>
                          </div>
                        </div>
                        <div className="text-[11px] mt-4">
                          Remarks: <span className="underline px-1">{remarks || '__________________________________________________________________________'}</span>
                        </div>
                        <div className="text-[11px] mt-2">
                          This was issued on <span className="underline px-1 font-bold">{certDate || '__________________'}</span> at the College Clinic for Enrolment purposes only.
                        </div>
                        <div className="text-[11px] flex gap-6 mt-4">
                          <span className="font-bold">Purpose:</span>
                          <span>({pePurpose === 'ENROLMENT' ? 'x' : ' '}) Enrolment</span>
                          <span>({pePurpose === 'OJT' ? 'x' : ' '}) OJT / Internship</span>
                          <span>({pePurpose === 'RLE' ? 'x' : ' '}) R.L.E</span>
                        </div>
                        <div className="flex justify-between items-end text-[11px] pt-6 mt-4 border-t border-gray-100">
                          <div className="space-y-1">
                            <p>Control No.: <span className="font-bold underline">{controlNo}</span></p>
                            <p>Student No.: <span className="font-bold underline">{studentNo}</span></p>
                          </div>
                          <div className="text-right font-sans">
                            <p className="font-bold uppercase text-[11px] tracking-tight">{signatoryName || '_______________________'}</p>
                            <p className="text-[9px] text-gray-500 uppercase leading-none mt-1">{designation || 'College Physician'}</p>
                            {licenseNo && <p className="text-[9px] text-gray-500 uppercase leading-none mt-1">License No. {licenseNo}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* Consultation Preview (A5 / Half Letter) */
                  <div className="w-[210mm] h-[148mm] bg-white border border-gray-200 shadow-sm p-8 relative flex flex-col justify-between text-black rounded font-serif select-none shrink-0 print:w-full print:h-full print:border-none print:shadow-none print:rounded-none transform scale-[0.6] md:scale-[0.8] lg:scale-[0.9] origin-center my-[-10%] print:transform-none print:my-0">
                    <div className="space-y-6">
                      <div className="flex items-start gap-4 border-b border-black/40 pb-4">
                        <img src="/icons/gc-logo.png" alt="GC Logo" className="w-16 h-16 shrink-0" />
                        <div className="flex-1 text-center font-sans tracking-tight">
                          <p className="text-[14px] font-bold uppercase leading-none">Gordon College</p>
                          <p className="text-[10px] text-gray-600 mt-1 leading-none">Olongapo City Sports Complex, Donor Street, East Tapinac, Olongapo City</p>
                          <p className="text-[10px] text-gray-600 mt-1 leading-none">Tel. No.: (047) 222-4080 | www.gordoncollege.edu.ph</p>
                          <p className="text-[12px] font-black uppercase text-teal-800 tracking-wider mt-2 leading-none">Health Services Unit</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <img src="/icons/clinic-logo.png" alt="Clinic Logo" className="w-16 h-16" />
                        </div>
                      </div>
                      <div className="text-center">
                        <h4 className="text-[18px] font-bold uppercase tracking-widest text-black leading-tight">Medical Certificate</h4>
                      </div>
                      <div className="flex justify-end text-[12px]">
                        <p>Date: <span className="font-bold underline px-1">{certDate || '________________'}</span></p>
                      </div>
                      <div className="space-y-4 text-[12px] leading-relaxed">
                        <div className="flex justify-between gap-4">
                          <div className="flex-1">
                            Name: <span className="font-bold underline px-1">{fullName || '__________________________________'}</span>
                          </div>
                          <div className="w-24">
                            Age: <span className="font-bold underline px-1">{age || '____'}</span>
                          </div>
                          <div className="w-32">
                            Status: <span className="font-bold underline px-1">{status || '_________'}</span>
                          </div>
                        </div>
                        <div className="flex justify-between gap-4">
                          <div className="flex-1">
                            Department: <span className="font-bold underline px-1">{department || '____________________'}</span>
                          </div>
                          <div className="w-40 flex items-center gap-2">
                            Sex: 
                            <span>({sex === 'Male' ? 'x' : ' '}) Male</span>
                            <span>({sex === 'Female' ? 'x' : ' '}) Female</span>
                          </div>
                          <div className="w-48">
                            Date of Birth: <span className="font-bold underline px-1">{dob || '________________'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-[12px] leading-relaxed space-y-4 pt-2">
                        <p className="italic text-gray-800 font-sans">
                          The student was seen by the college physician/ nurse on duty:
                        </p>
                        <div className="space-y-1">
                          <p className="font-bold">For:</p>
                          <p className="underline leading-loose pl-6 break-words whitespace-pre-wrap">
                            {forReason || '____________________________________________________________________________________'}
                          </p>
                        </div>
                        <div className="space-y-1 mt-4">
                          <p className="font-bold">Remarks:</p>
                          <p className="underline leading-loose pl-6 break-words whitespace-pre-wrap">
                            {remarks || '____________________________________________________________________________________'}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-end text-[12px] pt-12">
                      <div className="text-center w-64">
                        <p className="font-bold underline leading-none uppercase">{signatoryName || '_________________________'}</p>
                        <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-wider leading-none">Signature Over Printed Name</p>
                      </div>
                      <div className="text-center w-64">
                        <p className="font-bold underline leading-none uppercase">{designation || '_________________________'}</p>
                        <p className="text-[10px] text-gray-500 mt-2 uppercase tracking-wider leading-none">Designation</p>
                        {licenseNo && <p className="text-[10px] text-gray-500 mt-1 uppercase leading-none">License No. {licenseNo}</p>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3 sticky bottom-0 bg-white z-10 shrink-0 print:hidden">
              <button
                onClick={() => setPreviewCert(null)}
                className="px-5 py-2 border border-gray-200 text-gray-700 hover:text-gray-900 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => window.print()}
                className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors"
              >
                <Printer size={16} /> Print Certificate
              </button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
