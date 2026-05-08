const express = require('express');
const {
  getUserRecommendations,
  getSmartRecommendationsHandler,
  triggerVectorRebuild,
} = require('../controllers/recommendationController');
const { protectUser, protectAdmin, optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// Smart multi-factor endpoint (public, merges user preferences when logged in)
router.get('/smart', optionalAuth, getSmartRecommendationsHandler);

// Legacy authenticated endpoint
router.get('/', protectUser, getUserRecommendations);

// Admin
router.post('/admin/rebuild-vectors', protectAdmin, triggerVectorRebuild);

module.exports = router;
