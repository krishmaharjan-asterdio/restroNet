require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const https = require('https');
require('../models/Metadata');
const Venue = require('../models/Venue');

const GALLERY_DIR = path.join(__dirname, '..', 'uploads', 'gallery');
const LOGOS_DIR = path.join(__dirname, '..', 'uploads', 'logos');
const TARGET_GALLERY_COUNT = 5;
const MIN_IMAGES_PER_CUISINE = 12; // logo + 5 gallery, with some rotation room
const MIN_SUCCESSFUL_DOWNLOADS = 15; // some candidate files 429 permanently; keep pulling until this many succeed

// Wikimedia Commons search queries per cuisine — real, freely-licensed food/
// restaurant photos relevant to what that cuisine actually serves.
const CUISINE_QUERIES = {
  Nepali: ['Nepali food dal bhat', 'Nepali cuisine restaurant', 'Nepali thali'],
  Newari: ['Newari food Nepal', 'Newari khaja set'],
  Italian: ['Italian pizza food', 'Italian pasta dish', 'Italian restaurant food'],
  Continental: ['restaurant interior fine dining', 'grilled steak dish restaurant', 'continental breakfast food'],
  Indian: ['Indian curry food', 'Indian restaurant food', 'Indian tandoori dish'],
  Korean: ['Korean BBQ food', 'Korean restaurant food', 'Korean side dishes'],
  Japanese: ['Japanese sushi restaurant', 'Japanese ramen food', 'Japanese restaurant food'],
  Thai: ['Thai food curry', 'Thai restaurant food'],
  Tibetan: ['Tibetan momo food', 'Tibetan cuisine restaurant'],
  Chinese: ['Chinese food restaurant', 'Chinese cuisine dish'],
  Asian: ['Asian restaurant food dish', 'pan Asian cuisine food'],
};

const CACHE_DIR = path.join(__dirname, '..', 'uploads', 'cuisine-image-cache');

function slugify(name, fallback) {
  const slug = name
    .toLowerCase()
    .replace(/&/g, '')
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug.length >= 3 ? slug : `venue-${fallback}`;
}

function wikimediaSearch(query, limit = 15) {
  return new Promise((resolve, reject) => {
    const url = `https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrnamespace=6&gsrsearch=${encodeURIComponent(query)}&gsrlimit=${limit}&prop=imageinfo&iiprop=url|mime&format=json`;
    https.get(url, { headers: { 'User-Agent': 'RestroNet/1.0 (educational project)' } }, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const pages = Object.values(json.query?.pages || {});
          // Use the Special:FilePath redirect (keyed by page title) rather than
          // the raw upload.wikimedia.org URL — direct hotlinks to some files
          // intermittently 429, but the wiki-page redirect route is reliable.
          const titles = pages
            .filter((p) => {
              const mime = p.imageinfo?.[0]?.mime || '';
              return mime.startsWith('image/') && mime !== 'image/svg+xml';
            })
            .map((p) => p.title.replace(/^File:/, ''));
          resolve(titles);
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

function filePathUrl(fileTitle) {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(fileTitle)}?width=1024`;
}

function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const request = https.get(url, { headers: { 'User-Agent': 'RestroNet/1.0 (educational project)' } }, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadImage(response.headers.location, destPath).then(resolve, reject);
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(destPath, () => {});
        return reject(new Error(`Bad status ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
    });
    request.on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(err);
    });
  });
}

async function buildCuisineImagePool(cuisineName) {
  const cacheFile = path.join(CACHE_DIR, `${cuisineName}.json`);
  if (fs.existsSync(cacheFile)) {
    return JSON.parse(fs.readFileSync(cacheFile, 'utf8'));
  }

  const queries = CUISINE_QUERIES[cuisineName] || CUISINE_QUERIES.Continental;
  const allUrls = new Set();
  // Pull a generous candidate pool since some files hit persistent 429s from
  // Wikimedia's CDN and need to be skipped in favor of the next candidate.
  for (const q of queries) {
    const urls = await wikimediaSearch(q, 40);
    urls.forEach((u) => allUrls.add(u));
  }

  const pool = [...allUrls];
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(pool, null, 2));
  return pool;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function downloadWithRetry(url, destPath, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      await downloadImage(url, destPath);
      return;
    } catch (err) {
      if (attempt === retries) throw err;
      await sleep(attempt * 2000);
    }
  }
}

async function ensureCuisineImagesDownloaded(cuisineName, pool) {
  const localDir = path.join(CACHE_DIR, 'downloaded', cuisineName);
  fs.mkdirSync(localDir, { recursive: true });

  const localFiles = [];
  for (let i = 0; i < pool.length && localFiles.length < MIN_SUCCESSFUL_DOWNLOADS; i++) {
    const fileTitle = pool[i];
    const ext = path.extname(fileTitle) || '.jpg';
    const localPath = path.join(localDir, `${i}${ext}`);
    if (!fs.existsSync(localPath)) {
      try {
        await downloadWithRetry(filePathUrl(fileTitle), localPath);
        await sleep(1500); // be polite to Wikimedia's servers
      } catch (err) {
        console.warn(`Failed to download ${pool[i]}: ${err.message}`);
        continue;
      }
    }
    localFiles.push(localPath);
  }
  return localFiles;
}

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/restronet');
    console.log('Connected to MongoDB');

    const venues = await Venue.find({}).populate('cuisines').lean();
    console.log(`Found ${venues.length} venues`);

    const cuisineFileCache = {};

    for (const venue of venues) {
      const cuisineName = venue.cuisines?.[0]?.name || 'Continental';

      if (!cuisineFileCache[cuisineName]) {
        console.log(`Building image pool for cuisine: ${cuisineName}`);
        const pool = await buildCuisineImagePool(cuisineName);
        console.log(`  Found ${pool.length} candidate images, downloading...`);
        cuisineFileCache[cuisineName] = await ensureCuisineImagesDownloaded(cuisineName, pool);
        console.log(`  ${cuisineFileCache[cuisineName].length} images ready locally`);
      }

      const files = cuisineFileCache[cuisineName];
      if (files.length === 0) {
        console.warn(`${venue.name}: no images available for cuisine ${cuisineName}, skipping`);
        continue;
      }

      const slug = slugify(venue.name, venue._id.toString());

      // Deterministic per-venue selection so re-runs are stable, but spread
      // across the available pool rather than always picking the same ones.
      const seed = venue._id.toString().split('').reduce((a, c) => a + c.charCodeAt(0), 0);
      const pickCount = Math.min(TARGET_GALLERY_COUNT + 1, files.length);
      const picks = [];
      for (let i = 0; i < pickCount; i++) {
        picks.push(files[(seed + i) % files.length]);
      }

      const logoSrc = picks[0];
      const logoDest = path.join(LOGOS_DIR, `${slug}-logo${path.extname(logoSrc)}`);
      fs.copyFileSync(logoSrc, logoDest);

      const galleryUrls = [];
      for (let i = 1; i < picks.length; i++) {
        const src = picks[i];
        const dest = path.join(GALLERY_DIR, `${slug}-${i}${path.extname(src)}`);
        fs.copyFileSync(src, dest);
        galleryUrls.push(`/uploads/gallery/${path.basename(dest)}`);
      }
      // If fewer than target unique images existed, pad by re-using with a
      // different filename (still a real, cuisine-relevant photo, just repeated).
      let extra = TARGET_GALLERY_COUNT - galleryUrls.length;
      let idx = 0;
      while (extra > 0) {
        const src = files[idx % files.length];
        const dest = path.join(GALLERY_DIR, `${slug}-pad${idx}${path.extname(src)}`);
        fs.copyFileSync(src, dest);
        galleryUrls.push(`/uploads/gallery/${path.basename(dest)}`);
        idx++;
        extra--;
      }

      await Venue.updateOne(
        { _id: venue._id },
        { $set: { logo: `/uploads/logos/${path.basename(logoDest)}`, gallery: galleryUrls } }
      );

      console.log(`${venue.name} (${cuisineName}): images set`);
    }

    console.log('Done.');
    process.exit(0);
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
};

run();
