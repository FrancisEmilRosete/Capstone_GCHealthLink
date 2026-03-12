const express = require("express");
const cors = require("cors");

// 1. Initialize the app FIRST
const app = express();

const allowedCorsOrigins = (process.env.CORS_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// 2. Set up Middleware (CORS and JSON parsing)
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedCorsOrigins.includes(origin)) {
        return callback(null, true);
      }

      const error = new Error("CORS origin is not allowed.");
      error.status = 403;
      return callback(error);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: "1mb" }));

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

// 5. Base Route
app.get("/", (req, res) => {
  res.json({ message: "Backend is running successfully!" });
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

// 7. Error Handling Middleware
app.use(notFound);
app.use(errorHandler);

module.exports = { app };