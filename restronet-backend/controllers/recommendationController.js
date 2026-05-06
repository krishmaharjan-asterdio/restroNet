const { getCBFRecommendations } = require('../services/recommendationService');
const { rebuildAllVectors } = require('../services/cbf-pipeline');

/**
 * @desc    Get personalized restaurant recommendations
 * @route   GET /api/recommendations
 * @access  Private (User)
 */
const getUserRecommendations = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit, 10) || 10;
    
    // Call the Content-Based Filtering recommendation service
    const recommendations = await getCBFRecommendations(req.user._id, limit);

    res.json({
      success: true,
      count: recommendations.length,
      recommendations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Force rebuild of all feature vectors
 * @route   POST /api/recommendations/admin/rebuild-vectors
 * @access  Private (Admin)
 */
const triggerVectorRebuild = async (req, res, next) => {
  try {
    // We do this asynchronously to not block the request
    rebuildAllVectors().catch(console.error);

    res.json({
      success: true,
      message: 'Background rebuild of feature vectors has been started.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserRecommendations,
  triggerVectorRebuild,
};
