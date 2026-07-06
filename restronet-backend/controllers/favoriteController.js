const Favorite = require('../models/Favorite');

/**
 * @desc    Get the current user's favorited venues
 * @route   GET /api/favorites
 * @access  Private (User)
 */
const getFavorites = async (req, res, next) => {
  try {
    const favorites = await Favorite.find({ user: req.user._id })
      .populate({ path: 'venue', populate: 'cuisines tags category' })
      .sort({ createdAt: -1 })
      .lean();

    res.json({
      success: true,
      favorites: favorites.map(f => f.venue).filter(Boolean),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle a venue as favorited/unfavorited for the current user
 * @route   POST /api/favorites/:venueId
 * @access  Private (User)
 */
const toggleFavorite = async (req, res, next) => {
  try {
    const { venueId } = req.params;

    const existing = await Favorite.findOne({ user: req.user._id, venue: venueId });

    if (existing) {
      await existing.deleteOne();
      return res.json({ success: true, favorited: false });
    }

    await Favorite.create({ user: req.user._id, venue: venueId });
    res.json({ success: true, favorited: true });
  } catch (error) {
    if (error.code === 11000) {
      return res.json({ success: true, favorited: true });
    }
    next(error);
  }
};

module.exports = {
  getFavorites,
  toggleFavorite,
};
