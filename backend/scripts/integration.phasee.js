const API_BASE = process.env.API_BASE_URL || 'http://localhost:5000/api/v1';
const DEMO_PASSWORD = process.env.PHASEE_DEMO_PASSWORD || 'password123';
const SEEDED_STUDENT_EMAIL = process.env.PHASEE_STUDENT_EMAIL || 'juan.delacruz.2026@gordoncollege.edu.ph';
const SEEDED_STUDENT_NUMBER = process.env.PHASEE_STUDENT_NUMBER || '2026-0001';
const STAFF_EMAIL = process.env.PHASEE_STAFF_EMAIL || 'nurse@gordoncollege.edu.ph';
const ADMIN_EMAIL = process.env.PHASEE_ADMIN_EMAIL || 'admin@gordoncollege.edu.ph';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function request(path, options = {}) {
  const { method = 'GET', token, body } = options;
  const headers = { ...(options.headers || {}) };

  let payload;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
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
  };
}

async function login(email, selectedTab, password = DEMO_PASSWORD) {
  const response = await request('/auth/login', {
    method: 'POST',
    body: { email, password, selectedTab },
  });

  assert(response.status === 200, `Login failed for ${email}: ${response.status} ${response.text}`);
  assert(response.data?.token, `Missing token for ${email}`);
  return response.data.token;
}

async function run() {
  console.log('PHASEE_INTEGRATION_START');

  const adminToken = await login(ADMIN_EMAIL, 'admin');
  const staffToken = await login(STAFF_EMAIL, 'staff');
  const seededStudentToken = await login(SEEDED_STUDENT_EMAIL, 'student');

  const invalidEmailLogin = await request('/auth/login', {
    method: 'POST',
    body: { email: 'not-an-email', password: DEMO_PASSWORD, selectedTab: 'student' },
  });
  assert(invalidEmailLogin.status === 400, `Expected 400 for invalid email login, got ${invalidEmailLogin.status}`);

  const suffix = Date.now();
  const registrationPayload = {
    personal: {
      studentId: `PHASEE-${String(suffix).slice(-6)}`,
      firstName: 'Phase',
      lastName: 'EStudent',
      middleInitial: 'T',
      course: 'Bachelor of Science in Information Technology',
      department: 'CCS',
      age: '19',
      sex: 'Male',
      birthday: '2007-01-01',
      civilStatus: 'Single',
      contact: '09171234567',
      email: `phasee_${suffix}@example.com`,
      address: 'Phase E Test Address',
    },
    emergency: {
      name: 'Test Guardian',
      relationship: 'Guardian',
      contact: '09170000000',
      address: 'Guardian Address',
    },
    medical: {
      conditions: [],
      others: '',
      bloodType: 'O+',
      allergies: 'None',
      existingConditions: 'None',
    },
    surgical: {
      hasSurgery: false,
      entries: [],
    },
    consentAgreed: true,
    credentials: {
      password: 'password123',
    },
  };

  const registration = await request('/students/registration/public', {
    method: 'POST',
    body: registrationPayload,
  });
  assert(registration.status === 201, `Registration failed: ${registration.status} ${registration.text}`);
  assert(registration.data?.data?.studentProfileId, 'Registration missing studentProfileId');

  const newStudentToken = await login(registrationPayload.personal.email, 'student');

  const invalidAppointment = await request('/appointments/book', {
    method: 'POST',
    token: seededStudentToken,
    body: {
      preferredDate: 'invalid-date',
      preferredTime: '09:00 AM',
      symptoms: 'Cough',
    },
  });
  assert(invalidAppointment.status === 400, `Expected 400 for invalid appointment date, got ${invalidAppointment.status}`);

  const searchSeededStudent = await request(`/clinic/search?q=${encodeURIComponent(SEEDED_STUDENT_NUMBER)}`, { token: staffToken });
  assert(searchSeededStudent.status === 200, `Search failed: ${searchSeededStudent.status}`);
  const seededStudentProfileId = searchSeededStudent.data?.data?.[0]?.id;
  assert(seededStudentProfileId, 'Seeded student profile id not found');

  const inventoryList = await request('/inventory', { token: staffToken });
  assert(inventoryList.status === 200, `Inventory fetch failed: ${inventoryList.status}`);
  const firstInventoryId = inventoryList.data?.data?.[0]?.id;
  assert(firstInventoryId, 'No inventory item available for validation test');

  const invalidVisitMedicine = await request('/clinic/visits', {
    method: 'POST',
    token: staffToken,
    body: {
      studentProfileId: seededStudentProfileId,
      visitDate: new Date().toISOString(),
      visitTime: '10:00 AM',
      chiefComplaintEnc: 'Phase E integration validation',
      dispensedMedicines: [
        {
          inventoryId: firstInventoryId,
          quantity: -1,
        },
      ],
    },
  });
  assert(invalidVisitMedicine.status === 400, `Expected 400 for invalid medicine quantity, got ${invalidVisitMedicine.status}`);

  const uploadForm = new FormData();
  uploadForm.append('studentProfileId', seededStudentProfileId);
  uploadForm.append('documentType', 'OTHER');
  uploadForm.append('file', new Blob(['phase-e-integration-doc'], { type: 'application/pdf' }), 'phasee-integration.pdf');

  const upload = await request('/documents/upload', {
    method: 'POST',
    token: staffToken,
    body: uploadForm,
  });
  assert(upload.status === 201, `Document upload failed: ${upload.status} ${upload.text}`);
  const documentId = upload.data?.data?.id;
  assert(documentId, 'Document upload missing document id');

  const seededStudentDocs = await request(`/documents/${seededStudentProfileId}`, {
    token: seededStudentToken,
  });
  assert(seededStudentDocs.status === 200, `Seeded student document list failed: ${seededStudentDocs.status}`);

  const studentUploadAttempt = new FormData();
  studentUploadAttempt.append('studentProfileId', seededStudentProfileId);
  studentUploadAttempt.append('documentType', 'LAB_RESULT');
  studentUploadAttempt.append('file', new Blob(['blocked'], { type: 'application/pdf' }), 'blocked.pdf');

  const forbiddenStudentUpload = await request('/documents/upload', {
    method: 'POST',
    token: seededStudentToken,
    body: studentUploadAttempt,
  });
  assert(forbiddenStudentUpload.status === 403, `Expected 403 for student upload, got ${forbiddenStudentUpload.status}`);

  const crossStudentDownload = await request(`/documents/file/${documentId}`, {
    token: newStudentToken,
  });
  assert(crossStudentDownload.status === 403, `Expected 403 for cross-student download, got ${crossStudentDownload.status}`);

  const studentOtherDeptAdvisories = await request('/advisories?dept=BSIT', {
    token: seededStudentToken,
  });
  assert(studentOtherDeptAdvisories.status === 403, `Expected 403 for student advisory cross-dept access, got ${studentOtherDeptAdvisories.status}`);

  const adminAnalytics = await request('/admin/analytics', {
    token: adminToken,
  });
  assert(adminAnalytics.status === 200, `Admin analytics failed: ${adminAnalytics.status}`);

  console.log('PHASEE_INTEGRATION_OK');
}

run().catch((error) => {
  console.error('PHASEE_INTEGRATION_FAIL');
  console.error(error.message || error);
  process.exit(1);
});
