// controllers/authController.js
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT for your app
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// Password validation function
const validatePassword = (password) => {
  const errors = [];
  
  if (password.length < 10) {
    errors.push('Password must be at least 10 characters');
  }
  if (password.length > 30) {
    errors.push('Password must be no more than 30 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least 1 uppercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least 1 number');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least 1 special character');
  }
  
  // Check for sequential numbers (123, 234, 321, etc.)
  for (let i = 0; i < password.length - 2; i++) {
    const char1 = password.charCodeAt(i);
    const char2 = password.charCodeAt(i + 1);
    const char3 = password.charCodeAt(i + 2);
    
    // Check if all three are digits
    if (char1 >= 48 && char1 <= 57 && char2 >= 48 && char2 <= 57 && char3 >= 48 && char3 <= 57) {
      // Check ascending (123, 234, etc.)
      if (char2 === char1 + 1 && char3 === char2 + 1) {
        errors.push('Password must not contain sequential numbers (e.g., 123)');
        break;
      }
      // Check descending (321, 210, etc.)
      if (char2 === char1 - 1 && char3 === char2 - 1) {
        errors.push('Password must not contain sequential numbers (e.g., 321)');
        break;
      }
    }
  }
  
  return errors;
};

// @desc    Register a new parent (local email/password)
// @route   POST /api/auth/register
// @access  Public
exports.registerParent = async (req, res) => {
  const { name, email, password } = req.body;
  
  try {
    // Validate password
    const passwordErrors = validatePassword(password);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ 
        message: 'Password validation failed', 
        errors: passwordErrors 
      });
    }

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
      hasAcceptedTerms: user.hasAcceptedTerms,
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
        hasAcceptedTerms: user.hasAcceptedTerms,
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
      hasAcceptedTerms: user.hasAcceptedTerms,
      token: appToken,
    });
  } catch (err) {
    console.error("SOCIAL LOGIN ERROR:", err);
    res.status(500).json({ message: "Social login failed" });
  }
};

// @desc    Accept terms and conditions
// @route   POST /api/auth/accept-terms
// @access  Private
exports.acceptTerms = async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { 
        hasAcceptedTerms: true, 
        termsAcceptedAt: new Date() 
      },
      { new: true }
    );
    res.json({ 
      success: true, 
      hasAcceptedTerms: user.hasAcceptedTerms 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};