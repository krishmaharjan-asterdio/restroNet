const mongoose = require('mongoose');

/**
 * MenuItem Schema — Individual items on a restaurant's menu.
 */
const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Menu item name is required'],
    trim: true,
    maxlength: 150,
  },
  description: { type: String, trim: true, maxlength: 500 },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
  },
  category: { type: String, trim: true }, // e.g., "Starters", "Mains", "Desserts"
  image: { type: String, default: null },
  isVegetarian: { type: Boolean, default: false },
  isVegan: { type: Boolean, default: false },
  isGlutenFree: { type: Boolean, default: false },
  isAvailable: { type: Boolean, default: true },
  isFeatured: { type: Boolean, default: false },
  allergens: [{ type: String }],
  calories: { type: Number, default: null },
}, { _id: true });

/**
 * Menu Schema — A menu belongs to one Venue.
 * Multiple menus can exist per venue (e.g., "Lunch Menu", "Dinner Menu").
 */
const menuSchema = new mongoose.Schema(
  {
    venue: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Venue',
      required: [true, 'Venue reference is required'],
    },
    name: {
      type: String,
      trim: true,
      default: 'Main Menu',
    },
    description: { type: String, trim: true },
    items: [menuItemSchema],
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

// ─── Index ────────────────────────────────────────────────────────────────────
menuSchema.index({ venue: 1 });

module.exports = mongoose.model('Menu', menuSchema);
