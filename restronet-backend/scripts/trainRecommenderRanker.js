/**
 * Trains a simple learned ranking model for the Discover recommendation
 * engine, replacing hand-tuned scoring weights with weights learned from
 * data via logistic regression (plain JS, no ML library dependency).
 *
 * WHY THIS EXISTS
 * ----------------
 * recommendationService.js currently ranks venues using weights someone
 * typed in by hand. This script produces weights that are *learned* from
 * example (user, venue) preference data instead.
 *
 * DATA: SIMULATED, DISCLOSED
 * ---------------------------
 * The live app only has a handful of real Interaction records — nowhere
 * near enough to learn from. So this script simulates a small population
 * of synthetic users built from 5 independent "persona" preference
 * profiles (defined below), and generates like/skip labels against the
 * real 30 venues in the database using each persona's own hidden weight
 * vector — a DIFFERENT set of weights than recommendationService.js uses,
 * so training isn't just recovering the existing hand-tuned formula.
 *
 * This is a demonstration/validation dataset, not production data. See
 * ml/ranker-report.md for the full disclosure and results.
 *
 * FEATURES (kept deliberately small and interpretable — 4 total):
 *   1. cuisineOverlap — fraction of the user's preferred cuisines the venue has
 *   2. tagOverlap      — fraction of the user's preferred tags the venue has
 *   3. priceFit        — how close the venue's price range is to the user's preferred price
 *   4. ratingNorm      — venue's average rating, normalized to 0-1
 *
 * MODEL: logistic regression, trained with plain gradient descent.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
require('../models/Metadata'); // registers Cuisine/Category/Tag schemas for .populate()
const Venue = require('../models/Venue');

const OUT_DIR = path.join(__dirname, '..', 'ml');
const WEIGHTS_PATH = path.join(OUT_DIR, 'ranker-weights.json');

// ─── 1. Personas ────────────────────────────────────────────────────────
// Each persona has: a preferred cuisine/tag subset, a preferred price
// range (1=Budget .. 4=Luxury), and a HIDDEN weight vector describing how
// much it cares about each feature. These weights are invented for the
// simulation and are intentionally different from recommendationService.js's
// own hand-tuned formula.
const PERSONAS = [
  {
    name: 'Budget Foodie',
    cuisines: ['Nepali', 'Newari', 'Indian'],
    tags: ['Budget Friendly', 'Family Friendly'],
    pricePref: 1,
    weights: { cuisineOverlap: 0.30, tagOverlap: 0.20, priceFit: 0.40, ratingNorm: 0.10 },
  },
  {
    name: 'Fine Dining Fan',
    cuisines: ['Continental', 'Italian', 'Japanese'],
    tags: ['Fine Dining', 'Romantic', 'Rooftop View'],
    pricePref: 4,
    weights: { cuisineOverlap: 0.25, tagOverlap: 0.25, priceFit: 0.15, ratingNorm: 0.35 },
  },
  {
    name: 'Cafe Hopper',
    cuisines: ['Continental', 'Asian'],
    tags: ['Outdoor Seating', 'Vegan Options', 'Pet Friendly'],
    pricePref: 2,
    weights: { cuisineOverlap: 0.20, tagOverlap: 0.45, priceFit: 0.20, ratingNorm: 0.15 },
  },
  {
    name: 'Nightlife Seeker',
    cuisines: ['Korean', 'Chinese', 'Thai'],
    tags: ['Live Music', 'Late Night'],
    pricePref: 3,
    weights: { cuisineOverlap: 0.20, tagOverlap: 0.40, priceFit: 0.10, ratingNorm: 0.30 },
  },
  {
    name: 'Rating Chaser',
    cuisines: ['Japanese', 'Italian', 'Nepali'],
    tags: ['Fine Dining', 'Family Friendly'],
    pricePref: 3,
    weights: { cuisineOverlap: 0.15, tagOverlap: 0.15, priceFit: 0.15, ratingNorm: 0.55 },
  },
];

const USERS_PER_PERSONA = 40; // 5 personas x 40 = 200 synthetic users
const TRAIN_SPLIT = 0.8;

// ─── 2. Helpers ─────────────────────────────────────────────────────────
function gaussianNoise(scale = 1) {
  // Box-Muller transform
  const u = Math.random() || 1e-9;
  const v = Math.random() || 1e-9;
  return scale * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

function overlapFraction(preferredNames, venueNames) {
  if (!preferredNames.length) return 0;
  const venueSet = new Set(venueNames);
  const hits = preferredNames.filter((n) => venueSet.has(n)).length;
  return hits / preferredNames.length;
}

/** Builds a slightly-noisy synthetic user from a persona (real people vary). */
function sampleUserFromPersona(persona) {
  // Randomly drop/keep persona traits with noise instead of copying exactly.
  const cuisines = persona.cuisines.filter(() => Math.random() > 0.15);
  const tags = persona.tags.filter(() => Math.random() > 0.15);
  const pricePref = Math.min(4, Math.max(1, Math.round(persona.pricePref + gaussianNoise(0.4))));
  return { personaName: persona.name, cuisines, tags, pricePref, weights: persona.weights };
}

/** Computes the 4 interpretable features for (user, venue). */
function computeFeatures(user, venue) {
  const cuisineOverlap = overlapFraction(user.cuisines, venue.cuisineNames);
  const tagOverlap = overlapFraction(user.tags, venue.tagNames);
  const priceFit = 1 - Math.abs(user.pricePref - venue.priceRange) / 3;
  const ratingNorm = (venue.averageRating || 0) / 5;
  return { cuisineOverlap, tagOverlap, priceFit, ratingNorm };
}

const FEATURE_KEYS = ['cuisineOverlap', 'tagOverlap', 'priceFit', 'ratingNorm'];

// Fraction of venues a user "likes" — a person likes some of the places
// that fit them, not just one. Kept as a constant so the ratio is explicit.
const LIKE_FRACTION = 0.35;
const LABEL_NOISE_STD = 0.06; // small — real people are mostly-but-not-perfectly consistent

/**
 * Labels come from each user's OWN hidden weights (utility), ranked against
 * the venues THEY were shown — the top LIKE_FRACTION become "liked" (1).
 * This is a relative/rank-based label, not a fixed global probability
 * cutoff: it avoids the labeling collapsing to mostly-0 when overlap
 * features are sparse (most venues won't match most preferred cuisines/tags),
 * which is what a flat threshold does.
 */
function labelVenuesForUser(user, venues) {
  const scored = venues.map((venue) => {
    const features = computeFeatures(user, venue);
    const utility =
      FEATURE_KEYS.reduce((sum, k) => sum + user.weights[k] * features[k], 0) + gaussianNoise(LABEL_NOISE_STD);
    return { features, utility };
  });
  const sortedUtilities = [...scored].map((s) => s.utility).sort((a, b) => b - a);
  const cutoffIdx = Math.max(1, Math.round(venues.length * LIKE_FRACTION)) - 1;
  const threshold = sortedUtilities[cutoffIdx];
  return scored.map((s) => ({ features: s.features, label: s.utility >= threshold ? 1 : 0 }));
}

// ─── 3. Logistic regression (plain gradient descent, no dependency) ────
function trainLogisticRegression(rows, { epochs = 2000, lr = 0.3 } = {}) {
  const n = FEATURE_KEYS.length;
  let weights = new Array(n).fill(0);
  let bias = 0;

  for (let epoch = 0; epoch < epochs; epoch++) {
    const gradW = new Array(n).fill(0);
    let gradB = 0;

    for (const row of rows) {
      const z = FEATURE_KEYS.reduce((sum, k, i) => sum + weights[i] * row.features[k], bias);
      const pred = sigmoid(z);
      const error = pred - row.label;
      FEATURE_KEYS.forEach((k, i) => {
        gradW[i] += error * row.features[k];
      });
      gradB += error;
    }

    const m = rows.length;
    weights = weights.map((w, i) => w - (lr * gradW[i]) / m);
    bias -= (lr * gradB) / m;
  }

  return { weights, bias };
}

function predict(model, features) {
  const z = FEATURE_KEYS.reduce((sum, k, i) => sum + model.weights[i] * features[k], model.bias);
  return sigmoid(z);
}

// ─── 4. Evaluation ──────────────────────────────────────────────────────
function evaluateClassification(model, rows) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  for (const row of rows) {
    const pred = predict(model, row.features) >= 0.5 ? 1 : 0;
    if (pred === 1 && row.label === 1) tp++;
    else if (pred === 1 && row.label === 0) fp++;
    else if (pred === 0 && row.label === 0) tn++;
    else fn++;
  }
  const accuracy = (tp + tn) / rows.length;
  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  return { accuracy, precision, recall, f1, n: rows.length };
}

/** Precision@5: of the top-5 venues the model ranks for a user, how many were actually liked. */
function precisionAtK(scoredVenues, k = 5) {
  const top = scoredVenues.slice(0, k);
  const hits = top.filter((v) => v.label === 1).length;
  return hits / Math.min(k, top.length || 1);
}

function evaluateRankingPerUser(usersRows, scoreFn) {
  const precisions = [];
  for (const rows of usersRows) {
    const scored = rows.map((r) => ({ ...r, score: scoreFn(r.features) })).sort((a, b) => b.score - a.score);
    precisions.push(precisionAtK(scored, 5));
  }
  return precisions.reduce((a, b) => a + b, 0) / precisions.length;
}

// ─── 5. Main ────────────────────────────────────────────────────────────
async function main() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 });

  const venuesRaw = await Venue.find().populate('cuisines', 'name').populate('tags', 'name').lean();
  const venues = venuesRaw.map((v) => ({
    id: v._id.toString(),
    name: v.name,
    priceRange: v.priceRange || 2,
    averageRating: v.averageRating || 0,
    cuisineNames: (v.cuisines || []).map((c) => c.name),
    tagNames: (v.tags || []).map((t) => t.name),
  }));

  if (venues.length < 5) {
    console.error(`Only ${venues.length} venues found — need real venue data to build features from.`);
    process.exit(1);
  }

  // Generate synthetic users, grouped by user (needed for per-user split + ranking eval).
  const allUsers = [];
  PERSONAS.forEach((persona) => {
    for (let i = 0; i < USERS_PER_PERSONA; i++) {
      allUsers.push(sampleUserFromPersona(persona));
    }
  });

  // Shuffle then split by USER (not by row) to avoid leaking a user's other venues into test.
  for (let i = allUsers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [allUsers[i], allUsers[j]] = [allUsers[j], allUsers[i]];
  }
  const splitIdx = Math.floor(allUsers.length * TRAIN_SPLIT);
  const trainUsers = allUsers.slice(0, splitIdx);
  const testUsers = allUsers.slice(splitIdx);

  const buildRows = (users) => users.map((user) => labelVenuesForUser(user, venues));

  const trainRowsByUser = buildRows(trainUsers);
  const testRowsByUser = buildRows(testUsers);
  const trainRowsFlat = trainRowsByUser.flat();
  const testRowsFlat = testRowsByUser.flat();

  console.log(`Synthetic users: ${allUsers.length} (train ${trainUsers.length} / test ${testUsers.length})`);
  console.log(`Rows: train ${trainRowsFlat.length}, test ${testRowsFlat.length} (venues: ${venues.length})`);
  const posRate = trainRowsFlat.filter((r) => r.label === 1).length / trainRowsFlat.length;
  console.log(`Positive label rate (train): ${(posRate * 100).toFixed(1)}%`);

  const model = trainLogisticRegression(trainRowsFlat);

  const classMetrics = evaluateClassification(model, testRowsFlat);
  const learnedPrecisionAt5 = evaluateRankingPerUser(testRowsByUser, (f) => predict(model, f));
  const randomPrecisionAt5 = evaluateRankingPerUser(testRowsByUser, () => Math.random());
  const ratingOnlyPrecisionAt5 = evaluateRankingPerUser(testRowsByUser, (f) => f.ratingNorm);

  console.log('\n=== Classification metrics (held-out test users) ===');
  console.log(
    `Accuracy: ${(classMetrics.accuracy * 100).toFixed(1)}%  Precision: ${(classMetrics.precision * 100).toFixed(1)}%  Recall: ${(classMetrics.recall * 100).toFixed(1)}%  F1: ${(classMetrics.f1 * 100).toFixed(1)}%`
  );

  console.log('\n=== Ranking metrics: Precision@5 (held-out test users) ===');
  console.log(`Learned model:     ${(learnedPrecisionAt5 * 100).toFixed(1)}%`);
  console.log(`Rating-only:       ${(ratingOnlyPrecisionAt5 * 100).toFixed(1)}%`);
  console.log(`Random baseline:   ${(randomPrecisionAt5 * 100).toFixed(1)}%`);

  console.log('\n=== Learned weights ===');
  FEATURE_KEYS.forEach((k, i) => console.log(`${k}: ${model.weights[i].toFixed(3)}`));
  console.log(`bias: ${model.bias.toFixed(3)}`);

  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(
    WEIGHTS_PATH,
    JSON.stringify(
      {
        featureOrder: FEATURE_KEYS,
        weights: model.weights,
        bias: model.bias,
        trainedAt: new Date().toISOString(),
        trainedOn: 'simulated personas (see ml/ranker-report.md)',
        metrics: { classification: classMetrics, precisionAt5: { learned: learnedPrecisionAt5, ratingOnly: ratingOnlyPrecisionAt5, random: randomPrecisionAt5 } },
      },
      null,
      2
    )
  );
  console.log(`\nSaved weights to ${WEIGHTS_PATH}`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
