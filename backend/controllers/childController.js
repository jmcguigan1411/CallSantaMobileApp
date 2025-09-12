const ChildProfile = require('../models/ChildProfile');

// GET /api/children
exports.getChildren = async (req, res) => {
  try {
    console.log('[DEBUG] REQ USER:', req.user);
    const children = await ChildProfile.find({ parent: req.user._id });
    console.log('[DEBUG] Fetched children:', children);
    res.json(children);
  } catch (err) {
    console.error('[DEBUG] getChildren ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// GET /api/children/:id
exports.getChild = async (req, res) => {
  try {
    console.log('[DEBUG] REQ USER:', req.user);
    const child = await ChildProfile.findOne({ _id: req.params.id, parent: req.user._id });
    if (!child) {
      console.log('[DEBUG] Child not found for ID:', req.params.id);
      return res.status(404).json({ message: 'Child not found' });
    }
    console.log('[DEBUG] Fetched child:', child);
    res.json(child);
  } catch (err) {
    console.error('[DEBUG] getChild ERROR:', err);
    res.status(500).json({ message: 'Server error' });
  }
};

// POST /api/children
exports.addChild = async (req, res) => {
  try {
    const { name, age, gender, phoneticSpelling, pronunciationSamples } = req.body;

    console.log('[DEBUG] REQ USER:', req.user);
    console.log('[DEBUG] Adding child data:', req.body);

    const child = await ChildProfile.create({
      name,
      age,
      gender,
      phoneticSpelling,
      pronunciationSamples: pronunciationSamples || [],
      parent: req.user._id,
    });

    console.log('[DEBUG] Child created:', child);
    res.status(201).json(child);
  } catch (err) {
    console.error('[DEBUG] addChild ERROR:', err);
    res.status(500).json({ message: 'Failed to add child' });
  }
};

// PUT /api/children/:id
exports.updateChild = async (req, res) => {
  try {
    const { name, age, gender, phoneticSpelling, pronunciationSamples } = req.body;

    const updateData = { name, age, gender, phoneticSpelling };
    if (pronunciationSamples) updateData.pronunciationSamples = pronunciationSamples;

    console.log('[DEBUG] REQ USER:', req.user);
    console.log('[DEBUG] Updating child ID:', req.params.id, 'with data:', updateData);

    const child = await ChildProfile.findOneAndUpdate(
      { _id: req.params.id, parent: req.user._id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!child) {
      console.log('[DEBUG] Child not found for ID:', req.params.id);
      return res.status(404).json({ message: 'Child not found' });
    }

    console.log('[DEBUG] Child updated:', child);
    res.json(child);
  } catch (err) {
    console.error('[DEBUG] updateChild ERROR:', err);
    res.status(500).json({ message: 'Failed to update child' });
  }
};

// PATCH /api/children/:id/pronunciation
exports.addPronunciationSamples = async (req, res) => {
  try {
    const { samples } = req.body;

    if (!samples || !Array.isArray(samples) || samples.length === 0) {
      return res.status(400).json({ message: 'No pronunciation samples provided' });
    }

    console.log('[DEBUG] REQ USER:', req.user);
    console.log('[DEBUG] Adding pronunciation samples to child ID:', req.params.id);

    const child = await ChildProfile.findOne({ _id: req.params.id, parent: req.user._id });
    if (!child) return res.status(404).json({ message: 'Child not found' });

    child.pronunciationSamples.push(...samples);
    await child.save();

    console.log('[DEBUG] Updated pronunciationSamples:', child.pronunciationSamples);
    res.json(child);
  } catch (err) {
    console.error('[DEBUG] addPronunciationSamples ERROR:', err);
    res.status(500).json({ message: 'Failed to add pronunciation samples' });
  }
};

// DELETE /api/children/:id
exports.deleteChild = async (req, res) => {
  try {
    console.log('[DEBUG] REQ USER:', req.user);
    console.log('[DEBUG] Deleting child ID:', req.params.id);

    const child = await ChildProfile.findOneAndDelete({
      _id: req.params.id,
      parent: req.user._id,
    });

    if (!child) {
      console.log('[DEBUG] Child not found for ID:', req.params.id);
      return res.status(404).json({ message: 'Child not found' });
    }

    console.log('[DEBUG] Child deleted successfully');
    res.json({ message: 'Child deleted successfully' });
  } catch (err) {
    console.error('[DEBUG] deleteChild ERROR:', err);
    res.status(500).json({ message: 'Failed to delete child' });
  }
};
