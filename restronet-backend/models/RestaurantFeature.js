const mongoose = require('mongoose');

/**
 * RestaurantFeature Schema — CBF Feature Vector Store
 * Stores pre-computed TF-IDF feature vectors for each restaurant.
 * Used by the Content-Based Filtering recommendation engine.
 */
const restaurantFeatureSchema = new mongoose.Schema(
  {
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
      required: true,
      unique: true, // One feature document per venue
    },

    // ─── Cuisine One-Hot Vector ──────────────────────────────────────────────
    // Array of 0/1 values representing presence of each cuisine
    // Order determined by the global cuisineIndex in the CBF pipeline
    cuisineVector: {
      type: [Number],
      default: [],
    },

    // ─── Tag One-Hot Vector ──────────────────────────────────────────────────
    tagVector: {
      type: [Number],
      default: [],
    },

    // ─── Price Range Normalized [0, 1] ───────────────────────────────────────
    normalizedPriceRange: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },

    // ─── Rating Score Normalized [0, 1] ─────────────────────────────────────
    normalizedRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 1,
    },

    // ─── TF-IDF Vector ───────────────────────────────────────────────────────
    // Sparse TF-IDF representation of: cuisine names + tag names + description
    // Stored as key-value pairs for efficiency
    tfidfVector: {
      type: Map,
      of: Number,
      default: {},
    },

    // ─── Combined Feature Vector ─────────────────────────────────────────────
    // Concatenated: cuisineVector + tagVector + [normalizedPriceRange, normalizedRating]
    combinedVector: {
      type: [Number],
      default: [],
    },

    // ─── Metadata ────────────────────────────────────────────────────────────
    lastComputedAt: {
      type: Date,
      default: Date.now,
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// ─── Index ────────────────────────────────────────────────────────────────────
restaurantFeatureSchema.index({ lastComputedAt: -1 });

module.exports = mongoose.model('RestaurantFeature', restaurantFeatureSchema);
