// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const { registerParent, loginParent } = require("../controllers/authController");

// Register
router.post("/register", registerParent);

// Login
router.post("/login", loginParent);

module.exports = router;
