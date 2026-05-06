const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

/**
 * Review / Rating Schema
 * Users can leave one review per venue. Ratings are 1–5.
 * On save/delete, the Venue's averageRating is recalculated via a static method.
 */
const reviewSchema = new mongoose.Schema(
  {
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
      required: [true, 'Venue reference is required'],
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },

    // ─── Ratings (granular breakdown) ───────────────────────────────────────
    rating: {
      overall: {
        type: Number,
        required: [true, 'Overall rating is required'],
        min: [1, 'Rating must be at least 1'],
        max: [5, 'Rating cannot exceed 5'],
      },
      food: { type: Number, min: 1, max: 5, default: null },
      service: { type: Number, min: 1, max: 5, default: null },
      ambience: { type: Number, min: 1, max: 5, default: null },
      value: { type: Number, min: 1, max: 5, default: null },
    },

    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    comment: {
      type: String,
      trim: true,
      maxlength: [2000, 'Comment cannot exceed 2000 characters'],
    },
    photos: [{ type: String }], // Review photo URLs

    // ─── Moderation ─────────────────────────────────────────────────────────
    isApproved: { type: Boolean, default: true },
    isHidden: { type: Boolean, default: false },
    moderationNote: { type: String, default: null },

    // ─── Helpful votes ───────────────────────────────────────────────────────
    helpfulVotes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  },
  {
    timestamps: true,
  }
);

// ─── One review per user per venue ────────────────────────────────────────────
reviewSchema.index({ venue: 1, user: 1 }, { unique: true });
reviewSchema.index({ venue: 1, createdAt: -1 });

// ─── Static: Recalculate venue average rating ─────────────────────────────────
reviewSchema.statics.recalculateRating = async function (venueId) {
  const Venue = mongoose.model('Venue');

  const result = await this.aggregate([
    { $match: { venue: venueId, isHidden: false, isApproved: true } },
    {
      $group: {
        _id: '$venue',
        averageRating: { $avg: '$rating.overall' },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  if (result.length > 0) {
    await Venue.findByIdAndUpdate(venueId, {
      averageRating: Math.round(result[0].averageRating * 10) / 10,
      totalReviews: result[0].totalReviews,
    });
  } else {
    await Venue.findByIdAndUpdate(venueId, {
      averageRating: 0,
      totalReviews: 0,
    });
  }
};

// ─── Post-save Hook: Recalculate rating after review saved ────────────────────
reviewSchema.post('save', async function () {
  await this.constructor.recalculateRating(this.venue);
});

// ─── Post-delete Hook: Recalculate after deletion ─────────────────────────────
reviewSchema.post('findOneAndDelete', async function (doc) {
  if (doc) {
    await doc.constructor.recalculateRating(doc.venue);
  }
});

// ─── Pagination Plugin ────────────────────────────────────────────────────────
reviewSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Review', reviewSchema);
