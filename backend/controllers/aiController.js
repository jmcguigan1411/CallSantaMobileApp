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

// --- main controller ---
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
      "Ho ho ho! Merry Christmas! 🎅✨";

    // 4) Generate Santa's voice with ElevenLabs (optional)
    let audioUrl = null;
    const ELEVEN_API_KEY = process.env.ELEVENLABS_API_KEY;
    const VOICE_ID = process.env.ELEVENLABS_VOICE_ID;

    if (ELEVEN_API_KEY && VOICE_ID) {
      try {
        const elevenUrl = `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`;
        const ttsPayload = {
          text: santaResponse,
          voice_settings: { stability: 0.65, similarity_boost: 0.75 },
        };

        const ttsResp = await axios.post(elevenUrl, ttsPayload, {
          headers: {
            "xi-api-key": ELEVEN_API_KEY,
            "Content-Type": "application/json",
          },
          responseType: "arraybuffer",
        });

        audioUrl = await saveAudioBuffer(Buffer.from(ttsResp.data), "mp3");
      } catch (ttsErr) {
        console.error("Santa TTS error:", ttsErr.message || ttsErr);
      }
    }

    // 5) Return reply + audioUrl
    res.json({ reply: santaResponse, audioUrl });
  } catch (err) {
    console.error("chatWithSanta error:", err);
    res.json({
      reply: `Ho ho ho! Santa is busy feeding the reindeer, but he sends hugs! 🎅🦌✨`,
      audioUrl: null,
    });
  }
};
