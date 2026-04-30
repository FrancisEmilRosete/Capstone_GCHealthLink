const express = require("express");
const cors = require("cors");
const path = require("path");
const compression = require("compression");

require("dotenv").config({
  path: path.resolve(__dirname, "..", ".env"),
});

// 1. Initialize the app FIRST
const app = express();
app.disable("x-powered-by");
app.set("trust proxy", 1);

function normalizeOrigin(value) {
  return typeof value === "string"
    ? value.trim().replace(/\/+$/, "")
    : "";
}

const configuredCorsOrigins = (
  process.env.CORS_ORIGIN
  || "https://capstone-gchealthlink.vercel.app,https://capstone-gchealthlink-git-main-francisemilrosetes-projects.vercel.app,http://localhost:3000"
)
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowAnyCorsOrigin = configuredCorsOrigins.includes("*");
const allowedCorsOrigins = new Set(
  configuredCorsOrigins
    .map((origin) => normalizeOrigin(origin))
    .filter(Boolean)
);

function isAllowedCorsOrigin(origin) {
  if (!origin) {
    return true;
  }

  if (allowAnyCorsOrigin) {
    return true;
  }

  const normalizedOrigin = normalizeOrigin(origin);
  return allowedCorsOrigins.has(normalizedOrigin);
}

// 2. Set up Middleware (CORS and JSON parsing)
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedCorsOrigin(origin)) {
        return callback(null, true);
      }

      const error = new Error("CORS origin is not allowed.");
      error.status = 403;
      return callback(error);
    },
    credentials: true,
  })
);

app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

if (process.env.LOG_REQUESTS === "true") {
  app.use((req, res, next) => {
    console.log(`INCOMING REQUEST: ${req.method} ${req.url}`);
    next();
  });
}

// 3. Import Routes
const authRoutes = require("./routes/auth.routes");
const clinicRoutes = require("./routes/clinic.routes");
const studentsRoutes = require("./routes/students.routes");
const inventoryRoutes = require("./routes/inventory.routes");
const adminRoutes = require("./routes/admin.routes");
const { errorHandler, notFound } = require("./middleware/error.middleware");
const appointmentRoutes = require("./routes/appointment.routes");
const advisoryRoutes = require("./routes/advisory.routes");
const analyticsRoutes = require("./routes/analytics.routes");
const documentRoutes = require("./routes/document.routes");
const physicalExamRoutes = require("./routes/physicalExam.routes");
const certificateRoutes = require("./routes/certificate.routes");
const settingsRoutes = require("./routes/settings.routes");
const emergencyRoutes = require("./routes/emergency.routes");
const aiRoutes = require("./routes/ai.routes");
const debugRoutes = require("./routes/debug.routes");

// 5. Base Route
app.get("/", (req, res) => {
  res.json({ message: "Backend is running successfully!" });
});

app.get("/healthz", (req, res) => {
  res.status(200).json({ ok: true });
});

// 6. API Routes
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/clinic", clinicRoutes);
app.use("/api/v1/students", studentsRoutes);
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/appointments", appointmentRoutes);
app.use("/api/v1/advisories", advisoryRoutes);
app.use("/api/v1/analytics", analyticsRoutes);
app.use("/api/v1/documents", documentRoutes);
app.use("/api/v1/physical-exams", physicalExamRoutes);
app.use("/api/v1/certificates", certificateRoutes);
app.use("/api/v1/settings", settingsRoutes);
app.use("/api/v1/emergency", emergencyRoutes);
app.use("/api/v1/ai", aiRoutes);
app.use("/api/v1/debug", debugRoutes);

// 7. Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

module.exports = { app };