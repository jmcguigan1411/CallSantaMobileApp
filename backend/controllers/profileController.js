// controllers/profileController.js
const ChildProfile = require("../models/ChildProfile");

// @desc    Create child profile
// @route   POST /api/profile
// @access  Private (parent only)
exports.createChildProfile = async (req, res) => {
  const { name, age } = req.body;

  try {
    const child = await ChildProfile.create({
      parent: req.user._id,
      name,
      age,
    });

    res.status(201).json(child);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all children for a parent
// @route   GET /api/profile
// @access  Private (parent only)
exports.getChildProfiles = async (req, res) => {
  try {
    const children = await ChildProfile.find({ parent: req.user._id });
    res.json(children);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
