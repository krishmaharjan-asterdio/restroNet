const express = require('express');
const { 
  getVenueReviews, 
  addReview, 
  deleteReview,
  getAllReviewsAdmin,
  toggleReviewVisibility
} = require('../controllers/reviewController');
const { protectUser, protectAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

// Public & User routes
router.route('/venue/:venueId')
  .get(getVenueReviews)
  .post(protectUser, addReview);

router.route('/:id')
  .delete(protectUser, deleteReview);

// Admin routes
router.get('/admin', protectAdmin, getAllReviewsAdmin);
router.put('/admin/:id/toggle', protectAdmin, toggleReviewVisibility);

module.exports = router;
