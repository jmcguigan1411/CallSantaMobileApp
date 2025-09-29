const OpenAI = require("openai");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs/promises");
const fsSync = require("fs");
const ChildProfile = require("../models/ChildProfile");
const AudioRecording = require("../models/AudioRecording");
const { getSantaPrompt } = require("../utils/santaPersona");

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// --- helper: save audio buffer and return a static URL ---
async function saveAudioBuffer(buffer, ext = "mp3") {
  const filename = `${Date.now()}-${uuidv4()}.${ext}`;
  const tmpDir = path.join(__dirname, "..", "tmp");
  if (!fsSync.existsSync(tmpDir)) {
    fsSync.mkdirSync(tmpDir);
  }
  const filePath = path.join(tmpDir, filename);
  await fs.writeFile(filePath, buffer);
  return `/tmp/${filename}`; // express.static will serve this
}

// --- NEW: Save audio recording to database ---
async function saveAudioRecording(childId, parentId, audioFilePath, transcription) {
  try {
    console.log(`🔍 saveAudioRecording called with:`, { childId, parentId, audioFilePath, transcriptionLength: transcription?.length });
    
    const child = await ChildProfile.findById(childId);
    if (!child) {
      console.log(`❌ Child not found: ${childId}`);
      return null;
    }

    // Get next sequence number
    const lastRecording = await AudioRecording.findOne({ child: childId })
      .sort({ sequenceNumber: -1 });
    const sequenceNumber = lastRecording ? lastRecording.sequenceNumber + 1 : 1;

    // Get file info
    const stats = await fs.stat(audioFilePath);
    const filename = `${child.name.toLowerCase().replace(/\s+/g, '_')}_audio_${sequenceNumber}.m4a`;

    // Create permanent storage directory
    const permanentDir = path.join(__dirname, '..', 'audio-recordings');
    if (!fsSync.existsSync(permanentDir)) {
      fsSync.mkdirSync(permanentDir, { recursive: true });
    }

    // Copy file to permanent location
    const permanentPath = path.join(permanentDir, filename);
    await fs.copyFile(audioFilePath, permanentPath);

    // Save to database
    const recording = new AudioRecording({
      child: childId,
      parent: parentId,
      filename,
      sequenceNumber,
      transcription,
      fileSize: stats.size,
      filePath: permanentPath
    });

    await recording.save();
    console.log(`✅ Saved audio recording: ${filename}`);
    
    return recording;
  } catch (error) {
    console.error('❌ Error saving audio recording:', error);
    return null;
  }
}

// --- Generate Santa's voice with ElevenLabs (OPTIMIZED) ---
async function generateSantaVoice(text) {
  const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY;
  const VOICE_ID = process.env.ELEVENLABS_VOICE_ID;

  if (!ELEVEN_API_KEY || !VOICE_ID) {
    console.warn("ElevenLabs API key or Voice ID not configured");
    return null;
  }

  try {
    const elevenUrl = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;
    const ttsPayload = {
      text: text,
      model_id: "eleven_turbo_v2",
      voice_settings: { 
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: false,
        speed: 0.85,
      },
    };

    console.log(`Generating voice for text: "${text.substring(0, 50)}..."`);
    console.log(`Using Voice ID: ${VOICE_ID}`);

    const ttsResp = await axios.post(elevenUrl, ttsPayload, {
      headers: {
        "xi-api-key": ELEVEN_API_KEY,
        "Content-Type": "application/json",
      },
      responseType: "arraybuffer",
      timeout: 15000,
    });

    const audioBuffer = Buffer.from(ttsResp.data);
    const audioBase64 = audioBuffer.toString('base64');
    
    console.log(`✅ Generated audio: ${audioBase64.length} characters`);
    return audioBase64;

  } catch (ttsErr) {
    if (ttsErr.response?.data) {
      const errorData = Buffer.isBuffer(ttsErr.response.data) 
        ? JSON.parse(ttsErr.response.data.toString('utf-8'))
        : ttsErr.response.data;
      console.error("❌ ElevenLabs detailed error:", errorData);
    } else {
      console.error("❌ ElevenLabs TTS error:", ttsErr.message);
    }
    return null;
  }
}

// --- Transcribe audio using Whisper (OPTIMIZED) ---
async function transcribeAudio(filePath) {
  try {
    console.log(`Transcribing audio file: ${filePath}`);
    
    const transcription = await openai.audio.transcriptions.create({
      file: fsSync.createReadStream(filePath),
      model: "whisper-1",
      language: "en",
      response_format: "text",
    });

    console.log(`Transcription result: "${transcription}"`);
    return transcription;
  } catch (error) {
    console.error("Whisper transcription error:", error);
    throw new Error("Failed to transcribe audio");
  }
}

// --- Generate ChatGPT response (OPTIMIZED) ---
async function generateSantaResponse(userMessage, child) {
  const systemPrompt = getSantaPrompt(child.name, child.age) + 
    " Keep response under 40 words for natural conversation flow.";

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    max_tokens: 100,
    temperature: 0.8,
  });

  return completion.choices?.[0]?.message?.content?.trim() || 
         "Ho ho ho! That's wonderful! Tell me more!";
}

// --- Existing text chat controller ---
exports.chatWithSanta = async (req, res) => {
  const { childId } = req.params;
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ message: "Message is required" });
  }

  try {
    const child = await ChildProfile.findOne({ _id: childId, parent: req.user._id });
    if (!child) return res.status(404).json({ message: "Child not found" });

    const systemPrompt = getSantaPrompt(child.name, child.age) + 
      " Keep response under 50 words.";

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      max_tokens: 150,
    });

    const santaResponse =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Ho ho ho! Merry Christmas!";

    let audioUrl = null;
    try {
      const audioBuffer = await generateSantaVoice(santaResponse);
      if (audioBuffer) {
        audioUrl = await saveAudioBuffer(Buffer.from(audioBuffer, 'base64'), "mp3");
      }
    } catch (ttsErr) {
      console.error("TTS generation failed:", ttsErr);
    }

    res.json({ reply: santaResponse, audioUrl });
  } catch (err) {
    console.error("chatWithSanta error:", err);
    res.json({
      reply: `Ho ho ho! Santa is busy feeding the reindeer, but he sends hugs!`,
      audioUrl: null,
    });
  }
};

// --- Audio chat controller for phone calls (OPTIMIZED + RECORDING SAVE) ---
exports.chatWithSantaAudio = async (req, res) => {
  const { childId } = req.params;
  const { isGreeting, greetingText, childName } = req.body;

  try {
    const child = await ChildProfile.findOne({ _id: childId, parent: req.user._id });
    if (!child) {
      return res.status(404).json({ message: "Child not found" });
    }

    console.log(`Audio chat request for child: ${child.name} (${child.age}y)`);

    let santaResponse;

    if (isGreeting === 'true' || isGreeting === true) {
      santaResponse = greetingText || `Ho ho ho! Hello ${childName || child.name}! What would you like for Christmas?`;
      console.log("Processing greeting:", santaResponse);
    } else {
      const audioFile = req.file;
      
      if (!audioFile) {
        return res.status(400).json({ message: "No audio file provided" });
      }

      console.log(`Processing audio file: ${audioFile.filename} (${audioFile.size} bytes)`);

      try {
        // Transcribe audio using Whisper
        const userMessage = await transcribeAudio(audioFile.path);
        
        // DEBUG LOGGING
        console.log(`🔍 DEBUG: About to save recording`);
        console.log(`🔍 childId: ${childId}`);
        console.log(`🔍 parentId: ${req.user._id}`);
        console.log(`🔍 audioFilePath: ${audioFile.path}`);
        console.log(`🔍 transcription: "${userMessage}"`);
        
        // SAVE AUDIO RECORDING WITH TRANSCRIPTION
        const savedRecording = await saveAudioRecording(childId, req.user._id, audioFile.path, userMessage);
        console.log(`🔍 Recording saved result:`, savedRecording ? 'SUCCESS' : 'FAILED');
        
        if (!userMessage.trim()) {
          await fs.unlink(audioFile.path).catch(console.error);
          const audioBase64 = await generateSantaVoice("I didn't catch that. Tell me again?");
          return res.json({
            text: "I didn't quite catch that. Can you tell me again?",
            audioBase64
          });
        }

        // Generate ChatGPT response
        santaResponse = await generateSantaResponse(userMessage, child);

        console.log(`User said: "${userMessage}"`);
        console.log(`Santa responds: "${santaResponse}"`);

        // Clean up uploaded audio file from tmp
        await fs.unlink(audioFile.path).catch(console.error);
      } catch (transcriptionError) {
        console.error("Audio processing error:", transcriptionError);
        await fs.unlink(audioFile.path).catch(console.error);
        
        const fallbackText = "I'm having trouble hearing you. Try speaking again?";
        const fallbackAudio = await generateSantaVoice(fallbackText);
        return res.json({
          text: fallbackText,
          audioBase64: fallbackAudio
        });
      }
    }

    const audioBase64 = await generateSantaVoice(santaResponse);

    if (!audioBase64) {
      console.warn('⚠️ TTS failed, returning text-only response');
      return res.json({
        text: santaResponse,
        audioBase64: null,
        ttsUnavailable: true
      });
    }

    res.json({
      text: santaResponse,
      audioBase64: audioBase64
    });

  } catch (error) {
    console.error("chatWithSantaAudio error:", error);
    
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }

    const fallbackText = "Santa is having technical difficulties. Try again?";
    const fallbackAudio = await generateSantaVoice(fallbackText).catch(() => null);

    res.status(500).json({
      text: fallbackText,
      audioBase64: fallbackAudio,
      error: error.message
    });
  }
};