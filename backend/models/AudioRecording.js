const mongoose = require('mongoose');

const AudioRecordingSchema = new mongoose.Schema({
  child: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ChildProfile',
    required: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  filename: {
    type: String,
    required: true
  },
  sequenceNumber: {
    type: Number,
    required: true
  },
  transcription: {
    type: String,
    default: ''
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  fileSize: {
    type: Number, // in bytes
    default: 0
  },
  filePath: {
    type: String,
    required: true
  }
}, {
  timestamps: true
});

// Index for faster queries
AudioRecordingSchema.index({ child: 1, sequenceNumber: 1 });
AudioRecordingSchema.index({ parent: 1 });

module.exports = mongoose.model('AudioRecording', AudioRecordingSchema);