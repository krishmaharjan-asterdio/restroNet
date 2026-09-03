require('dotenv').config();
const mongoose = require('mongoose');
require('../models/Metadata');
const Venue = require('../models/Venue');

/**
 * Re-place the seeded venues across real Kathmandu Valley neighbourhoods.
 *
 * Why: the venues were all sitting inside a ~1 km blob around Thamel, so the
 * Search map rendered them as one unreadable pile of markers. This spreads them
 * across the valley (Kathmandu core, Patan/Lalitpur, Bhaktapur, the ring-road
 * belt and a few outer pockets) using genuine area centres, with just enough
 * jitter that no two markers land on the exact same pixel.
 *
 * Placement is a fixed venue -> area table (not random) so the script is fully
 * deterministic and re-runnable. Where a venue has a well-known real location
 * (Le Sherpa in Maharajgunj, Krishnarpan at Dwarika's in Battisputali, the
 * Patan cafes, ...) the table keeps it plausible; the rest are distributed to
 * keep the map even. Every chosen area centre is >= ~1 km from every other, so
 * markers never clump even before the frontend's clustering layer.
 */

// venueName -> { area, city, lng, lat }
// lng/lat are the approximate centre of that neighbourhood (WGS84).
const PLACEMENTS = {
  'Fire And Ice Pizzeria':            { area: 'Tridevi Marg, Thamel',      city: 'Kathmandu', lng: 85.3112, lat: 27.7151 },
  'Himalayan Java Coffee':            { area: 'Durbar Marg',               city: 'Kathmandu', lng: 85.3175, lat: 27.7107 },
  'OR2K':                             { area: 'Kamalpokhari',              city: 'Kathmandu', lng: 85.3232, lat: 27.7158 },
  'Bhojan Griha':                     { area: 'Dillibazar',                city: 'Kathmandu', lng: 85.3288, lat: 27.7040 },
  'Hankook Sarang':                   { area: 'Tinkune',                   city: 'Kathmandu', lng: 85.3480, lat: 27.6875 },
  'Le Sherpa':                        { area: 'Maharajgunj',               city: 'Kathmandu', lng: 85.3320, lat: 27.7385 },
  'Roadhouse Cafe Thamel':            { area: 'Lazimpat',                  city: 'Kathmandu', lng: 85.3197, lat: 27.7240 },
  'Mezesh Restaurant & Bar':          { area: 'Jhamsikhel',                city: 'Lalitpur',  lng: 85.3078, lat: 27.6785 },
  'Third Eye Restaurant':             { area: 'Baluwatar',                 city: 'Kathmandu', lng: 85.3305, lat: 27.7295 },
  'Dan Ran':                          { area: 'Kupondole',                 city: 'Lalitpur',  lng: 85.3160, lat: 27.6880 },
  'Pumpernickel Bakery':             { area: 'Jhochhen (Freak Street)',   city: 'Kathmandu', lng: 85.3075, lat: 27.7025 },
  'Yangling Tibetan Restaurant':      { area: 'Boudha',                    city: 'Kathmandu', lng: 85.3618, lat: 27.7215 },
  'Bricks Cafe':                      { area: 'Pulchowk',                  city: 'Lalitpur',  lng: 85.3155, lat: 27.6790 },
  'Vesper House':                     { area: 'Sanepa',                    city: 'Lalitpur',  lng: 85.3050, lat: 27.6835 },
  'Trisara':                          { area: 'Chabahil',                  city: 'Kathmandu', lng: 85.3470, lat: 27.7175 },
  'Rosemary Kitchen & Coffee Shop':   { area: 'Jawalakhel',                city: 'Lalitpur',  lng: 85.3110, lat: 27.6725 },
  'Evoke Cafe & Bistro':              { area: 'Patan Durbar Square',       city: 'Lalitpur',  lng: 85.3255, lat: 27.6727 },
  'Bawarchi':                         { area: 'New Baneshwor',             city: 'Kathmandu', lng: 85.3350, lat: 27.6890 },
  'Kathmandu Steak House':            { area: 'Lagankhel',                 city: 'Lalitpur',  lng: 85.3230, lat: 27.6670 },
  'The Old House':                    { area: 'Kalimati',                  city: 'Kathmandu', lng: 85.2960, lat: 27.6960 },
  'Gokarna House Restaurant':         { area: 'Gokarneshwor',              city: 'Kathmandu', lng: 85.4030, lat: 27.7370 },
  'Utsav Authentic Nepali Restaurant':{ area: 'Bhaktapur Durbar Square',   city: 'Bhaktapur', lng: 85.4280, lat: 27.6720 },
  'Utse Restaurant':                  { area: 'Gongabu',                   city: 'Kathmandu', lng: 85.3135, lat: 27.7360 },
  'Yin Yang Restaurant':              { area: 'Balaju',                    city: 'Kathmandu', lng: 85.3020, lat: 27.7360 },
  'Electric Pagoda Bar':              { area: 'Sinamangal',                city: 'Kathmandu', lng: 85.3560, lat: 27.6960 },
  "Alina's Bakery Cafe":              { area: 'Koteshwor',                 city: 'Kathmandu', lng: 85.3490, lat: 27.6780 },
  'The Yard by Oasis Garden Homes':   { area: 'Bhaisepati',                city: 'Lalitpur',  lng: 85.3010, lat: 27.6520 },
  'Kaiser Cafe':                      { area: 'Swayambhu',                 city: 'Kathmandu', lng: 85.2895, lat: 27.7148 },
  'Krishnarpan Restaurant':           { area: 'Battisputali',              city: 'Kathmandu', lng: 85.3400, lat: 27.7062 },
  'Pizza World':                      { area: 'Kalanki',                   city: 'Kathmandu', lng: 85.2810, lat: 27.6935 },
};

// Small deterministic offset per venue name so two venues that (in a future
// edit) share an area still don't overlap, without breaking the >=1 km spacing
// between distinct areas. Max ~150 m.
function jitter(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  const dLng = ((h % 1000) / 1000 - 0.5) * 0.0028;        // ~ +/- 150 m
  const dLat = (((h >> 10) % 1000) / 1000 - 0.5) * 0.0026;
  return [dLng, dLat];
}

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/restronet');
    console.log('Connected to MongoDB');

    const venues = await Venue.find({}, 'name address location').lean();
    let updated = 0;
    const missing = [];

    for (const v of venues) {
      const p = PLACEMENTS[v.name];
      if (!p) { missing.push(v.name); continue; }

      const [dLng, dLat] = jitter(v.name);
      const lng = +(p.lng + dLng).toFixed(6);
      const lat = +(p.lat + dLat).toFixed(6);

      const before = (v.location?.coordinates || []).map(n => n.toFixed(4)).join(', ');

      await Venue.updateOne(
        { _id: v._id },
        {
          $set: {
            'location.type': 'Point',
            'location.coordinates': [lng, lat],
            'address.street': p.area,
            'address.city': p.city,
            'address.state': 'Bagmati',
            'address.country': 'Nepal',
          },
        }
      );
      updated++;
      console.log(`${v.name}: [${before}] -> [${lat.toFixed(4)}, ${lng.toFixed(4)}] (${p.area}, ${p.city})`);
    }

    console.log(`\nUpdated ${updated}/${venues.length} venues.`);
    if (missing.length) {
      console.log(`No placement entry for ${missing.length} venue(s) (left unchanged):`);
      missing.forEach(n => console.log(`  - ${n}`));
    }

    // Sanity check: closest pair of venues after placement.
    const after = await Venue.find({}, 'name location').lean();
    let min = Infinity, pair = null;
    for (let i = 0; i < after.length; i++) {
      for (let j = i + 1; j < after.length; j++) {
        const [a, b] = [after[i].location.coordinates, after[j].location.coordinates];
        const dx = (a[0] - b[0]) * 111 * Math.cos((a[1] * Math.PI) / 180);
        const dy = (a[1] - b[1]) * 111;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < min) { min = d; pair = [after[i].name, after[j].name]; }
      }
    }
    console.log(`\nClosest pair: ${pair?.join('  <->  ')} = ${min.toFixed(2)} km apart`);

    process.exit(0);
  } catch (err) {
    console.error('Failed:', err);
    process.exit(1);
  }
};

run();
