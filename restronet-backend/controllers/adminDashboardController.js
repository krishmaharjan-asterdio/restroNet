const User = require('../models/User');
const Venue = require('../models/Venue');
const Review = require('../models/Review');
const Menu = require('../models/Menu');

/**
 * @desc    Get dashboard summary stats for superadmin
 * @route   GET /api/admin/dashboard/stats
 * @access  Private (Admin)
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalVenues = await Venue.countDocuments();
    const totalReviews = await Review.countDocuments();
    const totalMenus = await Menu.countDocuments();

    const recentVenues = await Venue.find().sort({ createdAt: -1 }).limit(5).select('name createdAt averageRating');
    const recentReviews = await Review.find().sort({ createdAt: -1 }).limit(5).populate('user', 'name').populate('venue', 'name');

    // Quick trending stats based on reviews
    const trendingVenues = await Venue.find()
      .sort({ averageRating: -1, totalReviews: -1 })
      .limit(5)
      .select('name averageRating totalReviews logo');

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalVenues,
        totalReviews,
        totalMenus,
      },
      recentVenues,
      recentReviews,
      trendingVenues
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
};
