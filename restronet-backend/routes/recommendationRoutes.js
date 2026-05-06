const express = require('express');
const { getUserRecommendations, triggerVectorRebuild } = require('../controllers/recommendationController');
const { protectUser, protectAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/', protectUser, getUserRecommendations);
router.post('/admin/rebuild-vectors', protectAdmin, triggerVectorRebuild);

module.exports = router;
