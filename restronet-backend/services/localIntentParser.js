/**
 * Local, offline replacement for aiService.parseIntent — parses a Discover
 * free-text query into structured filters without calling Gemini.
 *
 * DESIGN: two different techniques for two different kinds of slots.
 *
 * - Entity slots (cuisineIds/categoryIds/tagIds) are exact names that must
 *   map to real database IDs — that's a lookup problem, not a classification
 *   one. nlpParser.js already does this well with fuzzy string matching
 *   against real metadata names, so it's reused unchanged here.
 *
 * - "Soft" slots (mood, price sentiment, isNearMe, isTopRated) are expressed
 *   in endless paraphrases with no shared keywords ("won't break the bank"
 *   vs "cheap"). These use the classifier trained by
 *   scripts/trainIntentClassifier.js on top of the MiniLM sentence
 *   embeddings already used elsewhere in this app — see
 *   ml/intent-classifier-report.md for why and the accuracy numbers vs the
 *   keyword-rule approach it replaces.
 *
 * - sortBy and location have no ML/rule equivalent anywhere yet (Gemini was
 *   the only thing that ever extracted them) — added here as small
 *   deterministic lookups: sortBy from explicit phrase patterns, location
 *   from the real city/neighbourhood names already in the Venue collection.
 *
 * Output shape matches aiService.parseIntent exactly, so the controller
 * doesn't need to change how it consumes the result.
 */

const fs = require('fs');
const path = require('path');
const aiService = require('./aiService');
const { parsePrompt } = require('./nlpParser');
const Venue = require('../models/Venue');

const WEIGHTS_PATH = path.join(__dirname, '..', 'ml', 'intent-classifier-weights.json');

let weights = null;
function loadWeights() {
  if (weights) return weights;
  if (!fs.existsSync(WEIGHTS_PATH)) return null;
  weights = JSON.parse(fs.readFileSync(WEIGHTS_PATH, 'utf8'));
  return weights;
}

function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

function predictProb(model, x) {
  let z = model.bias;
  for (let i = 0; i < x.length; i++) z += model.weights[i] * x[i];
  return sigmoid(z);
}

/** Runs the trained classifier heads over one query embedding. */
function classifySoftSlots(embedding, w) {
  const threshold = w.threshold ?? 0.5;

  let mood = null, moodProb = threshold;
  for (const key of Object.keys(w.moodModels)) {
    const p = predictProb(w.moodModels[key], embedding);
    if (p > moodProb) { moodProb = p; mood = key; }
  }

  let price = null, priceProb = threshold;
  for (const key of Object.keys(w.priceModels)) {
    const p = predictProb(w.priceModels[key], embedding);
    if (p > priceProb) { priceProb = p; price = key; }
  }

  const isNearMe = predictProb(w.nearMeModel, embedding) > threshold;
  const isTopRated = predictProb(w.topRatedModel, embedding) > threshold;

  return { mood, price, isNearMe, isTopRated };
}

// ─── sortBy: explicit phrase patterns only — a user who types "cheapest
// first" is issuing a direct command, not a fuzzy preference, so a fixed
// pattern match is the right tool (no paraphrase ambiguity to resolve). ───
const SORT_PATTERNS = [
  { re: /\b(cheapest|lowest price)\b/i, sortBy: 'price_asc' },
  { re: /\b(most expensive|highest price)\b/i, sortBy: 'price_desc' },
  { re: /\b(closest|nearest)\s+first\b/i, sortBy: 'distance_asc' },
  { re: /\b(farthest|furthest)\s+first\b/i, sortBy: 'distance_desc' },
  { re: /\b(highest rated|top rated|best rated)\s+first\b/i, sortBy: 'rating_desc' },
];

function detectSortBy(prompt) {
  for (const { re, sortBy } of SORT_PATTERNS) {
    if (re.test(prompt)) return sortBy;
  }
  return null;
}

// ─── location: match against the real city/neighbourhood names already in
// the Venue collection, cached in memory and refreshed periodically. ───
let locationCache = { names: [], fetchedAt: 0 };
const LOCATION_CACHE_TTL_MS = 10 * 60 * 1000;

async function getKnownLocationNames() {
  const now = Date.now();
  if (locationCache.names.length && now - locationCache.fetchedAt < LOCATION_CACHE_TTL_MS) {
    return locationCache.names;
  }
  const [cities, streets] = await Promise.all([
    Venue.distinct('address.city'),
    Venue.distinct('address.street'),
  ]);
  const names = [...new Set([...cities, ...streets].filter(Boolean))];
  locationCache = { names, fetchedAt: now };
  return names;
}

async function detectLocation(prompt) {
  const lower = prompt.toLowerCase();
  const names = await getKnownLocationNames();
  // Prefer the longest match so "New Baneshwor" wins over a shorter substring hit.
  let best = null;
  for (const name of names) {
    if (name.length < 3) continue;
    if (lower.includes(name.toLowerCase())) {
      if (!best || name.length > best.length) best = name;
    }
  }
  return best;
}

function buildExplanation({ mood, price, isNearMe, isTopRated, location, cuisineNames }) {
  const parts = [];
  if (price === 'cheap') parts.push('budget-friendly');
  if (price === 'expensive') parts.push('upscale');
  if (mood) parts.push(mood.replace('-', ' '));
  if (cuisineNames?.length) parts.push(cuisineNames.join('/'));
  let text = parts.length ? `Showing ${parts.join(', ')} venues` : 'Showing venues matching your search';
  if (isTopRated) text += ', sorted by top ratings';
  if (isNearMe) text += ' near you';
  if (location) text += ` in ${location}`;
  return text + '.';
}

/**
 * Parses a free-text Discover query into the same filter shape
 * aiService.parseIntent produced — entirely local, no network call.
 */
async function parseIntent(prompt) {
  // Entity extraction (cuisine/category/tag) + rule-based fallback for the
  // soft slots reuse the existing local parser unchanged.
  const entityFilters = await parsePrompt(prompt);

  const w = loadWeights();
  let soft = { mood: null, price: null, isNearMe: false, isTopRated: false };
  if (w) {
    const embedding = await aiService.generateEmbedding(prompt);
    if (embedding) soft = classifySoftSlots(embedding, w);
  }

  const priceRanges = soft.price === 'cheap' ? [1, 2]
    : soft.price === 'expensive' ? [3, 4]
    : entityFilters.priceRanges || [];

  const mood = soft.mood || entityFilters.mood || null;
  const isNearMe = soft.isNearMe || entityFilters.isNearMe || false;
  const isTopRated = soft.isTopRated || entityFilters.isTopRated || false;
  const sortBy = detectSortBy(prompt);
  const location = await detectLocation(prompt);

  const result = {
    cuisineIds: entityFilters.cuisineIds || [],
    categoryIds: entityFilters.categoryIds || [],
    tagIds: entityFilters.tagIds || [],
    priceRanges,
    mood,
    location,
    sortBy,
    isNearMe,
    isTopRated,
  };
  result.explanation = buildExplanation({ ...result, cuisineNames: [] });
  return result;
}

module.exports = { parseIntent };
