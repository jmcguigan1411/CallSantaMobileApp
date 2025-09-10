// models/WishList.js
const mongoose = require("mongoose");

const wishListSchema = new mongoose.Schema(
  {
    child: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChildProfile",
      required: true,
    },
    items: [
      {
        name: {
          type: String,
          required: [true, "Please add a gift name"],
        },
        quantity: {
          type: Number,
          default: 1,
        },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const WishList = mongoose.model("WishList", wishListSchema);
module.exports = WishList;
