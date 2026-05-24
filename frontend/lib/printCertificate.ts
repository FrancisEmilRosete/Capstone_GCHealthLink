/**
 * printCertificate
 * ─────────────────────────────────────────────────────────────
 * Opens a formatted, print-ready HTML popup for a single medical
 * certificate. The popup calls window.print() on load and closes
 * itself after printing, so sidebars / navbars never appear.
 */

export interface PrintableCertificate {
  id: string;
  studentId: string;
  student: string;
  course: string;
  certificateType: string;
  diagnosisFindings: string;
  recommendationsRemarks: string;
  issuedAt: string;
  issuedBy: string;
  issuedByRole?: string;
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

export function printCertificate(cert: PrintableCertificate): void {
  const isPhysical = cert.certificateType === 'PHYSICAL_EXAM';

  const formattedDate = new Date(cert.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const statementText = isPhysical
    ? 'This is to certify that the below-named student has undergone a physical examination and the findings are as follows:'
    : 'The student was seen by the college physician/ nurse on duty:';

  const designationText = (cert.issuedByRole || '').toUpperCase() === 'NURSE' || (cert.issuedByRole || '').toUpperCase() === 'CLINIC_STAFF'
    ? 'College Nurse'
    : 'College Physician';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Medical Certificate &mdash; ${escapeHtml(cert.student)}</title>
  <style>
    @page {
      size: 5.5in 8.5in;
      margin: 0.4in;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 10pt;
      color: #000;
      background: #fff;
      line-height: 1.4;
    }
    .page {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    /* ── Header ── */
    .header {
      display: flex;
      align-items: flex-start;
      border-bottom: 2px solid #000;
      padding-bottom: 8px;
      margin-bottom: 12px;
    }
    .header-logo-left {
      width: 50px;
      height: 50px;
      margin-right: 10px;
    }
    .header-text {
      flex: 1;
      text-align: center;
    }
    .header-text h1 {
      font-size: 13pt;
      font-weight: bold;
      text-transform: uppercase;
      margin: 0;
      padding: 0;
    }
    .header-text p.address {
      font-size: 7.5pt;
      color: #333;
      margin-top: 2px;
      line-height: 1.1;
    }
    .header-text p.contact {
      font-size: 7.5pt;
      color: #333;
      margin-top: 1px;
      line-height: 1.1;
    }
    .header-text p.unit {
      font-size: 10pt;
      font-weight: bold;
      color: #065f46; /* teal */
      text-transform: uppercase;
      margin-top: 4px;
      letter-spacing: 0.5px;
    }
    .header-logos-right {
      display: flex;
      gap: 3px;
      margin-left: 10px;
    }
    .header-logos-right img {
      width: 50px;
      height: 50px;
    }

    /* ── Title ── */
    .title-container {
      text-align: center;
      margin: 12px 0;
    }
    .title-container h2 {
      font-size: 14pt;
      font-weight: bold;
      text-decoration: underline;
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    /* ── Date ── */
    .date-row {
      display: flex;
      justify-content: flex-end;
      font-size: 10pt;
      margin-bottom: 10px;
    }
    .underline-value {
      font-weight: bold;
      text-decoration: underline;
      padding: 0 4px;
    }

    /* ── Grid Fields ── */
    .fields-container {
      margin-bottom: 15px;
    }
    .field-row {
      display: flex;
      justify-content: space-between;
      gap: 15px;
      margin-bottom: 8px;
      font-size: 10pt;
    }
    .flex-fill {
      flex: 1;
    }
    .w-16 { width: 64px; }
    .w-28 { width: 112px; }
    .w-36 { width: 144px; }
    .w-48 { width: 192px; }

    /* ── Content ── */
    .statement {
      font-style: italic;
      font-family: sans-serif;
      font-size: 9pt;
      color: #333;
      margin-bottom: 12px;
    }
    .content-section {
      margin-bottom: 12px;
    }
    .content-section p.label {
      font-weight: bold;
      font-size: 10pt;
      margin-bottom: 2px;
    }
    .content-section p.value {
      text-decoration: underline;
      line-height: 1.8;
      padding-left: 15px;
      font-size: 10pt;
      word-wrap: break-word;
      white-space: pre-wrap;
    }

    /* ── Signatures ── */
    .signatures-row {
      display: flex;
      justify-content: space-between;
      margin-top: 40px;
      padding: 0 10px;
    }
    .signature-block {
      text-align: center;
      width: 180px;
    }
    .signature-block p.name {
      font-weight: bold;
      text-decoration: underline;
      text-transform: uppercase;
      font-size: 10pt;
    }
    .signature-block p.sub {
      font-size: 8pt;
      color: #555;
      margin-top: 3px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="page">
    <div>
      <!-- Header -->
      <div class="header">
        <img src="/icons/gc-logo.png" alt="GC Logo" class="header-logo-left" />
        <div class="header-text">
          <h1>Gordon College</h1>
          <p class="address">Olongapo City Sports Complex, Donor Street, East Tapinac, Olongapo City 2200</p>
          <p class="contact">Tel. No.: (047) 222-4080 | www.gordoncollege.edu.ph</p>
          <p class="unit">Health Services Unit</p>
        </div>
        <div class="header-logos-right">
          <img src="/icons/gc-logo.png" alt="GC Logo" />
          <img src="/icons/clinic-logo.png" alt="Clinic Logo" />
        </div>
      </div>

      <!-- Title -->
      <div class="title-container">
        <h2>Medical Certificate</h2>
      </div>

      <!-- Date -->
      <div class="date-row">
        <p>Date: <span class="underline-value">${escapeHtml(formattedDate)}</span></p>
      </div>

      <!-- Patient Details -->
      <div class="fields-container">
        <div class="field-row">
          <div class="flex-fill">
            Name: <span class="underline-value">${escapeHtml(cert.student)}</span>
          </div>
          <div class="w-16">
            Age: <span class="underline-value">N/A</span>
          </div>
          <div class="w-36">
            Status: <span class="underline-value">Student</span>
          </div>
        </div>

        <div class="field-row">
          <div class="flex-fill">
            Department: <span class="underline-value">${escapeHtml(cert.course || 'N/A')}</span>
          </div>
          <div class="w-48">
            Sex: ( ) Male &nbsp;( ) Female
          </div>
          <div class="w-48">
            Date of Birth: <span class="underline-value">________________</span>
          </div>
        </div>
      </div>

      <!-- Body Statement -->
      <p class="statement">${escapeHtml(statementText)}</p>

      <!-- Diagnosis / For -->
      <div class="content-section">
        <p class="label">For:</p>
        <p class="value">${escapeHtml(cert.diagnosisFindings) || '____________________________________________________________________________________'}</p>
      </div>

      <!-- Remarks -->
      <div class="content-section">
        <p class="label">Remarks:</p>
        <p class="value">${escapeHtml(cert.recommendationsRemarks) || '____________________________________________________________________________________'}</p>
      </div>
    </div>

    <!-- Signatures -->
    <div class="signatures-row">
      <div class="signature-block">
        <p class="name">${escapeHtml(cert.issuedBy)}</p>
        <p class="sub">Signature Over Printed Name</p>
      </div>
      
      <div class="signature-block">
        <p class="name">${escapeHtml(designationText)}</p>
        <p class="sub">Designation</p>
      </div>
    </div>
  </div>

  <script>
    window.onload = function () {
      window.print();
      window.onafterprint = function () { window.close(); };
    };
  </script>
</body>
</html>`;

  const popup = window.open('', '_blank', 'width=860,height=1120,scrollbars=yes');
  if (!popup) {
    alert('Pop-up blocked. Please allow pop-ups for this site to enable printing.');
    return;
  }
  popup.document.write(html);
  popup.document.close();
}
