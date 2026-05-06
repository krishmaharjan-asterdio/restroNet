const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

/**
 * User (Consumer) Schema
 * Represents end-users who browse restaurants and receive personalized recommendations.
 */
const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Never returned in queries by default
    },
    avatar: {
      type: String,
      default: null,
    },
    phone: {
      type: String,
      trim: true,
      default: null,
    },

    // ─── User Preferences (used for CBF recommendation vector) ──────────────
    preferences: {
      /** List of Cuisine ObjectIds the user prefers */
      cuisines: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cuisine' }],
      /** List of Tag ObjectIds the user prefers */
      tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
      /** Preferred price range: 1=budget, 2=mid, 3=premium, 4=luxury */
      priceRange: {
        type: Number,
        min: 1,
        max: 4,
        default: null,
      },
      /** Preferred meal types */
      mealTypes: [{
        type: String,
        enum: ['breakfast', 'lunch', 'dinner', 'brunch', 'snacks', 'all-day'],
      }],
      /** Maximum distance in km for location-aware recommendations */
      maxDistanceKm: {
        type: Number,
        default: 10,
      },
    },

    // ─── Last Known Location (for location-aware recommendations) ──────────
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [0, 0],
      },
    },

    // ─── Password Reset ──────────────────────────────────────────────────────
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },

    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
userSchema.index({ email: 1 });
userSchema.index({ location: '2dsphere' }); // for geo-queries

// ─── Pre-save Hook: Hash password ─────────────────────────────────────────────
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─── Instance Method: Compare password ───────────────────────────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ─── Virtual: Full preference summary ────────────────────────────────────────
userSchema.virtual('hasPreferences').get(function () {
  return (
    this.preferences.cuisines.length > 0 ||
    this.preferences.tags.length > 0 ||
    this.preferences.priceRange !== null
  );
});

module.exports = mongoose.model('User', userSchema);
