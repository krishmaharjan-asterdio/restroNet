require('dotenv').config();
const mongoose = require('mongoose');
const Venue = require('../models/Venue');
const Menu = require('../models/Menu');
const Review = require('../models/Review');
const Favorite = require('../models/Favorite');
const Reservation = require('../models/Reservation');
const RestaurantFeature = require('../models/RestaurantFeature');

// Matches generic/local eatery naming patterns (Newari khaja ghar, momo
// house/center, fast food, bhojanalaya, guest house, tea shop, tandoori
// fast-food combos, sweet shops, tea stalls, small lodges) — not the kind
// of named restaurant/cafe this app curates.
const GENERIC_PATTERNS = [
  /khaja\s*ghar/i,
  /khajaghar/i,
  /\bmomo\s*(center|corner|house|hut)?\s*$/i,
  /^momo\b/i,
  /\bfast\s*food\b/i,
  /\bfastfood\b/i,
  /bhojanalaya/i,
  /\btea\s*shop\b/i,
  /\bguest\s*house\b/i,
  /\btandoori\b.*\bfast\b/i,
  /\bpasal\b/i,
  /\bmithai\b/i,
  /food\s*court/i,
  /\bhotel\b/i,
  /\bcorner\b/i,
  /\bstore\b/i,
];

// Venue names with no Latin characters at all (e.g. Devanagari-only, no
// English name tag in OSM) aren't presentable in a curated English-first UI.
const isNonLatinOnly = (name) => !/[A-Za-z]/.test(name);

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/restronet');
    console.log('Connected to MongoDB');

    const venues = await Venue.find({}, 'name').lean();
    const toRemove = venues.filter(
      v => GENERIC_PATTERNS.some(p => p.test(v.name)) || isNonLatinOnly(v.name)
    );
    console.log(`Found ${toRemove.length} generic/local/non-Latin venues to remove`);

    const ids = toRemove.map(v => v._id);

    const [menuRes, reviewRes, favRes, resvRes, featRes] = await Promise.all([
      Menu.deleteMany({ venue: { $in: ids } }),
      Review.deleteMany({ venue: { $in: ids } }),
      Favorite.deleteMany({ venue: { $in: ids } }),
      Reservation.deleteMany({ venue: { $in: ids } }),
      RestaurantFeature.deleteMany({ venue: { $in: ids } }),
    ]);
    const venueRes = await Venue.deleteMany({ _id: { $in: ids } });

    console.log('Deleted:', {
      venues: venueRes.deletedCount,
      menus: menuRes.deletedCount,
      reviews: reviewRes.deletedCount,
      favorites: favRes.deletedCount,
      reservations: resvRes.deletedCount,
      featureVectors: featRes.deletedCount,
    });

    const remaining = await Venue.countDocuments();
    console.log('Venues remaining:', remaining);

    console.log('Done.');
    process.exit(0);
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
};

run();
