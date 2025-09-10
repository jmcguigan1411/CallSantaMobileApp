// controllers/wishlistController.js
const WishList = require("../models/WishList");
const ChildProfile = require("../models/ChildProfile");

// @desc    Add items to a child's wishlist
// @route   POST /api/wishlist/:childId
// @access  Private
exports.addWishListItems = async (req, res) => {
  const { childId } = req.params;
  const { items } = req.body; // array of { name, quantity }

  try {
    // Check that child belongs to parent
    const child = await ChildProfile.findOne({ _id: childId, parent: req.user._id });
    if (!child) {
      return res.status(404).json({ message: "Child not found" });
    }

    let wishList = await WishList.findOne({ child: childId });

    if (!wishList) {
      wishList = new WishList({
        child: childId,
        items,
      });
    } else {
      wishList.items.push(...items);
    }

    await wishList.save();
    res.status(201).json(wishList);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get a child's wishlist
// @route   GET /api/wishlist/:childId
// @access  Private
exports.getWishList = async (req, res) => {
  const { childId } = req.params;

  try {
    const child = await ChildProfile.findOne({ _id: childId, parent: req.user._id });
    if (!child) {
      return res.status(404).json({ message: "Child not found" });
    }

    const wishList = await WishList.findOne({ child: childId });
    res.json(wishList || { items: [] });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
