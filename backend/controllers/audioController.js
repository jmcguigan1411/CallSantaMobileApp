const AudioRecording = require('../models/AudioRecording');
const ChildProfile = require('../models/ChildProfile');
const fs = require('fs/promises');
const path = require('path');
const OpenAI = require('openai');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Get all audio recordings for a child
exports.getChildAudioRecordings = async (req, res) => {
  try {
    const { childId } = req.params;

    // Verify child belongs to parent
    const child = await ChildProfile.findOne({ _id: childId, parent: req.user._id });
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }

    const recordings = await AudioRecording.find({ child: childId })
      .sort({ sequenceNumber: 1 })
      .select('-filePath'); // Don't send file path to frontend

    res.json(recordings);
  } catch (error) {
    console.error('Error fetching audio recordings:', error);
    res.status(500).json({ message: 'Failed to fetch audio recordings' });
  }
};

// Delete an audio recording
exports.deleteAudioRecording = async (req, res) => {
  try {
    const { recordingId } = req.params;

    const recording = await AudioRecording.findById(recordingId).populate('child');
    
    if (!recording) {
      return res.status(404).json({ message: 'Recording not found' });
    }

    // Verify parent owns this recording
    if (recording.parent.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Delete the physical file
    try {
      await fs.unlink(recording.filePath);
    } catch (fileError) {
      console.error('Error deleting file:', fileError);
    }

    // Delete from database
    await AudioRecording.deleteOne({ _id: recordingId });

    res.json({ message: 'Recording deleted successfully' });
  } catch (error) {
    console.error('Error deleting audio recording:', error);
    res.status(500).json({ message: 'Failed to delete recording' });
  }
};

// Download an audio file
exports.downloadAudioRecording = async (req, res) => {
  try {
    const { recordingId } = req.params;

    const recording = await AudioRecording.findById(recordingId);
    
    if (!recording) {
      return res.status(404).json({ message: 'Recording not found' });
    }

    // Verify parent owns this recording
    if (recording.parent.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Send file
    res.download(recording.filePath, recording.filename);
  } catch (error) {
    console.error('Error downloading audio recording:', error);
    res.status(500).json({ message: 'Failed to download recording' });
  }
};

// Extract wishlist from all recordings for a child
// Extract wishlist from all recordings for a child
exports.extractWishlist = async (req, res) => {
  try {
    const { childId } = req.params;

    const child = await ChildProfile.findOne({ _id: childId, parent: req.user._id });
    if (!child) {
      return res.status(404).json({ message: 'Child not found' });
    }

    const recordings = await AudioRecording.find({ 
      child: childId,
      transcription: { $ne: '' }
    }).sort({ sequenceNumber: 1 });

    if (recordings.length === 0) {
      return res.json({ wishlist: [], message: 'No recordings found' });
    }

    const allTranscriptions = recordings
      .map((r, idx) => `[Recording ${idx + 1}]: ${r.transcription}`)
      .join('\n\n');

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are analyzing conversations between a child and Santa Claus. Extract all gift wishes, toys, activities, or things the child mentioned wanting for Christmas. Return a JSON object with a "wishlist" array. Each item should be a string describing what the child wants. Only include actual wishes, not general conversation.`
        },
        {
          role: "user",
          content: `Child's name: ${child.name}\nAge: ${child.age}\n\nTranscriptions:\n${allTranscriptions}\n\nExtract the wishlist as a JSON object with a "wishlist" array.`
        }
      ],
      max_tokens: 500,
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(completion.choices[0].message.content);
    const wishlist = result.wishlist || result.items || [];

    // SAVE WISHLIST TO DATABASE
    child.wishlist = wishlist;
    await child.save();
    console.log(`✅ Saved wishlist for ${child.name}:`, wishlist);

    res.json({ 
      wishlist,
      recordingsAnalyzed: recordings.length,
      childName: child.name
    });

  } catch (error) {
    console.error('Error extracting wishlist:', error);
    res.status(500).json({ message: 'Failed to extract wishlist', error: error.message });
  }
};