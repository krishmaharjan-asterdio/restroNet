/**
 * Configures reservation capacity and opening hours defaults for venues
 * that are missing them, so slot-based booking works end to end.
 *
 * Idempotent: only fills in missing values — never overwrites a venue that
 * already has maxCapacity set or opening/close times configured.
 *
 * Usage: node scripts/configureCapacity.js [--dry-run]
 */
require('dotenv').config();
const mongoose = require('mongoose');
const Venue = require('../models/Venue');

const DEFAULT_MAX_CAPACITY = 20;
const DEFAULT_OPEN = '10:00';
const DEFAULT_CLOSE = '21:00';
const DAYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

const dryRun = process.argv.includes('--dry-run');

(async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected. ${dryRun ? '[DRY RUN] ' : ''}Scanning venues...`);

  const venues = await Venue.find({ isActive: true });
  let capacitySet = 0;
  let hoursSet = 0;

  for (const venue of venues) {
    let changed = false;

    if (!venue.maxCapacity) {
      venue.maxCapacity = DEFAULT_MAX_CAPACITY;
      capacitySet++;
      changed = true;
    }

    for (const day of DAYS) {
      const dayHours = venue.openingHours?.[day];
      if (dayHours && !dayHours.isClosed && (!dayHours.open || !dayHours.close)) {
        dayHours.open = dayHours.open || DEFAULT_OPEN;
        dayHours.close = dayHours.close || DEFAULT_CLOSE;
        changed = true;
      }
    }
    if (changed && venue.isModified('openingHours')) hoursSet++;

    if (changed && !dryRun) {
      await venue.save({ validateBeforeSave: false });
    }
  }

  console.log(`Venues scanned: ${venues.length}`);
  console.log(`maxCapacity defaulted (${DEFAULT_MAX_CAPACITY}): ${capacitySet}`);
  console.log(`opening hours filled (${DEFAULT_OPEN}-${DEFAULT_CLOSE}): ${hoursSet}`);
  if (dryRun) console.log('Dry run — no writes performed.');

  await mongoose.disconnect();
  process.exit(0);
})().catch((err) => {
  console.error('Failed:', err);
  process.exit(1);
});
