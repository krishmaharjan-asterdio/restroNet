require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const https = require('https');
const axios = require('axios');
require('../models/Metadata');
const Venue = require('../models/Venue');

/**
 * Give a venue a real photo of *that specific restaurant* from a freely-licensed
 * source, instead of the generic cuisine stock photos.
 *
 * Sources, in priority order:
 *   1. CURATED map below — Wikimedia Commons file titles a human has verified
 *      actually show this venue. This is the only source trusted by default.
 *   2. (--osm) OpenStreetMap `wikimedia_commons` / `image` tag for a node whose
 *      name matches the venue inside the Kathmandu Valley. Human-tagged for that
 *      exact place, so reliable when present — but Overpass is rate-limit flaky,
 *      hence opt-in.
 *   3. Fallback: the venue keeps its current (cuisine) images; photoSource is
 *      set to 'fallback'.
 *
 * A blind Commons/Wikipedia *text search* on the venue name was tried and
 * removed: restaurant names aren't unique ("Bawarchi", "Third Eye", "Vesper
 * House", "The Old House" all resolved to same-named businesses in other
 * countries, or to unrelated book scans). Only add a venue to CURATED after
 * eyeballing the file on Commons.
 *
 * Images are downloaded into uploads/ — the app never hot-links a third party.
 * Idempotent. --force reprocesses venues that already have a real photo.
 */

const FORCE = process.argv.includes('--force');
const USE_OSM = process.argv.includes('--osm');
const LOGOS_DIR = path.join(__dirname, '..', 'uploads', 'logos');
const GALLERY_DIR = path.join(__dirname, '..', 'uploads', 'gallery');
const TARGET_GALLERY = 5;

const BBOX = [27.58, 85.20, 27.82, 85.55]; // Kathmandu Valley (S,W,N,E)
const OVERPASS_URLS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

// venueName -> Wikimedia Commons file titles (no "File:" prefix), each verified
// by eye to show this venue. First entry becomes the logo, so lead with a wide
// establishing shot where possible.
const CURATED = {
  'Fire And Ice Pizzeria': [
    'Fire&Ice pizzeria at Thamel.jpg',
  ],
  // Bhojan Griha's Commons coverage is its signature dinner: Nepali thali served
  // on brass, with the live folk-dance-and-music performance in the old Rana
  // mansion dining hall.
  'Bhojan Griha': [
    'Kathmandu-Dinner-02-Dal-Bhat ueppig-2007-gje.jpg',
    'Kathmandu-Dinner-08-Taenzer-2007-gje.jpg',
    'Kathmandu-Dinner-12-Taenzer-Musiker-2007-gje.jpg',
    'Kathmandu-Dinner-14-Taenzer-2007-gje.jpg',
    'Kathmandu-Dinner-22-Taenzer-2013-gje.jpg',
    'Kathmandu-Dinner-24-Musiker-2013-gje.jpg',
    'Kathmandu-Dinner-28-Taenzerin-2014-gje.jpg',
    'Kathmandu-Dinner-32-Organist-2014-gje.jpg',
  ],
  'Himalayan Java Coffee': [
    'Coffee Himalayan Java Nepal.jpg',
  ],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function slugify(name) {
  return name.toLowerCase().replace(/&/g, 'and').replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'venue';
}

function commonsFilePathUrl(fileTitle) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileTitle)}?width=1200`;
}

function download(url, destPath, redirects = 0) {
  return new Promise((resolve, reject) => {
    if (redirects > 5) return reject(new Error('too many redirects'));
    const file = fs.createWriteStream(destPath);
    https.get(url, { headers: { 'User-Agent': 'RestroNet/1.0 (educational project)' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close(); fs.unlink(destPath, () => {});
        return download(res.headers.location, destPath, redirects + 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        file.close(); fs.unlink(destPath, () => {});
        return reject(new Error(`status ${res.statusCode}`));
      }
      if (!(res.headers['content-type'] || '').startsWith('image/')) {
        file.close(); fs.unlink(destPath, () => {});
        return reject(new Error(`not an image (${res.headers['content-type']})`));
      }
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
    }).on('error', (err) => { fs.unlink(destPath, () => {}); reject(err); });
  });
}

// --- Source 2: OpenStreetMap tags (opt-in) --------------------------------
async function osmPhotoForVenue(name) {
  const escaped = name.replace(/["\\]/g, '\\$&');
  const query = `
    [out:json][timeout:25];
    ( nwr["name"~"${escaped}",i]["amenity"~"restaurant|cafe|fast_food|bar|pub"](${BBOX.join(',')}); );
    out tags 5;
  `;
  const params = new URLSearchParams();
  params.append('data', query);

  for (const url of OVERPASS_URLS) {
    try {
      const res = await axios.post(url, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'RestroNet/1.0 (educational project)',
        },
        timeout: 25000,
      });
      for (const el of res.data.elements || []) {
        const t = el.tags || {};
        if (t.wikimedia_commons && /^File:/i.test(t.wikimedia_commons)) {
          return { url: commonsFilePathUrl(t.wikimedia_commons.replace(/^File:/i, '')), source: 'osm:wikimedia_commons' };
        }
        if (t.image && /^https?:\/\/.+\.(jpe?g|png|webp)/i.test(t.image)) {
          return { url: t.image, source: 'osm:image' };
        }
      }
      return null;
    } catch (err) {
      console.warn(`    overpass ${url}: ${err.response?.status || err.message}`);
    }
  }
  return null;
}

async function resolvePhoto(venue) {
  const curated = CURATED[venue.name];
  if (curated?.length) {
    return { urls: curated.map(commonsFilePathUrl), source: 'curated' };
  }
  if (USE_OSM) {
    const osm = await osmPhotoForVenue(venue.name);
    if (osm) return { urls: [osm.url], source: osm.source };
  }
  return null;
}

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/restronet');
    console.log('Connected to MongoDB\n');
    fs.mkdirSync(LOGOS_DIR, { recursive: true });
    fs.mkdirSync(GALLERY_DIR, { recursive: true });

    const venues = await Venue.find({}).lean();
    const summary = { updated: [], skipped: [], fallback: [] };

    for (const venue of venues) {
      if (!FORCE && venue.photoSource && venue.photoSource !== 'fallback') {
        summary.skipped.push(`${venue.name} (${venue.photoSource})`);
        continue;
      }

      const resolved = await resolvePhoto(venue).catch((e) => {
        console.warn(`- ${venue.name}: lookup error ${e.message}`);
        return null;
      });

      if (!resolved) {
        summary.fallback.push(venue.name);
        await Venue.updateOne({ _id: venue._id }, { $set: { photoSource: 'fallback' } });
        continue;
      }

      console.log(`- ${venue.name} (${resolved.source})`);
      const slug = slugify(venue.name);

      const local = [];
      const seenSizes = new Set();
      for (let i = 0; i < resolved.urls.length && local.length <= TARGET_GALLERY; i++) {
        const ext = (resolved.urls[i].match(/\.(jpe?g|png|webp)/i)?.[1] || 'jpg').toLowerCase();
        const tmp = path.join(GALLERY_DIR, `${slug}-src${i}.${ext === 'jpeg' ? 'jpg' : ext}`);
        try {
          await download(resolved.urls[i], tmp);
          const size = fs.statSync(tmp).size;
          if (seenSizes.has(size)) { fs.unlinkSync(tmp); continue; }
          seenSizes.add(size);
          local.push(tmp);
          await sleep(500);
        } catch (err) {
          console.warn(`    download ${i} failed: ${err.message}`);
        }
      }

      if (local.length === 0) {
        summary.fallback.push(venue.name);
        console.log('    all downloads failed — keeping current images');
        await Venue.updateOne({ _id: venue._id }, { $set: { photoSource: 'fallback' } });
        continue;
      }

      // Remove images a previous run of THIS script left for the venue.
      const escSlug = slug.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const oldRe = new RegExp(`^${escSlug}-(logo|g\\d+)\\.`);
      for (const dir of [LOGOS_DIR, GALLERY_DIR]) {
        for (const f of fs.readdirSync(dir)) if (oldRe.test(f)) fs.unlinkSync(path.join(dir, f));
      }

      const logoPath = path.join(LOGOS_DIR, `${slug}-logo${path.extname(local[0])}`);
      fs.copyFileSync(local[0], logoPath);

      const gallery = [];
      for (let i = 0; i < TARGET_GALLERY; i++) {
        const src = local[(i + 1) % local.length] || local[0];
        const dest = path.join(GALLERY_DIR, `${slug}-g${i}${path.extname(src)}`);
        fs.copyFileSync(src, dest);
        gallery.push(`/uploads/gallery/${path.basename(dest)}`);
      }
      local.forEach((f) => fs.existsSync(f) && fs.unlinkSync(f));

      await Venue.updateOne(
        { _id: venue._id },
        { $set: {
            logo: `/uploads/logos/${path.basename(logoPath)}`,
            gallery,
            photoSource: resolved.source,
        } }
      );
      summary.updated.push(`${venue.name}  <-  ${resolved.source}`);
      console.log(`    set logo + ${gallery.length} gallery images`);
    }

    console.log('\n=========== SUMMARY ===========');
    console.log(`Real photo (${summary.updated.length}):`);
    summary.updated.forEach((s) => console.log(`  ${s}`));
    console.log(`\nCuisine fallback (${summary.fallback.length}):`);
    summary.fallback.forEach((s) => console.log(`  ${s}`));
    if (summary.skipped.length) {
      console.log(`\nSkipped — already had a real photo (${summary.skipped.length}):`);
      summary.skipped.forEach((s) => console.log(`  ${s}`));
    }

    process.exit(0);
  } catch (err) {
    console.error('Failed:', err);
    process.exit(1);
  }
};

run();
