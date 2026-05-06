const mongoose = require('mongoose');

/** Cuisine Metadata (e.g., Nepali, Indian, Chinese, Italian) */
const cuisineSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, unique: true, lowercase: true, trim: true },
  description: { type: String, trim: true },
  icon: { type: String, default: null }, // emoji or icon URL
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

cuisineSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
  next();
});

/** Tag Metadata (e.g., "Outdoor Seating", "Live Music", "Family Friendly") */
const tagSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, unique: true, lowercase: true, trim: true },
  description: { type: String, trim: true },
  category: {
    type: String,
    enum: ['ambience', 'service', 'food', 'facility', 'occasion', 'other'],
    default: 'other',
  },
  icon: { type: String, default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

tagSchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
  next();
});

/** Category Metadata (e.g., "Fast Food", "Fine Dining", "Café", "Bakery") */
const categorySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  slug: { type: String, unique: true, lowercase: true, trim: true },
  description: { type: String, trim: true },
  icon: { type: String, default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

categorySchema.pre('save', function (next) {
  if (this.isModified('name')) {
    this.slug = this.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  }
  next();
});

module.exports = {
  Cuisine: mongoose.model('Cuisine', cuisineSchema),
  Tag: mongoose.model('Tag', tagSchema),
  Category: mongoose.model('Category', categorySchema),
};
