// controllers/chatVoiceController.js
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const ffmpegPath = require("ffmpeg-static"); // ✅ use ffmpeg-static
const OpenAI = require("openai");
const axios = require("axios");

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

exports.chatWithVoice = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio uploaded" });
    }

    // 0️⃣ Validate environment variables
    const { ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID } = process.env;
    if (!ELEVENLABS_API_KEY || !ELEVENLABS_VOICE_ID) {
      return res.status(500).json({
        error:
          "ElevenLabs API key or voice ID is missing. Please set ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID in your .env",
      });
    }

    // 1️⃣ Prepare temp files
    const tmpDir = path.join(__dirname, "../tmp");
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

    const originalFile = req.file.path;
    const convertedFile = path.join(tmpDir, `converted-${Date.now()}.wav`);

    // 2️⃣ Convert audio to 16kHz mono WAV
    execSync(`"${ffmpegPath}" -y -i "${originalFile}" -ar 16000 -ac 1 "${convertedFile}"`);

    // 3️⃣ Transcribe with Whisper
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(convertedFile),
      model: "whisper-1",
    });
    const userText = transcription.text.trim();
    console.log("🗣️ Transcribed:", userText);

    // 4️⃣ GPT reply
    const gptResp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are Santa Claus. Be jolly, magical, and kind!" },
        { role: "user", content: userText },
      ],
    });
    const reply = gptResp.choices[0].message.content;

    // 5️⃣ ElevenLabs TTS
    const elevenResp = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`,
      {
        text: reply,
        model_id: "eleven_monolingual_v1",
        voice_settings: { stability: 0.3, similarity_boost: 0.7 },
      },
      {
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        responseType: "arraybuffer",
      }
    );

    // 6️⃣ Save audio file
    const audioFile = path.join(tmpDir, `santa-${Date.now()}.mp3`);
    fs.writeFileSync(audioFile, Buffer.from(elevenResp.data));

    // 7️⃣ Return reply + audio URL
    res.json({
      reply,
      audioUrl: `/tmp/${path.basename(audioFile)}`,
    });
  } catch (err) {
    console.error("❌ Chat Voice error:", err);
    res.status(500).json({ error: "Santa had trouble chatting" });
  } finally {
    // 8️⃣ Cleanup temp files
    if (req.file) fs.existsSync(req.file.path) && fs.unlinkSync(req.file.path);
    const convertedFile = path.join(__dirname, "../tmp", `converted-${Date.now()}.wav`);
    fs.existsSync(convertedFile) && fs.unlinkSync(convertedFile);
  }
};
