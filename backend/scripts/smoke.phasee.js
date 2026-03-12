const API_BASE = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(path, options = {}) {
  const { method = 'GET', token, body } = options;
  const headers = { ...(options.headers || {}) };

  let payload;
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: payload,
  });

  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  return {
    status: response.status,
    data,
    text,
    headers: response.headers,
  };
}

async function login(email) {
  const result = await request('/auth/login', {
    method: 'POST',
    body: {
      email,
      password: 'password123',
    },
  });

  assert(result.status === 200, `Login failed for ${email}: ${result.status} ${result.text}`);
  assert(result.data?.token, `Missing token for ${email}`);
  return result.data.token;
}

async function run() {
  console.log('PHASEE_SMOKE_START');

  const studentToken = await login('student@gordoncollege.edu.ph');
  const staffToken = await login('nurse@gordoncollege.edu.ph');
  const adminToken = await login('admin@gordoncollege.edu.ph');

  // Student journey
  const myProfile = await request('/students/me', { token: studentToken });
  assert(myProfile.status === 200, `Student profile failed: ${myProfile.status}`);
  const myStudentProfileId = myProfile.data?.data?.id;
  assert(myStudentProfileId, 'Student profile id missing in /students/me response');

  const myQr = await request('/students/qr', { token: studentToken });
  assert(myQr.status === 200, `Student QR failed: ${myQr.status}`);

  const bookAppointment = await request('/appointments/book', {
    method: 'POST',
    token: studentToken,
    body: {
      preferredDate: new Date().toISOString(),
      preferredTime: '10:00 AM',
      symptoms: 'Phase E journey check',
    },
  });
  assert(bookAppointment.status === 201, `Student appointment booking failed: ${bookAppointment.status}`);

  const studentAdvisories = await request('/advisories', { token: studentToken });
  assert(studentAdvisories.status === 200, `Student advisories failed: ${studentAdvisories.status}`);

  const studentDocuments = await request(`/documents/${myStudentProfileId}`, { token: studentToken });
  assert(studentDocuments.status === 200, `Student document list failed: ${studentDocuments.status}`);

  // Staff journey
  const queue = await request('/appointments/queue', { token: staffToken });
  assert(queue.status === 200, `Staff queue failed: ${queue.status}`);

  const searchStudent = await request('/clinic/search?q=2024-0001', { token: staffToken });
  assert(searchStudent.status === 200, `Staff student search failed: ${searchStudent.status}`);
  const targetStudentProfileId = searchStudent.data?.data?.[0]?.id;
  assert(targetStudentProfileId, 'Target student profile id not found in search');

  const exam = await request('/physical-exams', {
    method: 'POST',
    token: staffToken,
    body: {
      studentProfileId: targetStudentProfileId,
      yearLevel: '1st Year',
      dateOfExam: new Date().toISOString().slice(0, 10),
      bp: '120/80',
      heartRate: '78',
      respRate: '18',
      temperature: '36.7',
      weight: '62',
      height: '166',
      examinedBy: 'Phase E Smoke',
    },
  });
  assert(exam.status === 201, `Physical exam save failed: ${exam.status}`);

  const certificate = await request('/certificates', {
    method: 'POST',
    token: staffToken,
    body: {
      studentId: '2024-0001',
      dateIso: new Date().toISOString().slice(0, 10),
      reason: 'Illness (Fever)',
      remarks: 'Phase E smoke',
      issuedBy: 'Phase E Smoke',
    },
  });
  assert(certificate.status === 201, `Certificate issue failed: ${certificate.status}`);

  const staffDocuments = await request(`/documents/${targetStudentProfileId}`, { token: staffToken });
  assert(staffDocuments.status === 200, `Staff document list failed: ${staffDocuments.status}`);

  // Admin journey
  const analytics = await request('/admin/analytics', { token: adminToken });
  assert(analytics.status === 200, `Admin analytics failed: ${analytics.status}`);

  const report = await request('/admin/reports/monthly-pdf', { token: adminToken });
  assert(report.status === 200, `Admin monthly report failed: ${report.status}`);
  const reportContentType = report.headers.get('content-type') || '';
  assert(reportContentType.includes('application/pdf'), `Expected PDF report content-type, got ${reportContentType}`);

  const adminSettings = await request('/settings/admin', { token: adminToken });
  assert(adminSettings.status === 200, `Admin settings failed: ${adminSettings.status}`);

  console.log('PHASEE_SMOKE_OK');
}

run().catch((error) => {
  console.error('PHASEE_SMOKE_FAIL');
  console.error(error.message || error);
  process.exit(1);
});
