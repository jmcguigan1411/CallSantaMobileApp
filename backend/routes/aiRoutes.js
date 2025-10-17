const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const aiController = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

// Configure multer with proper file extension handling
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'tmp/');
  },
  filename: function (req, file, cb) {
    // Keep the original extension
    const ext = path.extname(file.originalname) || '.m4a';
    cb(null, Date.now() + '-' + Math.random().toString(36).substring(7) + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  }
});

// Text chat with Santa
router.post('/chat/:childId', protect, aiController.chatWithSanta);

// Audio chat with Santa (for phone calls)
router.post(
  '/chat-audio/:childId',
  protect,
  upload.single('audio'),
  aiController.chatWithSantaAudio
);

// Extract wishlist from local device recordings
router.post('/wishlist/extract', protect, aiController.extractWishlistLocal);

module.exports = router;