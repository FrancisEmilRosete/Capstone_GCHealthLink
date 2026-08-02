'use client';

import React, { useState, useEffect } from 'react';
import { X, Printer, FileText } from 'lucide-react';
import { getNormalizedUserRole } from '@/lib/auth';

interface UiStudent {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  mi?: string;
  course?: string;
  college?: string;
  yearLevel?: string;
  age?: string | number;
  sex?: string;
  dob?: string;
}

interface MedicalCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: UiStudent;
  certificateType: 'CONSULTATION' | 'PHYSICAL_EXAM';
}

const MedicalCertificateModal: React.FC<MedicalCertificateModalProps> = ({
  isOpen,
  onClose,
  student,
  certificateType,
}) => {
  const role = getNormalizedUserRole();
  const isNurse = role === 'CLINIC_STAFF';

  // State variables for fields
  const [certDate, setCertDate] = useState('');
  const [fullName, setFullName] = useState('');
  const [age, setAge] = useState('');
  const [status, setStatus] = useState('Student');
  const [department, setDepartment] = useState('');
  const [sex, setSex] = useState('');
  const [dob, setDob] = useState('');
  const [forReason, setForReason] = useState('');
  const [remarks, setRemarks] = useState('');
  const [signatoryName, setSignatoryName] = useState('');
  const [designation, setDesignation] = useState('');
  const [licenseNo, setLicenseNo] = useState('');

  // Physical Exam specific states
  const [peFindingsOption, setPeFindingsOption] = useState<'NORMAL' | 'DIAGNOSIS'>('NORMAL');
  const [peDiagnosis, setPeDiagnosis] = useState('');
  const [pePurpose, setPePurpose] = useState<'ENROLMENT' | 'OJT' | 'RLE'>('ENROLMENT');
  const [controlNo, setControlNo] = useState('');
  const [studentNo, setStudentNo] = useState('');

  const [isPrinting, setIsPrinting] = useState(false);

  useEffect(() => {
    if (student) {
      const today = new Date().toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      setCertDate(today);

      const mName = student.mi ? `${student.mi}. ` : '';
      setFullName(`${student.lastName}, ${student.firstName} ${mName}`.trim());
      setAge(student.age ? String(student.age) : '');
      setDepartment(student.course || student.college || 'N/A');
      setSex(student.sex || '');
      setStudentNo(student.studentNumber);
      setControlNo(`PE-${Date.now().toString().slice(-6)}`);

      let formattedDob = student.dob || '';
      if (student.dob && student.dob.includes('-')) {
        try {
          formattedDob = new Date(student.dob).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          });
        } catch {
          // ignore
        }
      }
      setDob(formattedDob);

      setRemarks('Fit to resume classes');

      if (certificateType === 'PHYSICAL_EXAM') {
        setForReason('Annual Physical Examination findings are normal and healthy.');
        setPeFindingsOption('NORMAL');
        setPeDiagnosis('');
        setPePurpose('ENROLMENT');

        // Defaults matching the provided image
        setSignatoryName('GERALD S. BERNAL, MD');
        setDesignation('College Physician');
        setLicenseNo('0084558');
      } else {
        setForReason('Medical Consultation due to acute symptoms.');

        if (isNurse) {
          setSignatoryName('Juana Dela Cruz, RN');
          setDesignation('College Nurse');
          setLicenseNo('123456');
        } else {
          setSignatoryName('Dr. Juan Dela Cruz, MD');
          setDesignation('College Physician');
          setLicenseNo('123456');
        }
      }
    }
  }, [student, certificateType, isNurse]);

  if (!isOpen || !student) return null;

  const handlePrint = () => {
    setIsPrinting(true);
    const originalTitle = document.title;
    const sanitizedLastName = student.lastName.replace(/[^a-zA-Z0-9]/g, '');
    const sanitizedFirstName = student.firstName.replace(/[^a-zA-Z0-9]/g, '');
    document.title = `${sanitizedLastName}-${sanitizedFirstName}_Medical_Certificate`;

    setTimeout(() => {
      window.print();
      setIsPrinting(false);
      document.title = originalTitle;
    }, 150);
  };

  const isPE = certificateType === 'PHYSICAL_EXAM';

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
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 leading-tight">
                Give Medical Certificate ({isPE ? 'Physical Examination' : 'Consultation'})
              </h2>
              <p className="text-xs text-gray-500">
                {isPE
                  ? 'Preview and print the official Gordon College Physical Examination certificate (Triplicate - Legal Size)'
                  : 'Preview and print the official Gordon College Consultation certificate (Half-Letter Size)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
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
                    value={peDiagnosis}
                    onChange={(e) => setPeDiagnosis(e.target.value)}
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
                    className={`py-2 rounded-xl border text-xs font-bold transition-all ${pePurpose === 'ENROLMENT' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-500 bg-white'
                      }`}
                  >
                    Enrolment
                  </button>
                  <button
                    type="button"
                    onClick={() => setPePurpose('OJT')}
                    className={`py-2 rounded-xl border text-xs font-bold transition-all ${pePurpose === 'OJT' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-500 bg-white'
                      }`}
                  >
                    OJT/Internship
                  </button>
                  <button
                    type="button"
                    onClick={() => setPePurpose('RLE')}
                    className={`py-2 rounded-xl border text-xs font-bold transition-all ${pePurpose === 'RLE' ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-500 bg-white'
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
                        <p>({peFindingsOption === 'DIAGNOSIS' ? 'x' : ' '}) Diagnosis: <span className="underline px-1">{peFindingsOption === 'DIAGNOSIS' ? peDiagnosis : '____________________________________________________'}</span></p>
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
            onClick={onClose}
            className="px-5 py-2 border border-gray-200 text-gray-700 hover:text-gray-900 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-6 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors"
          >
            <Printer size={16} /> Print Certificate
          </button>
        </div>
      </div>
    </div>
  );
};

export default MedicalCertificateModal;
