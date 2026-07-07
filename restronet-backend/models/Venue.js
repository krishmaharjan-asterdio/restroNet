const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');

/**
 * Venue / Restaurant Schema — The main entity in RESTRONET.
 * Contains all restaurant details used in the recommendation engine.
 */
const venueSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Restaurant name is required'],
      trim: true,
      maxlength: [200, 'Name cannot exceed 200 characters'],
    },
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [2000, 'Description cannot exceed 2000 characters'],
    },

    // ─── Location ───────────────────────────────────────────────────────────
    address: {
      street: { type: String, trim: true },
      city: { type: String, trim: true, required: [true, 'City is required'] },
      state: { type: String, trim: true },
      country: { type: String, trim: true, default: 'Nepal' },
      postalCode: { type: String, trim: true },
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: [true, 'Coordinates (lng, lat) are required'],
        validate: {
          validator: (v) => v.length === 2,
          message: 'Coordinates must be [longitude, latitude]',
        },
      },
    },

    // ─── Metadata (Many-to-Many refs) ───────────────────────────────────────
    cuisines: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Cuisine' }],
    tags: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tag' }],
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },

    // ─── Price & Hours ──────────────────────────────────────────────────────
    priceRange: {
      type: Number,
      min: 1,
      max: 4,
      required: [true, 'Price range is required'],
      // 1 = Budget (<500 NPR), 2 = Mid (500-1500), 3 = Premium (1500-3000), 4 = Luxury (>3000)
    },
    openingHours: {
      monday:    { open: String, close: String, isClosed: { type: Boolean, default: false } },
      tuesday:   { open: String, close: String, isClosed: { type: Boolean, default: false } },
      wednesday: { open: String, close: String, isClosed: { type: Boolean, default: false } },
      thursday:  { open: String, close: String, isClosed: { type: Boolean, default: false } },
      friday:    { open: String, close: String, isClosed: { type: Boolean, default: false } },
      saturday:  { open: String, close: String, isClosed: { type: Boolean, default: false } },
      sunday:    { open: String, close: String, isClosed: { type: Boolean, default: false } },
    },
    mealTypes: [{
      type: String,
      enum: ['breakfast', 'lunch', 'dinner', 'brunch', 'snacks', 'all-day'],
    }],

    // ─── Contact ────────────────────────────────────────────────────────────
    phone: { type: String, trim: true },
    website: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },

    // ─── Images ─────────────────────────────────────────────────────────────
    logo: {
      type: String,
      default: null,
    },
    gallery: [{ type: String }], // Array of image URLs/paths
    menu: [{ type: String }],    // Array of menu image URLs/paths

    // ─── Rating (Denormalized for performance) ───────────────────────────────
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    totalReviews: {
      type: Number,
      default: 0,
    },

    // ─── Recommendation Engine Vector (populated by CBF pipeline) ───────────
    featureVector: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RestaurantFeature',
      default: null,
    },

    // ─── AI Fields ──────────────────────────────────────────────────────────
    aiSummary: {
      summaryText: { type: String, default: null },
      positives: [{ type: String }],
      constructives: [{ type: String }],
      lastUpdated: { type: Date, default: null },
      reviewCountSnapshot: { type: Number, default: 0 },
    },
    embedding: {
      type: [Number], // 384-dimensional vector from local Xenova/all-MiniLM-L6-v2
      default: undefined,
    },

    // ─── Ownership ─────────────────────────────────────────────────────────
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
      default: null,
    },

    // ─── Status ─────────────────────────────────────────────────────────────
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isTrending:    { type: Boolean, default: false },
    trendingScore: { type: Number,  default: 0 },

    maxCapacity:         { type: Number, default: null },
    slotDurationMinutes: { type: Number, default: 60 },
    staleFlag:           { type: Boolean, default: false },

    // ─── External Source (Scraper/Importer) ─────────────────────────────────
    osmId: { type: String, unique: true, sparse: true },
    source: { type: String, default: 'manual', enum: ['manual', 'osm'] },
  },
  {
    timestamps: true,
  }
);

// ─── Indexes ──────────────────────────────────────────────────────────────────
venueSchema.index({ location: '2dsphere' });
venueSchema.index({ name: 'text', description: 'text' }); // full-text search
venueSchema.index({ cuisines: 1 });
venueSchema.index({ tags: 1 });
venueSchema.index({ priceRange: 1 });
venueSchema.index({ averageRating: -1 });

// ─── Auto-generate slug from name ────────────────────────────────────────────
venueSchema.pre('save', function (next) {
  if (this.isModified('name') && !this.slug) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '') + '-' + Date.now();
  }
  next();
});

// ─── Pagination Plugin ────────────────────────────────────────────────────────
venueSchema.plugin(mongoosePaginate);

// ─── Recommendation cache invalidation ───────────────────────────────────────
// The recommendation engine caches the venue list; any write must clear it so
// new/updated venues appear immediately.
const venueCache = require('../services/venueCache');
venueSchema.post(
  ['save', 'insertMany', 'findOneAndUpdate', 'findOneAndDelete', 'updateOne', 'updateMany', 'deleteOne', 'deleteMany'],
  () => venueCache.clear()
);

module.exports = mongoose.model('Venue', venueSchema);
