require('dotenv').config();
const mongoose = require('mongoose');
const axios = require('axios');
const Venue = require('../models/Venue');
const { Cuisine, Category } = require('../models/Metadata');
const { buildRestaurantFeatureVector } = require('../services/cbf-pipeline');

const TARGET_COUNT = 500;

// Kathmandu Valley bounding box (south, west, north, east) — covers Kathmandu, Lalitpur, Bhaktapur.
const BBOX = [27.60, 85.20, 27.80, 85.50];

const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

// OSM `cuisine` tag values → this app's Cuisine collection names.
const OSM_CUISINE_MAP = {
  nepalese: 'Nepali', nepali: 'Nepali', local: 'Nepali', regional: 'Nepali',
  newari: 'Newari',
  indian: 'Indian', curry: 'Indian',
  korean: 'Korean',
  japanese: 'Japanese', sushi: 'Japanese',
  thai: 'Thai',
  tibetan: 'Tibetan', momo: 'Tibetan',
  chinese: 'Chinese', noodles: 'Chinese',
  asian: 'Asian',
  italian: 'Italian', pizza: 'Italian', pasta: 'Italian',
  international: 'Continental', american: 'Continental', breakfast: 'Continental',
  coffee_shop: 'Continental', cake: 'Continental', ice_cream: 'Continental',
  burger: 'Continental', sandwich: 'Continental', chicken: 'Continental',
  fish_and_chips: 'Continental', sausage: 'Continental', diner: 'Continental',
  tea: 'Continental', juice: 'Continental',
};

// Name-keyword → cuisine, used when the OSM cuisine tag is missing.
const NAME_KEYWORD_MAP = [
  [/moma|momo/i, 'Tibetan'],
  [/newari|newar/i, 'Newari'],
  [/thakali|nepali|nepalese|bhanchha|bhansa|daal ?bhat/i, 'Nepali'],
  [/tibet/i, 'Tibetan'],
  [/pizza|italian|pasta/i, 'Italian'],
  [/sushi|japan|ramen/i, 'Japanese'],
  [/korea/i, 'Korean'],
  [/thai/i, 'Thai'],
  [/chinese|china|wok|noodle/i, 'Chinese'],
  [/indian|curry|tandoor|masala/i, 'Indian'],
  [/asian/i, 'Asian'],
];

const AMENITY_CATEGORY_MAP = {
  restaurant: 'Casual Dining',
  cafe: 'Cafe',
  fast_food: 'Fast Food',
  bar: 'Pub',
  pub: 'Pub',
};

function inferCuisineName(tags) {
  const osmCuisine = (tags.cuisine || '').toLowerCase();
  for (const part of osmCuisine.split(';')) {
    const trimmed = part.trim();
    if (OSM_CUISINE_MAP[trimmed]) return OSM_CUISINE_MAP[trimmed];
  }

  const name = tags.name || '';
  for (const [pattern, cuisine] of NAME_KEYWORD_MAP) {
    if (pattern.test(name)) return cuisine;
  }

  return 'Continental';
}

function inferCity(lat, lng, tags) {
  if (tags['addr:city']) return tags['addr:city'];
  // Rough valley sub-region split by longitude/latitude bands.
  if (lat < 27.66) return 'Bhaktapur';
  if (lng < 85.30 && lat < 27.70) return 'Lalitpur';
  return 'Kathmandu';
}

function dedupeKey(name, lat, lng) {
  const roundedLat = Math.round(lat * 200) / 200; // ~500m grid
  const roundedLng = Math.round(lng * 200) / 200;
  return `${name.toLowerCase().trim()}|${roundedLat}|${roundedLng}`;
}

async function fetchOSMVenues() {
  const query = `
    [out:json][timeout:120];
    (
      nwr["amenity"~"restaurant|cafe|fast_food|bar|pub"]["name"](${BBOX.join(',')});
    );
    out center tags;
  `;
  const params = new URLSearchParams();
  params.append('data', query);

  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    for (const url of OVERPASS_URLS) {
      try {
        const res = await axios.post(url, params.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Accept': 'application/json',
            'User-Agent': 'RestroNet/1.0 (https://restronet.com)',
          },
          timeout: 120000,
        });
        return res.data.elements || [];
      } catch (err) {
        lastError = err;
        console.warn(`Overpass ${url} failed (attempt ${attempt}): ${err.response?.status || err.message}`);
      }
    }
    if (attempt < 3) {
      const waitSec = attempt * 30;
      console.log(`All servers failed; retrying in ${waitSec}s...`);
      await new Promise(r => setTimeout(r, waitSec * 1000));
    }
  }
  throw new Error(`All Overpass servers unreachable after retries: ${lastError?.response?.status || lastError?.message}`);
}

function selectDiverseSubset(venues, targetCount) {
  const byCuisine = {};
  for (const v of venues) {
    byCuisine[v.cuisineName] = byCuisine[v.cuisineName] || [];
    byCuisine[v.cuisineName].push(v);
  }

  const cuisineNames = Object.keys(byCuisine);
  const selected = [];
  let round = 0;
  while (selected.length < targetCount) {
    let addedAny = false;
    for (const name of cuisineNames) {
      const bucket = byCuisine[name];
      if (bucket[round]) {
        selected.push(bucket[round]);
        addedAny = true;
        if (selected.length >= targetCount) break;
      }
    }
    round++;
    if (!addedAny) break;
  }
  return selected;
}

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/restronet');
    console.log('Connected to MongoDB');

    const allCuisines = await Cuisine.find({}).lean();
    const cuisineByName = Object.fromEntries(allCuisines.map(c => [c.name, c._id]));
    const allCategories = await Category.find({}).lean();
    const categoryByName = Object.fromEntries(allCategories.map(c => [c.name, c._id]));
    const defaultCategory = categoryByName['Casual Dining'] || allCategories[0]?._id;

    console.log('Fetching restaurants from OpenStreetMap (Kathmandu Valley)...');
    const elements = await fetchOSMVenues();
    console.log(`Fetched ${elements.length} raw OSM elements`);

    const existingOsmIds = new Set((await Venue.find({}, 'osmId').lean()).map(v => v.osmId).filter(Boolean));
    const existingNames = new Set((await Venue.find({}, 'name').lean()).map(v => v.name.toLowerCase()));

    const seen = new Set();
    const candidates = [];

    for (const el of elements) {
      const tags = el.tags || {};
      const name = tags.name?.trim();
      if (!name) continue;
      if (existingNames.has(name.toLowerCase())) continue;

      const lat = el.lat || el.center?.lat;
      const lng = el.lon || el.center?.lon;
      if (!lat || !lng) continue;

      const osmId = el.id.toString();
      if (existingOsmIds.has(osmId)) continue;

      const dupeKey = dedupeKey(name, lat, lng);
      if (seen.has(dupeKey)) continue;
      seen.add(dupeKey);

      const cuisineName = inferCuisineName(tags);
      const amenity = (tags.amenity || 'restaurant').split(';')[0];
      const categoryName = AMENITY_CATEGORY_MAP[amenity] || 'Casual Dining';
      const city = inferCity(lat, lng, tags);

      candidates.push({
        osmId,
        name,
        lat,
        lng,
        cuisineName,
        categoryName,
        city,
        street: tags['addr:street'] || tags['addr:full'] || '',
        phone: tags.phone || tags['contact:phone'] || '',
        website: tags.website || tags['contact:website'] || '',
      });
    }

    console.log(`${candidates.length} new, deduplicated candidates found`);

    const selected = selectDiverseSubset(candidates, TARGET_COUNT);
    console.log(`Selected ${selected.length} venues for import (cuisine-diverse sampling)`);

    let importedCount = 0;
    for (const c of selected) {
      const cuisineId = cuisineByName[c.cuisineName];
      const categoryId = categoryByName[c.categoryName] || defaultCategory;

      try {
        const venue = await Venue.create({
          name: c.name,
          description: `A ${c.cuisineName.toLowerCase()} restaurant in ${c.city}, discovered via OpenStreetMap.`,
          address: {
            street: c.street || 'Unknown Street',
            city: c.city,
            country: 'Nepal',
          },
          location: { type: 'Point', coordinates: [c.lng, c.lat] },
          category: categoryId,
          cuisines: cuisineId ? [cuisineId] : [],
          phone: c.phone,
          website: c.website,
          priceRange: 2,
          osmId: c.osmId,
          source: 'osm',
          isActive: true,
        });
        buildRestaurantFeatureVector(venue._id).catch(() => {});
        importedCount++;
      } catch (err) {
        console.error(`Failed to import ${c.name}:`, err.message);
      }
    }

    console.log(`Done. Imported ${importedCount} new venues.`);
    process.exit(0);
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
};

run();
