// controllers/aiController.js
const OpenAI = require("openai");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const fs = require("fs/promises");
const fsSync = require("fs");
const ChildProfile = require("../models/ChildProfile");
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

// --- Generate Santa's voice with ElevenLabs ---
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
      voice_settings: { 
        stability: 0.65, 
        similarity_boost: 0.75,
        style: 0.1,
        use_speaker_boost: true
      },
    };

    console.log(`Generating voice for text: "${text.substring(0, 50)}..."`);

    const ttsResp = await axios.post(elevenUrl, ttsPayload, {
      headers: {
        "xi-api-key": ELEVEN_API_KEY,
        "Content-Type": "application/json",
      },
      responseType: "arraybuffer",
    });

    // Convert to base64 for mobile app
    const audioBuffer = Buffer.from(ttsResp.data);
    const audioBase64 = audioBuffer.toString('base64');
    
    console.log(`Generated audio: ${audioBase64.length} characters`);
    return audioBase64;

  } catch (ttsErr) {
    console.error("ElevenLabs TTS error:", ttsErr.response?.data || ttsErr.message);
    return null;
  }
}

// --- Transcribe audio using Whisper ---
async function transcribeAudio(filePath) {
  try {
    console.log(`Transcribing audio file: ${filePath}`);
    
    const transcription = await openai.audio.transcriptions.create({
      file: fsSync.createReadStream(filePath),
      model: "whisper-1",
      language: "en",
    });

    console.log(`Transcription result: "${transcription.text}"`);
    return transcription.text;
  } catch (error) {
    console.error("Whisper transcription error:", error);
    throw new Error("Failed to transcribe audio");
  }
}

// --- Existing text chat controller ---
exports.chatWithSanta = async (req, res) => {
  const { childId } = req.params;
  const { message } = req.body;

  if (!message || !message.trim()) {
    return res.status(400).json({ message: "Message is required" });
  }

  try {
    // 1) Find child profile (ensure child belongs to logged-in parent)
    const child = await ChildProfile.findOne({ _id: childId, parent: req.user._id });
    if (!child) return res.status(404).json({ message: "Child not found" });

    // 2) Build persona prompt
    const systemPrompt = getSantaPrompt
      ? getSantaPrompt(child.name, child.age)
      : `You are Santa Claus. Always be kind, magical, and encouraging.`;

    // 3) Generate Santa's text reply with OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
      max_tokens: 250,
    });

    const santaResponse =
      completion.choices?.[0]?.message?.content?.trim() ||
      "Ho ho ho! Merry Christmas!";

    // 4) Generate Santa's voice with ElevenLabs (optional)
    let audioUrl = null;
    try {
      const audioBuffer = await generateSantaVoice(santaResponse);
      if (audioBuffer) {
        audioUrl = await saveAudioBuffer(Buffer.from(audioBuffer, 'base64'), "mp3");
      }
    } catch (ttsErr) {
      console.error("TTS generation failed:", ttsErr);
    }

    // 5) Return reply + audioUrl
    res.json({ reply: santaResponse, audioUrl });
  } catch (err) {
    console.error("chatWithSanta error:", err);
    res.json({
      reply: `Ho ho ho! Santa is busy feeding the reindeer, but he sends hugs!`,
      audioUrl: null,
    });
  }
};

// --- NEW: Audio chat controller for phone calls ---
exports.chatWithSantaAudio = async (req, res) => {
  const { childId } = req.params;
  const { isGreeting, greetingText, childName } = req.body;

  try {
    // 1) Find child profile
    const child = await ChildProfile.findOne({ _id: childId, parent: req.user._id });
    if (!child) {
      return res.status(404).json({ message: "Child not found" });
    }

    console.log(`Audio chat request for child: ${child.name} (${child.age}y)`);

    let santaResponse;

    // Handle greeting vs regular conversation
    if (isGreeting === 'true' || isGreeting === true) {
      // This is the initial greeting
      santaResponse = greetingText || `Ho ho ho! Hello ${childName || child.name}! This is Santa calling from the North Pole. What would you like for Christmas this year?`;
      console.log("Processing greeting:", santaResponse);
    } else {
      // This is a regular conversation - need to process audio
      const audioFile = req.file;
      
      if (!audioFile) {
        return res.status(400).json({ message: "No audio file provided" });
      }

      console.log(`Processing audio file: ${audioFile.filename} (${audioFile.size} bytes)`);

      // 2) Transcribe audio using Whisper
      const userMessage = await transcribeAudio(audioFile.path);
      
      if (!userMessage.trim()) {
        // Clean up file and return gentle prompt
        await fs.unlink(audioFile.path).catch(console.error);
        const audioBase64 = await generateSantaVoice("Ho ho ho! I didn't quite catch that. Can you tell me again what you'd like for Christmas?");
        return res.json({
          text: "I didn't quite catch that. Can you tell me again?",
          audioBase64
        });
      }

      // 3) Generate ChatGPT response
      const systemPrompt = getSantaPrompt
        ? getSantaPrompt(child.name, child.age)
        : `You are Santa Claus talking to ${child.name}, who is ${child.age} years old. Be warm, magical, encouraging, and keep responses conversational and under 150 words. Ask follow-up questions to keep the conversation going.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        max_tokens: 200,
        temperature: 0.8,
      });

      santaResponse = completion.choices?.[0]?.message?.content?.trim() || 
                    "Ho ho ho! That's wonderful! Tell me more!";

      console.log(`User said: "${userMessage}"`);
      console.log(`Santa responds: "${santaResponse}"`);

      // Clean up uploaded audio file
      await fs.unlink(audioFile.path).catch(console.error);
    }

    // 4) Generate Santa's voice using ElevenLabs
    const audioBase64 = await generateSantaVoice(santaResponse);

    if (!audioBase64) {
      return res.status(500).json({ 
        message: "Failed to generate Santa's voice",
        text: santaResponse,
        audioBase64: null
      });
    }

    // 5) Return response
    res.json({
      text: santaResponse,
      audioBase64: audioBase64
    });

  } catch (error) {
    console.error("chatWithSantaAudio error:", error);
    
    // Clean up uploaded file if it exists
    if (req.file) {
      await fs.unlink(req.file.path).catch(console.error);
    }

    // Return fallback response
    const fallbackText = "Ho ho ho! Santa is having some technical difficulties at the North Pole. Can you try again?";
    const fallbackAudio = await generateSantaVoice(fallbackText).catch(() => null);

    res.status(500).json({
      text: fallbackText,
      audioBase64: fallbackAudio,
      error: error.message
    });
  }
};