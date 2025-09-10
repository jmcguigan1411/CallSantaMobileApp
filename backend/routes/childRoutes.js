const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const {
  getChildren,
  getChild,
  addChild,
  updateChild,
  deleteChild,
} = require('../controllers/childController');

const router = express.Router();

router.route('/')
  .get(protect, getChildren)
  .post(protect, addChild);

router.route('/:id')
  .get(protect, getChild)
  .put(protect, updateChild)
  .delete(protect, deleteChild);

module.exports = router;
