require('dotenv').config();
const mongoose = require('mongoose');
const Venue = require('../models/Venue');
const Menu = require('../models/Menu');
const Review = require('../models/Review');
const Favorite = require('../models/Favorite');
const Reservation = require('../models/Reservation');
const RestaurantFeature = require('../models/RestaurantFeature');

// Non-restaurant listings that slipped through the OSM amenity filter.
const NON_RESTAURANT_NAMES = [
  '7.9 food blog',
  'Bhadrakali Dairy Farm',
  'Dakshinkali Resort',
  'eastern village de resort',
];

const normalizeForDedupe = (name) =>
  name
    .toLowerCase()
    .replace(/['']/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

async function deleteVenues(ids, label) {
  if (ids.length === 0) return;
  const [menuRes, reviewRes, favRes, resvRes, featRes] = await Promise.all([
    Menu.deleteMany({ venue: { $in: ids } }),
    Review.deleteMany({ venue: { $in: ids } }),
    Favorite.deleteMany({ venue: { $in: ids } }),
    Reservation.deleteMany({ venue: { $in: ids } }),
    RestaurantFeature.deleteMany({ venue: { $in: ids } }),
  ]);
  const venueRes = await Venue.deleteMany({ _id: { $in: ids } });
  console.log(`[${label}] Deleted:`, {
    venues: venueRes.deletedCount,
    menus: menuRes.deletedCount,
    reviews: reviewRes.deletedCount,
    favorites: favRes.deletedCount,
    reservations: resvRes.deletedCount,
    featureVectors: featRes.deletedCount,
  });
}

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/restronet');
    console.log('Connected to MongoDB');

    // 1. Remove non-restaurant listings.
    const nonRestaurants = await Venue.find({ name: { $in: NON_RESTAURANT_NAMES } }, '_id name').lean();
    await deleteVenues(nonRestaurants.map(v => v._id), 'non-restaurant');

    // 2. Collapse duplicate names (same normalized name → keep the oldest, drop the rest).
    const venues = await Venue.find({}, 'name createdAt').sort({ createdAt: 1 }).lean();
    const groups = {};
    for (const v of venues) {
      const key = normalizeForDedupe(v.name);
      groups[key] = groups[key] || [];
      groups[key].push(v);
    }

    const dupeIdsToRemove = [];
    for (const key of Object.keys(groups)) {
      const group = groups[key];
      if (group.length > 1) {
        const [, ...rest] = group; // keep first (oldest), remove the rest
        console.log(`Duplicate group "${key}": keeping "${group[0].name}" (${group[0]._id}), removing ${rest.length}`);
        dupeIdsToRemove.push(...rest.map(v => v._id));
      }
    }
    await deleteVenues(dupeIdsToRemove, 'duplicates');

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
