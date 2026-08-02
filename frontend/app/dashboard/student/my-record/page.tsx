'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

import { api, ApiError } from '@/lib/api';
import { getToken } from '@/lib/auth';
import { normalizeComplaintDisplay } from '@/lib/complaint';
import { formatTime12Hour } from '@/lib/time';

interface VisitMedicine {
  quantity: number;
  inventory: {
    itemName: string;
    unit: string;
  };
}

interface ClinicVisit {
  id: string;
  visitDate: string;
  visitTime: string | null;
  chiefComplaintEnc: string | null;
  handledBy: {
    email: string;
  };
  dispensedMedicines: VisitMedicine[];
}

interface StudentProfile {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  courseDept: string;
  civilStatus: string | null;
  age: number | null;
  sex: string | null;
  birthday: string | null;
  presentAddress: string | null;
  telNumber: string | null;
  emergencyContactName: string | null;
  emergencyRelationship: string | null;
  emergencyContactAddress: string | null;
  emergencyContactTelNumber: string | null;
  medicalHistory: {
    allergyEnc?: string | null;
    asthmaEnc?: string | null;
    diabetesEnc?: string | null;
    hypertensionEnc?: string | null;
    anxietyDisorderEnc?: string | null;
    bloodType?: string | null;
    immunizations?: string[] | null;
  } | null;
  clinicVisits: ClinicVisit[];
  physicalExaminations: Array<{
    id: string;
    examDate: string;
    yearLevel: string;
    bp?: string | null;
    cr?: string | null;
    rr?: string | null;
    temp?: string | null;
    weight?: string | null;
    height?: string | null;
    bmi?: string | null;
    visualAcuity?: string | null;
    skin?: string | null;
    heent?: string | null;
    chestLungs?: string | null;
    heart?: string | null;
    abdomen?: string | null;
    extremities?: string | null;
    others?: string | null;
    examinedBy?: string | null;
  }>;
}

interface StudentProfileResponse {
  success: boolean;
  data: StudentProfile;
}


function toLabel(value?: string | null) {
  return value && value.trim() ? value : 'N/A';
}

function formatDate(value?: string | null) {
  if (!value) return 'N/A';
  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function splitCsv(value?: string | null): string[] {
  if (!value) return [];
  const normalized = value.trim().toLowerCase();
  if (!normalized || ['none', 'no', 'n/a', 'na'].includes(normalized)) return [];
  return value.split(',').map((entry) => entry.trim()).filter(Boolean);
}

function pickConditions(history: StudentProfile['medicalHistory']) {
  if (!history) return [];

  const conditions: string[] = [];
  if (history.asthmaEnc && !['none', 'no', 'n/a', 'na'].includes(history.asthmaEnc.toLowerCase().trim())) {
    conditions.push('Asthma');
  }
  if (history.diabetesEnc && !['none', 'no', 'n/a', 'na'].includes(history.diabetesEnc.toLowerCase().trim())) {
    conditions.push('Diabetes');
  }
  if (history.hypertensionEnc && !['none', 'no', 'n/a', 'na'].includes(history.hypertensionEnc.toLowerCase().trim())) {
    conditions.push('Hypertension');
  }
  if (history.anxietyDisorderEnc && !['none', 'no', 'n/a', 'na'].includes(history.anxietyDisorderEnc.toLowerCase().trim())) {
    conditions.push('Anxiety Disorder');
  }

  return conditions;
}

function downloadPdf(profile: StudentProfile) {
  const generatedAt = new Date();
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(13, 148, 136);
  doc.rect(0, 0, pageWidth, 86, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('GC HealthLink Student Medical Record', 40, 38);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Generated: ${generatedAt.toLocaleString('en-US')}`, 40, 58);
  doc.text(`Student Number: ${profile.studentNumber}`, 40, 74);

  const profileRows: string[][] = [
    ['Full Name', `${profile.lastName}, ${profile.firstName}`],
    ['Course/Department', profile.courseDept],
    ['Age / Sex', `${profile.age ?? 'N/A'} / ${toLabel(profile.sex)}`],
    ['Birthday', formatDate(profile.birthday)],
    ['Contact Number', toLabel(profile.telNumber)],
    ['Address', toLabel(profile.presentAddress)],
    ['Emergency Contact', toLabel(profile.emergencyContactName)],
    ['Emergency Relationship', toLabel(profile.emergencyRelationship)],
    ['Emergency Number', toLabel(profile.emergencyContactTelNumber)],
    ['Allergies', splitCsv(profile.medicalHistory?.allergyEnc).join(', ') || 'None'],
    ['Blood Type', toLabel(profile.medicalHistory?.bloodType)],
    ['Immunizations', (profile.medicalHistory?.immunizations || []).join(', ') || 'None'],
    ['Known Conditions', pickConditions(profile.medicalHistory).join(', ') || 'None'],
  ];

  autoTable(doc, {
    startY: 104,
    head: [['Profile Field', 'Value']],
    body: profileRows,
    theme: 'grid',
    margin: { left: 40, right: 40 },
    styles: {
      fontSize: 9,
      cellPadding: 6,
      textColor: [55, 65, 81],
      valign: 'top',
    },
    headStyles: {
      fillColor: [15, 118, 110],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 170, fontStyle: 'bold' },
      1: { cellWidth: 345 },
    },
  });

  const docWithTable = doc as jsPDF & { lastAutoTable?: { finalY: number } };
  const visitRows: string[][] = profile.clinicVisits.length
    ? profile.clinicVisits.map((visit) => [
        formatDate(visit.visitDate),
        visit.visitTime || 'N/A',
        normalizeComplaintDisplay(visit.chiefComplaintEnc),
        visit.handledBy?.email || 'Clinic Staff',
        visit.dispensedMedicines.length
          ? visit.dispensedMedicines.map((item) => `${item.inventory.itemName} x${item.quantity}`).join(', ')
          : 'None',
      ])
    : [['No consultation records yet.', '', '', '', '']];

  autoTable(doc, {
    startY: (docWithTable.lastAutoTable?.finalY || 130) + 22,
    head: [['Visit Date', 'Time', 'Concern', 'Handled By', 'Medicines']],
    body: visitRows,
    theme: 'striped',
    margin: { left: 40, right: 40, bottom: 40 },
    styles: {
      fontSize: 8.5,
      cellPadding: 5,
      textColor: [31, 41, 55],
      valign: 'top',
    },
    headStyles: {
      fillColor: [13, 27, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 55 },
      2: { cellWidth: 150 },
      3: { cellWidth: 130 },
      4: { cellWidth: 140 },
    },
  });

  const physicalExamRows: string[][] = profile.physicalExaminations.length
    ? profile.physicalExaminations.map((exam) => [
        formatDate(exam.examDate),
        exam.yearLevel || 'N/A',
        exam.bp || 'N/A',
        exam.weight || 'N/A',
        exam.height || 'N/A',
        exam.bmi || 'N/A',
        exam.examinedBy || 'N/A',
      ])
    : [['No physical examination records yet.', '', '', '', '', '', '']];

  autoTable(doc, {
    startY: ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 130) + 22,
    head: [['Exam Date', 'Year Level', 'BP', 'Weight', 'Height', 'BMI', 'Examined By']],
    body: physicalExamRows,
    theme: 'striped',
    margin: { left: 40, right: 40, bottom: 40 },
    styles: {
      fontSize: 8.5,
      cellPadding: 5,
      textColor: [31, 41, 55],
      valign: 'top',
    },
    headStyles: {
      fillColor: [13, 27, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { cellWidth: 78 },
      1: { cellWidth: 70 },
      2: { cellWidth: 55 },
      3: { cellWidth: 58 },
      4: { cellWidth: 58 },
      5: { cellWidth: 48 },
      6: { cellWidth: 120 },
    },
  });

  doc.save(`my_record_${profile.studentNumber}.pdf`);
}

export default function MyRecordPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<StudentProfile | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const token = getToken();
      if (!token) {
        setError('You are not logged in. Please sign in again.');
        setLoading(false);
        return;
      }

      try {
        const response = await api.get<StudentProfileResponse>('/students/me', token);
        setProfile(response.data);
        setError('');
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError('Unable to load your health record.');
        }
      } finally {
        setLoading(false);
      }
    }

    void loadProfile();
  }, []);

  const allergies = useMemo(() => splitCsv(profile?.medicalHistory?.allergyEnc), [profile]);
  const conditions = useMemo(() => pickConditions(profile?.medicalHistory || null), [profile]);

  return (
    <div className="p-5 max-w-5xl mx-auto space-y-4">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-xl border border-gray-100 bg-white px-4 py-8 text-center text-sm text-gray-400">
          Loading your record...
        </div>
      ) : profile ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3">Personal Information</h2>
              <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                <div><p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Name</p><p className="text-sm font-medium text-gray-800">{profile.lastName}, {profile.firstName}</p></div>
                <div><p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Student Number</p><p className="text-sm font-medium text-gray-800">{profile.studentNumber}</p></div>
                <div><p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Course/Dept</p><p className="text-sm font-medium text-gray-800">{profile.courseDept}</p></div>
                <div><p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Birthday</p><p className="text-sm font-medium text-gray-800">{formatDate(profile.birthday)}</p></div>
                <div><p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Age/Sex</p><p className="text-sm font-medium text-gray-800">{profile.age || 'N/A'} / {toLabel(profile.sex)}</p></div>
                <div><p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Civil Status</p><p className="text-sm font-medium text-gray-800">{toLabel(profile.civilStatus)}</p></div>
                <div><p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Contact</p><p className="text-sm font-medium text-gray-800">{toLabel(profile.telNumber)}</p></div>
                <div><p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Address</p><p className="text-sm font-medium text-gray-800">{toLabel(profile.presentAddress)}</p></div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
              <h2 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3">Emergency & Medical Profile</h2>
              <div className="grid grid-cols-2 gap-y-4 gap-x-4">
                <div><p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Emergency Contact</p><p className="text-sm font-medium text-gray-800">{toLabel(profile.emergencyContactName)}</p></div>
                <div><p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Relationship</p><p className="text-sm font-medium text-gray-800">{toLabel(profile.emergencyRelationship)}</p></div>
                <div className="col-span-2"><p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Emergency Number</p><p className="text-sm font-medium text-gray-800">{toLabel(profile.emergencyContactTelNumber)}</p></div>
                <div className="col-span-2"><p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Emergency Address</p><p className="text-sm font-medium text-gray-800">{toLabel(profile.emergencyContactAddress)}</p></div>
                <div><p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Blood Type</p><p className="text-sm font-medium text-gray-800">{toLabel(profile.medicalHistory?.bloodType)}</p></div>
                <div><p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Allergies</p><p className="text-sm font-medium text-gray-800">{allergies.join(', ') || 'None'}</p></div>
                <div className="col-span-2"><p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Immunizations</p><p className="text-sm font-medium text-gray-800">{(profile.medicalHistory?.immunizations || []).join(', ') || 'None'}</p></div>
                <div className="col-span-2"><p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-0.5">Conditions</p><p className="text-sm font-medium text-gray-800">{conditions.join(', ') || 'None'}</p></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-sm font-bold text-gray-800">Physical Examination</h2>
            </div>
            {profile.physicalExaminations.length === 0 ? (
              <div className="p-6 text-sm text-gray-400">No physical examination records yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[720px]">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-gray-500 bg-gray-50 border-b border-gray-100">
                      <th className="text-left py-3 px-6 font-semibold">Date</th>
                      <th className="text-left py-3 px-6 font-semibold">Year Level</th>
                      <th className="text-left py-3 px-6 font-semibold">BP</th>
                      <th className="text-left py-3 px-6 font-semibold">Weight</th>
                      <th className="text-left py-3 px-6 font-semibold">Height</th>
                      <th className="text-left py-3 px-6 font-semibold">BMI</th>
                      <th className="text-left py-3 px-6 font-semibold">Examined By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profile.physicalExaminations.map((exam) => (
                      <tr key={exam.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-6 text-gray-800 font-medium">{formatDate(exam.examDate)}</td>
                        <td className="py-3 px-6 text-gray-600">{exam.yearLevel || 'N/A'}</td>
                        <td className="py-3 px-6 text-gray-600">{exam.bp || 'N/A'}</td>
                        <td className="py-3 px-6 text-gray-600">{exam.weight || 'N/A'}</td>
                        <td className="py-3 px-6 text-gray-600">{exam.height || 'N/A'}</td>
                        <td className="py-3 px-6 text-gray-600">{exam.bmi || 'N/A'}</td>
                        <td className="py-3 px-6 text-gray-600">{exam.examinedBy || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>


        </>
      ) : null}
    </div>
  );
}
