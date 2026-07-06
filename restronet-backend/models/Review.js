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

// ─── Pre-save Hook: Automated Content Moderation via Gemini ───────────────────
reviewSchema.pre('save', async function (next) {
  // Only moderate if the comment was modified and is not empty
  if (!this.isModified('comment') || !this.comment) {
    return next();
  }

  // If Gemini API Key is missing, skip moderation (fail-open)
  if (!process.env.GEMINI_API_KEY) {
    return next();
  }

  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `
You are an automated content moderation agent for RestroNet, a luxury restaurant recommendation portal in Kathmandu.
Analyze this user review comment and determine if it violates community standards (extreme profanity, hate speech, spam/advertising links, or complete gibberish).
Constructive critical feedback (e.g. "the service was slow", "the food was cold") is NOT a violation and should be approved.

REVIEW TO ANALYZE: "${this.comment}"

Respond with valid JSON ONLY:
{
  "isApproved": boolean,
  "moderationNote": "Reason for rejection if isApproved is false, otherwise null"
}
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const moderation = JSON.parse(jsonMatch[0]);
      this.isApproved = moderation.isApproved;
      this.moderationNote = moderation.moderationNote;
    }
  } catch (error) {
    console.error('AI Review Moderation failed, bypass moderation:', error.message);
    this.isApproved = true; // Fail-open
  }
  next();
});

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

reviewSchema.post('deleteOne', { document: true, query: false }, async function () {
  await this.constructor.recalculateRating(this.venue);
});

// ─── Pagination Plugin ────────────────────────────────────────────────────────
reviewSchema.plugin(mongoosePaginate);

module.exports = mongoose.model('Review', reviewSchema);
