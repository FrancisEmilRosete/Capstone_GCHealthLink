const express = require("express");
const { login } = require("../controllers/auth.controller");
const { protect } = require("../middleware/auth.middleware");
const { prisma } = require("../lib/prisma");

const router = express.Router();

router.post("/login", login);

// Logout — records audit log then responds (JWT is stateless, client discards token)
router.post("/logout", protect, async (req, res) => {
  try {
    await prisma.auditLog.create({
      data: {
        userId: req.user?.userId || null,
        action: "LOGOUT",
        ipAddress: req.ip || null,
        metadata: { role: req.user?.role || null },
      },
    });
  } catch {
    // non-blocking
  }
  return res.json({ success: true, message: "Logged out successfully." });
});

module.exports = router;