const express = require('express');
const { getFavorites, toggleFavorite } = require('../controllers/favoriteController');
const { protectUser } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protectUser, getFavorites);
router.post('/:venueId', protectUser, toggleFavorite);

module.exports = router;
