const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Please add a name"],
    },
    email: {
      type: String,
      required: [true, "Please add an email"],
      unique: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please use a valid email address",
      ],
    },
    password: {
      type: String,
      minlength: 6,
    },
    role: {
      type: String,
      enum: ["parent", "admin"],
      default: "parent",
    },
    provider: {
      type: String,
      enum: ["local", "google", "apple"],
      default: "local",
    },
    hasAcceptedTerms: {
      type: Boolean,
      default: false,
    },
    termsAcceptedAt: {
      type: Date,
      default: null,
    },
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true }
);

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate 6-digit password reset code
userSchema.methods.getResetPasswordCode = function () {
  // Generate random 6-digit code
  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Hash the code before storing
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetCode)
    .digest('hex');
  
  this.resetPasswordExpire = Date.now() + 3600000; // 1 hour
  
  return resetCode; // Return unhashed code to send in email
};

const User = mongoose.model("User", userSchema);
module.exports = User;