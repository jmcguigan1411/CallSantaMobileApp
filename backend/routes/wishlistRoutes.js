// routes/wishlistRoutes.js
const express = require("express");
const router = express.Router();
const { addWishListItems, getWishList } = require("../controllers/wishlistController");
const { protect } = require("../middleware/authMiddleware");

// Protected routes
router.post("/:childId", protect, addWishListItems);
router.get("/:childId", protect, getWishList);

module.exports = router;
