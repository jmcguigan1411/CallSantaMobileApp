// models/User.js
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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
      // remove 'required' to allow social login users without a password
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
  },
  { timestamps: true }
);

// Hash password before saving, only if password exists
userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// Compare passwords (will return false if password doesn't exist)
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
module.exports = User;
