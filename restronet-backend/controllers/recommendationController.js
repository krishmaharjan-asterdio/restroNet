const {
  getCBFRecommendations,
  getSmartRecommendations,
  buildFilterExplanation,
  MOOD_KEYWORDS,
} = require('../services/recommendationService');
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
const Venue = require('../models/Venue');
const Review = require('../models/Review');

// Words that signal a natural-language intent query (vs. a direct restaurant-name lookup).
const INTENT_KEYWORDS = [
  'near', 'nearby', 'close', 'around',
  'cheap', 'budget', 'affordable', 'inexpensive', 'expensive', 'luxury', 'premium', 'upscale',
  'best', 'top', 'popular', 'famous', 'highest', 'rated',
  'romantic', 'family', 'casual', 'aesthetic', 'nightlife', 'work',
  'food', 'cuisine', 'dish', 'meal', 'eat', 'restaurant', 'restaurants', 'place', 'places',
  'italian', 'nepali', 'indian', 'chinese', 'mexican', 'thai', 'japanese',
];

function isIntentQuery(prompt) {
  const lower = prompt.toLowerCase();
  const wordCount = lower.trim().split(/\s+/).length;
  if (wordCount <= 3 && !INTENT_KEYWORDS.some(kw => lower.includes(kw))) return false;
  return true;
}

/**
 * Maps frontend sort values to service sort keys.
 * Frontend sends: 'recommended' | 'rating' | 'distance' | 'price_asc' | 'price_desc'
 */
function mapSortValue(frontendSort) {
  const map = {
    recommended: null,
    rating:      'rating_desc',
    distance:    'distance_asc',
    price_asc:   'price_asc',
    price_desc:  'price_desc',
  };
  return map[frontendSort] ?? null;
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
 *   sortBy       — recommended | rating | distance | price_asc | price_desc
 *   lat          — float latitude
 *   lng          — float longitude
 *   maxDistance  — km (default 20)
 *   limit        — integer (default 12)
 */
const getSmartRecommendationsHandler = async (req, res, next) => {
  try {
    let { prompt, cuisines, priceRange, mood, lat, lng, maxDistance, limit, minRating, sortBy } = req.query;

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
      parsedFilters = await aiService.parseIntent(prompt);

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

      // The extracted location becomes a structured address filter, so remove
      // it from the free-text search term — otherwise venues whose name or
      // tags don't literally contain the place name get text-gated out even
      // though they sit in the requested area.
      if (parsedFilters.location) {
        prompt = prompt.replace(new RegExp(parsedFilters.location.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), ' ').trim();
      }
    }

    // AI-parsed cuisine intent from a free-text prompt is treated the same as an
    // explicit dropdown filter (hard exclude), since the user asked for it by name.
    userCuisineIds = [...new Set([...userCuisineIds, ...aiCuisineIds])];
    const cuisineIds = userCuisineIds;

    // Explicit sortBy from frontend takes precedence over AI-parsed sort
    // (user deliberately chose it via the sort dropdown)
    const resolvedSortBy = sortBy && sortBy !== 'recommended'
      ? mapSortValue(sortBy)
      : aiSortBy || null;

    const parsedLat = lat ? parseFloat(lat) : null;
    const parsedLng = lng ? parseFloat(lng) : null;
    const parsedMaxDistance = maxDistance ? parseFloat(maxDistance) : (isNearMe ? 10 : 20);

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
      sortBy:         resolvedSortBy,
      lat:            parsedLat,
      lng:            parsedLng,
      maxDistanceKm:  parsedMaxDistance,
      limit:          limit ? parseInt(limit, 10) : 12,
      isTopRated,
      minRating:      minRating ? parseFloat(minRating) : 0,
    });

    // Generate a filter-based explanation if no AI explanation exists but filters are active
    if (!aiExplanation && !prompt) {
      aiExplanation = buildFilterExplanation({
        mood:          mood || null,
        priceRanges,
        hasLocation:   !!(parsedLat && parsedLng),
        maxDistanceKm: parsedMaxDistance,
        cuisineIds:    userCuisineIds,
        sortBy:        resolvedSortBy,
      });
    }

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
 * Rebuilds AI summaries for all active venues in the database.
 */
const rebuildAllAISummaries = async () => {
  try {
    const venues = await Venue.find({ isActive: true });
    console.log(`Starting batch AI Review Summary rebuild for ${venues.length} venues...`);
    for (const venue of venues) {
      const reviews = await Review.find({ venue: venue._id, isApproved: true, isHidden: false })
        .select('rating.overall comment')
        .lean();
      
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
        continue;
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
    }
    console.log('✅ Batch AI summary rebuild completed.');
  } catch (error) {
    console.error('Batch AI summary rebuild failed:', error.message);
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

/**
 * @desc    Force rebuild of all AI review summaries
 * @route   POST /api/recommendations/admin/rebuild-summaries
 * @access  Private (Admin)
 */
const triggerAISummariesRebuild = async (req, res, next) => {
  try {
    rebuildAllAISummaries().catch(console.error);
    res.json({ success: true, message: 'Background rebuild of AI review summaries has been started.' });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserRecommendations,
  getSmartRecommendationsHandler,
  triggerVectorRebuild,
  triggerAISummariesRebuild,
};
