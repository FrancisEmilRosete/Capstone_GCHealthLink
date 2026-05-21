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

  const certTitle = isPhysical
    ? 'MEDICAL CERTIFICATE'
    : 'MEDICAL CERTIFICATE';

  const certSubtitle = isPhysical
    ? 'This is to certify that the below-named student has undergone a physical examination and the findings are as follows:'
    : 'This is to certify that the below-named student was examined at the clinic and found to have the following condition:';

  const findingsLabel = isPhysical
    ? 'Physical Examination Findings'
    : 'Diagnosis / Clinical Findings';

  const formattedDate = new Date(cert.issuedAt).toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const typeLabel = isPhysical ? 'PHYSICAL EXAMINATION' : 'CONSULTATION';
  const typeColor = isPhysical ? '#1e40af' : '#0f766e';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Medical Certificate &mdash; ${escapeHtml(cert.student)}</title>
  <style>
    @page { size: A4 portrait; margin: 2.2cm 2cm; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 11.5pt;
      color: #111;
      background: #fff;
    }
    .page { max-width: 680px; margin: 0 auto; }

    /* ── Header ── */
    .header {
      text-align: center;
      padding-bottom: 14px;
      border-bottom: 3px double #1e3a5f;
      margin-bottom: 22px;
    }
    .header .logo-line {
      font-size: 7pt;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #888;
      margin-bottom: 6px;
    }
    .header .clinic-name {
      font-size: 18pt;
      font-weight: bold;
      text-transform: uppercase;
      letter-spacing: 1.5px;
      color: #1e3a5f;
    }
    .header .clinic-sub {
      font-size: 10pt;
      color: #555;
      margin-top: 3px;
    }

    /* ── Certificate title ── */
    .cert-title {
      text-align: center;
      font-size: 14pt;
      font-weight: bold;
      text-decoration: underline;
      letter-spacing: 2px;
      margin: 20px 0 6px;
      text-transform: uppercase;
    }
    .cert-type-badge {
      text-align: center;
      display: inline-block;
      width: 100%;
      font-size: 8.5pt;
      font-weight: bold;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: ${typeColor};
      border: 1px solid ${typeColor};
      border-radius: 3px;
      padding: 2px 10px;
      margin-bottom: 18px;
    }

    /* ── Body text ── */
    .subtitle {
      font-size: 10.5pt;
      line-height: 1.7;
      margin-bottom: 18px;
      color: #333;
      font-style: italic;
    }

    /* ── Student info box ── */
    .student-box {
      border: 1px solid #b0bec5;
      padding: 12px 16px;
      margin-bottom: 20px;
      background: #f8fafb;
      border-radius: 4px;
    }
    .info-row { display: flex; gap: 32px; margin-top: 10px; flex-wrap: wrap; }
    .field-label {
      font-size: 8pt;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }
    .field-value { font-size: 11.5pt; font-weight: bold; margin-top: 2px; }

    /* ── Sections ── */
    .section { margin-bottom: 18px; }
    .section-title {
      font-size: 9pt;
      font-weight: bold;
      text-transform: uppercase;
      color: ${typeColor};
      letter-spacing: 0.8px;
      border-bottom: 1px solid #dde;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }
    .section-content {
      font-size: 11pt;
      line-height: 1.75;
      min-height: 2em;
      padding: 6px 0;
      color: #222;
    }
    .section-empty { color: #aaa; font-style: italic; }

    /* ── Signature area ── */
    .signature-area {
      margin-top: 44px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 24px;
    }
    .meta-block { font-size: 10pt; color: #444; line-height: 2; }
    .meta-block strong { color: #111; }
    .sig-block { text-align: center; min-width: 210px; }
    .sig-spacer { height: 44px; }
    .sig-line {
      border-top: 1.5px solid #111;
      padding-top: 6px;
      font-size: 11pt;
      font-weight: bold;
      color: #111;
    }
    .sig-sub { font-size: 8.5pt; color: #666; margin-top: 3px; }

    /* ── Footer ── */
    .footer {
      margin-top: 32px;
      text-align: center;
      font-size: 8pt;
      color: #aaa;
      border-top: 1px solid #eee;
      padding-top: 10px;
      font-style: italic;
    }

    @media print {
      body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="page">

    <div class="header">
      <div class="logo-line">Republic of the Philippines &mdash; Student Health Services</div>
      <div class="clinic-name">GC HealthLink Clinic</div>
      <div class="clinic-sub">Guidance &amp; Clinic Office &mdash; Health and Wellness Division</div>
    </div>

    <div class="cert-title">${certTitle}</div>
    <div style="text-align:center">
      <span class="cert-type-badge">Type: ${typeLabel}</span>
    </div>

    <p class="subtitle">${certSubtitle}</p>

    <div class="student-box">
      <div>
        <div class="field-label">Student Name</div>
        <div class="field-value">${escapeHtml(cert.student)}</div>
      </div>
      <div class="info-row">
        <div>
          <div class="field-label">Student ID</div>
          <div class="field-value">${escapeHtml(cert.studentId)}</div>
        </div>
        <div>
          <div class="field-label">Course / Department</div>
          <div class="field-value">${escapeHtml(cert.course)}</div>
        </div>
      </div>
    </div>

    <div class="section">
      <div class="section-title">${findingsLabel}</div>
      <div class="section-content">
        ${cert.diagnosisFindings
          ? escapeHtml(cert.diagnosisFindings)
          : '<span class="section-empty">No findings recorded.</span>'}
      </div>
    </div>

    <div class="section">
      <div class="section-title">Recommendations / Remarks</div>
      <div class="section-content">
        ${cert.recommendationsRemarks
          ? escapeHtml(cert.recommendationsRemarks)
          : '<span class="section-empty">No recommendations recorded.</span>'}
      </div>
    </div>

    <div class="signature-area">
      <div class="meta-block">
        <div><strong>Date Issued:</strong> ${formattedDate}</div>
        <div><strong>Reference No.:</strong> ${cert.id.slice(-10).toUpperCase()}</div>
      </div>
      <div class="sig-block">
        <div class="sig-spacer"></div>
        <div class="sig-line">${escapeHtml(cert.issuedBy)}</div>
        <div class="sig-sub">${(cert.issuedByRole || '').toUpperCase() === 'NURSE' ? 'Clinic Nurse' : 'Clinic Physician'} / Authorized Signatory</div>
      </div>
    </div>

    <div class="footer">
      This certificate is computer-generated and valid without a wet signature unless otherwise indicated. &bull;
      GC HealthLink System &bull; ${new Date().getFullYear()}
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
    // eslint-disable-next-line no-alert
    alert('Pop-up blocked. Please allow pop-ups for this site to enable printing.');
    return;
  }
  popup.document.write(html);
  popup.document.close();
}
