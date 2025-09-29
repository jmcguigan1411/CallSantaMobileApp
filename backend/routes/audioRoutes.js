const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

// Add debug logging
const audioController = require('../controllers/audioController');
console.log('audioController exports:', Object.keys(audioController));

const {
  getChildAudioRecordings,
  deleteAudioRecording,
  downloadAudioRecording,
  extractWishlist
} = audioController;

// Log each function to see which is undefined
console.log('getChildAudioRecordings:', typeof getChildAudioRecordings);
console.log('deleteAudioRecording:', typeof deleteAudioRecording);
console.log('downloadAudioRecording:', typeof downloadAudioRecording);
console.log('extractWishlist:', typeof extractWishlist);

// Get all recordings for a child
router.get('/child/:childId', protect, getChildAudioRecordings);

// Extract wishlist from recordings
router.get('/child/:childId/wishlist', protect, extractWishlist);

// Delete a recording
router.delete('/:recordingId', protect, deleteAudioRecording);

// Download a recording
router.get('/:recordingId/download', protect, downloadAudioRecording);

module.exports = router;