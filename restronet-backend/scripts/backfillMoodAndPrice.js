require('dotenv').config();
const mongoose = require('mongoose');
const Venue = require('../models/Venue');
const { Category, Tag } = require('../models/Metadata');

// Category name → mood id(s). Mirrors CATEGORY_MOOD_MAP in seedRealData.js —
// kept separate because this script infers from *stored* Venue fields
// (category/tags/name), not raw OSM tags, which aren't persisted on Venue.
const CATEGORY_MOOD_MAP = {
  'Fine Dining': ['luxury'],
  'Cafe': ['cafe', 'work-friendly'],
  'Restro-Bar': ['nightlife'],
  'Fast Food': ['casual'],
  'Bakery': ['cafe'],
  'Bistro': ['casual'],
  'Casual Dining': ['casual'],
  'Pub': ['nightlife'],
};

const TAG_MOOD_MAP = {
  'Romantic': 'romantic',
  'Family Friendly': 'family-friendly',
  'Wifi': 'work-friendly',
  'Quiet': 'work-friendly',
  'Rooftop': 'aesthetic',
  'Live Music': 'nightlife',
  'Late Night': 'nightlife',
  'Outdoor Seating': 'aesthetic',
  'Pet Friendly': 'family-friendly',
};

const NAME_MOOD_KEYWORD_MAP = [
  [/rooftop|terrace|view/i, 'aesthetic'],
  [/fine dining|gourmet|premium|luxury/i, 'luxury'],
  [/family/i, 'family-friendly'],
  [/romantic|candlelight/i, 'romantic'],
  [/lounge|club|night|pub|bar/i, 'nightlife'],
  [/cafe|coffee|bakery/i, 'cafe'],
];

// OSM doesn't reliably carry a price tier — approximate from category, same
// bands used at import time. Only applied where priceRange still sits at the
// old universal-default value of 2 (ambiguous: could be a real Mid-tier
// venue, or an unset OSM import) AND the venue has no other price signal.
const CATEGORY_PRICE_MAP = {
  'Fast Food': 1,
  'Cafe': 2,
  'Bakery': 2,
  'Bistro': 2,
  'Casual Dining': 2,
  'Restro-Bar': 3,
  'Pub': 3,
  'Fine Dining': 4,
};

function inferMood(venue, categoryName, tagNames) {
  const moods = new Set();
  (CATEGORY_MOOD_MAP[categoryName] || []).forEach(m => moods.add(m));
  tagNames.forEach(t => { if (TAG_MOOD_MAP[t]) moods.add(TAG_MOOD_MAP[t]); });
  for (const [pattern, moodId] of NAME_MOOD_KEYWORD_MAP) {
    if (pattern.test(venue.name)) moods.add(moodId);
  }
  if (venue.priceRange >= 4) moods.add('luxury');
  if (moods.size === 0) moods.add('casual');
  return [...moods];
}

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/restronet');
    console.log('Connected to MongoDB');

    const categories = await Category.find({}).lean();
    const categoryById = Object.fromEntries(categories.map(c => [c._id.toString(), c.name]));
    const tags = await Tag.find({}).lean();
    const tagById = Object.fromEntries(tags.map(t => [t._id.toString(), t.name]));

    // Only backfill venues genuinely missing mood — never overwrite mood
    // that was already set (e.g. by an owner via the dashboard).
    const venues = await Venue.find({
      $or: [{ mood: { $exists: false } }, { mood: { $size: 0 } }],
    });
    console.log(`${venues.length} venues missing mood`);

    let moodUpdated = 0;
    let priceUpdated = 0;

    for (const venue of venues) {
      const categoryName = venue.category ? categoryById[venue.category.toString()] : null;
      const tagNames = (venue.tags || []).map(id => tagById[id.toString()]).filter(Boolean);

      venue.mood = inferMood(venue, categoryName, tagNames);
      moodUpdated++;

      // Only touch priceRange when it's the ambiguous OSM-default AND the
      // venue actually came from the OSM importer (source: 'osm') — manual
      // venues with priceRange 2 are real data, not a placeholder.
      if (venue.source === 'osm' && venue.priceRange === 2 && categoryName && CATEGORY_PRICE_MAP[categoryName]) {
        venue.priceRange = CATEGORY_PRICE_MAP[categoryName];
        priceUpdated++;
      }

      await venue.save();
    }

    console.log(`Done. Backfilled mood on ${moodUpdated} venues, refined priceRange on ${priceUpdated} venues.`);
    process.exit(0);
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
};

run();
