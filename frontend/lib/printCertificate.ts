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
  const isDental = cert.certificateType === 'DENTAL' || cert.certificateType === 'DENTAL_CERTIFICATE';

  const formattedDate = new Date(cert.issuedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  if (isDental) {
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Dental Certificate &mdash; ${escapeHtml(cert.student)}</title>
  <style>
    @page {
      size: A5 landscape; /* 210mm x 148mm */
      margin: 15mm;
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif;
      font-size: 11pt;
      color: #000;
      background: #fff;
      line-height: 1.5;
    }
    .page {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
    }

    /* ── Header ── */
    .header {
      display: flex;
      align-items: flex-start;
      margin-bottom: 20px;
    }
    .header-logos-left {
      display: flex;
      gap: 5px;
      margin-right: 15px;
    }
    .header-logos-left img {
      width: 60px;
      height: 60px;
    }
    .header-text {
      flex: 1;
      text-align: center;
    }
    .header-text h1 {
      font-size: 14pt;
      font-weight: bold;
      text-transform: uppercase;
      margin: 0;
      padding: 0;
    }
    .header-text p.address {
      font-size: 8.5pt;
      margin-top: 2px;
      line-height: 1.2;
    }
    .header-text p.contact {
      font-size: 8.5pt;
      margin-top: 1px;
      line-height: 1.2;
    }
    .header-text p.unit {
      font-size: 11pt;
      font-weight: bold;
      margin-top: 10px;
    }
    .header-text p.sub-unit {
      font-size: 11pt;
      font-weight: bold;
      margin-top: 2px;
    }
    .header-logo-right {
      width: 60px;
      height: 60px;
      margin-left: 15px;
    }

    /* ── Title ── */
    .title-container {
      text-align: center;
      margin-top: 5px;
      margin-bottom: 25px;
    }
    .title-container h2 {
      font-size: 14pt;
      font-weight: bold;
      text-decoration: underline;
      text-transform: uppercase;
    }

    /* ── Date ── */
    .date-row {
      display: flex;
      justify-content: flex-end;
      font-size: 11pt;
      margin-bottom: 15px;
    }
    .underline-value {
      border-bottom: 1px solid #000;
      padding: 0 10px;
      display: inline-block;
      text-align: center;
      min-width: 40px;
      font-weight: bold;
    }

    /* ── Body Content ── */
    .body-content {
      font-size: 11pt;
      margin-bottom: 20px;
      flex: 1;
    }
    .salutation {
      margin-bottom: 15px;
    }
    .paragraph {
      text-indent: 40px;
      margin-bottom: 15px;
      line-height: 1.8;
      text-align: justify;
    }
    .paragraph span.underline-value {
      font-weight: bold;
    }

    /* ── Signatures ── */
    .footer {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      margin-top: 30px;
    }
    .signature-line {
      border-bottom: 1px solid #000;
      width: 200px;
      margin-bottom: 20px;
    }
    .prc-row {
      display: flex;
      align-items: center;
      margin-right: 20px;
    }
    .prc-row span {
      border-bottom: 1px solid #000;
      min-width: 150px;
      display: inline-block;
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="page">
    <!-- Header -->
    <div class="header">
      <div class="header-logos-left">
        <img src="/icons/gc-logo.png" alt="GC Logo 1" />
        <img src="/icons/gc-logo.png" alt="GC Logo 2" />
      </div>
      <div class="header-text">
        <h1>GORDON COLLEGE</h1>
        <p class="address">Olongapo City Sports Complex, Donor Street, East Tapinac, Olongapo City</p>
        <p class="contact">Tel. Nos.: (047) 224-2089 / (047) 602-7175<br/>Website: <span style="text-decoration:underline;">www.gordoncollege.edu.ph</span></p>
        <p class="unit">Office of Student Welfare & Services</p>
        <p class="sub-unit">Health Services Unit</p>
      </div>
      <img src="/icons/clinic-logo.png" alt="Clinic Logo" class="header-logo-right" />
    </div>

    <!-- Title -->
    <div class="title-container">
      <h2>DENTAL CERTIFICATE</h2>
    </div>

    <!-- Date -->
    <div class="date-row">
      Date: <span class="underline-value" style="min-width:150px;">${escapeHtml(formattedDate)}</span>
    </div>

    <!-- Body Content -->
    <div class="body-content">
      <p class="salutation">To Whom It May Concern:</p>
      
      <p class="paragraph">
        This is to certify that the bearer Mr. /Ms. <span class="underline-value" style="min-width:250px;">${escapeHtml(cert.student)}</span> age <span class="underline-value">N/A</span>
        from #<span class="underline-value" style="min-width:150px;">${escapeHtml(cert.course || '')}</span> had undergone <span class="underline-value" style="min-width:150px;">${escapeHtml(cert.diagnosisFindings || 'Dental Treatment')}</span>
        in the clinic on <span class="underline-value" style="min-width:120px;">${escapeHtml(formattedDate)}</span> because of <span class="underline-value" style="min-width:150px;">${escapeHtml(cert.recommendationsRemarks || 'Dental Checkup')}</span>.
      </p>

      <p class="paragraph">
        The patient is advised to: <span class="underline-value" style="min-width:300px;">${escapeHtml(cert.recommendationsRemarks || '')}</span>.
      </p>

      <p style="margin-top: 15px;">
        This certificate is issued for whatever purpose it may serve.
      </p>
    </div>

    <!-- Footer Signatures -->
    <div class="footer">
      <div class="signature-line"></div>
      <div class="prc-row">
        PRC Lic.# <span></span>
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

    const popup = window.open('', '_blank', 'width=1120,height=860,scrollbars=yes');
    if (!popup) {
      alert('Pop-up blocked. Please allow pop-ups for this site to enable printing.');
      return;
    }
    popup.document.write(html);
    popup.document.close();
    return;
  }

  // --- MEDICAL CERTIFICATE FALLBACK ---
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
  <title>Medical Certificate &mdash; \${escapeHtml(cert.student)}</title>
  <style>
    @page {
      size: A5 landscape; /* 210mm x 148mm */
      margin: 15mm;
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

export function printCertificatesBatch(certs: PrintableCertificate[]): void {
  if (!certs || certs.length === 0) return;

  const isDentalBatch = certs.every(c => c.certificateType === 'DENTAL' || c.certificateType === 'DENTAL_CERTIFICATE');
  const isMedicalBatch = certs.every(c => c.certificateType === 'CONSULTATION' || c.certificateType === 'PHYSICAL_EXAM');

  if (!isDentalBatch && !isMedicalBatch) {
    alert('Cannot batch print a mix of Medical and Dental certificates. Please filter by a specific type.');
    return;
  }

  const pagesHtml = certs.map((cert) => {
    const formattedDate = new Date(cert.issuedAt).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    if (isDentalBatch) {
      return `
  <div class="page page-break">
    <div class="header">
      <div class="header-logos-left">
        <img src="/icons/gc-logo.png" alt="GC Logo 1" />
        <img src="/icons/gc-logo.png" alt="GC Logo 2" />
      </div>
      <div class="header-text">
        <h1>GORDON COLLEGE</h1>
        <p class="address">Olongapo City Sports Complex, Donor Street, East Tapinac, Olongapo City</p>
        <p class="contact">Tel. Nos.: (047) 224-2089 / (047) 602-7175<br/>Website: <span style="text-decoration:underline;">www.gordoncollege.edu.ph</span></p>
        <p class="unit">Office of Student Welfare & Services</p>
        <p class="sub-unit">Health Services Unit</p>
      </div>
      <img src="/icons/clinic-logo.png" alt="Clinic Logo" class="header-logo-right" />
    </div>
    <div class="title-container">
      <h2>DENTAL CERTIFICATE</h2>
    </div>
    <div class="date-row">
      Date: <span class="underline-value" style="min-width:150px;">${escapeHtml(formattedDate)}</span>
    </div>
    <div class="body-content">
      <p class="salutation">To Whom It May Concern:</p>
      <p class="paragraph">
        This is to certify that the bearer Mr. /Ms. <span class="underline-value" style="min-width:250px;">${escapeHtml(cert.student)}</span> age <span class="underline-value">N/A</span>
        from #<span class="underline-value" style="min-width:150px;">${escapeHtml(cert.course || '')}</span> had undergone <span class="underline-value" style="min-width:150px;">${escapeHtml(cert.diagnosisFindings || 'Dental Treatment')}</span>
        in the clinic on <span class="underline-value" style="min-width:120px;">${escapeHtml(formattedDate)}</span> because of <span class="underline-value" style="min-width:150px;">${escapeHtml(cert.recommendationsRemarks || 'Dental Checkup')}</span>.
      </p>
      <p class="paragraph">
        The patient is advised to: <span class="underline-value" style="min-width:300px;">${escapeHtml(cert.recommendationsRemarks || '')}</span>.
      </p>
      <p style="margin-top: 15px;">
        This certificate is issued for whatever purpose it may serve.
      </p>
    </div>
    <div class="footer">
      <div class="signature-line"></div>
      <div class="prc-row">
        PRC Lic.# <span></span>
      </div>
    </div>
  </div>`;
    } else {
      const isPhysical = cert.certificateType === 'PHYSICAL_EXAM';
      const statementText = isPhysical
        ? 'This is to certify that the below-named student has undergone a physical examination and the findings are as follows:'
        : 'The student was seen by the college physician/ nurse on duty:';
      const designationText = (cert.issuedByRole || '').toUpperCase() === 'NURSE' || (cert.issuedByRole || '').toUpperCase() === 'CLINIC_STAFF'
        ? 'College Nurse'
        : 'College Physician';

      return `
  <div class="page page-break">
    <div>
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
      <div class="title-container">
        <h2>Medical Certificate</h2>
      </div>
      <div class="date-row">
        <p>Date: <span class="underline-value">${escapeHtml(formattedDate)}</span></p>
      </div>
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
      <p class="statement">${escapeHtml(statementText)}</p>
      <div class="content-section">
        <p class="label">For:</p>
        <p class="value">${escapeHtml(cert.diagnosisFindings) || '____________________________________________________________________________________'}</p>
      </div>
      <div class="content-section">
        <p class="label">Remarks:</p>
        <p class="value">${escapeHtml(cert.recommendationsRemarks) || '____________________________________________________________________________________'}</p>
      </div>
    </div>
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
  </div>`;
    }
  }).join('');

  const commonStyle = isDentalBatch ? `
    @page { size: A5 landscape; margin: 15mm; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: Arial, sans-serif; font-size: 11pt; color: #000; background: #fff; line-height: 1.5; }
    .page { width: 100%; height: 100%; display: flex; flex-direction: column; }
    .page-break { page-break-after: always; }
    .page-break:last-child { page-break-after: auto; }
    .header { display: flex; align-items: flex-start; margin-bottom: 20px; }
    .header-logos-left { display: flex; gap: 5px; margin-right: 15px; }
    .header-logos-left img { width: 60px; height: 60px; }
    .header-text { flex: 1; text-align: center; }
    .header-text h1 { font-size: 14pt; font-weight: bold; text-transform: uppercase; margin: 0; padding: 0; }
    .header-text p.address { font-size: 8.5pt; margin-top: 2px; line-height: 1.2; }
    .header-text p.contact { font-size: 8.5pt; margin-top: 1px; line-height: 1.2; }
    .header-text p.unit { font-size: 11pt; font-weight: bold; margin-top: 10px; }
    .header-text p.sub-unit { font-size: 11pt; font-weight: bold; margin-top: 2px; }
    .header-logo-right { width: 60px; height: 60px; margin-left: 15px; }
    .title-container { text-align: center; margin-top: 5px; margin-bottom: 25px; }
    .title-container h2 { font-size: 14pt; font-weight: bold; text-decoration: underline; text-transform: uppercase; }
    .date-row { display: flex; justify-content: flex-end; font-size: 11pt; margin-bottom: 15px; }
    .underline-value { border-bottom: 1px solid #000; padding: 0 10px; display: inline-block; text-align: center; min-width: 40px; font-weight: bold; }
    .body-content { font-size: 11pt; margin-bottom: 20px; flex: 1; }
    .salutation { margin-bottom: 15px; }
    .paragraph { text-indent: 40px; margin-bottom: 15px; line-height: 1.8; text-align: justify; }
    .paragraph span.underline-value { font-weight: bold; }
    .footer { display: flex; flex-direction: column; align-items: flex-end; margin-top: 30px; }
    .signature-line { border-bottom: 1px solid #000; width: 200px; margin-bottom: 20px; }
    .prc-row { display: flex; align-items: center; margin-right: 20px; }
    .prc-row span { border-bottom: 1px solid #000; min-width: 150px; display: inline-block; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  ` : `
    @page { size: 5.5in 8.5in; margin: 0.4in; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Times New Roman', Times, serif; font-size: 10pt; color: #000; background: #fff; line-height: 1.4; }
    .page { width: 100%; height: 100%; display: flex; flex-direction: column; justify-content: space-between; }
    .page-break { page-break-after: always; }
    .page-break:last-child { page-break-after: auto; }
    .header { display: flex; align-items: flex-start; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
    .header-logo-left { width: 50px; height: 50px; margin-right: 10px; }
    .header-text { flex: 1; text-align: center; }
    .header-text h1 { font-size: 13pt; font-weight: bold; text-transform: uppercase; margin: 0; padding: 0; }
    .header-text p.address { font-size: 7.5pt; color: #333; margin-top: 2px; line-height: 1.1; }
    .header-text p.contact { font-size: 7.5pt; color: #333; margin-top: 1px; line-height: 1.1; }
    .header-text p.unit { font-size: 10pt; font-weight: bold; color: #065f46; text-transform: uppercase; margin-top: 4px; letter-spacing: 0.5px; }
    .header-logos-right { display: flex; gap: 3px; margin-left: 10px; }
    .header-logos-right img { width: 50px; height: 50px; }
    .title-container { text-align: center; margin: 12px 0; }
    .title-container h2 { font-size: 14pt; font-weight: bold; text-decoration: underline; text-transform: uppercase; letter-spacing: 1px; }
    .date-row { display: flex; justify-content: flex-end; font-size: 10pt; margin-bottom: 10px; }
    .underline-value { font-weight: bold; text-decoration: underline; padding: 0 4px; }
    .fields-container { margin-bottom: 15px; }
    .field-row { display: flex; justify-content: space-between; gap: 15px; margin-bottom: 8px; font-size: 10pt; }
    .flex-fill { flex: 1; }
    .w-16 { width: 64px; }
    .w-28 { width: 112px; }
    .w-36 { width: 144px; }
    .w-48 { width: 192px; }
    .statement { font-style: italic; font-family: sans-serif; font-size: 9pt; color: #333; margin-bottom: 12px; }
    .content-section { margin-bottom: 12px; }
    .content-section p.label { font-weight: bold; font-size: 10pt; margin-bottom: 2px; }
    .content-section p.value { text-decoration: underline; line-height: 1.8; padding-left: 15px; font-size: 10pt; word-wrap: break-word; white-space: pre-wrap; }
    .signatures-row { display: flex; justify-content: space-between; margin-top: 40px; padding: 0 10px; }
    .signature-block { text-align: center; width: 180px; }
    .signature-block p.name { font-weight: bold; text-decoration: underline; text-transform: uppercase; font-size: 10pt; }
    .signature-block p.sub { font-size: 8pt; color: #555; margin-top: 3px; text-transform: uppercase; letter-spacing: 0.5px; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  `;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Batch Print Certificates</title>
  <style>
    ${commonStyle}
  </style>
</head>
<body>
  ${pagesHtml}
  <script>
    window.onload = function () {
      window.print();
      window.onafterprint = function () { window.close(); };
    };
  </script>
</body>
</html>`;

  const popup = window.open('', '_blank', 'width=1120,height=860,scrollbars=yes');
  if (!popup) {
    alert('Pop-up blocked. Please allow pop-ups for this site to enable printing.');
    return;
  }
  popup.document.write(html);
  popup.document.close();
}
