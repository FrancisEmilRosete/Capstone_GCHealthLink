import type { PendingCertificateRequest } from '@/components/dashboard/staff/CertificateApprovalTable';

export const staffCertificateRequestsMock: PendingCertificateRequest[] = [
  // ── PENDING — Staff needs to click "Request Doctor Approval" ──────────────
  {
    id: 'cert-001',
    studentName: 'Juan Miguel Dela Cruz',
    studentNumber: '2023-10451',
    courseDept: 'BSIT 3-A',
    reason: 'Medical clearance for OJT / internship requirement',
    requestedDateIso: '2026-04-27T08:30:00.000Z',
    proofFileName: 'ojt_endorsement.pdf',
    status: 'pending',
  },
  {
    id: 'cert-002',
    studentName: 'Alyssa Marie Reyes',
    studentNumber: '2024-00891',
    courseDept: 'BS Nursing 4-B',
    reason: 'Medical certificate for scholarship application (CHED)',
    requestedDateIso: '2026-04-26T13:15:00.000Z',
    proofFileName: 'ched_scholarship_form.pdf',
    status: 'pending',
  },
  {
    id: 'cert-003',
    studentName: 'Carlos Antonio Bautista',
    studentNumber: '2022-05532',
    courseDept: 'BS Civil Engineering 5',
    reason: 'Sick leave documentation for missed licensure review classes',
    requestedDateIso: '2026-04-25T09:00:00.000Z',
    proofFileName: undefined,
    status: 'pending',
  },

  // ── PENDING DOCTOR — Staff already requested, doctor has not approved yet ─
  {
    id: 'cert-004',
    studentName: 'Maria Kristina Santos',
    studentNumber: '2023-07712',
    courseDept: 'BS Psychology 3',
    reason: 'Mental health leave documentation for return-to-school clearance',
    requestedDateIso: '2026-04-24T11:45:00.000Z',
    proofFileName: 'counselor_referral.pdf',
    status: 'pending_doctor',
  },
  {
    id: 'cert-005',
    studentName: 'Jose Ramon Villanueva',
    studentNumber: '2021-03341',
    courseDept: 'BSBA Marketing 4',
    reason: 'Medical certificate for employment / job application',
    requestedDateIso: '2026-04-24T14:20:00.000Z',
    proofFileName: 'job_offer_letter.pdf',
    status: 'pending_doctor',
  },

  // ── DOCTOR APPROVED — Ready for staff to release the PDF ─────────────────
  {
    id: 'cert-006',
    studentName: 'Patricia Louise Gomez',
    studentNumber: '2022-09981',
    courseDept: 'BS Accountancy 3',
    reason: 'Fit-to-study clearance after hospitalization (appendectomy)',
    requestedDateIso: '2026-04-23T08:00:00.000Z',
    proofFileName: 'discharge_summary.pdf',
    status: 'doctor_approved',
    doctorName: 'Dr. Dela Cruz',
  },

  // ── DENIED — Already processed and rejected ───────────────────────────────
  {
    id: 'cert-007',
    studentName: 'Ryan Christopher Ocampo',
    studentNumber: '2024-11234',
    courseDept: 'BSCS 2-A',
    reason: 'Request to excuse absences (incomplete clinical supporting documents)',
    requestedDateIso: '2026-04-22T10:30:00.000Z',
    proofFileName: undefined,
    status: 'denied',
  },
  {
    id: 'cert-008',
    studentName: 'Angela Rose Fernandez',
    studentNumber: '2023-06678',
    courseDept: 'BS Tourism 3',
    reason: 'Certification of good health for travel abroad (school trip)',
    requestedDateIso: '2026-04-21T15:00:00.000Z',
    proofFileName: 'travel_authority_form.pdf',
    status: 'denied',
  },
];
