const ChildProfile = require('../models/ChildProfile');

// GET /api/children
exports.getChildren = async (req, res) => {
  try {
    const children = await ChildProfile.find({ parent: req.user._id });
    res.json(children);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/children/:id
exports.getChild = async (req, res) => {
  try {
    const child = await ChildProfile.findOne({ _id: req.params.id, parent: req.user._id });
    if (!child) return res.status(404).json({ message: 'Child not found' });
    res.json(child);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/children
exports.addChild = async (req, res) => {
  try {
    const { name, age } = req.body;
    const child = await ChildProfile.create({ name, age, parent: req.user._id });
    res.status(201).json(child);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to add child' });
  }
};

// PUT /api/children/:id
exports.updateChild = async (req, res) => {
  try {
    const { name, age } = req.body;
    const child = await ChildProfile.findOneAndUpdate(
      { _id: req.params.id, parent: req.user._id },
      { name, age },
      { new: true }
    );
    if (!child) return res.status(404).json({ message: 'Child not found' });
    res.json(child);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to update child' });
  }
};

// DELETE /api/children/:id
exports.deleteChild = async (req, res) => {
  try {
    const child = await ChildProfile.findOneAndDelete({
      _id: req.params.id,
      parent: req.user._id,
    });

    if (!child) return res.status(404).json({ message: 'Child not found' });

    res.json({ message: 'Child deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Failed to delete child' });
  }
};


