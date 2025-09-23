// routes/authRoutes.js
const express = require("express");
const router = express.Router();
const { registerParent, loginParent, socialLogin, acceptTerms } = require("../controllers/authController");
const { protect } = require("../middleware/authMiddleware");

// Register
router.post("/register", registerParent);

// Login
router.post("/login", loginParent);

// Social Login (Google/Apple)
router.post("/social-login", socialLogin);

// Accept Terms
router.post("/accept-terms", protect, acceptTerms);

module.exports = router;