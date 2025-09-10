// routes/aiRoutes.js
const express = require("express");
const router = express.Router();
const { chatWithSanta } = require("../controllers/aiController");
const { protect } = require("../middleware/authMiddleware");

// Protected route
router.post("/chat/:childId", protect, chatWithSanta);

module.exports = router;
