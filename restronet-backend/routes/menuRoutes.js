const express = require('express');
const { getMenusByVenue, addMenu, updateMenu, deleteMenu } = require('../controllers/menuController');
const { protectAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.route('/venue/:venueId')
  .get(getMenusByVenue)
  .post(protectAdmin, addMenu);

router.route('/:menuId')
  .put(protectAdmin, updateMenu)
  .delete(protectAdmin, deleteMenu);

module.exports = router;
