// routes/profileRoutes.js
const express = require("express");
const router = express.Router();
const { createChildProfile, getChildProfiles } = require("../controllers/profileController");
const { protect } = require("../middleware/authMiddleware");

// Protected routes
router.post("/", protect, createChildProfile);
router.get("/", protect, getChildProfiles);

module.exports = router;
