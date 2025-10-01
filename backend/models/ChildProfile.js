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
      required: true,
    },
    age: {
      type: Number,
      required: true,
    },
    gender: {
      type: String,
      enum: ["male", "female"],
      required: true,
    },
    phoneticSpelling: {
      type: String,
      default: "",
    },
    pronunciationSamples: [
      {
        url: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
    wishlist: [String],
    hasBehavioralNotes: {
      type: Boolean,
      default: false,
    },
    goodBehavior: {
      type: String,
      default: "",
    },
    badBehavior: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ChildProfile", childProfileSchema);