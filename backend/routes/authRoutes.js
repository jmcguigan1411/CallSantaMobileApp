// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const { registerParent, loginParent, socialLogin } = require("../controllers/authController");

// Register
router.post("/register", registerParent);

// Login
router.post("/login", loginParent);

// Social Login (Google/Apple)
router.post("/social-login", socialLogin);

module.exports = router;
