// routes/aiRoutes.js
const express = require("express");
const multer = require("multer");
const router = express.Router();
const { chatWithSanta, chatWithSantaAudio } = require("../controllers/aiController");
const { protect } = require("../middleware/authMiddleware");

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'tmp/'); // Make sure this directory exists
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'audio-' + uniqueSuffix + '.m4a');
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

// Existing text chat route
router.post("/chat/:childId", protect, chatWithSanta);

// NEW: Audio chat route for Santa calls
router.post("/chat-audio/:childId", protect, upload.single('audio'), chatWithSantaAudio);

module.exports = router;