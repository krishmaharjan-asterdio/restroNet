const User = require('../models/User');
const Venue = require('../models/Venue');
const Review = require('../models/Review');
const Menu = require('../models/Menu');
const Reservation = require('../models/Reservation');

/**
 * @desc    Get dashboard summary stats for superadmin
 * @route   GET /api/admin/dashboard/stats
 * @access  Private (Admin)
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const isOwner = req.admin.role === 'owner';
    const ownerId = req.admin._id;

    // Venue filter
    const venueQuery = isOwner ? { owner: ownerId } : {};
    
    // Reviews filter
    let reviewQuery = {};
    if (isOwner) {
      const ownedVenues = await Venue.find({ owner: ownerId }).select('_id');
      const ownedIds = ownedVenues.map(v => v._id);
      reviewQuery.venue = { $in: ownedIds };
    }

    const totalUsers = isOwner ? 0 : await User.countDocuments(); // Hide user count for owners
    const totalVenues = await Venue.countDocuments(venueQuery);
    const totalReviews = await Review.countDocuments(reviewQuery);
    const totalMenus = await Menu.countDocuments(isOwner ? { venue: { $in: await Venue.find({ owner: ownerId }).distinct('_id') } } : {});

    const recentVenues = await Venue.find(venueQuery).sort({ createdAt: -1 }).limit(5).select('name createdAt averageRating');
    const recentReviews = await Review.find(reviewQuery).sort({ createdAt: -1 }).limit(5).populate('user', 'name').populate('venue', 'name');

    const trendingVenues = await Venue.find(venueQuery)
      .sort({ averageRating: -1, totalReviews: -1 })
      .limit(5)
      .select('name averageRating totalReviews logo');

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayReservationQuery = { date: { $gte: todayStart, $lte: todayEnd } };
    if (isOwner) {
      const ownedVenues = await Venue.find({ owner: ownerId }).select('_id');
      todayReservationQuery.venue = { $in: ownedVenues.map(v => v._id) };
    }

    const todayReservationsCount = await Reservation.countDocuments(todayReservationQuery);
    const todayReservations = await Reservation.find(todayReservationQuery)
      .sort({ time: 1 })
      .limit(10)
      .populate('user', 'name')
      .populate('venue', 'name');

    res.json({
      success: true,
      stats: {
        totalUsers: isOwner ? null : totalUsers,
        totalVenues,
        totalReviews,
        totalMenus,
        todayReservationsCount,
      },
      recentVenues,
      recentReviews,
      trendingVenues,
      todayReservations,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardStats,
};
