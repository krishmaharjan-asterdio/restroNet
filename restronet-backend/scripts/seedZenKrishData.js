require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

require('../models/Metadata');
const User = require('../models/User');
const Venue = require('../models/Venue');
const Review = require('../models/Review');
const Favorite = require('../models/Favorite');
const Interaction = require('../models/Interaction');
const Reservation = require('../models/Reservation');
const { Cuisine, Tag } = require('../models/Metadata');

/**
 * Seeds two demo diners — `krish` and `zen` — with deliberately opposite
 * tastes, each carrying a full behavioural history so the recommendation
 * engine has real signal to personalise from on first login:
 *
 *   ~12 reviews  (mix of on-profile 4-5★ and off-profile 1-2★ negatives)
 *    8 reservations (5 past `completed`, 3 upcoming `confirmed`)
 *   12 favorites (distinct on-profile venues)
 *   35 interactions (click / view on liked venues, dismiss on disliked)
 *
 * krish = local + budget (Nepali / Newari / Tibetan, family/casual, price 2).
 * zen   = cafe-hopper + remote worker (Japanese / Korean / Thai / Continental
 *         cafes, outdoor seating, price 3).
 *
 * Idempotent: deletes each user and all their reviews/favorites/reservations/
 * interactions, then rebuilds. Deterministic — no RNG — so re-runs are stable.
 *
 * Run:  SEED_CONFIRM=yes node scripts/seedZenKrishData.js
 */

const USER_PASSWORD = 'RestroDiner@26'; // same as scripts/resetDemoData.js demo users
const DAY = 86400000;

// ─── personas ────────────────────────────────────────────────────────────────
// review rows: [venueName, overall, comment] — on-profile rows first (recent),
// off-profile negatives last (older createdAt).
const PERSONAS = [
  {
    name: 'krish',
    email: 'krish.demo@restronet.com',
    taste: 'Local and budget-conscious — Nepali / Newari / Tibetan, family-run and casual, walks everywhere in the Thamel core.',
    location: [85.3110, 27.7145], // Thamel
    prefs: {
      cuisines: ['Nepali', 'Newari', 'Tibetan'],
      tags: ['Family Friendly', 'Budget Friendly'],
      priceRange: 2,
      maxDistanceKm: 3,
      mealTypes: ['lunch', 'dinner'],
    },
    contactPhone: '+9779800000011',
    reviews: [
      ['Bhojan Griha', 5, 'The Newari bhoj here is the real deal — I bring every out-of-town guest.'],
      ['Utsav Authentic Nepali Restaurant', 5, 'Proper Nepali thali, generous refills, staff treat you like family.'],
      ['Yangling Tibetan Restaurant', 5, 'My weekday canteen. Ten minutes, a plate of jhol momo, done.'],
      ['Krishnarpan Restaurant', 5, 'Special-occasion Newari tasting menu. Worth every rupee once a year.'],
      ['Utse Restaurant', 4, 'Solid Tibetan-Chinese, the thenthuk is comforting and the bill is always small.'],
      ['Gokarna House Restaurant', 4, 'Homely Nepali food, quiet garden, easy walk from home.'],
      ['Bawarchi', 4, 'Good honest curry and naan without the tourist markup.'],
      ['Third Eye Restaurant', 4, 'Reliable Indian-Nepali, the thakali set is the pick.'],
      ['Alina\'s Bakery Cafe', 4, 'Cheap morning chiya and a bun, does the job before work.'],
      ['Le Sherpa', 2, 'Pretty garden, but four times the price for food I do not crave. Not for me.'],
      ['Vesper House', 2, 'Everyone raves about it. I found it stiff and far too expensive.'],
      ['Kathmandu Steak House', 3, 'Fine if someone else is paying — a slab of steak is not my thing.'],
    ],
    // liked pool → reservations, favorites, positive interactions
    liked: [
      'Bhojan Griha', 'Utsav Authentic Nepali Restaurant', 'Yangling Tibetan Restaurant',
      'Utse Restaurant', 'Gokarna House Restaurant', 'Bawarchi', 'Third Eye Restaurant',
      'Krishnarpan Restaurant', 'Alina\'s Bakery Cafe', 'Pumpernickel Bakery',
      'OR2K', 'Pizza World',
    ],
    // disliked pool → dismiss interactions
    disliked: [
      'Le Sherpa', 'Vesper House', 'Kathmandu Steak House', 'The Old House',
      'Trisara', 'Electric Pagoda Bar', 'Mezesh Restaurant & Bar',
    ],
    reservationsPast: [
      'Bhojan Griha', 'Utsav Authentic Nepali Restaurant', 'Yangling Tibetan Restaurant',
      'Third Eye Restaurant', 'Utse Restaurant',
    ],
    reservationsUpcoming: ['Gokarna House Restaurant', 'Bawarchi', 'Krishnarpan Restaurant'],
  },
  {
    name: 'zen',
    email: 'zen.demo@restronet.com',
    taste: 'Cafe-hopper and remote worker — Japanese / Korean / Thai and continental cafes, outdoor seating, will travel across the valley for a good table.',
    location: [85.3240, 27.7172], // Lazimpat / Naxal
    prefs: {
      cuisines: ['Japanese', 'Korean', 'Thai', 'Continental'],
      tags: ['Outdoor Seating', 'Vegan Options'],
      priceRange: 3,
      maxDistanceKm: 10,
      mealTypes: ['brunch', 'all-day'],
    },
    contactPhone: '+9779800000022',
    reviews: [
      ['Dan Ran', 5, 'Best Japanese in the valley. Fresh, precise, and the outdoor tables are perfect for a slow brunch.'],
      ['Hankook Sarang', 5, 'Proper Korean BBQ, the banchan spread is generous and the staff keep the grill clean.'],
      ['Himalayan Java Coffee', 5, 'My default work spot — reliable wifi, strong flat white, nobody rushes you.'],
      ['Evoke Cafe & Bistro', 5, 'Bright room, good vegan options, laptop-friendly all afternoon.'],
      ['Yin Yang Restaurant', 4, 'Dependable Thai, the green curry is the order, courtyard seating is a bonus.'],
      ['Rosemary Kitchen & Coffee Shop', 4, 'Calm garden, decent Asian-continental menu, great for a long lunch meeting.'],
      ['Kaiser Cafe', 4, 'The garden setting is unmatched for an afternoon coffee and a book.'],
      ['The Yard by Oasis Garden Homes', 4, 'Quiet, leafy, plenty of outdoor seats — I get a lot of work done here.'],
      ['Roadhouse Cafe Thamel', 4, 'Wood-fired pizza and a laptop corner. Does both jobs well.'],
      ['Bhojan Griha', 2, 'Beautiful building but a heavy fixed menu I cannot sit and work through. Not my scene.'],
      ['Bawarchi', 2, 'Fine curry, but cramped and loud — impossible to linger or open a laptop.'],
      ['Electric Pagoda Bar', 3, 'Okay for one drink, too dark and loud for anything else.'],
    ],
    liked: [
      'Dan Ran', 'Hankook Sarang', 'Yin Yang Restaurant', 'Himalayan Java Coffee',
      'Evoke Cafe & Bistro', 'Rosemary Kitchen & Coffee Shop', 'Kaiser Cafe',
      'The Yard by Oasis Garden Homes', 'Roadhouse Cafe Thamel', 'Bricks Cafe',
      'Trisara', 'Fire And Ice Pizzeria',
    ],
    disliked: [
      'Bhojan Griha', 'Bawarchi', 'Electric Pagoda Bar', 'Yangling Tibetan Restaurant',
      'Utsav Authentic Nepali Restaurant', 'Gokarna House Restaurant', 'Krishnarpan Restaurant',
    ],
    reservationsPast: [
      'Dan Ran', 'Hankook Sarang', 'Yin Yang Restaurant', 'Himalayan Java Coffee',
      'Rosemary Kitchen & Coffee Shop',
    ],
    reservationsUpcoming: ['Evoke Cafe & Bistro', 'Kaiser Cafe', 'Roadhouse Cafe Thamel'],
  },
];

const RES_TIMES = ['13:00', '19:30', '12:30', '20:00', '18:30', '13:30', '19:00', '12:00'];

async function main() {
  if (process.env.SEED_CONFIRM !== 'yes') {
    console.error('Refusing to run. Re-run with:  SEED_CONFIRM=yes node scripts/seedZenKrishData.js');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/restronet');
  console.log('connected');

  // venue name → doc, for every active venue
  const venues = await Venue.find({ isActive: true }).lean();
  const venueByName = new Map(venues.map((v) => [v.name, v]));
  const resolve = (label, names) => {
    const out = [];
    for (const n of names) {
      const v = venueByName.get(n);
      if (v) out.push(v);
      else console.warn(`  ! ${label}: venue not found, skipping — "${n}"`);
    }
    return out;
  };

  const touchedVenueIds = new Set();
  const summaryRows = [];

  for (const p of PERSONAS) {
    console.log(`\n── ${p.name} ──`);

    // 1. wipe any previous run for this persona
    const existing = await User.findOne({ email: p.email });
    if (existing) {
      await Promise.all([
        Review.deleteMany({ user: existing._id }),
        Favorite.deleteMany({ user: existing._id }),
        Interaction.deleteMany({ user: existing._id }),
        Reservation.deleteMany({ user: existing._id }),
      ]);
      await User.deleteOne({ _id: existing._id });
      // venues that user had reviewed need a rating recalc after the wipe
      console.log('  cleared previous data');
    }

    // 2. resolve preference metadata ids
    const [cz, tg] = await Promise.all([
      Cuisine.find({ name: { $in: p.prefs.cuisines } }).lean(),
      Tag.find({ name: { $in: p.prefs.tags } }).lean(),
    ]);

    // 3. create the user (individual save → bcrypt pre-save hook runs)
    const user = await User.create({
      name: p.name,
      email: p.email,
      password: USER_PASSWORD,
      emailNotifications: false, // demo account — never send automated mail
      location: { type: 'Point', coordinates: p.location },
      preferences: {
        cuisines: cz.map((c) => c._id),
        tags: tg.map((t) => t._id),
        priceRange: p.prefs.priceRange,
        maxDistanceKm: p.prefs.maxDistanceKm,
        mealTypes: p.prefs.mealTypes,
      },
    });
    console.log(`  user created: ${user.email}`);

    // 4. reviews — Gemini moderation pre-save hook is disabled for the loop:
    //    it fires one API call per review, is slow, rate-limited, and can
    //    nondeterministically hide a row — none of which belongs in seed data.
    const savedKey = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;
    let reviewCount = 0;
    try {
      let ageDays = 4;
      for (const [venueName, overall, comment] of p.reviews) {
        const v = venueByName.get(venueName);
        if (!v) { console.warn(`  ! review: venue not found, skipping — "${venueName}"`); continue; }
        const when = new Date(Date.now() - ageDays * DAY);
        await Review.create({
          venue: v._id,
          user: user._id,
          rating: { overall },
          comment,
          createdAt: when,
          updatedAt: when,
        });
        touchedVenueIds.add(v._id.toString());
        reviewCount++;
        ageDays += 7; // spread reviews roughly weekly into the past
      }
    } finally {
      if (savedKey !== undefined) process.env.GEMINI_API_KEY = savedKey;
    }
    console.log(`  reviews: ${reviewCount}`);

    // 5. reservations — past `completed`, upcoming `confirmed`.
    //    All reminder / review-request flags pre-set so the automation cron
    //    never emails a seeded reservation.
    const past = resolve('reservation(past)', p.reservationsPast);
    const upcoming = resolve('reservation(upcoming)', p.reservationsUpcoming);
    let resCount = 0;
    for (let i = 0; i < past.length; i++) {
      const when = new Date(Date.now() - (10 + i * 15) * DAY);
      await Reservation.create({
        venue: past[i]._id, user: user._id,
        date: when, time: RES_TIMES[i % RES_TIMES.length], guests: 2,
        status: 'completed', contactPhone: p.contactPhone,
        reminderSent24h: true, reminderSent2h: true, reviewRequestSent: true,
      });
      resCount++;
    }
    for (let i = 0; i < upcoming.length; i++) {
      const when = new Date(Date.now() + (3 + i * 7) * DAY);
      await Reservation.create({
        venue: upcoming[i]._id, user: user._id,
        date: when, time: RES_TIMES[(i + 3) % RES_TIMES.length], guests: 2,
        status: 'confirmed', contactPhone: p.contactPhone,
        reminderSent24h: true, reminderSent2h: true, reviewRequestSent: true,
      });
      resCount++;
    }
    console.log(`  reservations: ${resCount} (${past.length} completed, ${upcoming.length} upcoming)`);

    // 6. favorites — 12 distinct liked venues
    const favVenues = resolve('favorite', p.liked).slice(0, 12);
    let favCount = 0;
    for (const v of favVenues) {
      try {
        await Favorite.create({ user: user._id, venue: v._id });
        favCount++;
      } catch (err) {
        if (err.code !== 11000) throw err;
      }
    }
    console.log(`  favorites: ${favCount}`);

    // 7. interactions — 35 total: 22 click + 8 view on liked, 5 dismiss on
    //    disliked. Spread over the last ~50 days (90-day TTL on the model).
    const liked = resolve('interaction(liked)', p.liked);
    const disliked = resolve('interaction(disliked)', p.disliked);
    const plan = [
      ...Array.from({ length: 22 }, (_, i) => ['click', liked[i % liked.length]]),
      ...Array.from({ length: 8 }, (_, i) => ['view', liked[(i + 3) % liked.length]]),
      ...Array.from({ length: 5 }, (_, i) => ['dismiss', disliked[i % disliked.length]]),
    ];
    let intCount = 0;
    for (let i = 0; i < plan.length; i++) {
      const [type, v] = plan[i];
      if (!v) continue;
      const when = new Date(Date.now() - (1 + i * 1.4) * DAY);
      await Interaction.create({ user: user._id, venue: v._id, type, createdAt: when });
      intCount++;
    }
    console.log(`  interactions: ${intCount}`);

    summaryRows.push({
      ...p,
      counts: { reviews: reviewCount, reservations: resCount, favorites: favCount, interactions: intCount },
      cuisineNames: cz.map((c) => c.name),
      tagNames: tg.map((t) => t.name),
    });
  }

  // 8. recalc ratings on every venue we added a review to (seed low-star
  //    reviews slightly move the venue average — this makes it consistent).
  for (const id of touchedVenueIds) {
    await Review.recalculateRating(new mongoose.Types.ObjectId(id));
  }
  console.log(`\nrecalculated ratings on ${touchedVenueIds.size} venues`);

  // 9. write the cheat-sheet (separate file — does not touch DEMO_ACCOUNTS.md)
  const L = [];
  L.push('# RestroNet — `zen` & `krish` Demo Diners');
  L.push('');
  L.push('_Generated by `restronet-backend/scripts/seedZenKrishData.js`. Re-run: `SEED_CONFIRM=yes node scripts/seedZenKrishData.js`._');
  L.push('');
  L.push(`Both passwords: \`${USER_PASSWORD}\``);
  L.push('');
  L.push('| Name | Email | Price tier | Max distance | Cuisines | Tags | Reviews | Reservations | Favorites | Interactions |');
  L.push('|---|---|---|---|---|---|---|---|---|---|');
  for (const r of summaryRows) {
    L.push(`| ${r.name} | ${r.email} | ${r.prefs.priceRange} | ${r.prefs.maxDistanceKm} km | ${r.cuisineNames.join(', ')} | ${r.tagNames.join(', ')} | ${r.counts.reviews} | ${r.counts.reservations} | ${r.counts.favorites} | ${r.counts.interactions} |`);
  }
  L.push('');
  for (const r of summaryRows) {
    L.push(`## ${r.name}`);
    L.push('');
    L.push(`_${r.taste}_`);
    L.push('');
    L.push(`- **Loved (4–5★):** ${r.reviews.filter((x) => x[1] >= 4).map((x) => x[0]).join(', ')}`);
    L.push(`- **Disliked (1–2★):** ${r.reviews.filter((x) => x[1] <= 2).map((x) => x[0]).join(', ') || 'none'}`);
    L.push(`- **Upcoming reservations:** ${r.reservationsUpcoming.join(', ')}`);
    L.push(`- **Expected Discover feed:** leads with ${r.prefs.cuisines.slice(0, 3).join(' / ')} venues around the ${r.prefs.priceRange <= 2 ? 'lower' : 'middle/upper'} price tiers; the disliked venues above are pushed down by the negative affinity signal.`);
    L.push('');
  }

  const out = path.join(__dirname, '..', '..', 'DEMO_ZEN_KRISH.md');
  fs.writeFileSync(out, L.join('\n'));
  console.log(`wrote ${out}`);

  await mongoose.disconnect();
  console.log('done');
}

main().catch((e) => { console.error(e); process.exit(1); });
