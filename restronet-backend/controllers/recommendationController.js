const { getCBFRecommendations, getSmartRecommendations, MOOD_KEYWORDS } = require('../services/recommendationService');
const { rebuildAllVectors } = require('../services/cbf-pipeline');

/**
 * @desc    Legacy authenticated recommendations (profile-based)
 * @route   GET /api/recommendations
 * @access  Private (User)
 */
const getUserRecommendations = async (req, res, next) => {
  try {
    const { limit = 10, lat, lng } = req.query;
    const recommendations = await getCBFRecommendations(
      req.user._id, 
      parseInt(limit, 10),
      lat ? parseFloat(lat) : null,
      lng ? parseFloat(lng) : null
    );
    res.json({ success: true, count: recommendations.length, recommendations });
  } catch (error) {
    next(error);
  }
};

const { parsePrompt } = require('../services/nlpParser');
const aiService = require('../services/aiService');

// Words that signal a natural-language intent query (vs. a direct restaurant-name lookup).
// If the prompt is short AND contains none of these, skip AI/NLP parsing entirely.
const INTENT_KEYWORDS = [
  'near', 'nearby', 'close', 'around',
  'cheap', 'budget', 'affordable', 'inexpensive', 'expensive', 'luxury', 'premium', 'upscale',
  'best', 'top', 'popular', 'famous', 'highest', 'rated',
  'romantic', 'family', 'casual', 'aesthetic', 'nightlife', 'work',
  'food', 'cuisine', 'dish', 'meal',
  'italian', 'nepali', 'indian', 'chinese', 'mexican', 'thai', 'japanese',
];

function isIntentQuery(prompt) {
  const lower = prompt.toLowerCase();
  const wordCount = lower.trim().split(/\s+/).length;
  // Short prompts with no intent signals → treat as restaurant-name lookup
  if (wordCount <= 3 && !INTENT_KEYWORDS.some(kw => lower.includes(kw))) return false;
  return true;
}

/**
 * @desc    Smart multi-factor recommendations (public, guest-friendly)
 * @route   GET /api/recommendations/smart
 * @access  Public (optionalAuth)
 *
 * Query params:
 *   prompt       — natural language string
 *   cuisines     — comma-separated Cuisine ObjectIds
 *   priceRange   — comma-separated values: 1,2,3,4
 *   mood         — one of: romantic | family-friendly | cafe | luxury | nightlife | casual | work-friendly | aesthetic
 *   lat          — float latitude
 *   lng          — float longitude
 *   maxDistance  — km (default 20)
 *   limit        — integer (default 12)
 */
const getSmartRecommendationsHandler = async (req, res, next) => {
  try {
    let { prompt, cuisines, priceRange, mood, lat, lng, maxDistance, limit, minRating } = req.query;

    // userCuisineIds: explicitly selected by the user via UI chips
    // aiCuisineIds:  extracted by AI/NLP from the natural-language prompt
    // Only userCuisineIds trigger the strict cuisine hard-filter in the service.
    let userCuisineIds = cuisines ? cuisines.split(',').filter(Boolean) : [];
    let aiCuisineIds   = [];
    let categoryIds    = [];
    let tagIds         = [];
    let priceRanges    = priceRange ? priceRange.split(',').filter(Boolean).map(Number) : [];
    let isNearMe    = false;
    let isTopRated  = false;
    let city        = null;
    let aiSortBy    = null;

    let parsedFilters = null;
    let aiExplanation = null;

    if (prompt && isIntentQuery(prompt)) {
      // Natural-language query — parse intent via AI or rule-based NLP.
      // 1. Try AI-powered parsing first (Gemini)
      parsedFilters = await aiService.parseIntent(prompt);

      // 2. Fallback to rule-based parsing if AI fails or key is missing
      if (!parsedFilters) {
        parsedFilters = await parsePrompt(prompt);
      } else {
        aiExplanation = parsedFilters.explanation;
      }

      if (parsedFilters.cuisineIds?.length) aiCuisineIds = [...parsedFilters.cuisineIds];
      if (parsedFilters.categoryIds?.length) categoryIds  = [...new Set([...categoryIds,  ...parsedFilters.categoryIds])];
      if (parsedFilters.tagIds?.length)      tagIds       = [...new Set([...tagIds,       ...parsedFilters.tagIds])];
      if (parsedFilters.priceRanges?.length) priceRanges  = [...new Set([...priceRanges,  ...parsedFilters.priceRanges])];
      if (parsedFilters.mood)       mood       = parsedFilters.mood;
      if (parsedFilters.isNearMe)   isNearMe   = true;
      if (parsedFilters.isTopRated) isTopRated = true;
      if (parsedFilters.location)   city       = parsedFilters.location;
      if (parsedFilters.sortBy)     aiSortBy   = parsedFilters.sortBy;
    }
    // Short prompts with no intent signals bypass AI/NLP and go straight to text matching.

    // Merged cuisineIds passed for scoring; strict filter uses only userCuisineIds
    const cuisineIds = [...new Set([...userCuisineIds, ...aiCuisineIds])];

    const { results, suggestions, searchMeta } = await getSmartRecommendations({
      userId:         req.user?._id || null,
      searchTerm:     prompt        || null,
      cuisineIds,
      userCuisineIds,
      categoryIds,
      tagIds,
      priceRanges,
      mood:           mood          || null,
      city:           city          || null,
      sortBy:         aiSortBy      || null,
      lat:            lat           ? parseFloat(lat)         : null,
      lng:            lng           ? parseFloat(lng)         : null,
      maxDistanceKm:  maxDistance   ? parseFloat(maxDistance) : (isNearMe ? 10 : 20),
      limit:          limit         ? parseInt(limit, 10)     : 12,
      isTopRated,
      minRating:      minRating     ? parseFloat(minRating)   : 0,
    });

    res.json({
      success:         true,
      count:           results.length,
      recommendations: results,
      suggestions,
      searchMeta,
      availableMoods:  Object.keys(MOOD_KEYWORDS),
      parsedIntent:    parsedFilters ? { ...parsedFilters, mood } : null,
      aiExplanation,
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
    rebuildAllVectors().catch(console.error);
    res.json({ success: true, message: 'Background rebuild of feature vectors has been started.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserRecommendations,
  getSmartRecommendationsHandler,
  triggerVectorRebuild,
};
