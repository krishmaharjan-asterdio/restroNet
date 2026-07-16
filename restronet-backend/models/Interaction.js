const mongoose = require('mongoose');

/**
 * Interaction Schema — lightweight behavioral feedback events.
 *
 * Captures the fast, cheap signals (card clicks, detail views, dismissals)
 * that reviews/reservations/favorites are too slow and sparse to provide.
 * Fed into the implicit preference profile at low weight; dismissals are the
 * system's only real-time negative signal.
 *
 * Documents auto-expire after 90 days (TTL index) — interactions are a
 * recency-weighted signal, not a permanent record.
 */
const interactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
    },
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
      required: [true, 'Venue reference is required'],
    },
    type: {
      type: String,
      enum: ['view', 'click', 'dismiss'],
      required: [true, 'Interaction type is required'],
    },
    createdAt: {
      type: Date,
      default: Date.now,
      // TTL: MongoDB purges interactions older than 90 days automatically.
      expires: 60 * 60 * 24 * 90,
    },
  },
  { versionKey: false }
);

// Profile builder queries "latest N interactions for user"
interactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('Interaction', interactionSchema);
