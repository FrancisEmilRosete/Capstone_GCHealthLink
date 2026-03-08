const express = require("express");
const { login } = require("../controllers/auth.controller");

const router = express.Router();

// This is the missing link! It tells Express to accept POST requests at /login
router.post("/login", login);

module.exports = router;