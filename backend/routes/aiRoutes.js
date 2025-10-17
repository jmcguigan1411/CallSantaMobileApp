const express = require('express');
const router = express.Router();
const multer = require('multer');
const aiController = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

// Configure multer for audio file uploads
const upload = multer({
  dest: 'tmp/',
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