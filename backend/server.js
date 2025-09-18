// server.js
const path = require("path");
const fs = require("fs");

// Ensure tmp directory exists for audio files
const tmpDir = path.join(__dirname, "tmp");
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
  console.log("📁 Created tmp directory for audio files");
}
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

const connectDB = require("./config/db");
const { errorHandler } = require("./middleware/errorHandler"); // centralized error handling

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();

// Serve static files for Santa audio
app.use("/tmp", express.static(path.join(__dirname, "tmp")));

// Middleware
app.use(express.json());
app.use(cors()); // TODO: restrict origin in production

// Health check / root route
app.get("/", (req, res) => {
  res.send("🎅 Santa API is live!");
});

// --- Routes ---
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const wishlistRoutes = require("./routes/wishlistRoutes");
const aiRoutes = require("./routes/aiRoutes");
const childRoutes = require("./routes/childRoutes");


app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/children", childRoutes);

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
