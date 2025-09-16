const express = require("express");
const multer = require("multer");
const { chatWithVoice } = require("../controllers/chatVoiceController");

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// POST /api/chat-voice
router.post("/chat-voice", upload.single("audio"), chatWithVoice);

module.exports = router;
