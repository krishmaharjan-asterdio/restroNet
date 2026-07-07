require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const https = require('https');
const Venue = require('../models/Venue');

const GALLERY_DIR = path.join(__dirname, '..', 'uploads', 'gallery');
const LOGOS_DIR = path.join(__dirname, '..', 'uploads', 'logos');
const TARGET_GALLERY_COUNT = 5;

function slugify(name, fallback) {
  const slug = name
    .toLowerCase()
    .replace(/&/g, '')
    .replace(/'/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  // Non-Latin names (e.g. Devanagari) slugify to an empty string — use the
  // venue id instead so filenames stay unique.
  return slug.length >= 3 ? slug : `venue-${fallback}`;
}

function findLogoFile(slug) {
  const files = fs.readdirSync(LOGOS_DIR);
  return files.find((f) => f.replace(/\.[^.]+$/, '') === slug) || null;
}

function findGalleryFiles(slug) {
  const files = fs.readdirSync(GALLERY_DIR);
  return files
    .filter((f) => {
      const base = f.replace(/\.[^.]+$/, '');
      if (base === slug) return true;
      if (!base.startsWith(slug + '-')) return false;
      return /^\d+$/.test(base.slice(slug.length + 1));
    })
    .sort();
}

function downloadImage(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    const request = https.get(url, (response) => {
      if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        file.close();
        fs.unlinkSync(destPath);
        return downloadImage(response.headers.location, destPath).then(resolve, reject);
      }
      if (response.statusCode !== 200) {
        file.close();
        fs.unlink(destPath, () => {});
        return reject(new Error(`Bad status ${response.statusCode} for ${url}`));
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

async function ensureLogo(venue, slug) {
  if (venue.logo) return venue.logo;

  const existingLogoFile = findLogoFile(slug);
  if (existingLogoFile) {
    return `/uploads/logos/${existingLogoFile}`;
  }

  const filename = `${slug}-logo.jpg`;
  const destPath = path.join(LOGOS_DIR, filename);
  const url = `https://picsum.photos/seed/${slug}-logo/400/400`;
  await downloadImage(url, destPath);
  return `/uploads/logos/${filename}`;
}

async function ensureGallery(venue, slug) {
  const existingFiles = findGalleryFiles(slug);
  const galleryUrls = existingFiles.map((f) => `/uploads/gallery/${f}`);

  let nextIndex = existingFiles.length + 1;
  while (galleryUrls.length < TARGET_GALLERY_COUNT) {
    const filename = `${slug}-${nextIndex}.jpg`;
    const destPath = path.join(GALLERY_DIR, filename);
    const url = `https://picsum.photos/seed/${slug}-${nextIndex}/800/600`;
    await downloadImage(url, destPath);
    galleryUrls.push(`/uploads/gallery/${filename}`);
    nextIndex++;
  }

  return galleryUrls;
}

const run = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/restronet');
    console.log('Connected to MongoDB');

    const venues = await Venue.find({});
    console.log(`Found ${venues.length} venues`);

    const pending = venues.filter(
      (v) => !(v.logo && v.gallery?.length >= TARGET_GALLERY_COUNT)
    );
    console.log(`${pending.length} venues need images`);

    const processVenue = async (venue) => {
      const slug = slugify(venue.name, venue._id.toString());
      const beforeGallery = venue.gallery ? venue.gallery.length : 0;
      const beforeLogo = venue.logo;

      const logo = await ensureLogo(venue, slug);
      const gallery = await ensureGallery(venue, slug);

      venue.logo = logo;
      venue.gallery = gallery;
      await venue.save();

      console.log(
        `${venue.name}: logo ${beforeLogo ? 'kept' : 'set'}, gallery ${beforeGallery} -> ${gallery.length}`
      );
    };

    const BATCH_SIZE = 10;
    for (let i = 0; i < pending.length; i += BATCH_SIZE) {
      const batch = pending.slice(i, i + BATCH_SIZE);
      const results = await Promise.allSettled(batch.map(processVenue));
      results.forEach((r, idx) => {
        if (r.status === 'rejected') {
          console.error(`FAILED ${batch[idx].name}: ${r.reason?.message}`);
        }
      });
      console.log(`Progress: ${Math.min(i + BATCH_SIZE, pending.length)}/${pending.length}`);
    }

    console.log('Done.');
    process.exit(0);
  } catch (error) {
    console.error('Failed:', error);
    process.exit(1);
  }
};

run();
