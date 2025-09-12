// services/aiService.js
import Constants from "expo-constants";

const API_URL = Constants.expoConfig.extra?.apiBaseUrl || "http://localhost:5000"; 
// 👆 Configure this in app.json -> extra for dev/prod

// Chat with Santa via backend
export async function chatWithSanta(childId, userMessage, token) {
  try {
    const response = await fetch(`${API_URL}/api/ai/chat/${childId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`, // token passed from AuthContext
      },
      body: JSON.stringify({ message: userMessage }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Santa API error");
    }

    return data.reply; // ✅ backend always returns { reply: "..." }
  } catch (err) {
    console.error("Santa chat error:", err);
    return "Ho ho ho! Santa is having some trouble connecting. Try again soon! 🎅✨";
  }
}
