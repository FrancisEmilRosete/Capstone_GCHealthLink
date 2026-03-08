const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth.routes");
const clinicRoutes = require("./routes/clinic.routes");
const studentsRoutes = require("./routes/students.routes");
const inventoryRoutes = require("./routes/inventory.routes");
const adminRoutes = require("./routes/admin.routes");
const { errorHandler, notFound } = require("./middleware/error.middleware");

const app = express();

app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/", (req, res) => {
  res.json({ message: "Backend is running successfully!" });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/clinic", clinicRoutes);
app.use("/api/v1/students", studentsRoutes);
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/admin", adminRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = { app };
