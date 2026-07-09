const natural = require('natural');

const SEARCH_THRESHOLDS = {
  FUZZY_NAME_MIN: 0.88,
  SUGGESTION_NAME_MIN: 0.70,
  SUGGESTION_CUISINE_MIN: 0.75,
  FILTER_CONTEXT_SCORE: 0.35,
  TOKEN_MIN_LENGTH: 2,
  MAX_SUGGESTIONS: 5,
  // Minimum textMatchScore to be included in strict search results.
  // Scores below this (e.g. description_token at 0.15) are treated as no-match.
  HIGH_CONFIDENCE_THRESHOLD: 0.25,
};

// Common words that appear inside other words as substrings and pollute token matching
const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'been', 'by', 'can', 'do',
  'for', 'from', 'had', 'has', 'have', 'in', 'is', 'it', 'its', 'no',
  'not', 'of', 'on', 'or', 'the', 'this', 'to', 'was', 'with',
  // Restaurant-domain generic nouns — never signal a specific venue
  'restaurant', 'restaurants', 'cafe', 'cafes', 'eatery', 'eateries',
  'diner', 'diners', 'canteen', 'bistro', 'hotel', 'bar', 'pub', 'kitchen',
  'house', 'corner', 'place', 'places', 'spot', 'spots', 'lounge', 'grill',
  'eat', 'eats', 'food', 'foods', 'dining', 'dine', 'meal', 'meals',
]);

/**
 * Whole-word token match. Substring `includes` lets short tokens hit inside
 * unrelated words ("eat" ∈ "Seating") and pollute cuisine/category/tag tiers.
 * Tokens are already sanitized to [a-z0-9] so they are regex-safe.
 */
function tokenMatchesText(token, text) {
  return new RegExp(`\\b${token}\\b`).test(text);
}

/**
 * Normalizes and splits a query string into tokens.
 * Tokens shorter than TOKEN_MIN_LENGTH or in the stop-word list are dropped.
 * The full normalized string is preserved separately for exact/contains matching.
 *
 * @param {string} query
 * @returns {{ normalized: string, tokens: string[] }}
 */
function tokenizeQuery(query) {
  if (!query) return { normalized: '', tokens: [] };
  const normalized = query.toLowerCase().trim();
  const tokens = normalized
    .split(/[\s,\-_/]+/)
    .map(t => t.replace(/[^a-z0-9]/g, ''))
    .filter(t => t.length > SEARCH_THRESHOLDS.TOKEN_MIN_LENGTH && !STOP_WORDS.has(t));
  return { normalized, tokens };
}

/**
 * Computes a tiered text match score for a venue against a search query.
 * Cascade priority: exact name → starts-with → contains → all tokens →
 * partial tokens → fuzzy name → cuisine → category → tags → description.
 *
 * @param {Object}   venue      - Mongoose lean venue with populated cuisines/tags/category
 * @param {string}   normalized - output of tokenizeQuery().normalized
 * @param {string[]} tokens     - output of tokenizeQuery().tokens
 * @returns {{ score: number, matchedFields: string[], matchReason: string }}
 */
function computeTextMatchScore(venue, normalized, tokens) {
  if (!normalized) {
    return { score: 0, matchedFields: [], matchReason: 'no_query' };
  }

  const name = (venue.name || '').toLowerCase();

  // Tier 1: Exact name
  if (name === normalized) {
    return { score: 1.0, matchedFields: ['name'], matchReason: 'exact_name' };
  }

  // Tier 2: Name starts with query (followed by space or longer)
  if (
    name.startsWith(normalized + ' ') ||
    (name.startsWith(normalized) && name.length > normalized.length)
  ) {
    return { score: 0.95, matchedFields: ['name'], matchReason: 'name_startswith' };
  }

  // Tier 3: Name contains the full query string
  if (name.includes(normalized)) {
    return { score: 0.90, matchedFields: ['name'], matchReason: 'name_contains' };
  }

  // Tier 4–5: Token matching in name
  if (tokens.length > 0) {
    const nameTokenMatches = tokens.filter(t => name.includes(t));

    if (nameTokenMatches.length === tokens.length) {
      return { score: 0.85, matchedFields: ['name'], matchReason: 'name_all_tokens' };
    }

    if (nameTokenMatches.length > 0) {
      const ratio = nameTokenMatches.length / tokens.length;
      return {
        score: Math.round(ratio * 0.65 * 100) / 100,
        matchedFields: ['name'],
        matchReason: 'name_partial_tokens',
      };
    }
  }

  // Tier 6: Fuzzy word-level match in name (Jaro-Winkler)
  const nameWords = name.split(/\s+/);
  for (const word of nameWords) {
    for (const token of tokens) {
      if (token.length < 3) continue;
      const sim = natural.JaroWinklerDistance(token, word);
      if (sim >= SEARCH_THRESHOLDS.FUZZY_NAME_MIN) {
        return {
          score: Math.round(sim * 0.5 * 100) / 100,
          matchedFields: ['name'],
          matchReason: 'name_fuzzy',
        };
      }
    }
  }

  // Tier 7: Cuisine name
  const cuisines = Array.isArray(venue.cuisines) ? venue.cuisines : [];
  const cuisineText = cuisines.map(c => (c.name || '').toLowerCase()).join(' ');
  if (
    cuisineText &&
    (cuisineText.includes(normalized) ||
      tokens.some(t => t.length > 2 && tokenMatchesText(t, cuisineText)))
  ) {
    return { score: 0.50, matchedFields: ['cuisine'], matchReason: 'cuisine_match' };
  }

  // Tier 8: Category name
  const catName = (venue.category?.name || '').toLowerCase();
  if (
    catName &&
    (catName.includes(normalized) ||
      tokens.some(t => t.length > 2 && tokenMatchesText(t, catName)))
  ) {
    return { score: 0.40, matchedFields: ['category'], matchReason: 'category_match' };
  }

  // Tier 9: Tag names
  const tags = Array.isArray(venue.tags) ? venue.tags : [];
  const tagText = tags.map(t => (t.name || '').toLowerCase()).join(' ');
  if (
    tagText &&
    (tagText.includes(normalized) ||
      tokens.some(t => t.length > 2 && tokenMatchesText(t, tagText)))
  ) {
    return { score: 0.30, matchedFields: ['tag'], matchReason: 'tag_match' };
  }

  // Tier 10: Description
  // description_exact sits at HIGH_CONFIDENCE_THRESHOLD (0.25) — included.
  // description_token stays at 0.15 — below the threshold, excluded in strict mode.
  const desc = (venue.description || '').toLowerCase();
  if (desc.includes(normalized)) {
    return { score: 0.25, matchedFields: ['description'], matchReason: 'description_exact' };
  }
  if (tokens.some(t => t.length > 3 && tokenMatchesText(t, desc))) {
    return { score: 0.15, matchedFields: ['description'], matchReason: 'description_token' };
  }

  return { score: 0, matchedFields: [], matchReason: 'no_match' };
}

/**
 * Generates up to MAX_SUGGESTIONS suggestion strings when a search returns 0 results.
 * Uses Jaro-Winkler similarity against venue names and cuisine names.
 *
 * @param {string}   searchTerm
 * @param {Object[]} allVenues  - populated Venue documents
 * @returns {string[]}          - display strings for suggestion chips
 */
function generateSuggestions(searchTerm, allVenues) {
  if (!searchTerm || !allVenues.length) return [];

  const { tokens } = tokenizeQuery(searchTerm);
  if (!tokens.length) return [];

  const candidates = [];

  for (const venue of allVenues) {
    const name = (venue.name || '').toLowerCase();
    const nameWords = name.split(/\s+/);

    // Score against venue name words
    let bestNameSim = 0;
    for (const word of nameWords) {
      for (const token of tokens) {
        if (token.length < 2) continue;
        const sim = natural.JaroWinklerDistance(token, word);
        if (sim > bestNameSim) bestNameSim = sim;
      }
    }
    if (bestNameSim >= SEARCH_THRESHOLDS.SUGGESTION_NAME_MIN) {
      candidates.push({ text: venue.name, score: bestNameSim });
    }

    // Score against cuisine names
    const cuisines = Array.isArray(venue.cuisines) ? venue.cuisines : [];
    for (const c of cuisines) {
      if (!c.name) continue;
      const cn = c.name.toLowerCase();
      for (const token of tokens) {
        if (token.length < 2) continue;
        const sim = natural.JaroWinklerDistance(token, cn);
        if (sim >= SEARCH_THRESHOLDS.SUGGESTION_CUISINE_MIN) {
          candidates.push({ text: c.name, score: sim * 0.9 });
        }
      }
    }
  }

  // Sort by score, deduplicate by lowercase key, cap at MAX_SUGGESTIONS
  candidates.sort((a, b) => b.score - a.score);
  const seen = new Set();
  const result = [];
  for (const item of candidates) {
    const key = (item.text || '').toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item.text);
      if (result.length >= SEARCH_THRESHOLDS.MAX_SUGGESTIONS) break;
    }
  }
  return result;
}

/**
 * Applies confidence-tier gating: returns only the highest-confidence tier
 * that has at least one result, preventing weaker matches from appearing
 * alongside (or instead of) strong ones.
 *
 * Tier thresholds:
 *  1.0  → exact name match — return ONLY these when present
 *  0.85 → strong (all-tokens / starts-with)
 *  0.50 → moderate (cuisine, category, fuzzy)
 *  0.01 → weak (description, partial tokens)
 *
 * @param {Array<{textMatchScore: number}>} scoredVenues
 * @returns {Array<{textMatchScore: number}>}
 */
function selectByConfidenceTier(scoredVenues) {
  // Hard floor: anything below HIGH_CONFIDENCE_THRESHOLD is treated as no-match.
  // This excludes description_token (0.15) and weak partial-token hits.
  const aboveFloor = scoredVenues.filter(
    s => s.textMatchScore >= SEARCH_THRESHOLDS.HIGH_CONFIDENCE_THRESHOLD
  );
  if (!aboveFloor.length) return [];

  // Within qualifying venues, return only the highest-confidence tier present.
  // An exact match (1.0) gates out everything weaker — no partial results alongside it.
  const tiers = [1.0, 0.85, 0.50, SEARCH_THRESHOLDS.HIGH_CONFIDENCE_THRESHOLD];
  for (const min of tiers) {
    const matches = aboveFloor.filter(s => s.textMatchScore >= min);
    if (matches.length > 0) return matches;
  }
  return [];
}

module.exports = {
  tokenizeQuery,
  computeTextMatchScore,
  generateSuggestions,
  selectByConfidenceTier,
  SEARCH_THRESHOLDS,
};
