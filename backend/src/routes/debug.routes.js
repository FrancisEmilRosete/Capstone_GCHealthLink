/**
 * DEBUG ROUTES  (development only)
 * ─────────────────────────────────────────────────────────────
 * Provides endpoints to diagnose login issues without needing
 * a terminal or database GUI.
 *
 * Routes:
 *  GET  /api/v1/debug/status            – confirm backend is alive
 *  POST /api/v1/debug/reset-lock        – clear rate-limit for an email
 *  GET  /api/v1/debug/check-user/:email – check if a user exists
 *  POST /api/v1/debug/ensure-accounts   – upsert all test accounts
 */

const express = require('express');
const bcrypt  = require('bcrypt');
const { prisma } = require('../lib/prisma');
const { clearIdentityFailures, identityFailures } = require('../controllers/auth.controller');

const router = express.Router();

// GET /api/v1/debug/status
router.get('/status', (_req, res) => {
  res.json({ ok: true, env: process.env.NODE_ENV || 'development' });
});

// GET /api/v1/debug/reset-lock?email=...  (browser-friendly)
// POST /api/v1/debug/reset-lock  { email: "..." }
function resetLock(req, res) {
  const email = ((req.query.email || req.body?.email) || '').trim().toLowerCase();
  if (!email) return res.status(400).json({ error: 'email query param or body field required' });

  let cleared = 0;
  for (const key of identityFailures.keys()) {
    if (key.includes(email)) {
      identityFailures.delete(key);
      cleared++;
    }
  }

  res.json({ ok: true, message: `Cleared ${cleared} lock(s) for ${email}` });
}

router.get('/reset-lock', resetLock);
router.post('/reset-lock', resetLock);

// GET /api/v1/debug/check-user?email=...
router.get('/check-user', async (req, res) => {
  try {
    const email = (req.query.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ error: 'email query param required' });

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true, clinicStaffType: true, createdAt: true },
    });

    if (!user) {
      return res.json({ exists: false, email });
    }

    res.json({ exists: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/v1/debug/ensure-accounts  (browser-friendly alias)
// POST /api/v1/debug/ensure-accounts
// Creates/updates all standard test accounts with password123
async function ensureAccounts(_req, res) {
  try {
    const hash = await bcrypt.hash('password123', 10);

    const accounts = [
      { email: 'admin@gordoncollege.edu.ph',   role: 'ADMIN',        clinicStaffType: null      },
      { email: 'nurse@gordoncollege.edu.ph',    role: 'CLINIC_STAFF', clinicStaffType: 'NURSE'   },
      { email: 'doctor@gordoncollege.edu.ph',   role: 'CLINIC_STAFF', clinicStaffType: 'DOCTOR'  },
      { email: 'dental@gordoncollege.edu.ph',   role: 'CLINIC_STAFF', clinicStaffType: 'DENTIST' },
      { email: 'student@gordoncollege.edu.ph',  role: 'STUDENT',      clinicStaffType: null      },
    ];

    const results = [];

    for (const account of accounts) {
      const existing = await prisma.user.findUnique({ where: { email: account.email } });

      if (!existing) {
        const createData = {
          email: account.email,
          passwordHash: hash,
          role: account.role,
        };

        if (account.clinicStaffType) {
          createData.clinicStaffType = account.clinicStaffType;
        }

        if (account.role === 'STUDENT') {
          createData.studentProfile = {
            create: {
              studentNumber: '2024-0001',
              firstName: 'Juan',
              lastName: 'Dela Cruz',
              courseDept: 'BSCS',
              age: 20,
              sex: 'Male',
            },
          };
        }

        await prisma.user.create({ data: createData });
        results.push({ email: account.email, action: 'created' });
      } else {
        const updateData = { passwordHash: hash };
        if (account.clinicStaffType && existing.clinicStaffType !== account.clinicStaffType) {
          updateData.clinicStaffType = account.clinicStaffType;
        }
        await prisma.user.update({ where: { email: account.email }, data: updateData });
        results.push({ email: account.email, action: 'password-reset' });
      }
    }

    res.json({ ok: true, results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

router.get('/ensure-accounts', ensureAccounts);
router.post('/ensure-accounts', ensureAccounts);

module.exports = router;

