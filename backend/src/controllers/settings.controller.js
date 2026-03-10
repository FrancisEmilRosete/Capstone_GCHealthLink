const { PrismaClient } = require("@prisma/client");
const fs = require("fs");
const path = require("path");
const { comparePassword, hashPassword } = require("../utils/password.util");

const prisma = new PrismaClient();

const SETTINGS_FILE = path.join(__dirname, "../../exports/settings-store.json");
const SETTINGS_LOCK_FILE = `${SETTINGS_FILE}.lock`;
const SETTINGS_LOCK_MAX_WAIT_MS = Number(process.env.SETTINGS_LOCK_MAX_WAIT_MS || 3000);
const SETTINGS_LOCK_RETRY_MS = Number(process.env.SETTINGS_LOCK_RETRY_MS || 40);

const DEFAULT_SETTINGS = {
  clinic: {
    clinicName: "GC HealthLink - Clinic Management System",
    schoolYear: "2025-2026",
    contactNumber: "+63 47 224 2000",
    email: "clinic@gordoncollege.edu.ph",
    address: "Gordon College, Olongapo City",
    operatingHours: "Monday - Friday, 8:00 AM - 5:00 PM",
  },
  notifications: {
    lowInventory: true,
    highVisitVolume: true,
    pendingAccounts: true,
    diseaseAlert: true,
    loginActivity: false,
    exportActivity: false,
  },
  staffPreferences: {},
};

function createDefaultSettings() {
  return {
    clinic: { ...DEFAULT_SETTINGS.clinic },
    notifications: { ...DEFAULT_SETTINGS.notifications },
    staffPreferences: {},
  };
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function ensureSettingsDir() {
  const dir = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withSettingsLock(handler) {
  ensureSettingsDir();

  const startedAt = Date.now();
  let lockFd = null;

  while (Date.now() - startedAt <= SETTINGS_LOCK_MAX_WAIT_MS) {
    try {
      lockFd = fs.openSync(SETTINGS_LOCK_FILE, "wx");
      break;
    } catch (error) {
      if (error.code !== "EEXIST") {
        throw error;
      }

      await sleep(SETTINGS_LOCK_RETRY_MS);
    }
  }

  if (lockFd === null) {
    const lockError = new Error("Settings store is busy. Please retry.");
    lockError.status = 503;
    throw lockError;
  }

  try {
    return await handler();
  } finally {
    try {
      fs.closeSync(lockFd);
    } catch {
      // Ignore close errors so lock cleanup can continue.
    }

    try {
      if (fs.existsSync(SETTINGS_LOCK_FILE)) {
        fs.unlinkSync(SETTINGS_LOCK_FILE);
      }
    } catch {
      // Ignore cleanup errors because lock timeout still protects availability.
    }
  }
}

function loadSettingsStore() {
  ensureSettingsDir();

  if (!fs.existsSync(SETTINGS_FILE)) {
    const defaults = createDefaultSettings();
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(defaults, null, 2), "utf8");
    return defaults;
  }

  try {
    const fileContent = fs.readFileSync(SETTINGS_FILE, "utf8");
    const parsed = JSON.parse(fileContent);

    return {
      clinic: { ...DEFAULT_SETTINGS.clinic, ...(parsed.clinic || {}) },
      notifications: { ...DEFAULT_SETTINGS.notifications, ...(parsed.notifications || {}) },
      staffPreferences: parsed.staffPreferences || {},
    };
  } catch {
    return createDefaultSettings();
  }
}

function saveSettingsStore(settings) {
  ensureSettingsDir();

  // Write to temp first, then atomically replace to avoid partial/corrupt files.
  const tempFilePath = `${SETTINGS_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tempFilePath, JSON.stringify(settings, null, 2), "utf8");

  try {
    fs.renameSync(tempFilePath, SETTINGS_FILE);
  } catch (error) {
    if (error.code !== "EPERM" && error.code !== "EACCES" && error.code !== "EXDEV") {
      throw error;
    }

    // Windows/Dropbox can hold transient locks on target files; fall back to direct write.
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf8");

    if (fs.existsSync(tempFilePath)) {
      fs.unlinkSync(tempFilePath);
    }
  }
}

const getAdminSettings = async (req, res, next) => {
  try {
    const settings = loadSettingsStore();

    return res.json({
      success: true,
      message: "Admin settings retrieved successfully.",
      data: {
        clinic: settings.clinic,
        notifications: settings.notifications,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const updateAdminSettings = async (req, res, next) => {
  try {
    const clinic = req.body?.clinic || {};
    const notifications = req.body?.notifications || {};

    const settings = await withSettingsLock(async () => {
      const current = loadSettingsStore();

      current.clinic = {
        ...current.clinic,
        clinicName: normalizeText(clinic.clinicName) || current.clinic.clinicName,
        schoolYear: normalizeText(clinic.schoolYear) || current.clinic.schoolYear,
        contactNumber: normalizeText(clinic.contactNumber) || current.clinic.contactNumber,
        email: normalizeText(clinic.email) || current.clinic.email,
        address: normalizeText(clinic.address) || current.clinic.address,
        operatingHours: normalizeText(clinic.operatingHours) || current.clinic.operatingHours,
      };

      current.notifications = {
        ...current.notifications,
        ...Object.fromEntries(
          Object.entries(notifications).filter(([, value]) => typeof value === "boolean")
        ),
      };

      saveSettingsStore(current);
      return current;
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: "UPDATED_ADMIN_SETTINGS",
        ipAddress: req.ip,
      },
    });

    return res.json({
      success: true,
      message: "Settings saved successfully.",
      data: {
        clinic: settings.clinic,
        notifications: settings.notifications,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const getStaffSettings = async (req, res, next) => {
  try {
    const settings = loadSettingsStore();

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const preference = settings.staffPreferences[user.id] || { darkMode: false };

    return res.json({
      success: true,
      message: "Staff settings retrieved successfully.",
      data: {
        profile: {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.email,
        },
        preference,
      },
    });
  } catch (error) {
    return next(error);
  }
};

const updateStaffSettings = async (req, res, next) => {
  try {
    const darkMode = req.body?.darkMode;

    if (typeof darkMode !== "boolean") {
      return res.status(400).json({ success: false, message: "darkMode must be a boolean value." });
    }

    const settings = await withSettingsLock(async () => {
      const current = loadSettingsStore();

      current.staffPreferences[req.user.userId] = {
        ...(current.staffPreferences[req.user.userId] || {}),
        darkMode,
      };

      saveSettingsStore(current);
      return current;
    });

    return res.json({
      success: true,
      message: "Staff settings saved successfully.",
      data: settings.staffPreferences[req.user.userId],
    });
  } catch (error) {
    return next(error);
  }
};

const changeMyPassword = async (req, res, next) => {
  try {
    const currentPassword = normalizeText(req.body?.currentPassword);
    const newPassword = normalizeText(req.body?.newPassword);

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "currentPassword and newPassword are required." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "New password must be at least 8 characters." });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        passwordHash: true,
      },
    });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const isCurrentPasswordValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ success: false, message: "Current password is incorrect." });
    }

    const nextPasswordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: nextPasswordHash },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user.userId,
        action: "CHANGED_ACCOUNT_PASSWORD",
        ipAddress: req.ip,
      },
    });

    return res.json({
      success: true,
      message: "Password updated successfully.",
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  getAdminSettings,
  updateAdminSettings,
  getStaffSettings,
  updateStaffSettings,
  changeMyPassword,
};
