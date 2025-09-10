// controllers/aiController.js
const OpenAI = require("openai");
const ChildProfile = require("../models/ChildProfile"); // adjust path if needed

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// @desc    Chat with Santa
// @route   POST /api/ai/chat/:childId
// @access  Private
exports.chatWithSanta = async (req, res) => {
  const { childId } = req.params;
  const { message } = req.body;

  if (!message || message.trim() === "") {
    return res.status(400).json({ message: "Message is required" });
  }

  try {
    // Find child profile
    const child = await ChildProfile.findOne({ _id: childId, parent: req.user._id });
    if (!child) {
      return res.status(404).json({ message: "Child not found" });
    }

    // Build prompt
    const prompt = `You are Santa Claus. A child named ${child.name}, age ${child.age}, is talking to you. Respond warmly and playfully, as Santa would. The child says: "${message}"`;

    // Check if we are in development or quota exceeded
    if (process.env.NODE_ENV === "development" || !process.env.OPENAI_API_KEY) {
      // Return a mock reply for testing
      const mockReply = `Ho ho ho! Hello ${child.name}! Santa is excited to hear from you. 🎅✨`;
      return res.json({ reply: mockReply });
    }

    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo", // widely available
      messages: [
        { role: "system", content: "You are Santa Claus. Respond warmly and playfully." },
        { role: "user", content: prompt },
      ],
      max_tokens: 150,
    });

    const santaResponse = completion.choices[0].message.content;
    res.json({ reply: santaResponse });

  } catch (error) {
    console.error("OpenAI error:", error.response?.data || error.message);
    // Fallback to mock reply if API fails
    const mockReply = `Ho ho ho! Hello ${req.body.name || "child"}! Santa is here but is taking a short break. 🎅✨`;
    res.json({ reply: mockReply });
  }
};
