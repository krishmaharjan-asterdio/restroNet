const User = require('../models/User');
const Venue = require('../models/Venue');
const { Tag } = require('../models/Metadata');
const { calculateHaversineDistance } = require('../utils/haversine');

// ─── Mood → Tag keyword mapping ───────────────────────────────────────────────
const MOOD_KEYWORDS = {
  romantic:           ['romantic', 'candlelit', 'intimate', 'cozy', 'rooftop', 'date', 'couple', 'quiet ambience'],
  'family-friendly':  ['family', 'kids', 'children', 'spacious', 'pet-friendly', 'playground', 'family dining'],
  cafe:               ['cafe', 'coffee', 'bakery', 'dessert', 'brunch', 'tea', 'pastry', 'snacks'],
  luxury:             ['luxury', 'fine dining', 'upscale', 'premium', 'exclusive', 'gourmet', 'fine'],
  nightlife:          ['bar', 'pub', 'nightlife', 'live music', 'cocktail', 'beer', 'lounge', 'club'],
  casual:             ['casual', 'hangout', 'chill', 'relaxed', 'fast food', 'street food', 'quick bites', 'friendly'],
  'work-friendly':    ['wifi', 'quiet', 'laptop', 'workspace', 'study', 'co-working', 'outdoor seating'],
  aesthetic:          ['aesthetic', 'instagram', 'rooftop view', 'beautiful', 'trendy', 'modern', 'artsy', 'themed'],
};

/**
 * Smart multi-factor recommendation engine.
 * Works for both authenticated users (userId) and guests (explicit params).
 *
 * Scoring = Σ weight_i * score_i across 5 factors:
 *   cuisine match | price proximity | rating | distance decay | mood/vibe match
 */
const getSmartRecommendations = async ({
  userId = null,
  searchTerm = null,
  cuisineIds = [],
  categoryIds = [],
  tagIds = [],
  priceRanges = [],
  mood = null,
  lat = null,
  lng = null,
  maxDistanceKm = 20,
  limit = 12,
  isTopRated = false,
}) => {
  let explicitCuisineIds = [...cuisineIds]; // Keep track of what was explicitly asked for

  // Merge stored user preferences when authenticated
  if (userId) {
    const user = await User.findById(userId);
    if (user) {
      // If NO cuisines were explicitly provided, use user preferences for scoring
      if (!cuisineIds.length && user.preferences.cuisines?.length)
        cuisineIds = user.preferences.cuisines.map(c => c.toString());

      // Merge user tags into tagIds for scoring (but don't strictly filter)
      if (user.preferences.tags?.length) {
        const userTagIds = user.preferences.tags.map(t => t.toString());
        tagIds = [...new Set([...tagIds, ...userTagIds])];
      }
      
      if (!priceRanges.length && user.preferences.priceRange)
        priceRanges = [user.preferences.priceRange];
      
      if (lat === null && user.location?.coordinates?.[1])
        lat = user.location.coordinates[1];
      if (lng === null && user.location?.coordinates?.[0])
        lng = user.location.coordinates[0];
      if (maxDistanceKm === 20 && user.preferences.maxDistanceKm)
        maxDistanceKm = user.preferences.maxDistanceKm;
    }
  }

  const hasLocation = lat !== null && lng !== null && !(lat === 0 && lng === 0);

  const weights = computeWeights({
    hasCuisine:    cuisineIds.length > 0,
    hasCategory:   categoryIds.length > 0,
    hasTag:        tagIds.length > 0,
    hasMood:       !!mood,
    hasLocation,
    hasPriceFilter: priceRanges.length > 0,
    isTopRated,
  });

  // Resolve mood tag IDs via keyword match
  let moodTagIds = [];
  if (mood && MOOD_KEYWORDS[mood]) {
    const regex = new RegExp(MOOD_KEYWORDS[mood].join('|'), 'i');
    const tags = await Tag.find({ name: regex, isActive: true });
    moodTagIds = tags.map(t => t._id.toString());
  }

  const venues = await Venue.find({ isActive: true })
    .populate('cuisines tags category')
    .lean();

  const scoredVenues = venues.map(venue => {
    const cuisineScore  = computeCuisineScore(venue, cuisineIds);
    const categoryScore = computeCategoryScore(venue, categoryIds);
    const tagScore      = computeTagScore(venue, tagIds);
    const priceScore    = computePriceScore(venue, priceRanges);
    const ratingScore   = (venue.averageRating || 0) / 5.0;
    const { distanceKm, distanceScore } = computeDistanceScore(venue, lat, lng, maxDistanceKm, hasLocation);
    const moodScore     = computeMoodScore(venue, moodTagIds);

    const finalScore =
      weights.cuisine  * cuisineScore  +
      weights.category * categoryScore +
      weights.tag      * tagScore      +
      weights.price    * priceScore    +
      weights.rating   * ratingScore   +
      weights.distance * distanceScore +
      weights.mood     * moodScore;

    return {
      venue,
      finalScore,
      distanceKm,
      scoreBreakdown: {
        cuisine:  Math.round(cuisineScore  * 100),
        category: Math.round(categoryScore * 100),
        tag:      Math.round(tagScore      * 100),
        price:    Math.round(priceScore    * 100),
        rating:   Math.round(ratingScore   * 100),
        distance: Math.round(distanceScore * 100),
        mood:     Math.round(moodScore     * 100),
      },
    };
  });

  let filtered = hasLocation
    ? scoredVenues.filter(s => s.distanceKm === null || s.distanceKm <= maxDistanceKm)
    : scoredVenues;

  // STRICT FILTER: ONLY apply if cuisines were EXPLICITLY provided in the request
  if (explicitCuisineIds.length > 0) {
    filtered = filtered.filter(s => {
        const venueIds = s.venue.cuisines.map(c => c._id.toString());
        return explicitCuisineIds.some(id => venueIds.includes(id));
    });
  }

  // FALLBACK TEXT FILTER: If no structured intents were found, assume it's a direct name/keyword search.
  const hasStructuredIntent = cuisineIds.length > 0 || mood || priceRanges.length > 0 || (lat !== null && lng !== null);
  if (searchTerm && !hasStructuredIntent) {
    const terms = searchTerm.toLowerCase().split(/\s+/).filter(t => t.length > 2);
    if (terms.length > 0) {
      filtered = filtered.filter(s => {
        const textToSearch = `${s.venue.name} ${s.venue.description}`.toLowerCase();
        return terms.some(t => textToSearch.includes(t));
      });
    }
  }

  filtered.sort((a, b) => b.finalScore - a.finalScore);

  return filtered.slice(0, limit).map(item => ({
    ...item.venue,
    recommendationScore: Math.min(1, Math.max(0, item.finalScore)),
    scoreBreakdown: item.scoreBreakdown,
    distanceKm: item.distanceKm,
    matchedMood: mood,
  }));
};

// ─── Scoring helpers ──────────────────────────────────────────────────────────

function computeWeights({ hasCuisine, hasCategory, hasTag, hasMood, hasLocation, hasPriceFilter, isTopRated }) {
  let w = { cuisine: 0.20, category: 0.15, tag: 0.10, mood: 0.10, rating: 0.25, distance: 0.10, price: 0.10 };

  if (isTopRated)     { w.rating   += 0.40; w.cuisine -= 0.10; w.category -= 0.10; w.tag -= 0.05; w.distance -= 0.05; w.mood -= 0.05; w.price -= 0.05; }
  if (hasCuisine)     { w.cuisine  += 0.10; w.rating -= 0.05; }
  if (hasCategory)    { w.category += 0.10; w.rating -= 0.05; }
  if (hasTag)         { w.tag      += 0.10; w.rating -= 0.05; }
  if (hasMood)        { w.mood     += 0.10; w.rating -= 0.05; }
  if (hasLocation)    { w.distance += 0.10; w.rating -= 0.05; }
  if (hasPriceFilter) { w.price    += 0.05; w.rating -= 0.05; }

  Object.keys(w).forEach(k => { w[k] = Math.max(0.02, w[k]); });
  const total = Object.values(w).reduce((a, b) => a + b, 0);
  Object.keys(w).forEach(k => { w[k] = w[k] / total; });
  return w;
}

function computeCuisineScore(venue, cuisineIds) {
  if (!cuisineIds.length) return 0.5;
  const venueIds = venue.cuisines.map(c => c._id.toString());
  const matches = cuisineIds.filter(id => venueIds.includes(id)).length;
  return matches / cuisineIds.length;
}

function computeCategoryScore(venue, categoryIds) {
  if (!categoryIds.length) return 0.5;
  if (!venue.category) return 0;
  return categoryIds.includes(venue.category._id.toString()) ? 1.0 : 0;
}

function computeTagScore(venue, tagIds) {
  if (!tagIds.length) return 0.5;
  const venueTagIds = venue.tags.map(t => t._id.toString());
  const matches = tagIds.filter(id => venueTagIds.includes(id)).length;
  return matches / tagIds.length;
}

function computePriceScore(venue, priceRanges) {
  if (!priceRanges.length) return 0.5;
  const pr = venue.priceRange;
  if (priceRanges.map(Number).includes(pr)) return 1.0;
  const closest = Math.min(...priceRanges.map(p => Math.abs(Number(p) - pr)));
  return Math.max(0, 1 - closest * 0.35);
}

function computeDistanceScore(venue, lat, lng, maxDistanceKm, hasLocation) {
  if (!hasLocation) return { distanceKm: null, distanceScore: 0.5 };
  const distanceKm = calculateHaversineDistance(
    [lng, lat],
    venue.location.coordinates
  );
  // Exponential decay: score = 1 at 0 km, ~0.37 at maxDistance/2, ~0 at maxDistance
  const distanceScore = Math.exp(-distanceKm / (maxDistanceKm * 0.4));
  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    distanceScore: Math.min(1, distanceScore),
  };
}

function computeMoodScore(venue, moodTagIds) {
  if (!moodTagIds.length) return 0.5;
  const venueTagIds = venue.tags.map(t => t._id.toString());
  const matches = moodTagIds.filter(id => venueTagIds.includes(id)).length;
  return Math.min(1, matches / Math.max(1, Math.min(moodTagIds.length, 4)));
}

// ─── Legacy CBF wrapper (backwards compat) ───────────────────────────────────
const getCBFRecommendations = async (userId, limit = 10) => {
  return getSmartRecommendations({ userId, limit });
};

module.exports = {
  getSmartRecommendations,
  getCBFRecommendations,
  MOOD_KEYWORDS,
};
