require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Venue = require('../models/Venue');
const { Cuisine, Tag } = require('../models/Metadata');
const fs = require('fs');
const path = require('path');

/**
 * Seeds QA users + restaurant owners so the app can be tested end-to-end
 * with realistic accounts. Safe to re-run — clears only its own accounts
 * (matched by the exact email list below) and reuses its own dedicated
 * seed venues, never touching real user accounts or real venues.
 *
 * Requires SEED_CONFIRM=yes in the environment as a guard against running
 * unintentionally against a shared/production database.
 */

const TEST_PASSWORD = 'P@ssword123';

const USER_SPECS = [
  { name: 'Sabina Shrestha', email: 'sabina.shrestha01@gmail.com', priceRange: 1, mealTypes: ['lunch', 'snacks'], maxDistanceKm: 5 },
  { name: 'Rajesh Thapa', email: 'rajesh.thapa88@gmail.com', priceRange: 2, mealTypes: ['dinner', 'brunch'], maxDistanceKm: 10 },
  { name: 'Anisha Maharjan', email: 'anisha.maharjan22@gmail.com', priceRange: 3, mealTypes: ['dinner'], maxDistanceKm: 15 },
  { name: 'Bikash Gurung', email: 'bikash.gurung77@gmail.com', priceRange: null, mealTypes: [], maxDistanceKm: 10 },
];

const OWNER_SPECS = [
  { name: 'Prakash Joshi', email: 'prakash.joshi.owner@gmail.com' },
  { name: 'Mina Tamang', email: 'mina.tamang.owner@gmail.com' },
];

const ALL_SEED_EMAILS = [...USER_SPECS, ...OWNER_SPECS].map((s) => s.email);

const run = async () => {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/restronet';

  if (process.env.SEED_CONFIRM !== 'yes') {
    console.error(
      'Refusing to run: set SEED_CONFIRM=yes to confirm you want to seed QA ' +
      'accounts into this database (this writes a shared test password to ' +
      'TEST_USERS.md).'
    );
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log(`Connected to ${uri.replace(/:\/\/.*@/, '://<hidden>@')}`);

  // Clean up any previous run of this script only — matched by exact email.
  await User.deleteMany({ email: { $in: ALL_SEED_EMAILS } });
  await Admin.deleteMany({ email: { $in: ALL_SEED_EMAILS } });

  let cuisineDocs = await Cuisine.find({}).limit(3);
  if (!cuisineDocs.length) {
    console.log('No Cuisine docs found — creating a few.');
    cuisineDocs = await Cuisine.insertMany([{ name: 'Nepali' }, { name: 'Italian' }, { name: 'Chinese' }]);
  }
  let tagDocs = await Tag.find({}).limit(3);
  if (!tagDocs.length) {
    console.log('No Tag docs found — creating a few.');
    tagDocs = await Tag.insertMany([{ name: 'Family Friendly' }, { name: 'Outdoor Seating' }, { name: 'Live Music' }]);
  }

  // ─── Create test users with preferences ─────────────────────────────────
  const createdUsers = [];
  for (const spec of USER_SPECS) {
    const hasPrefs = spec.priceRange !== null;
    const prefCuisines = hasPrefs ? cuisineDocs.slice(0, 2) : [];
    const prefTags = hasPrefs ? tagDocs.slice(0, 2) : [];

    const user = await User.create({
      name: spec.name,
      email: spec.email,
      password: TEST_PASSWORD,
      // QA accounts use realistic-looking addresses that could belong to real
      // people — never send them automated email.
      emailNotifications: false,
      preferences: {
        cuisines: prefCuisines.map((c) => c._id),
        tags: prefTags.map((t) => t._id),
        priceRange: spec.priceRange,
        mealTypes: spec.mealTypes,
        maxDistanceKm: spec.maxDistanceKm,
      },
    });
    createdUsers.push({
      ...spec,
      cuisines: prefCuisines.map((c) => c.name),
      tags: prefTags.map((t) => t.name),
    });
  }

  // ─── Create test owners, each assigned a dedicated seeded venue ─────────
  // Each owner always gets its OWN venue (matched by name), never a real
  // venue picked up via `owner: null` — that was silently reassigning real
  // restaurants to test accounts on every re-run.
  const createdOwners = [];
  for (const spec of OWNER_SPECS) {
    const owner = await Admin.create({
      name: spec.name,
      email: spec.email,
      password: TEST_PASSWORD,
      role: 'owner',
      emailNotifications: false,
    });

    const venueName = `${spec.name}'s Restaurant (QA Seed)`;
    let venue = await Venue.findOne({ name: venueName });
    if (venue) {
      venue.owner = owner._id;
      await venue.save();
    } else {
      venue = await Venue.create({
        name: venueName,
        description: 'Seeded test venue for QA.',
        address: { street: 'Test Street', city: 'Kathmandu', country: 'Nepal' },
        location: { type: 'Point', coordinates: [85.324, 27.7172] },
        cuisines: cuisineDocs.slice(0, 1).map((c) => c._id),
        priceRange: 2,
        owner: owner._id,
      });
    }

    createdOwners.push({ ...spec, venueName: venue.name, venueId: venue._id.toString() });
  }

  // ─── Write TEST_USERS.md ─────────────────────────────────────────────────
  const lines = [];
  lines.push('# QA Test Accounts (real restronet DB)');
  lines.push('');
  lines.push(`All passwords: \`${TEST_PASSWORD}\``);
  lines.push('');
  lines.push('## Users');
  lines.push('');
  lines.push('| Name | Email | Price Range | Meal Types | Cuisines | Tags | Max Distance |');
  lines.push('|---|---|---|---|---|---|---|');
  for (const u of createdUsers) {
    lines.push(
      `| ${u.name} | ${u.email} | ${u.priceRange ?? 'none'} | ${u.mealTypes.join(', ') || 'none'} | ${u.cuisines.join(', ') || 'none'} | ${u.tags.join(', ') || 'none'} | ${u.maxDistanceKm}km |`
    );
  }
  lines.push('');
  lines.push('## Restaurant Owners');
  lines.push('');
  lines.push('| Name | Email | Assigned Venue |');
  lines.push('|---|---|---|');
  for (const o of createdOwners) {
    lines.push(`| ${o.name} | ${o.email} | ${o.venueName} (${o.venueId}) |`);
  }
  lines.push('');

  const outPath = path.join(__dirname, '..', '..', 'TEST_USERS.md');
  fs.writeFileSync(outPath, lines.join('\n'));
  console.log(`Wrote ${outPath}`);

  console.log('Done.');
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
