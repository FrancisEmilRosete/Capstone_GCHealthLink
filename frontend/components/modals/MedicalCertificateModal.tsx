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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:bg-transparent print:p-0 print:backdrop-blur-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[95vh] flex flex-col overflow-hidden ring-1 ring-white/10 print:hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <div className="flex items-center gap-2">
            <div className="bg-teal-500/10 p-2 rounded-xl text-teal-400">
              <FileText size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white leading-tight">
                Give Medical Certificate ({isPE ? 'Physical Examination' : 'Consultation'})
              </h2>
              <p className="text-xs text-slate-400">
                {isPE 
                  ? 'Preview and print the official Gordon College Physical Examination certificate (Triplicate - Legal Size)'
                  : 'Preview and print the official Gordon College Consultation certificate (Half-Letter Size)'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors hover:bg-slate-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body: Split Layout */}
        <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row">
          {/* Left Pane: Editor */}
          <div className="w-full lg:w-[45%] p-6 space-y-4 border-r border-slate-800 bg-slate-950/40 overflow-y-auto">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Edit Certificate Fields</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Date</label>
                <input
                  type="text"
                  value={certDate}
                  onChange={(e) => setCertDate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              {!isPE ? (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
                  <input
                    type="text"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Control No.</label>
                  <input
                    type="text"
                    value={controlNo}
                    onChange={(e) => setControlNo(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-xs font-medium text-slate-400 mb-1">Patient Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Age</label>
                <input
                  type="text"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Sex</label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>

              {isPE ? (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Student No.</label>
                  <input
                    type="text"
                    value={studentNo}
                    onChange={(e) => setStudentNo(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Date of Birth</label>
                  <input
                    type="text"
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              )}
            </div>

            {!isPE && (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Department / College</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            )}

            {/* Findings Editor */}
            {isPE ? (
              <div className="space-y-3 border-t border-slate-850 pt-3">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Physical Findings</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                    <input
                      type="radio"
                      name="findingsOpt"
                      checked={peFindingsOption === 'NORMAL'}
                      onChange={() => setPeFindingsOption('NORMAL')}
                      className="text-teal-600 focus:ring-teal-500"
                    />
                    <span>Essentially normal physical findings</span>
                  </label>
                  <label className="flex items-center gap-2 text-sm text-white cursor-pointer">
                    <input
                      type="radio"
                      name="findingsOpt"
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
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none animate-in fade-in duration-200"
                  />
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Seen / Examined For</label>
                <textarea
                  rows={2}
                  value={forReason}
                  onChange={(e) => setForReason(e.target.value)}
                  placeholder="Details of medical condition..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                />
              </div>
            )}

            {/* Purpose for PE */}
            {isPE && (
              <div className="space-y-2 border-t border-slate-850 pt-3">
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">Purpose</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPePurpose('ENROLMENT')}
                    className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                      pePurpose === 'ENROLMENT' ? 'border-teal-500 bg-teal-500/10 text-teal-400' : 'border-slate-800 text-slate-400'
                    }`}
                  >
                    Enrolment
                  </button>
                  <button
                    type="button"
                    onClick={() => setPePurpose('OJT')}
                    className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                      pePurpose === 'OJT' ? 'border-teal-500 bg-teal-500/10 text-teal-400' : 'border-slate-800 text-slate-400'
                    }`}
                  >
                    OJT/Internship
                  </button>
                  <button
                    type="button"
                    onClick={() => setPePurpose('RLE')}
                    className={`py-2 rounded-xl border text-xs font-bold transition-all ${
                      pePurpose === 'RLE' ? 'border-teal-500 bg-teal-500/10 text-teal-400' : 'border-slate-800 text-slate-400'
                    }`}
                  >
                    R.L.E
                  </button>
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Remarks</label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Recommendations (e.g. Fit to resume classes)..."
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 border-t border-slate-850 pt-3">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Signatory Name</label>
                <input
                  type="text"
                  value={signatoryName}
                  onChange={(e) => setSignatoryName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">License No.</label>
                <input
                  type="text"
                  value={licenseNo}
                  onChange={(e) => setLicenseNo(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">Designation</label>
              <input
                type="text"
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>
          </div>

          {/* Right Pane: Live Visual Preview */}
          <div className="flex-grow p-6 bg-slate-950 flex items-center justify-center overflow-y-auto max-h-[80vh] lg:max-h-none">
            {isPE ? (
              /* Physical Exam Preview (Triplicate on Legal size, scaled down to fit) */
              <div className="flex flex-col gap-4 overflow-y-auto max-h-[70vh] p-2 bg-slate-900 border border-slate-800 rounded-2xl">
                <span className="text-[10px] text-center font-bold text-slate-500 uppercase tracking-widest">Triplicate Preview (Legal Size aspect ratio)</span>
                
                {['STUDENT\'S COPY', 'COORDINATOR\'S COPY', 'REGISTRAR\'S COPY'].map((copyLabel) => (
                  <div key={copyLabel} className="w-[420px] bg-white border border-slate-300 shadow-md p-5 text-black font-serif rounded relative select-none">
                    {/* Copy Box Badge */}
                    <div className="absolute top-10 right-4 border border-black px-1.5 py-0.5 text-[6.5px] font-sans font-black tracking-widest uppercase">
                      {copyLabel}
                    </div>

                    {/* Header */}
                    <div className="flex items-start gap-2 border-b border-black pb-1.5">
                      <div className="flex gap-0.5 shrink-0">
                        <img src="/icons/gc-logo.png" alt="GC Logo" className="w-8 h-8" />
                        <img src="/icons/gc-logo.png" alt="GC Logo" className="w-8 h-8" />
                      </div>
                      <div className="flex-1 text-center font-sans tracking-tight">
                        <h4 className="text-[9px] font-bold uppercase leading-none">Gordon College</h4>
                        <p className="text-[5.5px] text-slate-600 mt-0.5 leading-none">Olongapo City Sports Complex, Donor Street, East Tapinac, Olongapo City</p>
                        <p className="text-[5.5px] text-slate-600 mt-0.5 leading-none">Tel. No.: (047) 222-4080</p>
                        <p className="text-[6.5px] font-bold uppercase text-slate-700 mt-0.5 leading-none">Office of Student Welfare and Services</p>
                        <p className="text-[7.5px] font-black uppercase text-teal-800 tracking-wide leading-none mt-0.5">Health Services Unit</p>
                      </div>
                      <img src="/icons/clinic-logo.png" alt="Clinic Logo" className="w-8 h-8 shrink-0" />
                    </div>

                    {/* Title */}
                    <div className="text-center my-2">
                      <h3 className="text-[10px] font-bold uppercase tracking-[0.3em] text-slate-900 leading-tight">M E D I C A L &nbsp; C E R T I F I C A T E</h3>
                    </div>

                    {/* Main statement */}
                    <p className="text-[7.5px] leading-relaxed">
                      This is to certify that Mr./Ms. <span className="font-bold underline px-1">{fullName || '__________________________'}</span> 
                      Age <span className="font-bold underline px-1">{age || '___'}</span> 
                      Sex <span className="font-bold underline px-1">{sex || '______'}</span> 
                      has submitted all required medical requirements and upon physical examination.
                    </p>

                    {/* Findings checkboxes */}
                    <div className="text-[7.5px] space-y-1 mt-2">
                      <p className="font-bold">Findings:</p>
                      <div className="pl-3 space-y-0.5">
                        <p>({peFindingsOption === 'NORMAL' ? 'x' : ' '}) Essentially normal physical findings at the time of evaluation</p>
                        <p>({peFindingsOption === 'DIAGNOSIS' ? 'x' : ' '}) Diagnosis: <span className="underline px-1">{peFindingsOption === 'DIAGNOSIS' ? peDiagnosis : '____________________________________________________'}</span></p>
                      </div>
                    </div>

                    {/* Remarks */}
                    <div className="text-[7.5px] mt-2">
                      Remarks: <span className="underline px-1">{remarks || '__________________________________________________________________________'}</span>
                    </div>

                    {/* Issue string */}
                    <div className="text-[7.5px] mt-1">
                      This was issued on <span className="underline px-1 font-bold">{certDate || '__________________'}</span> at the College Clinic for Enrolment purposes only.
                    </div>

                    {/* Purpose checkboxes */}
                    <div className="text-[7.5px] flex gap-4 mt-2">
                      <span className="font-bold">Purpose:</span>
                      <span>({pePurpose === 'ENROLMENT' ? 'x' : ' '}) Enrolment</span>
                      <span>({pePurpose === 'OJT' ? 'x' : ' '}) OJT / Internship</span>
                      <span>({pePurpose === 'RLE' ? 'x' : ' '}) R.L.E</span>
                    </div>

                    {/* Signatures & Codes */}
                    <div className="flex justify-between items-end text-[7.5px] pt-4 mt-1 border-t border-slate-100">
                      <div className="space-y-0.5">
                        <p>Control No.: <span className="font-bold underline">{controlNo}</span></p>
                        <p>Student No.: <span className="font-bold underline">{studentNo}</span></p>
                      </div>

                      <div className="text-right font-sans">
                        <p className="font-bold uppercase text-[8px] tracking-tight">{signatoryName || '_______________________'}</p>
                        <p className="text-[6px] text-slate-500 uppercase leading-none">College Physician</p>
                        <p className="text-[6px] text-slate-500 uppercase leading-none">License No. {licenseNo}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Consultation Preview (A5 / Half Letter) */
              <div className="w-[420px] h-[600px] bg-white border border-slate-200 shadow-2xl p-6 relative flex flex-col justify-between text-black rounded font-serif select-none">
                <div className="space-y-4">
                  {/* Header */}
                  <div className="flex items-start gap-2 border-b border-black/40 pb-2">
                    <img src="/icons/gc-logo.png" alt="GC Logo" className="w-10 h-10 shrink-0" />
                    <div className="flex-1 text-center font-sans tracking-tight">
                      <p className="text-[10px] font-bold uppercase leading-none">Gordon College</p>
                      <p className="text-[6.5px] text-slate-600 mt-0.5 leading-none">Olongapo City Sports Complex, Donor Street, East Tapinac, Olongapo City</p>
                      <p className="text-[6.5px] text-slate-600 mt-0.5 leading-none">Tel. No.: (047) 222-4080 | www.gordoncollege.edu.ph</p>
                      <p className="text-[8px] font-black uppercase text-teal-800 tracking-wider mt-1 leading-none">Health Services Unit</p>
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      <img src="/icons/gc-logo.png" alt="GC Logo" className="w-10 h-10" />
                      <img src="/icons/clinic-logo.png" alt="Clinic Logo" className="w-10 h-10" />
                    </div>
                  </div>

                  {/* Title */}
                  <div className="text-center">
                    <h4 className="text-[12px] font-bold uppercase tracking-widest text-slate-900 leading-tight">Medical Certificate</h4>
                  </div>

                  {/* Date */}
                  <div className="flex justify-end text-[9px]">
                    <p>Date: <span className="font-bold underline px-1">{certDate || '________________'}</span></p>
                  </div>

                  {/* Patient Details */}
                  <div className="space-y-2 text-[8px] leading-relaxed">
                    <div className="flex justify-between gap-2">
                      <div className="flex-1">
                        Name: <span className="font-bold underline px-1">{fullName || '__________________________________'}</span>
                      </div>
                      <div className="w-16">
                        Age: <span className="font-bold underline px-1">{age || '____'}</span>
                      </div>
                      <div className="w-24">
                        Status: <span className="font-bold underline px-1">{status || '_________'}</span>
                      </div>
                    </div>

                    <div className="flex justify-between gap-2">
                      <div className="flex-1">
                        Department: <span className="font-bold underline px-1">{department || '____________________'}</span>
                      </div>
                      <div className="w-28 flex items-center gap-1.5">
                        Sex: 
                        <span>({sex === 'Male' ? 'x' : ' '}) Male</span>
                        <span>({sex === 'Female' ? 'x' : ' '}) Female</span>
                      </div>
                      <div className="w-32">
                        Date of Birth: <span className="font-bold underline px-1">{dob || '________________'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Body Statement */}
                  <div className="text-[8.5px] leading-relaxed space-y-3 pt-1">
                    <p className="italic text-slate-800 font-sans">
                      The student was seen by the college physician/ nurse on duty:
                    </p>
                    
                    <div className="space-y-1">
                      <p className="font-bold">For:</p>
                      <p className="underline leading-loose pl-4 break-words whitespace-pre-wrap">
                        {forReason || '____________________________________________________________________________________'}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="font-bold">Remarks:</p>
                      <p className="underline leading-loose pl-4 break-words whitespace-pre-wrap">
                        {remarks || '____________________________________________________________________________________'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Signatures */}
                <div className="flex justify-between items-end text-[8.5px] pt-12">
                  <div className="text-center w-40">
                    <p className="font-bold underline leading-none uppercase">{signatoryName || '_________________________'}</p>
                    <p className="text-[7.5px] text-slate-500 mt-1 uppercase tracking-wider leading-none">Signature Over Printed Name</p>
                  </div>
                  
                  <div className="text-center w-40">
                    <p className="font-bold underline leading-none uppercase">{designation || '_________________________'}</p>
                    <p className="text-[7.5px] text-slate-500 mt-1 uppercase tracking-wider leading-none">Designation</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 flex justify-end gap-3 sticky bottom-0 bg-slate-900 z-10">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-800 text-slate-400 hover:text-white rounded-xl text-sm font-semibold hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 bg-teal-500 hover:bg-teal-600 text-white px-6 py-2 rounded-xl text-sm font-semibold shadow-lg shadow-teal-500/10 transition-colors"
          >
            <Printer size={16} /> Print Certificate
          </button>
        </div>
      </div>

      {/* ── Print-Only Consultation Certificate (A5 / Half Letter size) ── */}
      {!isPE && (
        <div
          id="print-medcert-content"
          className="hidden print:block w-full text-black bg-white"
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
        >
          <div className="space-y-6">
            <div className="flex items-start justify-between border-b-2 border-black/80 pb-3">
              <img src="/icons/gc-logo.png" alt="GC Logo" className="w-14 h-14 shrink-0" />
              <div className="flex-1 text-center tracking-tight">
                <h1 className="text-[15px] font-bold uppercase leading-none">Gordon College</h1>
                <p className="text-[9.5px] text-slate-700 mt-1 leading-none">Olongapo City Sports Complex, Donor Street, East Tapinac, Olongapo City 2200</p>
                <p className="text-[9.5px] text-slate-700 mt-1 leading-none">Tel. No.: (047) 222-4080 | www.gordoncollege.edu.ph</p>
                <p className="text-[12px] font-black uppercase text-teal-800 tracking-wider mt-2 leading-none">Health Services Unit</p>
              </div>
              <div className="flex gap-1 shrink-0">
                <img src="/icons/gc-logo.png" alt="GC Logo" className="w-14 h-14" />
                <img src="/icons/clinic-logo.png" alt="Clinic Logo" className="w-14 h-14" />
              </div>
            </div>

            <div className="text-center pt-2">
              <h2 className="text-[18px] font-bold uppercase tracking-widest text-black leading-tight underline">Medical Certificate</h2>
            </div>

            <div className="flex justify-end text-[12px] pt-2">
              <p>Date: <span className="font-bold underline px-1">{certDate || '________________'}</span></p>
            </div>

            <div className="space-y-4 text-[12px] leading-relaxed pt-2">
              <div className="flex justify-between gap-4">
                <div className="flex-1">
                  Name: <span className="font-bold underline px-1">{fullName || '__________________________________'}</span>
                </div>
                <div className="w-24">
                  Age: <span className="font-bold underline px-1">{age || '____'}</span>
                </div>
                <div className="w-36">
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

            <div className="text-[12px] leading-relaxed space-y-5 pt-4">
              <p className="italic text-slate-800 font-sans">
                The student was seen by the college physician/ nurse on duty:
              </p>
              
              <div className="space-y-1">
                <p className="font-bold">For:</p>
                <p className="underline leading-loose pl-4 break-words whitespace-pre-wrap">
                  {forReason || '____________________________________________________________________________________'}
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-bold">Remarks:</p>
                <p className="underline leading-loose pl-4 break-words whitespace-pre-wrap">
                  {remarks || '____________________________________________________________________________________'}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-end text-[12px] pt-24 px-4">
            <div className="text-center w-52">
              <p className="font-bold underline leading-none uppercase">{signatoryName || '_________________________'}</p>
              <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-wider leading-none">Signature Over Printed Name</p>
            </div>
            
            <div className="text-center w-52">
              <p className="font-bold underline leading-none uppercase">{designation || '_________________________'}</p>
              <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-wider leading-none">Designation</p>
            </div>
          </div>
        </div>
      )}

      {/* ── Print-Only Physical Exam Certificate (Triplicate on Legal size, 8.5in x 14in) ── */}
      {isPE && (
        <div
          id="print-medcert-content"
          className="hidden print:block w-full text-black bg-white"
          style={{ fontFamily: "'Times New Roman', Times, serif" }}
        >
          <div className="flex flex-col justify-between h-[13in]">
            {['STUDENT\'S COPY', 'COORDINATOR\'S COPY', 'REGISTRAR\'S COPY'].map((copyLabel, idx) => (
              <div
                key={copyLabel}
                className="w-full relative flex flex-col justify-between py-6 px-4"
                style={{
                  height: '4.1in',
                  borderBottom: idx < 2 ? '1px dashed #000' : 'none',
                  pageBreakInside: 'avoid',
                }}
              >
                {/* Badge copy box */}
                <div className="absolute top-10 right-4 border-2 border-black px-3 py-1 text-[10px] font-sans font-black tracking-widest uppercase">
                  {copyLabel}
                </div>

                {/* Header */}
                <div className="flex items-start gap-4 border-b border-black pb-2">
                  <div className="flex gap-1 shrink-0">
                    <img src="/icons/gc-logo.png" alt="GC Logo" className="w-12 h-12" />
                    <img src="/icons/gc-logo.png" alt="GC Logo" className="w-12 h-12" />
                  </div>
                  <div className="flex-1 text-center font-sans tracking-tight">
                    <h4 className="text-[13px] font-bold uppercase leading-none">Gordon College</h4>
                    <p className="text-[8px] text-slate-700 mt-1 leading-none">Olongapo City Sports Complex, Donor Street, East Tapinac, Olongapo City</p>
                    <p className="text-[8px] text-slate-700 mt-1 leading-none">Tel. No.: (047) 222-4080</p>
                    <p className="text-[9px] font-bold uppercase text-slate-700 mt-1 leading-none">Office of Student Welfare and Services</p>
                    <p className="text-[11px] font-black uppercase text-teal-800 tracking-wide mt-1 leading-none">Health Services Unit</p>
                  </div>
                  <img src="/icons/clinic-logo.png" alt="Clinic Logo" className="w-12 h-12 shrink-0" />
                </div>

                {/* Title */}
                <div className="text-center my-3">
                  <h3 className="text-[14px] font-black uppercase tracking-[0.4em] text-black leading-none">
                    M E D I C A L &nbsp; C E R T I F I C A T E
                  </h3>
                </div>

                {/* Main certification statement */}
                <p className="text-[11px] leading-relaxed mt-2 text-justify">
                  This is to certify that Mr./Ms. <span className="font-bold underline px-1">{fullName || '__________________________'}</span> 
                  Age <span className="font-bold underline px-1">{age || '___'}</span> 
                  Sex <span className="font-bold underline px-1">{sex || '______'}</span> 
                  has submitted all required medical requirements and upon physical examination.
                </p>

                {/* Findings checkboxes */}
                <div className="text-[11px] space-y-1 mt-3">
                  <p className="font-bold">Findings:</p>
                  <div className="pl-6 space-y-1">
                    <p>({peFindingsOption === 'NORMAL' ? 'x' : ' '}) Essentially normal physical findings at the time of evaluation</p>
                    <p>({peFindingsOption === 'DIAGNOSIS' ? 'x' : ' '}) Diagnosis: <span className="underline px-1 font-bold">{peFindingsOption === 'DIAGNOSIS' ? peDiagnosis : '____________________________________________________________________'}</span></p>
                  </div>
                </div>

                {/* Remarks */}
                <div className="text-[11px] mt-3">
                  Remarks: <span className="underline px-1 font-bold">{remarks || '__________________________________________________________________________'}</span>
                </div>

                {/* Issue date/time details */}
                <div className="text-[11px] mt-2">
                  This was issued on <span className="underline px-1 font-bold">{certDate || '__________________'}</span> at the College Clinic for Enrolment purposes only.
                </div>

                {/* Purpose checkboxes */}
                <div className="text-[11px] flex gap-8 mt-3">
                  <span className="font-bold">Purpose:</span>
                  <span>({pePurpose === 'ENROLMENT' ? 'x' : ' '}) Enrolment</span>
                  <span>({pePurpose === 'OJT' ? 'x' : ' '}) OJT / Internship</span>
                  <span>({pePurpose === 'RLE' ? 'x' : ' '}) R.L.E</span>
                </div>

                {/* Footnotes: Signatures & Codes */}
                <div className="flex justify-between items-end text-[10px] pt-4 mt-2 border-t border-black/30">
                  <div className="space-y-1">
                    <p>Control No.: <span className="font-bold underline">{controlNo}</span></p>
                    <p>Student No.: <span className="font-bold underline">{studentNo}</span></p>
                  </div>

                  <div className="text-right font-sans leading-tight">
                    <p className="font-bold uppercase text-[11px] tracking-tight">{signatoryName || '_______________________'}</p>
                    <p className="text-[8px] text-slate-600 uppercase leading-none font-bold mt-1">College Physician</p>
                    <p className="text-[8px] text-slate-600 uppercase leading-none font-bold">License No. {licenseNo}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CSS Styles injection during print */}
      {isPrinting && (
        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #print-medcert-content, #print-medcert-content * {
              visibility: visible !important;
            }
            #print-medcert-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100% !important;
              display: block !important;
            }
            @page {
              size: ${isPE ? '8.5in 14in' : '5.5in 8.5in'};
              margin: ${isPE ? '0.2in 0.4in' : '0.4in'};
            }
          }
        `}</style>
      )}
    </div>
  );
};

export default MedicalCertificateModal;
