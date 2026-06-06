const Review = require('../models/Review');
const Venue = require('../models/Venue');
const { buildRestaurantFeatureVector } = require('../services/cbf-pipeline');
const aiService = require('../services/aiService');

/**
 * Updates the cached AI review summary for a venue.
 */
const updateVenueAISummary = async (venueId) => {
  try {
    const venue = await Venue.findById(venueId);
    if (!venue) return;

    const reviews = await Review.find({ venue: venueId, isApproved: true, isHidden: false })
      .select('rating.overall comment')
      .lean();

    // Check if we actually have text to summarize
    const hasComments = reviews.some(r => r.comment && r.comment.trim());
    if (!hasComments) {
      venue.aiSummary = {
        summaryText: 'No detailed feedback has been left by diners yet.',
        positives: ['Quiet ambience'],
        constructives: ['Needs more user reviews for detailed summary insights.'],
        lastUpdated: new Date(),
        reviewCountSnapshot: reviews.length,
      };
      await venue.save({ validateBeforeSave: false });
      return;
    }

    const summary = await aiService.generateReviewSummary(venue.name, reviews);
    if (summary) {
      venue.aiSummary = {
        summaryText: summary.summaryText,
        positives: summary.positives,
        constructives: summary.constructives,
        lastUpdated: new Date(),
        reviewCountSnapshot: reviews.length,
      };
      await venue.save({ validateBeforeSave: false });
    }
  } catch (error) {
    console.error(`Error updating AI Summary for venue ${venueId}:`, error.message);
  }
};

/**
 * @desc    Get reviews for a venue
 * @route   GET /api/reviews/venue/:venueId
 * @access  Public
 */
const getVenueReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const options = {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      populate: { path: 'user', select: 'name avatar' },
      sort: { createdAt: -1 },
    };

    const reviews = await Review.paginate(
      { venue: req.params.venueId, isApproved: true, isHidden: false },
      options
    );

    res.json({ success: true, ...reviews });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add a review
 * @route   POST /api/reviews/venue/:venueId
 * @access  Private (User)
 */
const addReview = async (req, res, next) => {
  try {
    const venueExists = await Venue.findById(req.params.venueId);
    if (!venueExists) {
      return res.status(404).json({ success: false, message: 'Venue not found' });
    }

    // Check if user already left a review
    const existingReview = await Review.findOne({
      venue: req.params.venueId,
      user: req.user._id,
    });

    if (existingReview) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this venue' });
    }

    const review = await Review.create({
      venue: req.params.venueId,
      user: req.user._id,
      rating: req.body.rating,
      title: req.body.title,
      comment: req.body.comment,
    });

    // Rating changes affect the normalized rating in CBF feature vector
    // We rebuild the feature vector asynchronously
    buildRestaurantFeatureVector(req.params.venueId).catch(console.error);
    updateVenueAISummary(req.params.venueId).catch(console.error);

    res.status(201).json({ success: true, review });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete user's own review
 * @route   DELETE /api/reviews/:id
 * @access  Private (User)
 */
const deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this review' });
    }

    const venueId = review.venue;
    await review.deleteOne();

    buildRestaurantFeatureVector(venueId).catch(console.error);
    updateVenueAISummary(venueId).catch(console.error);

    res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all reviews (Admin moderation)
 * @route   GET /api/reviews/admin
 * @access  Private (Admin)
 */
const getAllReviewsAdmin = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    let query = {};

    // If owner, only show reviews for their venues
    if (req.admin.role === 'owner') {
      const ownedVenues = await Venue.find({ owner: req.admin._id }).distinct('_id');
      query.venue = { $in: ownedVenues };
    }

    const reviews = await Review.paginate(query, {
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      populate: [
        { path: 'user', select: 'name email' },
        { path: 'venue', select: 'name owner' }
      ],
      sort: { createdAt: -1 }
    });

    res.json({ success: true, ...reviews });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle review visibility (Admin)
 * @route   PUT /api/reviews/admin/:id/toggle
 * @access  Private (Admin)
 */
const toggleReviewVisibility = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id).populate('venue');
    if (!review) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    // Ownership check for owners
    if (req.admin.role === 'owner' && review.venue?.owner?.toString() !== req.admin._id.toString()) {
      return res.status(403).json({ success: false, message: 'You do not have permission to moderate this review' });
    }

    review.isHidden = !review.isHidden;
    await review.save();

    // Re-trigger static recalculation of venue rating
    await Review.recalculateRating(review.venue._id);
    buildRestaurantFeatureVector(review.venue._id).catch(console.error);
    updateVenueAISummary(review.venue._id).catch(console.error);

    res.json({ success: true, review });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getVenueReviews,
  addReview,
  deleteReview,
  getAllReviewsAdmin,
  toggleReviewVisibility,
};
