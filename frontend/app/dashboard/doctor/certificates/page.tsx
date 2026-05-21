'use client';

import { useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { FileText, Search, Printer } from 'lucide-react';
import UseQrLookupModal, { type QrResolvedStudent } from '@/components/scanner/UseQrLookupModal';
import PaginationControls from '@/components/ui/PaginationControls';

interface Certificate {
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

  useEffect(() => {
    loadCertificates(search);
  }, [activeTab]);

  async function loadCertificates(q = '') {
    try {
      const token = getToken();
      if (!token) return;
      setLoading(true);
      const res = await api.get<{ data: Certificate[] }>(`/certificates?q=${q}`, token);
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

  // Individual Print
  const handlePrint = (cert: Certificate) => {
    alert(`Printing Certificate for ${cert.student}...`);
    window.print();
  };

  // Batch Print
  const handleBatchPrint = () => {
    if (filtered.length === 0) {
      alert("No certificates match the current filters to print.");
      return;
    }
    alert(`Batch Printing ${filtered.length} Certificates...`);
    window.print();
  };

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
            <FileText className="text-teal-600" /> Automated Certificates
          </h1>
          <p className="text-sm text-gray-500 mt-1">Automatically generated certificates from completed sessions.</p>
        </div>
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
        onResolved={(student: QrResolvedStudent) => {
          setSearch(student.studentNumber);
        }}
        onNotFound={() => {
          alert('Student not found. Please try another QR.');
        }}
      />
    </div>
  );
}
