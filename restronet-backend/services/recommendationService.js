const User = require('../models/User');
const Venue = require('../models/Venue');
const { Cuisine, Tag } = require('../models/Metadata');
const RestaurantFeature = require('../models/RestaurantFeature');
const { calculateHaversineDistance } = require('../utils/haversine');
const { cosineSimilarity } = require('../utils/cosineSimilarity');

/**
 * Get Content-Based Filtering recommendations for a user.
 * 
 * @param {ObjectId} userId 
 * @param {Number} limit 
 */
const getCBFRecommendations = async (userId, limit = 10) => {
  const user = await User.findById(userId).populate('preferences.cuisines').populate('preferences.tags');
  if (!user) throw new Error('User not found');

  // If user has no preferences, fallback to popular/highly-rated restaurants
  if (!user.hasPreferences) {
    return await Venue.find({ isActive: true })
      .sort({ averageRating: -1, totalReviews: -1 })
      .limit(limit)
      .populate('cuisines tags');
  }

  // 1. Build the User's Preference Vector (Dynamic)
  // This must match the exact dimensions of the Restaurant's combinedVector
  const allCuisines = await Cuisine.find().sort({ _id: 1 });
  const allTags = await Tag.find().sort({ _id: 1 });

  const userCuisineVector = allCuisines.map((c) =>
    user.preferences.cuisines.some((uc) => uc._id.toString() === c._id.toString()) ? 1 : 0
  );

  const userTagVector = allTags.map((t) =>
    user.preferences.tags.some((ut) => ut._id.toString() === t._id.toString()) ? 1 : 0
  );

  // Default to mid-range if not set
  const userPriceRange = user.preferences.priceRange ? user.preferences.priceRange / 4.0 : 0.5;
  // We assume the user prefers highly rated places (1.0)
  const userRatingPreference = 1.0; 

  const userCombinedVector = [
    ...userCuisineVector,
    ...userTagVector,
    userPriceRange,
    userRatingPreference
  ];

  // 2. Fetch all active restaurant feature vectors
  const allFeatures = await RestaurantFeature.find().populate({
    path: 'venue',
    match: { isActive: true }, // Only active venues
    populate: { path: 'cuisines tags' }
  });

  // 3. Compute Scores
  let scoredVenues = allFeatures
    .filter(f => f.venue !== null) // Filter out features where venue was deleted or inactive
    .map((feature) => {
      // Compute Cosine Similarity between user vector and venue vector
      const similarityScore = cosineSimilarity(userCombinedVector, feature.combinedVector);

      // Compute Distance if user location is available
      let distanceKm = null;
      let distancePenalty = 0;
      if (user.location && user.location.coordinates[0] !== 0) {
        distanceKm = calculateHaversineDistance(
          user.location.coordinates,
          feature.venue.location.coordinates
        );
        
        // Simple distance penalty: if beyond user's maxDistance, heavily penalize
        // If within, slight linear penalty based on distance
        const maxDist = user.preferences.maxDistanceKm || 10;
        if (distanceKm > maxDist) {
           distancePenalty = 0.5; // Huge drop in score
        } else {
           distancePenalty = (distanceKm / maxDist) * 0.1; // Max 0.1 penalty
        }
      }

      const finalScore = similarityScore - distancePenalty;

      return {
        venue: feature.venue,
        similarityScore,
        distanceKm,
        finalScore
      };
    });

  // 4. Sort by Final Score and return top K
  scoredVenues.sort((a, b) => b.finalScore - a.finalScore);
  
  return scoredVenues.slice(0, limit).map(item => ({
    ...item.venue.toObject(),
    recommendationScore: item.finalScore,
    distanceKm: item.distanceKm ? Math.round(item.distanceKm * 10) / 10 : null
  }));
};

module.exports = {
  getCBFRecommendations
};
