require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Venue = require('../models/Venue');
const Review = require('../models/Review');
const Favorite = require('../models/Favorite');
const Interaction = require('../models/Interaction');
const Reservation = require('../models/Reservation');
const { Cuisine, Tag } = require('../models/Metadata');

/**
 * One-shot demo reset for the defense build.
 *
 *  1. Fills Venue.mood on every venue (inferred from category + tags + name + price).
 *  2. Deletes ALL restaurant owners (keeps the single superadmin).
 *  3. Deletes ALL human user accounts and their reviews/favorites/interactions/
 *     reservations. KEEPS the 15 `*@restronet-seed.local` review-author fixtures
 *     so every venue keeps its ratings and the admin review screens stay populated.
 *  4. Creates 4 owners, each assigned one venue.
 *  5. Creates 3 demo users with distinct explicit preferences + a few implicit
 *     signals so their Discover feeds are personalised from first load.
 *  6. Writes DEMO_ACCOUNTS.md at the repo root.
 *
 * Run:  SEED_CONFIRM=yes node scripts/resetDemoData.js
 */

const OWNER_PASSWORD = 'RestroOwner@26';
const USER_PASSWORD  = 'RestroDiner@26';
const SEED_DOMAIN    = '@restronet-seed.local';

// ─── mood inference ──────────────────────────────────────────────────────────
const CATEGORY_MOOD = {
  'Fine Dining': ['luxury'],
  'Cafe': ['cafe', 'work-friendly'],
  'Bakery': ['cafe'],
  'Bistro': ['casual'],
  'Casual Dining': ['casual'],
  'Fast Food': ['casual'],
  'Restro-Bar': ['nightlife'],
  'Pub': ['nightlife'],
};
const TAG_MOOD = {
  'Romantic': 'romantic',
  'Family Friendly': 'family-friendly',
  'Pet Friendly': 'family-friendly',
  'Vegan Options': 'cafe',
  'Wifi': 'work-friendly',
  'Quiet': 'work-friendly',
  'Rooftop': 'aesthetic',
  'Rooftop View': 'aesthetic',
  'Outdoor Seating': 'aesthetic',
  'Live Music': 'nightlife',
  'Late Night': 'nightlife',
};
const CUISINE_MOOD = {
  Italian: 'romantic', Japanese: 'aesthetic', Newari: 'family-friendly',
  Nepali: 'family-friendly', Korean: 'casual', Thai: 'casual', Tibetan: 'casual',
};
const NAME_MOOD = [
  [/rooftop|terrace|view/i, 'aesthetic'],
  [/fine dining|gourmet|premium|luxury/i, 'luxury'],
  [/family/i, 'family-friendly'],
  [/romantic|candlelight/i, 'romantic'],
  [/lounge|club|night|pub|bar/i, 'nightlife'],
  [/cafe|coffee|bakery/i, 'cafe'],
];

function inferMood(name, categoryName, tagNames, cuisineNames, priceRange) {
  const moods = new Set();
  (CATEGORY_MOOD[categoryName] || []).forEach(m => moods.add(m));
  tagNames.forEach(t => { if (TAG_MOOD[t]) moods.add(TAG_MOOD[t]); });
  cuisineNames.forEach(c => { if (CUISINE_MOOD[c]) moods.add(CUISINE_MOOD[c]); });
  for (const [re, m] of NAME_MOOD) if (re.test(name)) moods.add(m);
  if (priceRange >= 4) moods.add('luxury');
  if (moods.size === 0) moods.add('casual');
  // keep it to at most 3 so the label stays meaningful
  return [...moods].slice(0, 3);
}

// ─── demo owners ─────────────────────────────────────────────────────────────
const OWNERS = [
  { name: 'Ramesh Shakya',   email: 'ramesh.shakya.owner@restronet.com',  venue: 'Pizza World' },
  { name: 'Sunita Tuladhar', email: 'sunita.tuladhar.owner@restronet.com', venue: 'Le Sherpa' },
  { name: 'Deepak Gurung',   email: 'deepak.gurung.owner@restronet.com',   venue: 'Fire And Ice Pizzeria' },
  { name: 'Anjana Rai',      email: 'anjana.rai.owner@restronet.com',      venue: 'Bricks Cafe' },
];

// ─── demo users ──────────────────────────────────────────────────────────────
const USERS = [
  {
    name: 'Prashanna Manandhar', email: 'prashanna.demo@restronet.com',
    taste: 'Traditional local food, budget-conscious, walks everywhere in the Thamel core.',
    prefs: { cuisines: ['Nepali', 'Newari'], tags: ['Family Friendly', 'Budget Friendly'],
             priceRange: 2, maxDistanceKm: 3, mealTypes: ['lunch', 'dinner'] },
    location: [85.3110, 27.7145],
    reviews: [
      ['Bhojan Griha', 5, 'The Newari thali here is the real thing. My go-to for guests.'],
      ['Utsav Authentic Nepali Restaurant', 5, 'Authentic, generous portions, fair price.'],
      ['Yangling Tibetan Restaurant', 4, 'Cheap and fast momo, exactly what I want on a weekday.'],
      ['Le Sherpa', 2, 'Lovely garden but far too expensive for everyday eating.'],
    ],
    favorites: ['Krishnarpan Restaurant'],
    interactions: [['Third Eye Restaurant', 'click'], ['Gokarna House Restaurant', 'click'],
                   ['Vesper House', 'dismiss']],
  },
  {
    name: 'Isha Pradhan', email: 'isha.demo@restronet.com',
    taste: 'Fine dining and date nights, mixes Continental / Italian / Japanese, will travel across the valley.',
    prefs: { cuisines: ['Continental', 'Italian', 'Japanese'], tags: ['Romantic', 'Fine Dining'],
             priceRange: 4, maxDistanceKm: 12, mealTypes: ['dinner'] },
    location: [85.3240, 27.7172],
    reviews: [
      ['The Old House', 5, 'Still the benchmark for a special occasion in Kathmandu.'],
      ['Vesper House', 5, 'Beautiful room and a proper wine list. Worth the drive to Lalitpur.'],
      ['Dan Ran', 4, 'Best Japanese in the valley, only the wait held it back.'],
      ['Yangling Tibetan Restaurant', 3, 'Fine for a quick bite but too basic for what I look for.'],
    ],
    favorites: ['Le Sherpa', 'Yin Yang Restaurant'],
    interactions: [['Kathmandu Steak House', 'click'], ['Bricks Cafe', 'click'],
                   ['Mezesh Restaurant & Bar', 'view']],
  },
  {
    name: 'Kevin Lama', email: 'kevin.demo@restronet.com',
    taste: 'Pan-Asian (Japanese / Korean / Thai / Chinese), mid-price, cafe-hopper who eats outdoors.',
    prefs: { cuisines: ['Japanese', 'Korean', 'Thai', 'Chinese'], tags: ['Outdoor Seating', 'Vegan Options'],
             priceRange: 3, maxDistanceKm: 8, mealTypes: ['brunch', 'all-day'] },
    location: [85.3200, 27.7100],
    reviews: [
      ['Dan Ran', 5, 'Consistent, fresh, great outdoor tables.'],
      ['Hankook Sarang', 5, 'Proper Korean BBQ, the banchan spread is generous.'],
      ['Utse Restaurant', 4, 'Solid Tibetan-Chinese, good value for the portion.'],
      ['Yin Yang Restaurant', 4, 'Reliable Thai, the green curry is the pick.'],
    ],
    favorites: ['Rosemary Kitchen & Coffee Shop'],
    interactions: [['Yangling Tibetan Restaurant', 'click'], ['Trisara', 'click'],
                   ['Evoke Cafe & Bistro', 'view']],
  },
];

async function venueByName(name) {
  const v = await Venue.findOne({ name });
  if (!v) throw new Error(`Venue not found: ${name}`);
  return v;
}

(async () => {
  if (process.env.SEED_CONFIRM !== 'yes') {
    console.error('Refusing to run. Re-run with:  SEED_CONFIRM=yes node scripts/resetDemoData.js');
    process.exit(1);
  }
  await mongoose.connect(process.env.MONGO_URI);
  console.log('connected');

  // ── 1. mood backfill ──────────────────────────────────────────────────────
  const venues = await Venue.find({}).populate('cuisines', 'name').populate('tags', 'name').populate('category', 'name');
  for (const v of venues) {
    v.mood = inferMood(
      v.name,
      v.category?.name || null,
      (v.tags || []).map(t => t.name),
      (v.cuisines || []).map(c => c.name),
      v.priceRange,
    );
    await v.save();
  }
  console.log(`mood filled on ${venues.length} venues`);

  // ── 2. wipe humans + owners ───────────────────────────────────────────────
  const keep = await User.find({ email: { $regex: `${SEED_DOMAIN}$`, $options: 'i' } }).select('_id');
  const keepIds = keep.map(u => u._id);
  const doomed = await User.find({ _id: { $nin: keepIds } }).select('_id');
  const doomedIds = doomed.map(u => u._id);

  await Promise.all([
    Review.deleteMany({ user: { $in: doomedIds } }),
    Favorite.deleteMany({ user: { $in: doomedIds } }),
    Interaction.deleteMany({ user: { $in: doomedIds } }),
    Reservation.deleteMany({ user: { $in: doomedIds } }),
  ]);
  await User.deleteMany({ _id: { $in: doomedIds } });
  await Admin.deleteMany({ role: 'owner' });
  await Venue.updateMany({}, { $set: { owner: null } });
  console.log(`deleted ${doomedIds.length} users (kept ${keepIds.length} review fixtures) + all owners`);

  // ── 3. owners ─────────────────────────────────────────────────────────────
  const ownerRows = [];
  for (const o of OWNERS) {
    const admin = await Admin.create({ name: o.name, email: o.email, password: OWNER_PASSWORD, role: 'owner', emailNotifications: false });
    const v = await venueByName(o.venue);
    v.owner = admin._id;
    await v.save();
    ownerRows.push({ ...o });
  }
  console.log(`created ${ownerRows.length} owners`);

  // ── 4. users ──────────────────────────────────────────────────────────────
  const userRows = [];
  for (const spec of USERS) {
    const cz = await Cuisine.find({ name: { $in: spec.prefs.cuisines } });
    const tg = await Tag.find({ name: { $in: spec.prefs.tags } });
    const user = await User.create({
      name: spec.name, email: spec.email, password: USER_PASSWORD, emailNotifications: false,
      location: { type: 'Point', coordinates: spec.location },
      preferences: {
        cuisines: cz.map(c => c._id), tags: tg.map(t => t._id),
        priceRange: spec.prefs.priceRange, maxDistanceKm: spec.prefs.maxDistanceKm,
        mealTypes: spec.prefs.mealTypes,
      },
    });

    let age = 3;
    for (const [name, overall, comment] of spec.reviews) {
      const v = await venueByName(name);
      const when = new Date(Date.now() - age * 86400000);
      await Review.create({ venue: v._id, user: user._id, rating: { overall }, comment, createdAt: when, updatedAt: when });
      age += 4;
    }
    for (const name of spec.favorites) {
      const v = await venueByName(name);
      await Favorite.create({ user: user._id, venue: v._id });
    }
    for (const [name, type] of spec.interactions) {
      const v = await venueByName(name);
      await Interaction.create({ user: user._id, venue: v._id, type });
    }
    userRows.push(spec);
  }
  console.log(`created ${userRows.length} users`);

  // ── 5. sheet ──────────────────────────────────────────────────────────────
  const L = [];
  L.push('# RestroNet — Demo Accounts');
  L.push('');
  L.push('_Generated by `scripts/resetDemoData.js`. Superadmin unchanged: `admin@restronet.com` / `password123`._');
  L.push('');
  L.push('## Restaurant Owners');
  L.push('');
  L.push(`All owner passwords: \`${OWNER_PASSWORD}\`  (admin login page)`);
  L.push('');
  L.push('| Name | Email | Password | Owned Restaurant |');
  L.push('|---|---|---|---|');
  ownerRows.forEach(o => L.push(`| ${o.name} | ${o.email} | ${OWNER_PASSWORD} | ${o.venue} |`));
  L.push('');
  L.push('## Users');
  L.push('');
  L.push(`All user passwords: \`${USER_PASSWORD}\``);
  L.push('');
  L.push('| Name | Email | Password | Price tier | Max distance | Cuisines | Mood/tags | Taste in one line |');
  L.push('|---|---|---|---|---|---|---|---|');
  userRows.forEach(u => L.push(
    `| ${u.name} | ${u.email} | ${USER_PASSWORD} | ${u.prefs.priceRange} | ${u.prefs.maxDistanceKm} km | ${u.prefs.cuisines.join(', ')} | ${u.prefs.tags.join(', ')} | ${u.taste} |`
  ));
  L.push('');
  L.push('### What each user should see on Discover');
  L.push('');
  userRows.forEach(u => {
    L.push(`- **${u.name}** — 5★/4★ reviews on ${u.reviews.filter(r => r[1] >= 4).map(r => r[0]).join(', ')}; ` +
      `low/negative on ${u.reviews.filter(r => r[1] <= 3).map(r => r[0]).join(', ') || 'none'}; ` +
      `favourites ${u.favorites.join(', ')}. Feed should lead with ${u.prefs.cuisines.slice(0, 2).join('/')} venues in the ${u.prefs.priceRange <= 2 ? 'lower' : 'upper'} price tiers.`);
  });
  L.push('');

  const out = path.join(__dirname, '..', '..', 'DEMO_ACCOUNTS.md');
  fs.writeFileSync(out, L.join('\n'));
  console.log(`wrote ${out}`);

  await mongoose.disconnect();
  console.log('done');
})().catch(e => { console.error(e); process.exit(1); });
