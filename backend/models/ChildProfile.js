// models/ChildProfile.js
const mongoose = require("mongoose");

const childProfileSchema = new mongoose.Schema(
  {
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Please add the child's name"],
    },
    age: {
      type: Number,
      required: [true, "Please add the child's age"],
      min: 0,
      max: 18,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const ChildProfile = mongoose.model("ChildProfile", childProfileSchema);
module.exports = ChildProfile;
