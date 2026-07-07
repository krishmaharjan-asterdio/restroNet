const natural = require('natural');
const TfIdf = natural.TfIdf;
const { Cuisine, Tag } = require('../models/Metadata');
const Venue = require('../models/Venue');
const RestaurantFeature = require('../models/RestaurantFeature');
const logger = require('../config/logger');
const aiService = require('./aiService');

/**
 * Builds the comprehensive feature vector for a given restaurant.
 * This vector is used for Content-Based Filtering.
 * 
 * Flow:
 * 1. Fetch all global cuisines and tags to establish vector dimensions.
 * 2. Generate Cuisine One-Hot Vector for the restaurant.
 * 3. Generate Tag One-Hot Vector for the restaurant.
 * 4. Normalize Price (0 to 1).
 * 5. Normalize Rating (0 to 1).
 * 6. Generate TF-IDF sparse vector from text (cuisine names + tag names + description).
 * 7. Combine all vectors into a single 1D array.
 * 8. Save or update the RestaurantFeature document.
 * 
 * @param {ObjectId} venueId 
 */
const buildRestaurantFeatureVector = async (venueId) => {
  try {
    const venue = await Venue.findById(venueId).populate('cuisines').populate('tags');
    if (!venue) throw new Error('Venue not found');

    // 1. Fetch globals to maintain consistent indexing across all vectors
    const allCuisines = await Cuisine.find().sort({ _id: 1 });
    const allTags = await Tag.find().sort({ _id: 1 });

    // 2. Cuisine One-Hot Vector
    const cuisineVector = allCuisines.map((c) =>
      venue.cuisines.some((vc) => vc._id.toString() === c._id.toString()) ? 1 : 0
    );

    // 3. Tag One-Hot Vector
    const tagVector = allTags.map((t) =>
      venue.tags.some((vt) => vt._id.toString() === t._id.toString()) ? 1 : 0
    );

    // 4. Normalized Price Range (1-4 map to 0.25-1.0)
    const normalizedPriceRange = venue.priceRange / 4.0;

    // 5. Normalized Rating (0-5 map to 0-1.0)
    const normalizedRating = venue.averageRating / 5.0;

    // 6. Text TF-IDF Vector
    // Combine text features for TF-IDF
    const textCorpus = [
      ...venue.cuisines.map((c) => c.name),
      ...venue.tags.map((t) => t.name),
      venue.description || '',
      venue.name
    ].join(' ');

    const tfidf = new TfIdf();
    tfidf.addDocument(textCorpus);

    const tfidfVectorMap = new Map();
    // We get terms from document 0
    tfidf.listTerms(0).forEach((item) => {
      tfidfVectorMap.set(item.term, item.tfidf);
    });

    // 7. Combined Dense Vector (for easy cosine similarity computation)
    // Structure: [CuisineVector..., TagVector..., Price, Rating]
    const combinedVector = [
      ...cuisineVector,
      ...tagVector,
      normalizedPriceRange,
      normalizedRating
    ];

    // 8. Update or create the feature store
    const featureDoc = await RestaurantFeature.findOneAndUpdate(
      { venue: venueId },
      {
        cuisineVector,
        tagVector,
        normalizedPriceRange,
        normalizedRating,
        tfidfVector: tfidfVectorMap,
        combinedVector,
        lastComputedAt: Date.now(),
      },
      { upsert: true, new: true }
    );

    // Generate text embedding using local model
    const embedding = await aiService.generateEmbedding(textCorpus).catch((err) => {
      logger.warn(`Failed to generate embedding for venue ${venue.name}: ${err.message}`);
      return null;
    });

    venue.featureVector = featureDoc._id;
    if (embedding) {
      venue.embedding = embedding;
    }
    await venue.save({ validateBeforeSave: false }); // Skip hook triggers

    logger.info(`✅ Built feature vector for venue: ${venue.name}`);
    return featureDoc;

  } catch (error) {
    logger.error(`❌ Error building vector for venue ${venueId}: ${error.message}`);
    throw error;
  }
};

/**
 * Rebuilds feature vectors for ALL venues.
 * Should be called when global cuisines or tags are added/removed.
 */
const rebuildAllVectors = async () => {
  try {
    const venues = await Venue.find().select('_id');
    logger.info(`Starting batch feature vector rebuild for ${venues.length} venues...`);
    
    for (const venue of venues) {
      await buildRestaurantFeatureVector(venue._id);
    }
    
    logger.info(`✅ Batch rebuild complete.`);
  } catch (error) {
    logger.error(`Batch rebuild failed: ${error.message}`);
  }
};

module.exports = {
  buildRestaurantFeatureVector,
  rebuildAllVectors
};
