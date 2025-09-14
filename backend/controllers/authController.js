// controllers/authController.js
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT for your app
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// @desc    Register a new parent (local email/password)
// @route   POST /api/auth/register
// @access  Public
exports.registerParent = async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const user = await User.create({
      name,
      email,
      password,
      role: "parent",
      provider: "local",
    });

    res.status(201).json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: generateToken(user._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Login parent (local email/password)
// @route   POST /api/auth/login
// @access  Public
exports.loginParent = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Social login (Google / Apple) with automatic account creation
// @route   POST /api/auth/social-login
// @access  Public
exports.socialLogin = async (req, res) => {
  try {
    const { provider, token } = req.body;

    if (!provider || !token) {
      return res.status(400).json({ message: "Provider and token are required" });
    }

    let email;
    let name;

    if (provider === "google") {
      // Verify Google token
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      email = payload.email;
      name = payload.name;
    } else if (provider === "apple") {
      // Decode Apple JWT (simplified)
      const decoded = jwt.decode(token);
      email = decoded.email || `${decoded.sub}@apple.com`;
      // Try to get full name from Apple token
      if (decoded.name && typeof decoded.name === "object") {
        const { firstName = "", lastName = "" } = decoded.name;
        name = `${firstName} ${lastName}`.trim() || "Apple User";
      } else {
        name = decoded.name || "Apple User";
      }
    } else {
      return res.status(400).json({ message: "Unsupported provider" });
    }

    // Find existing user
    let user = await User.findOne({ email });

    // If user doesn't exist, create new social account
    if (!user) {
      user = new User({
        name,
        email,
        password: null, // no password for social login
        role: "parent",
        provider,
      });
      await user.save();
    } else if (user.provider !== provider) {
      // Optional: prevent login if user exists via different provider
      // or link accounts here if you want
      console.warn(`User ${email} exists with different provider: ${user.provider}`);
    }

    // Generate JWT for the app
    const appToken = generateToken(user._id);

    res.json({
      _id: user._id,
      name: user.name,
      email: user.email,
      token: appToken,
    });
  } catch (err) {
    console.error("SOCIAL LOGIN ERROR:", err);
    res.status(500).json({ message: "Social login failed" });
  }
};

