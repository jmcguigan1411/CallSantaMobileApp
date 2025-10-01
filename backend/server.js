const path = require("path");
const fs = require("fs");

// Ensure tmp directory exists for audio files (temporary processing only)
const tmpDir = path.join(__dirname, "tmp");
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
  console.log("📁 Created tmp directory for temporary audio processing");
}

// Note: audio-recordings directory no longer needed - using device-local storage
// Keeping this commented out for reference
/*
const audioRecordingsDir = path.join(__dirname, "audio-recordings");
if (!fs.existsSync(audioRecordingsDir)) {
  fs.mkdirSync(audioRecordingsDir, { recursive: true });
  console.log("📁 Created audio-recordings directory for permanent storage");
}
*/

const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const compression = require("compression");
const connectDB = require("./config/db");
const { errorHandler } = require("./middleware/errorHandler");

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Enable compression for faster responses
app.use(compression());

// Serve static files (tmp only for temporary processing)
app.use("/tmp", express.static(path.join(__dirname, "tmp")));
// Audio recordings static route removed - no longer storing on server
// app.use("/audio-recordings", express.static(path.join(__dirname, "audio-recordings")));

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Health check
app.get("/", (req, res) => {
  res.send("🎅 Santa API is live!");
});

// --- Routes ---
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const aiRoutes = require("./routes/aiRoutes");
const childRoutes = require("./routes/childRoutes");
// Audio routes disabled - using device-local storage instead
// const audioRoutes = require("./routes/audioRoutes");

app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/children", childRoutes);
// Audio routes disabled - using device-local storage instead
// app.use("/api/audio", audioRoutes);

// Error handler (must come last)
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Server running on http://0.0.0.0:${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  server.close(() => {
    console.log("✅ HTTP server closed.");
    process.exit(0);
  });
});