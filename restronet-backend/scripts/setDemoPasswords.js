require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Admin = require('../models/Admin');
const User = require('../models/User');

/**
 * Sets a single shared password ("password") on every demo login — all
 * restaurant owners and all human user accounts — so the defense build can
 * be signed into without a cheat-sheet.
 *
 *  - Owners:  every Admin with role 'owner'.
 *  - Users:   every User EXCEPT the `*@restronet-seed.local` review-author
 *             fixtures (those have no real login and keeping them untouched
 *             avoids churn).
 *  - The single superadmin (role 'superadmin') is NOT touched.
 *
 * Saving each doc individually so the model's pre('save') bcrypt hook runs —
 * a bulk updateMany would store the plaintext.
 *
 * Run:  SEED_CONFIRM=yes node scripts/setDemoPasswords.js
 */

const NEW_PASSWORD = 'password';
const SEED_DOMAIN   = '@restronet-seed.local';

(async () => {
  if (process.env.SEED_CONFIRM !== 'yes') {
    console.error('Refusing to run. Re-run with:  SEED_CONFIRM=yes node scripts/setDemoPasswords.js');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('connected');

  // ── owners ────────────────────────────────────────────────────────────────
  const owners = await Admin.find({ role: 'owner' }).select('+password');
  for (const o of owners) {
    o.password = NEW_PASSWORD;
    await o.save();
  }
  console.log(`owners updated: ${owners.length}`);

  // ── users (skip the seed review fixtures) ─────────────────────────────────
  const users = await User.find({
    email: { $not: new RegExp(`${SEED_DOMAIN}$`, 'i') },
  }).select('+password');
  for (const u of users) {
    u.password = NEW_PASSWORD;
    await u.save();
  }
  console.log(`users updated: ${users.length}`);

  // ── refresh DEMO_ACCOUNTS.md password lines if the file exists ────────────
  const md = path.join(__dirname, '..', '..', 'DEMO_ACCOUNTS.md');
  if (fs.existsSync(md)) {
    let text = fs.readFileSync(md, 'utf8');
    text = text
      .replace(/All owner passwords: `[^`]*`/g, 'All owner passwords: `password`')
      .replace(/All user passwords: `[^`]*`/g,  'All user passwords: `password`')
      .replace(/\| RestroOwner@26 \|/g, '| password |')
      .replace(/\| RestroDiner@26 \|/g, '| password |');
    fs.writeFileSync(md, text);
    console.log(`updated ${md}`);
  }

  await mongoose.disconnect();
  console.log('done');
})().catch(e => { console.error(e); process.exit(1); });
