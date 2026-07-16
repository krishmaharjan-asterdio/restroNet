const User = require('../models/User');
const Venue = require('../models/Venue');
const Review = require('../models/Review');
const Reservation = require('../models/Reservation');
const Favorite = require('../models/Favorite');
const Interaction = require('../models/Interaction');
const { Tag } = require('../models/Metadata');
const { calculateHaversineDistance } = require('../utils/haversine');
const { tokenizeQuery, computeTextMatchScore, generateSuggestions, selectByConfidenceTier, SEARCH_THRESHOLDS } = require('./searchService');
const aiService = require('./aiService');
const venueCache = require('./venueCache');

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

// ─── Implicit profile builder ─────────────────────────────────────────────────
/**
 * Builds an implicit preference profile for a user from their reviews, reservations,
 * and favorites. Returns { cuisineIds, tagIds, priceRanges, venueIds (already-visited) }.
 *
 * Reviews rated 4–5 stars signal strong positive preference.
 * Reservations signal intent (venue visited at least once).
 * Favorites signal deliberate interest without requiring a visit or review.
 */
// Half-life-style recency decay: a signal from today keeps full weight,
// one from ~6 months ago keeps ~37%. Prevents a year-old food phase from
// weighing the same as last week's choices.
const RECENCY_DECAY_DAYS = 180;
const recencyFactor = (date) => {
  if (!date) return 1;
  const ageDays = (Date.now() - new Date(date).getTime()) / 86400000;
  if (ageDays <= 0) return 1;
  return Math.exp(-ageDays / RECENCY_DECAY_DAYS);
};

// Interaction type → affinity weight. Clicks/views are weak positive signal;
// dismissals are the system's only real-time negative signal.
const INTERACTION_WEIGHTS = { click: 0.2, view: 0.1, dismiss: -0.3 };

const buildImplicitProfile = async (userId) => {
  const [reviews, reservations, favorites, interactions] = await Promise.all([
    // All visible reviews, not just positive ones — low ratings carry negative
    // preference signal and drive a stronger visited penalty.
    Review.find({ user: userId, isHidden: false })
      .populate({ path: 'venue', populate: { path: 'cuisines tags' } })
      .sort({ createdAt: -1 })
      .limit(40)
      .lean(),
    Reservation.find({ user: userId, status: { $in: ['confirmed', 'completed'] } })
      .populate({ path: 'venue', populate: { path: 'cuisines tags' } })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean(),
    Favorite.find({ user: userId })
      .populate({ path: 'venue', populate: { path: 'cuisines tags' } })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean(),
    Interaction.find({ user: userId })
      .populate({ path: 'venue', populate: { path: 'cuisines tags' } })
      .sort({ createdAt: -1 })
      .limit(100)
      .lean(),
  ]);

  const cuisineFreq  = {};
  const tagFreq      = {};
  const priceFreq    = {};
  const visitedIds   = new Set();
  // venueId → { maxRating: number|null, reserved: boolean } — used to grade
  // the visited penalty (a loved venue should resurface; a disliked one shouldn't).
  const visitedInfo  = new Map();

  const markVisited = (venue, { rating = null, reserved = false } = {}) => {
    const id = venue._id.toString();
    visitedIds.add(id);
    const info = visitedInfo.get(id) || { maxRating: null, reserved: false };
    if (rating !== null) info.maxRating = Math.max(info.maxRating ?? 0, rating);
    if (reserved) info.reserved = true;
    visitedInfo.set(id, info);
  };

  const processVenue = (venue, weight = 1) => {
    if (!venue) return;
    (venue.cuisines || []).forEach(c => {
      cuisineFreq[c._id.toString()] = (cuisineFreq[c._id.toString()] || 0) + weight;
    });
    (venue.tags || []).forEach(t => {
      tagFreq[t._id.toString()] = (tagFreq[t._id.toString()] || 0) + weight;
    });
    if (venue.priceRange) {
      priceFreq[venue.priceRange] = (priceFreq[venue.priceRange] || 0) + weight;
    }
  };

  reviews.forEach(r => {
    if (!r.venue) return;
    const rating = r.rating.overall;
    markVisited(r.venue, { rating });
    // Rating → affinity weight: 5★ 1.0, 4★ 0.7, 3★ neutral (no signal),
    // 1–2★ negative — pushes that venue's cuisines/tags/price DOWN.
    let w = 0;
    if (rating === 5) w = 1.0;
    else if (rating === 4) w = 0.7;
    else if (rating <= 2) w = -0.5;
    if (w !== 0) processVenue(r.venue, w * recencyFactor(r.createdAt));
  });

  reservations.forEach(r => {
    if (!r.venue) return;
    markVisited(r.venue, { reserved: true });
    processVenue(r.venue, 0.4 * recencyFactor(r.createdAt));
  });
  // Favorites signal interest, not a visit — they must not trigger the
  // visited-venue score penalty, or hearting a restaurant would bury it.
  favorites.forEach(f => processVenue(f.venue, 0.6 * recencyFactor(f.createdAt)));

  // Behavioral interactions: weak but fast-moving signal, never counts as a
  // visit. Dismissals push a venue's traits down in real time — the only
  // negative feedback that doesn't require the user to write a bad review.
  interactions.forEach(i => {
    const w = INTERACTION_WEIGHTS[i.type];
    if (w) processVenue(i.venue, w * recencyFactor(i.createdAt));
  });

  // Normalise frequencies to [-1, 1] (top item = 1); negative affinities
  // (from low-rated reviews) are preserved as negative values.
  const normalise = (freq) => {
    const max = Math.max(...Object.values(freq).map(Math.abs), 1);
    return Object.fromEntries(Object.entries(freq).map(([k, v]) => [k, v / max]));
  };

  return {
    cuisineAffinity: normalise(cuisineFreq),
    tagAffinity:     normalise(tagFreq),
    priceAffinity:   normalise(priceFreq),
    visitedIds,
    visitedInfo,
  };
};

/**
 * Graded visited penalty — replaces the old flat 0.85.
 * Loved venues (5★) barely dip so they can resurface; disliked ones (≤2★)
 * sink hard; reservation-only visits sit in between.
 */
const computeVisitedPenalty = (info) => {
  if (!info) return 1.0;
  if (info.maxRating !== null) {
    if (info.maxRating >= 5) return 0.95;
    if (info.maxRating >= 4) return 0.9;
    if (info.maxRating >= 3) return 0.75;
    return 0.6;
  }
  return info.reserved ? 0.85 : 1.0;
};

/**
 * Smart multi-factor recommendation engine.
 * Works for both authenticated users (userId) and guests (explicit params).
 *
 * Scoring = Σ weight_i * score_i across factors:
 *   cuisine | category | tag | price | rating | distance | mood | popularity | implicit | featured
 */
const getSmartRecommendations = async ({
  userId = null,
  searchTerm = null,
  cuisineIds = [],
  userCuisineIds = [],
  categoryIds = [],
  tagIds = [],
  priceRanges = [],
  mood = null,
  lat = null,
  lng = null,
  maxDistanceKm = 20,
  limit = 12,
  isTopRated = false,
  city = null,
  sortBy = null,
  minRating = 0,
}) => {
  let explicitCuisineIds = [...userCuisineIds];

  // Build implicit profile from reviews + reservations (async, non-blocking if error)
  let implicitProfile = null;

  // Merge stored user preferences when authenticated
  if (userId) {
    const [user, profile] = await Promise.all([
      User.findById(userId),
      buildImplicitProfile(userId).catch(() => null),
    ]);
    implicitProfile = profile;

    if (user) {
      if (!cuisineIds.length) {
        // Blend implicit behavioral signal with explicit stored preferences —
        // a user's chosen cuisines must keep mattering even after they review
        // venues of other cuisines.
        // Only positive-affinity cuisines feed the filter — a cuisine the user
        // consistently rated 1–2★ must not be treated as a preference.
        const implicitCuisines = implicitProfile
          ? Object.entries(implicitProfile.cuisineAffinity).filter(([, v]) => v > 0).map(([k]) => k)
          : [];
        const explicitCuisines = user.preferences.cuisines?.map(c => c.toString()) || [];
        cuisineIds = [...new Set([...implicitCuisines, ...explicitCuisines])];
      }

      if (user.preferences.tags?.length) {
        const userTagIds = user.preferences.tags.map(t => t.toString());
        tagIds = [...new Set([...tagIds, ...userTagIds])];
      }

      if (!priceRanges.length) {
        // Blend: explicit chosen tier always included, plus the top implicit
        // tiers, capped at 3 total (2 was silently dropping a tier for users
        // who genuinely eat across three price levels — the hard price filter
        // then excluded those venues entirely). Build the full candidate list
        // first so the cap doesn't accidentally swallow an implicit tier when
        // it happens to equal the explicit one.
        const implicitTiers = implicitProfile
          ? Object.entries(implicitProfile.priceAffinity)
              .filter(([, v]) => v > 0)
              .sort((a, b) => b[1] - a[1])
              .map(([k]) => Number(k))
          : [];
        const candidates = user.preferences.priceRange
          ? [user.preferences.priceRange, ...implicitTiers]
          : implicitTiers;
        priceRanges = [...new Set(candidates)].slice(0, 3);
      }

      if (lat === null && user.location?.coordinates?.[1])
        lat = user.location.coordinates[1];
      if (lng === null && user.location?.coordinates?.[0])
        lng = user.location.coordinates[0];
      if (maxDistanceKm === 20 && user.preferences.maxDistanceKm)
        maxDistanceKm = user.preferences.maxDistanceKm;
    }
  }

  const hasLocation = lat !== null && lng !== null && !(lat === 0 && lng === 0);

  // Generate query embedding if search term is provided. Embeddings run on
  // the local MiniLM model (no API key involved) — venue embeddings are
  // already local, so the query side must never be gated on GEMINI_API_KEY.
  let queryEmbedding = null;
  if (searchTerm) {
    queryEmbedding = await aiService.generateEmbedding(searchTerm).catch(() => null);
  }

  // Build user preference vector for CBF scoring
  let userPreferenceVector = null;
  if (implicitProfile && Object.keys(implicitProfile.cuisineAffinity).length > 0) {
    const { Cuisine: CuisineModel, Tag: TagModel } = require('../models/Metadata');
    const [allCuisinesVec, allTagsVec] = await Promise.all([
      CuisineModel.find().sort({ _id: 1 }).select('_id').lean(),
      TagModel.find().sort({ _id: 1 }).select('_id').lean(),
    ]);
    userPreferenceVector = buildUserPreferenceVector(implicitProfile, allCuisinesVec, allTagsVec);
  }

  const hasImplicit = !!(implicitProfile && Object.keys(implicitProfile.cuisineAffinity).length);

  // Cold start: no behavioral history, no stored preferences, no explicit
  // filters — nothing personal to rank on. Lean on proven signals (rating +
  // popularity + proximity) instead of pretending to personalize, and flag
  // the response so the UI can say "Popular near you" rather than "For you".
  const isColdStart =
    !hasImplicit &&
    !searchTerm &&
    !mood &&
    cuisineIds.length === 0 &&
    categoryIds.length === 0 &&
    tagIds.length === 0 &&
    priceRanges.length === 0;

  const weights = computeWeights({
    hasCuisine:    cuisineIds.length > 0,
    hasCategory:   categoryIds.length > 0,
    hasTag:        tagIds.length > 0,
    hasMood:       !!mood,
    hasLocation,
    hasPriceFilter: priceRanges.length > 0,
    isTopRated,
    hasImplicit,
    hasVector:     !!queryEmbedding,
    hasCbfVector:  !!userPreferenceVector,
    isColdStart,
  });

  // Resolve mood tag IDs via keyword match — used only as a fallback signal
  // for venues that predate the direct Venue.mood field (e.g. legacy/manual
  // entries without mood inferred at import time).
  let moodTagIds = [];
  if (mood && MOOD_KEYWORDS[mood]) {
    const regex = new RegExp(MOOD_KEYWORDS[mood].join('|'), 'i');
    const tags = await Tag.find({ name: regex, isActive: true });
    moodTagIds = tags.map(t => t._id.toString());
  }

  const filterQuery = { isActive: true };
  if (city) {
    // AI intent parsing returns either a city ("Kathmandu") or a neighbourhood
    // ("Thamel", "Lazimpat") — neighbourhoods are stored in address.street,
    // so match against both fields.
    const cityRegex = { $regex: city, $options: 'i' };
    filterQuery.$or = [{ 'address.city': cityRegex }, { 'address.street': cityRegex }];
  }
  if (hasLocation) {
    filterQuery.location = {
      $near: {
        $geometry: { type: 'Point', coordinates: [lng, lat] },
        $maxDistance: maxDistanceKm * 1000, // metres
      },
    };
  }

  // Geo ($near) queries vary per user location, so only cache the non-geo
  // variants (keyed by city). Cache is invalidated on every Venue write.
  const cacheKey = hasLocation ? null : `venues:${city ? city.trim().toLowerCase() : 'all'}`;
  let venues = cacheKey ? venueCache.get(cacheKey) : null;
  if (!venues) {
    let query = Venue.find(filterQuery)
      .populate('cuisines tags category')
      .populate({ path: 'featureVector', select: 'combinedVector' });
    // Candidate cap on geo queries: $near returns nearest-first, so limiting
    // keeps the closest venues and bounds the in-memory scoring pass as the
    // catalog grows.
    if (hasLocation) query = query.limit(1000);
    venues = await query.lean();
    if (cacheKey) venueCache.set(cacheKey, venues);
  }

  // Compute max totalReviews for normalisation (popularity signal)
  const maxReviews = Math.max(...venues.map(v => v.totalReviews || 0), 1);

  const { normalized: searchNormalized, tokens: searchTokens } = tokenizeQuery(searchTerm || '');

  const scoredVenues = venues.map(venue => {
    const venueId = venue._id.toString();

    const cuisineScore   = computeCuisineScore(venue, cuisineIds);
    const categoryScore  = computeCategoryScore(venue, categoryIds);
    const tagScore       = computeTagScore(venue, tagIds);
    const priceScore     = computePriceScore(venue, priceRanges);
    const ratingScore    = (venue.averageRating || 0) / 5.0;
    const { distanceKm, distanceScore } = computeDistanceScore(venue, lat, lng, maxDistanceKm, hasLocation);
    const moodScore      = computeMoodScore(venue, mood, moodTagIds);
    const popularityScore = computePopularityScore(venue, maxReviews);
    const featuredBoost  = venue.isFeatured ? 0.08 : 0;
    const timeBoost      = computeTimeBoost(venue);

    // null = signal unavailable for THIS venue (no stored embedding) while
    // other venues have it — must not default to 0.5, or data-less venues
    // outrank ones with a real-but-mediocre similarity. Handled below by
    // renormalizing this venue's weights over its available signals.
    const vectorSimilarity = (queryEmbedding && venue.embedding && venue.embedding.length > 0)
      ? computeCosineSimilarity(queryEmbedding, venue.embedding)
      : null;

    // Raw (non-normalized) cosine, used only for the semantic-fallback gate
    // below — computeCosineSimilarity remaps [-1,1] to [0,1] for scoring,
    // which compresses the spread between "relevant" and "garbage" query
    // similarity too much to threshold on reliably.
    const rawVectorSimilarity = (queryEmbedding && venue.embedding && venue.embedding.length > 0)
      ? rawCosineSimilarity(queryEmbedding, venue.embedding)
      : 0;

    // Implicit feedback: combined cuisine + tag affinity from behavior
    const implicitScore = implicitProfile
      ? computeImplicitScore(venue, implicitProfile)
      : 0.5;

    // CBF vector score: cosine similarity between user preference vector and
    // venue feature vector. null = this venue has no usable feature vector.
    const cbfVectorScore = computeCBFVectorScore(venue, userPreferenceVector);

    // Graded visited penalty: loved venues barely dip, disliked ones sink hard
    const visitedPenalty = computeVisitedPenalty(implicitProfile?.visitedInfo?.get(venueId));

    // Tiered text match
    const textMatch = searchTerm
      ? computeTextMatchScore(venue, searchNormalized, searchTokens)
      : { score: 0, matchedFields: [], matchReason: 'no_query' };

    let nameScore = 0;
    if (searchTerm) {
      const vName = venue.name.toLowerCase();
      if (vName === searchNormalized) nameScore = 1.0;
      else if (
        vName.startsWith(searchNormalized + ' ') ||
        (vName.startsWith(searchNormalized) && vName.length > searchNormalized.length)
      ) nameScore = 0.95;
      else if (vName.includes(searchNormalized)) nameScore = 0.85;
      else if (searchNormalized.includes(vName)) nameScore = 0.75;
      else {
        const matches = searchTokens.filter(t => vName.includes(t)).length;
        if (matches > 0) nameScore = (matches / searchTokens.length) * 0.6;
      }
      nameScore = Math.max(nameScore, textMatch.score * 0.65);
    }

    const activeWeights = { ...weights };
    if (searchTerm) {
      activeWeights.name = 0.3;
      activeWeights.vector = queryEmbedding ? 0.3 : 0.0;
      const remaining = 1.0 - (activeWeights.name + activeWeights.vector);
      const sumOthers = Object.keys(weights)
        .filter(k => k !== 'name' && k !== 'vector')
        .reduce((acc, k) => acc + weights[k], 0);
      Object.keys(weights).forEach(k => {
        if (k !== 'name' && k !== 'vector') {
          activeWeights[k] = (weights[k] / sumOthers) * remaining;
        }
      });
    }

    // Per-venue factor table. score === null marks a signal this venue can't
    // provide (no stored embedding / feature vector / mood data); its weight
    // is redistributed across the venue's available signals instead of the
    // old behavior of silently scoring 0.5 "average" — which let data-less
    // venues outrank ones with real-but-mediocre signals.
    const factorScores = {
      name:       searchTerm ? nameScore : 0,
      cuisine:    cuisineScore,
      category:   categoryScore,
      tag:        tagScore,
      price:      priceScore,
      rating:     ratingScore,
      distance:   distanceScore,
      mood:       moodScore,
      popularity: popularityScore,
      implicit:   implicitScore,
      vector:     vectorSimilarity,
      cbfVector:  cbfVectorScore,
    };

    let weightedSum = 0;
    let knownWeight = 0;
    Object.entries(factorScores).forEach(([key, score]) => {
      const w = activeWeights[key] || 0;
      if (w === 0 || score === null) return;
      weightedSum += w * score;
      knownWeight += w;
    });
    const rawScore = knownWeight > 0 ? weightedSum / knownWeight : 0;

    const finalScore = (rawScore + featuredBoost + timeBoost) * visitedPenalty;

    return {
      venue,
      finalScore,
      textMatchScore: textMatch.score,
      matchedFields:  textMatch.matchedFields,
      matchReason:    textMatch.matchReason,
      rawVectorSimilarity,
      distanceKm,
      scoreBreakdown: {
        name:          Math.round(nameScore        * 100),
        cuisine:       Math.round(cuisineScore     * 100),
        category:      Math.round(categoryScore    * 100),
        tag:           Math.round(tagScore         * 100),
        price:         Math.round(priceScore       * 100),
        rating:        Math.round(ratingScore      * 100),
        distance:      Math.round(distanceScore    * 100),
        mood:          Math.round((moodScore        ?? 0) * 100),
        popularity:    Math.round(popularityScore  * 100),
        implicit:      Math.round(implicitScore    * 100),
        vector:        Math.round((vectorSimilarity ?? 0) * 100),
        cbfVector:     Math.round((cbfVectorScore   ?? 0) * 100),
        timeBoost:     Math.round(timeBoost        * 100),
        featured:      venue.isFeatured ? 8 : 0,
        matchedFields: textMatch.matchedFields,
        matchReason:   textMatch.matchReason,
      },
    };
  });

  let filtered = hasLocation
    ? scoredVenues.filter(s => s.distanceKm === null || s.distanceKm <= maxDistanceKm)
    : scoredVenues;

  // Only gate on text relevance when the query has meaningful tokens left
  // after stop-word removal — an all-generic query ("places to eat") carries
  // no venue-specific signal, so gating on it would cut arbitrary venues.
  if (searchTerm && searchTokens.length > 0) {
    const hasFilterContext = cuisineIds.length > 0 || priceRanges.length > 0 || !!mood;
    const textMatched    = filtered.filter(s => s.textMatchScore > 0);
    const strongMatched  = selectByConfidenceTier(textMatched);

    if (strongMatched.length > 0) {
      filtered = strongMatched;
    } else if (queryEmbedding) {
      // No literal keyword/tag hit — fall back to semantic similarity so
      // natural-language queries ("family environment") aren't dropped to
      // zero results just because no venue text contains those words.
      // Requires an absolute floor AND a relative margin: with only a few
      // dozen venues, cosine scores for a nonsense query still cluster
      // within a tight band of each other, so a margin-only check would
      // wrongly "match" every venue. Uses RAW cosine (not the [0,1]-remapped
      // scoreBreakdown.vector) because that remap compresses the gap
      // between relevant and garbage queries too much to threshold on.
      // Empirically (MiniLM, this venue set): genuine semantic matches top
      // out above ~0.30 raw cosine; garbage queries top out below ~0.25.
      const SEMANTIC_FLOOR  = 0.30; // absolute min top raw-cosine to trust the fallback at all
      const SEMANTIC_MARGIN = 0.10; // raw-cosine points below the top score, once trusted
      const vectorScores = filtered.map(s => s.rawVectorSimilarity);
      const maxVector = Math.max(0, ...vectorScores);
      const semanticMatched = maxVector >= SEMANTIC_FLOOR
        ? filtered.filter(s => s.rawVectorSimilarity >= maxVector - SEMANTIC_MARGIN)
        : [];

      if (semanticMatched.length > 0) {
        filtered = semanticMatched;
      } else if (hasFilterContext) {
        filtered = filtered.filter(s => s.finalScore > SEARCH_THRESHOLDS.FILTER_CONTEXT_SCORE);
      } else {
        filtered = [];
      }
    } else if (hasFilterContext) {
      filtered = filtered.filter(s => s.finalScore > SEARCH_THRESHOLDS.FILTER_CONTEXT_SCORE);
    } else {
      filtered = [];
    }
  }

  if (minRating > 0) {
    filtered = filtered.filter(s => (s.venue.averageRating || 0) >= minRating);
  }

  // Hard filters, applied as named, independently-relaxable steps. When
  // stacking several (price + mood + cuisine + a tight distance) leaves zero
  // results, we drop them one at a time — softest/most negotiable first —
  // instead of showing a dead end, and report what got relaxed so the UI can
  // tell the user ("no exact match for Nightlife — showing nearby options").
  const cuisineFilter = list => explicitCuisineIds.length
    ? list.filter(s => {
        const venueIds = s.venue.cuisines.map(c => c._id.toString());
        return explicitCuisineIds.some(id => venueIds.includes(id));
      })
    : list;

  const priceFilter = list => priceRanges.length
    ? list.filter(s => priceRanges.map(Number).includes(s.venue.priceRange))
    : list;

  const moodFilter = list => mood
    ? list.filter(s => {
        const venue = s.venue;
        // Direct mood match wins; otherwise fall back to tag keywords even
        // when venue.mood IS set — mood labels come from a heuristic backfill,
        // and one wrong inference must not make a venue invisible for a mood
        // its tags clearly support.
        if (venue.mood && venue.mood.length > 0 && venue.mood.includes(mood)) return true;
        if (!moodTagIds.length) return !(venue.mood && venue.mood.length > 0); // unknown mood id — don't exclude everything
        const venueTagIds = venue.tags.map(t => t._id.toString());
        return moodTagIds.some(id => venueTagIds.includes(id));
      })
    : list;

  const preHardFilter = filtered;
  filtered = moodFilter(priceFilter(cuisineFilter(preHardFilter)));

  // Relaxation order: mood (softest — a vibe preference), then price, then
  // cuisine (kept last — the most deliberate, specific ask). Distance and
  // minRating are never relaxed here: distance already means "too far to be
  // useful," and rating is a quality floor, not a preference.
  const relaxedFilters = [];
  if (filtered.length === 0 && (mood || priceRanges.length || explicitCuisineIds.length)) {
    const dropOrder = ['mood', 'price', 'cuisine'].filter(name => (
      (name === 'mood' && mood) ||
      (name === 'price' && priceRanges.length > 0) ||
      (name === 'cuisine' && explicitCuisineIds.length > 0)
    ));

    for (const dropped of dropOrder) {
      if (filtered.length > 0) break;
      relaxedFilters.push(dropped);
      let candidates = preHardFilter;
      if (!relaxedFilters.includes('mood'))    candidates = moodFilter(candidates);
      if (!relaxedFilters.includes('price'))   candidates = priceFilter(candidates);
      if (!relaxedFilters.includes('cuisine')) candidates = cuisineFilter(candidates);
      filtered = candidates;
    }

    if (filtered.length === 0) relaxedFilters.length = 0; // relaxing everything still found nothing — not worth reporting
  }

  // Sort
  if (searchTerm && !sortBy) {
    filtered.sort((a, b) => {
      if (b.textMatchScore !== a.textMatchScore) return b.textMatchScore - a.textMatchScore;
      return b.finalScore - a.finalScore;
    });
  } else if (sortBy) {
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price_desc':    return b.venue.priceRange - a.venue.priceRange;
        case 'price_asc':     return a.venue.priceRange - b.venue.priceRange;
        case 'rating':
        case 'rating_desc':   return b.venue.averageRating - a.venue.averageRating;
        case 'rating_asc':    return a.venue.averageRating - b.venue.averageRating;
        case 'distance':
        case 'distance_asc': {
          const distA = a.distanceKm === null ? Infinity : a.distanceKm;
          const distB = b.distanceKm === null ? Infinity : b.distanceKm;
          return distA - distB;
        }
        case 'distance_desc': return (b.distanceKm || 0) - (a.distanceKm || 0);
        default:              return b.finalScore - a.finalScore;
      }
    });
  } else {
    filtered.sort((a, b) => b.finalScore - a.finalScore);
  }

  // Diversity re-ranking: prevent cuisine monopoly in top results
  // Cap any single cuisine to appear in at most 40% of the top-N results
  const diversified = applyDiversityReranking(filtered, limit);

  const results = diversified.slice(0, limit).map(item => ({
    ...item.venue,
    recommendationScore: Math.min(1, Math.max(0, item.finalScore)),
    scoreBreakdown: item.scoreBreakdown,
    distanceKm: item.distanceKm,
    matchedMood: mood,
    matchLabel: computeMatchLabel(item.scoreBreakdown, mood, item.distanceKm, !!userId, isColdStart),
  }));

  const suggestions = (searchTerm && results.length === 0)
    ? generateSuggestions(searchTerm, venues)
    : [];

  return {
    results,
    suggestions,
    searchMeta: {
      query:          searchTerm,
      totalScanned:   venues.length,
      matched:        filtered.length,
      filteredOut:    venues.length - filtered.length,
      relaxedFilters, // filters dropped to avoid a dead-end zero-result response
      coldStart:      isColdStart, // true = ranked by popularity/rating, not personalization
    },
  };
};

// ─── Scoring helpers ──────────────────────────────────────────────────────────

function computeWeights({ hasCuisine, hasCategory, hasTag, hasMood, hasLocation, hasPriceFilter, isTopRated, hasImplicit, hasVector, hasCbfVector = false, isColdStart = false }) {
  let w = {
    cuisine:    0.18,
    category:   0.12,
    tag:        0.08,
    mood:       0.10,
    rating:     0.22,
    distance:   0.10,
    price:      0.08,
    popularity: 0.07,
    implicit:   0.05,
    vector:     0.00,
    cbfVector:  0.00,
  };

  if (isTopRated)    { w.rating += 0.35; w.cuisine -= 0.08; w.category -= 0.08; w.tag -= 0.05; w.distance -= 0.05; w.mood -= 0.05; w.price -= 0.04; }
  // Cold start: no personal signal exists, so rank on proven quality and
  // popularity (plus proximity when available) instead of diluted defaults.
  if (isColdStart)   { w.rating += 0.12; w.popularity += 0.12; w.distance += 0.05; w.cuisine -= 0.08; w.tag -= 0.04; w.mood -= 0.05; }
  if (hasCuisine)    { w.cuisine  += 0.10; w.rating -= 0.05; }
  if (hasCategory)   { w.category += 0.08; w.rating -= 0.04; }
  if (hasTag)        { w.tag      += 0.08; w.rating -= 0.04; }
  if (hasMood)       { w.mood     += 0.10; w.rating -= 0.05; }
  if (hasLocation)   { w.distance += 0.10; w.rating -= 0.05; }
  // Price gets a strong boost when the user expressed a price preference —
  // at the base 0.08 weight a budget user's top results were dominated by
  // premium venues whenever cuisine matched.
  if (hasPriceFilter){ w.price    += 0.12; w.rating -= 0.06; w.popularity -= 0.03; }
  if (hasImplicit)   { w.implicit += 0.05; if (hasCbfVector) w.cbfVector = 0.07; w.rating -= 0.04; }

  if (hasVector) {
    w.vector = 0.25;
    // Scale down other weights
    const factor = 0.75;
    Object.keys(w).forEach(k => {
      if (k !== 'vector') w[k] *= factor;
    });
  }

  // Clamp negatives
  Object.keys(w).forEach(k => { w[k] = Math.max(0.02, w[k]); });

  // Normalize to sum = 1
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
  // Exponential decay: score = 1 at 0 km, ~0.37 at maxDistance/2
  const distanceScore = Math.exp(-distanceKm / (maxDistanceKm * 0.4));
  return {
    distanceKm: Math.round(distanceKm * 10) / 10,
    distanceScore: Math.min(1, distanceScore),
  };
}

function computeMoodScore(venue, mood, moodTagIds) {
  if (!mood) return 0.5;
  // Prefer the direct Venue.mood field — populated at import/seed time —
  // over the fuzzy Tag-keyword fallback, which only exists for venues
  // that predate that field.
  if (venue.mood && venue.mood.length > 0) {
    if (venue.mood.includes(mood)) return 1.0;
    // Non-match scores 0.15, not 0 — mood labels come from a heuristic
    // backfill, so one wrong inference shouldn't zero the venue out. Tag
    // keywords can still rescue a partial match.
    const tagFallback = computeMoodTagScore(venue, moodTagIds);
    return Math.max(0.15, tagFallback * 0.6);
  }
  const tagScore = computeMoodTagScore(venue, moodTagIds);
  // null = no mood data at all for this venue AND no tag keywords resolved —
  // signal genuinely unknown, weight gets redistributed rather than faked.
  return tagScore === null ? null : tagScore;
}

function computeMoodTagScore(venue, moodTagIds) {
  if (!moodTagIds.length) return null;
  const venueTagIds = (venue.tags || []).map(t => t._id.toString());
  const matches = moodTagIds.filter(id => venueTagIds.includes(id)).length;
  return Math.min(1, matches / Math.max(1, Math.min(moodTagIds.length, 4)));
}

/**
 * Popularity signal: log-normalized review count.
 * A venue with 50 reviews scores ~0.85; one with 5 scores ~0.4.
 * This prevents cold-start venues from dominating but lets proven ones surface.
 */
function computePopularityScore(venue, maxReviews) {
  const reviews = venue.totalReviews || 0;
  let score = 0.1;
  if (reviews > 0) {
    score = Math.min(1, Math.log1p(reviews) / Math.log1p(maxReviews));
  }
  
  // Cold-start / New Launch Boost:
  // If restaurant was created in the last 30 days, ensure a baseline popularity score of 0.35
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  if (venue.createdAt && new Date(venue.createdAt) > thirtyDaysAgo) {
    score = Math.max(score, 0.35);
  }
  return score;
}

/**
 * Raw cosine similarity in [-1, 1], no normalization. Used where the actual
 * spread between relevant and irrelevant matters (semantic-fallback gating),
 * as opposed to computeCosineSimilarity's [0, 1] remap used for scoring.
 */
function rawCosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Computes cosine similarity between two numeric arrays of the same length.
 */
function computeCosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0.5;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0.5;
  const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  // Normalize similarity from [-1, 1] to [0, 1] range
  return (similarity + 1) / 2;
}

/**
 * Dynamically boosts restaurants if they specialize in items fitting the current time of day.
 */
function computeTimeBoost(venue) {
  const currentHour = new Date().getHours();
  let currentMealContext = 'all-day';
  
  if (currentHour >= 6 && currentHour < 11) {
    currentMealContext = 'breakfast';
  } else if (currentHour >= 11 && currentHour < 15) {
    currentMealContext = 'lunch';
  } else if (currentHour >= 15 && currentHour < 18) {
    currentMealContext = 'snacks';
  } else if (currentHour >= 18 && currentHour < 23) {
    currentMealContext = 'dinner';
  }
  
  // If the venue has explicitly defined mealTypes and supports the current context
  if (venue.mealTypes && venue.mealTypes.includes(currentMealContext)) {
    return 0.05; // 5% positive boost
  }
  return 0;
}

/**
 * Implicit feedback score — measures how well this venue matches
 * the user's historical preference profile (derived from reviews + reservations).
 */
function computeImplicitScore(venue, implicitProfile) {
  const { cuisineAffinity, tagAffinity, priceAffinity } = implicitProfile;

  let score = 0;
  let components = 0;

  // Affinities can be negative (venues the user rated 1–2★ push their
  // cuisines/tags down). Components are clamped to [-1, 1] and the final
  // average floors at 0 so a disliked profile never produces a boost.
  const venuesCuisineIds = venue.cuisines.map(c => c._id.toString());
  const cuisineMatch = venuesCuisineIds.reduce((sum, id) => sum + (cuisineAffinity[id] || 0), 0);
  if (Object.keys(cuisineAffinity).length > 0) {
    score += Math.max(-1, Math.min(1, cuisineMatch));
    components++;
  }

  const venuesTagIds = venue.tags.map(t => t._id.toString());
  const tagMatch = venuesTagIds.reduce((sum, id) => sum + (tagAffinity[id] || 0), 0);
  if (Object.keys(tagAffinity).length > 0) {
    score += Math.max(-1, Math.min(1, tagMatch * 0.5));
    components++;
  }

  const priceMatch = priceAffinity[venue.priceRange] || 0;
  if (Object.keys(priceAffinity).length > 0) {
    score += Math.max(-1, Math.min(1, priceMatch));
    components++;
  }

  return components > 0 ? Math.max(0, Math.min(1, score / components)) : 0.5;
}

/**
 * Diversity re-ranking: from the sorted candidate list, ensure no single
 * cuisine accounts for more than ~40% of the final top-N results.
 * Uses a window-based interleaving approach.
 */
function applyDiversityReranking(sortedVenues, limit) {
  if (sortedVenues.length <= limit) return sortedVenues;

  const maxPerCuisine = Math.ceil(limit * 0.40);
  const cuisineCounts = {};
  const selected = [];
  const deferred  = [];

  for (const item of sortedVenues) {
    if (selected.length >= limit) break;

    // Count the venue against ALL its cuisines, not just cuisines[0] — keyed
    // on the first cuisine alone, [Italian, Pizza] and [Pizza, Italian]
    // landed in different buckets and the cap was trivially defeated by
    // cuisine ordering.
    const venueCuisines = (item.venue.cuisines || []).map(c => c._id.toString());
    const keys = venueCuisines.length > 0 ? venueCuisines : ['none'];
    const atCap = keys.some(k => (cuisineCounts[k] || 0) >= maxPerCuisine);

    if (!atCap) {
      selected.push(item);
      keys.forEach(k => { cuisineCounts[k] = (cuisineCounts[k] || 0) + 1; });
    } else {
      deferred.push(item);
    }
  }

  // Fill remaining slots with deferred items if we didn't hit the limit
  for (const item of deferred) {
    if (selected.length >= limit) break;
    selected.push(item);
  }

  return selected;
}

// ─── CBF Vector helpers ───────────────────────────────────────────────────────

/**
 * Builds a numeric preference vector in the same space as venue.featureVector.combinedVector.
 * Layout: [cuisineVec..., tagVec..., normalizedPrice, priceConfidence]
 */
function buildUserPreferenceVector(implicitProfile, allCuisines, allTags) {
  const { cuisineAffinity = {}, tagAffinity = {}, priceAffinity = {} } = implicitProfile;
  const cuisineVec = allCuisines.map(c => cuisineAffinity[c._id.toString()] || 0);
  const tagVec     = allTags.map(t => tagAffinity[t._id.toString()] || 0);
  const sortedPrices = Object.entries(priceAffinity).sort((a, b) => b[1] - a[1]);
  const normalizedPrice = sortedPrices.length > 0 ? Number(sortedPrices[0][0]) / 4.0 : 0.5;
  return [...cuisineVec, ...tagVec, normalizedPrice, 0.8];
}

/**
 * Cosine similarity between a user's preference vector and a venue's stored feature vector.
 */
// Warn once per venue per process about stale CBF vectors — a dimension
// mismatch means a Cuisine/Tag was added/removed after vectors were built,
// silently neutralizing the whole CBF signal until an admin rebuild runs.
const staleCbfWarned = new Set();

function computeCBFVectorScore(venue, userPreferenceVector) {
  if (!userPreferenceVector) return 0.5; // no user profile — uniform, harmless
  const combined = venue.featureVector?.combinedVector;
  if (!combined?.length) return null; // this venue has no vector — signal unknown
  if (combined.length !== userPreferenceVector.length) {
    const venueId = venue._id.toString();
    if (!staleCbfWarned.has(venueId)) {
      staleCbfWarned.add(venueId);
      console.warn(
        `[CBF] Stale feature vector for venue ${venueId} ` +
        `(stored dim ${combined.length}, expected ${userPreferenceVector.length}). ` +
        `Trigger the admin vector rebuild endpoint to fix.`
      );
    }
    return null;
  }
  return computeCosineSimilarity(userPreferenceVector, combined);
}

/**
 * Returns a short human-readable label explaining why a venue was recommended.
 */
function computeMatchLabel(scoreBreakdown, mood, distanceKm, isAuthenticated, isColdStart = false) {
  if (scoreBreakdown.name >= 85)   return 'Exact match';
  if (scoreBreakdown.vector >= 60) return 'AI match';
  if (mood && scoreBreakdown.mood >= 60) return 'Mood match';
  if (distanceKm !== null && distanceKm <= 2) return 'Near you';
  // Cold start: honest labels — nothing here is personalized, so say
  // "Popular" instead of implying a match with a profile that doesn't exist.
  if (isColdStart && scoreBreakdown.popularity >= 60) return 'Popular';
  if (scoreBreakdown.rating >= 80) return 'Top rated';
  if (scoreBreakdown.cuisine >= 80) return 'Cuisine match';
  if (scoreBreakdown.implicit >= 70 && isAuthenticated && !isColdStart) return 'For you';
  return null;
}

// ─── Daily Digest helper ──────────────────────────────────────────────────────
const buildDigest = async (userId, limit = 3) => {
  const profile = await buildImplicitProfile(userId).catch(() => null);
  const hasProfile = profile && Object.keys(profile.cuisineAffinity).length > 0;

  const { results } = await getSmartRecommendations({
    userId: hasProfile ? userId : null,
    isTopRated: !hasProfile,
    limit,
  });

  return results;
};

// ─── Legacy CBF wrapper (backwards compat) ───────────────────────────────────
const getCBFRecommendations = async (userId, limit = 10, lat = null, lng = null) => {
  const { results } = await getSmartRecommendations({ userId, limit, lat, lng });
  return results;
};

// ─── Build explanation for filter-based discovery (no NL prompt) ─────────────
const buildFilterExplanation = ({ mood, priceRanges, hasLocation, maxDistanceKm, cuisineIds, sortBy }) => {
  const parts = [];
  if (mood) parts.push(`${mood.replace('-', ' ')} vibes`);
  if (priceRanges?.length) {
    const symbols = ['$', '$$', '$$$', '$$$$'];
    const labels = priceRanges.map(p => symbols[p - 1] || p).join(', ');
    parts.push(`${labels} price range`);
  }
  if (hasLocation) parts.push(`within ${maxDistanceKm} km of you`);
  if (sortBy === 'rating' || sortBy === 'rating_desc') parts.push('sorted by top rating');
  if (sortBy === 'distance' || sortBy === 'distance_asc') parts.push('sorted by nearest first');
  if (sortBy === 'price_asc') parts.push('sorted from most affordable');
  if (sortBy === 'price_desc') parts.push('sorted from most premium');

  if (parts.length === 0) return null;
  return `Showing restaurants matching: ${parts.join(' · ')}.`;
};

module.exports = {
  getSmartRecommendations,
  getCBFRecommendations,
  buildImplicitProfile,
  buildFilterExplanation,
  buildDigest,
  MOOD_KEYWORDS,
  // Pure scoring helpers, exported for unit tests
  _internal: {
    computeWeights,
    applyDiversityReranking,
    computeVisitedPenalty,
    computeMoodScore,
    computeImplicitScore,
    computePriceScore,
    computeCosineSimilarity,
    rawCosineSimilarity,
    buildUserPreferenceVector,
    recencyFactor,
    computeMatchLabel,
  },
};
