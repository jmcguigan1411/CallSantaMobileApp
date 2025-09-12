// routes/aiRoutes.js
const express = require("express");
const router = express.Router();
const { chatWithSanta } = require("../controllers/aiController");
const { protect } = require("../middleware/authMiddleware");

// Santa Chat Routes
// POST /api/ai/chat/:childId -> Send message and get Santa's reply
router.post("/chat/:childId", protect, chatWithSanta);

// (Optional: Future expansion)
// e.g. router.post("/story/:childId", protect, generateSantaStory);

module.exports = router;
