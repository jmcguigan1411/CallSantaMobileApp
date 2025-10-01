const User = require("../models/User");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");
const { sendWelcomeEmail, sendPasswordResetEmail } = require('../utils/emailService');

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// Password validation
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
  
  for (let i = 0; i < password.length - 2; i++) {
    const char1 = password.charCodeAt(i);
    const char2 = password.charCodeAt(i + 1);
    const char3 = password.charCodeAt(i + 2);
    
    if (char1 >= 48 && char1 <= 57 && char2 >= 48 && char2 <= 57 && char3 >= 48 && char3 <= 57) {
      if (char2 === char1 + 1 && char3 === char2 + 1) {
        errors.push('Password must not contain sequential numbers (e.g., 123)');
        break;
      }
      if (char2 === char1 - 1 && char3 === char2 - 1) {
        errors.push('Password must not contain sequential numbers (e.g., 321)');
        break;
      }
    }
  }
  
  return errors;
};

exports.registerParent = async (req, res) => {
  const { name, email, password } = req.body;
  
  try {
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
    
    sendWelcomeEmail(email, name).catch(err => 
      console.error('Failed to send welcome email:', err)
    );
    
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

exports.socialLogin = async (req, res) => {
  try {
    const { provider, token } = req.body;
    if (!provider || !token) {
      return res.status(400).json({ message: "Provider and token are required" });
    }
    let email;
    let name;
    if (provider === "google") {
      const ticket = await googleClient.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      email = payload.email;
      name = payload.name;
    } else if (provider === "apple") {
      const decoded = jwt.decode(token);
      email = decoded.email || `${decoded.sub}@apple.com`;
      if (decoded.name && typeof decoded.name === "object") {
        const { firstName = "", lastName = "" } = decoded.name;
        name = `${firstName} ${lastName}`.trim() || "Apple User";
      } else {
        name = decoded.name || "Apple User";
      }
    } else {
      return res.status(400).json({ message: "Unsupported provider" });
    }
    
    let user = await User.findOne({ email });
    
    if (!user) {
      user = new User({
        name,
        email,
        password: null,
        role: "parent",
        provider,
      });
      await user.save();
      
      sendWelcomeEmail(email, name).catch(err => 
        console.error('Failed to send welcome email:', err)
      );
    } else if (user.provider !== provider) {
      console.warn(`User ${email} exists with different provider: ${user.provider}`);
    }
    
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

exports.requestPasswordReset = async (req, res) => {
  try {
    const { email } = req.body;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: 'No account with that email exists' });
    }
    
    if (user.provider !== 'local') {
      return res.status(400).json({ 
        message: `This account uses ${user.provider} login. Please use ${user.provider} to access your account.` 
      });
    }
    
    const resetCode = user.getResetPasswordCode();
    await user.save();
    
    await sendPasswordResetEmail(user.email, user.name, resetCode);
    
    res.json({ message: 'Password reset code sent to your email' });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ message: 'Failed to send reset code' });
  }
};

exports.verifyResetCode = async (req, res) => {
  try {
    const { email, code } = req.body;
    
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(code)
      .digest('hex');
    
    const user = await User.findOne({
      email,
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }
    
    res.json({ message: 'Code verified successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    
    const passwordErrors = validatePassword(newPassword);
    if (passwordErrors.length > 0) {
      return res.status(400).json({ 
        message: 'Password validation failed', 
        errors: passwordErrors 
      });
    }
    
    const resetPasswordToken = crypto
      .createHash('sha256')
      .update(code)
      .digest('hex');
    
    const user = await User.findOne({
      email,
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({ message: 'Invalid or expired code' });
    }
    
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();
    
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};