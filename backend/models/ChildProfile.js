const mongoose = require('mongoose');

const ChildProfileSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  gender: { type: String, required: false },
  phoneticSpelling: { type: String, required: false },
  pronunciationSamples: { type: [String], default: [] },
  parent: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

// Prevent model overwrite errors in watch mode
module.exports = mongoose.models.ChildProfile || mongoose.model('ChildProfile', ChildProfileSchema);
