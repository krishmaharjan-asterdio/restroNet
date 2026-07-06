const mongoose = require('mongoose');

const favoriteSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

favoriteSchema.index({ user: 1, venue: 1 }, { unique: true });

module.exports = mongoose.model('Favorite', favoriteSchema);
