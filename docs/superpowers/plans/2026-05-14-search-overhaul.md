# Search Overhaul Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken search relevance system so only genuinely matching restaurants appear, with intelligent suggestion chips when nothing matches.

**Architecture:** A new pure `searchService.js` module handles tokenization, tiered text scoring, and suggestion generation. `recommendationService.js` imports it, removes the broken `isVerySpecific` gate, and returns `{ results, suggestions, searchMeta }`. The controller forwards these fields to the frontend. `Search.jsx` debounces input and shows clickable suggestion chips on empty results.

**Tech Stack:** Node.js, Express, Mongoose, `natural` (already installed — Jaro-Winkler), React, React Router v6

---

## File Map

| File | Status | Responsibility |
|------|--------|----------------|
| `restronet-backend/services/searchService.js` | **Create** | `tokenizeQuery`, `computeTextMatchScore`, `generateSuggestions`, `SEARCH_THRESHOLDS` |
| `restronet-backend/tests/searchService.test.js` | **Create** | Unit tests for all pure functions in searchService |
| `restronet-backend/services/recommendationService.js` | **Modify** | Import searchService; rewrite scoring loop; replace isVerySpecific; return `{ results, suggestions, searchMeta }` |
| `restronet-backend/controllers/recommendationController.js` | **Modify** | Destructure new return type; forward suggestions/searchMeta to response |
| `restronet-frontend/src/pages/Discover.jsx` | **Modify** | Fix `setRecommendations` → `setResults` (1 line) |
| `restronet-frontend/src/pages/Search.jsx` | **Modify** | Debounce input; suggestion chips in empty state |

---

## Task 1: Add Jest for backend unit tests

**Files:**
- Modify: `restronet-backend/package.json`
- Create: `restronet-backend/tests/` (directory)

- [ ] **Step 1: Install Jest as a dev dependency**

```bash
cd /Users/krishmaharjan/Desktop/RestroNet/restronet-backend && npm install --save-dev jest
```

Expected: Jest added under `devDependencies` in `package.json`.

- [ ] **Step 2: Add test scripts and Jest config to package.json**

Open `restronet-backend/package.json` and replace the `"scripts"` block and add a `"jest"` key:

```json
{
  "name": "restronet-backend",
  "version": "1.0.0",
  "description": "RESTRONET Restaurant Recommendation System - Backend API",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "seed": "node scripts/seed.js",
    "test": "jest",
    "test:watch": "jest --watch"
  },
  "jest": {
    "testEnvironment": "node",
    "testMatch": ["**/tests/**/*.test.js"]
  }
}
```

- [ ] **Step 3: Create the tests directory**

```bash
mkdir -p /Users/krishmaharjan/Desktop/RestroNet/restronet-backend/tests
```

- [ ] **Step 4: Verify Jest runs (no tests yet)**

```bash
cd /Users/krishmaharjan/Desktop/RestroNet/restronet-backend && npm test
```

Expected output: `No tests found` or `Test Suites: 0 passed`. No errors.

- [ ] **Step 5: Commit**

```bash
cd /Users/krishmaharjan/Desktop/RestroNet && git add restronet-backend/package.json restronet-backend/package-lock.json && git commit -m "chore: add Jest for backend unit testing"
```

---

## Task 2: Create searchService.js (TDD)

**Files:**
- Create: `restronet-backend/tests/searchService.test.js`
- Create: `restronet-backend/services/searchService.js`

### Step 2a — Write the failing tests first

- [ ] **Step 1: Create the test file**

Create `/Users/krishmaharjan/Desktop/RestroNet/restronet-backend/tests/searchService.test.js`:

```js
const {
  tokenizeQuery,
  computeTextMatchScore,
  generateSuggestions,
} = require('../services/searchService');

// Minimal venue builder — avoids repeating structure
const venue = (overrides = {}) => ({
  name: 'Test Restaurant',
  description: '',
  cuisines: [],
  category: null,
  tags: [],
  ...overrides,
});

// ─── tokenizeQuery ────────────────────────────────────────────────────────────

describe('tokenizeQuery', () => {
  test('lowercases and trims input', () => {
    const { normalized } = tokenizeQuery('  Fire  ');
    expect(normalized).toBe('fire');
  });

  test('splits multi-word query into tokens', () => {
    const { tokens } = tokenizeQuery('Fire Kitchen');
    expect(tokens).toContain('fire');
    expect(tokens).toContain('kitchen');
  });

  test('filters tokens of length <= TOKEN_MIN_LENGTH (2)', () => {
    // "a" and "to" are too short; "momo" is not
    const { tokens } = tokenizeQuery('a to momo');
    expect(tokens).not.toContain('a');
    expect(tokens).not.toContain('to');
    expect(tokens).toContain('momo');
  });

  test('handles empty string', () => {
    const { normalized, tokens } = tokenizeQuery('');
    expect(normalized).toBe('');
    expect(tokens).toHaveLength(0);
  });

  test('splits on hyphens and slashes', () => {
    const { tokens } = tokenizeQuery('fire-grill/bbq');
    expect(tokens).toContain('fire');
    expect(tokens).toContain('grill');
    expect(tokens).toContain('bbq');
  });
});

// ─── computeTextMatchScore ────────────────────────────────────────────────────

describe('computeTextMatchScore', () => {
  test('exact name match → score 1.0, reason exact_name', () => {
    const v = venue({ name: 'fire' });
    const result = computeTextMatchScore(v, 'fire', ['fire']);
    expect(result.score).toBe(1.0);
    expect(result.matchReason).toBe('exact_name');
    expect(result.matchedFields).toContain('name');
  });

  test('name starts-with query → score 0.95, reason name_startswith', () => {
    const v = venue({ name: 'Fire Kitchen' });
    const result = computeTextMatchScore(v, 'fire', ['fire']);
    expect(result.score).toBe(0.95);
    expect(result.matchReason).toBe('name_startswith');
  });

  test('name contains full query → score 0.90, reason name_contains', () => {
    const v = venue({ name: 'Dragon Fire BBQ' });
    const result = computeTextMatchScore(v, 'fire', ['fire']);
    expect(result.score).toBe(0.90);
    expect(result.matchReason).toBe('name_contains');
  });

  test('all tokens present in name → score 0.85, reason name_all_tokens', () => {
    const v = venue({ name: 'The BBQ Grill House' });
    const result = computeTextMatchScore(v, 'bbq grill', ['bbq', 'grill']);
    expect(result.score).toBe(0.85);
    expect(result.matchReason).toBe('name_all_tokens');
  });

  test('cuisine match → score 0.50, reason cuisine_match', () => {
    const v = venue({ name: 'Corner Bistro', cuisines: [{ name: 'Italian' }] });
    const result = computeTextMatchScore(v, 'italian', ['italian']);
    expect(result.score).toBe(0.50);
    expect(result.matchReason).toBe('cuisine_match');
    expect(result.matchedFields).toContain('cuisine');
  });

  test('category match → score 0.40, reason category_match', () => {
    const v = venue({ name: 'Corner Spot', category: { name: 'Cafe' } });
    const result = computeTextMatchScore(v, 'cafe', ['cafe']);
    expect(result.score).toBe(0.40);
    expect(result.matchReason).toBe('category_match');
  });

  test('tag match → score 0.30, reason tag_match', () => {
    const v = venue({ name: 'The Spot', tags: [{ name: 'Live Music' }] });
    const result = computeTextMatchScore(v, 'music', ['music']);
    expect(result.score).toBe(0.30);
    expect(result.matchReason).toBe('tag_match');
  });

  test('description exact match → score 0.20, reason description_exact', () => {
    const v = venue({ name: 'The Spot', description: 'Grilled over open fire pits' });
    const result = computeTextMatchScore(v, 'fire', ['fire']);
    expect(result.score).toBe(0.20);
    expect(result.matchReason).toBe('description_exact');
  });

  test('completely unrelated venue → score 0, reason no_match', () => {
    const v = venue({ name: 'Spicy Momo', description: 'Authentic momo shop' });
    const result = computeTextMatchScore(v, 'fire', ['fire']);
    expect(result.score).toBe(0);
    expect(result.matchReason).toBe('no_match');
  });

  test('empty query → score 0, reason no_query', () => {
    const v = venue({ name: 'Fire Kitchen' });
    const result = computeTextMatchScore(v, '', []);
    expect(result.score).toBe(0);
    expect(result.matchReason).toBe('no_query');
  });
});

// ─── generateSuggestions ─────────────────────────────────────────────────────

describe('generateSuggestions', () => {
  const sampleVenues = [
    venue({ name: 'Fire and Ice', cuisines: [] }),
    venue({ name: 'Dragon Fire BBQ', cuisines: [] }),
    venue({ name: 'Spicy Momo House', cuisines: [] }),
    venue({ name: 'Grill Station', cuisines: [{ name: 'Italian' }] }),
  ];

  test('returns suggestions whose names are similar to the search term', () => {
    const suggestions = generateSuggestions('fire', sampleVenues);
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.some(s => s.toLowerCase().includes('fire'))).toBe(true);
  });

  test('does not suggest completely unrelated venues', () => {
    const suggestions = generateSuggestions('fire', sampleVenues);
    expect(suggestions).not.toContain('Spicy Momo House');
  });

  test('returns empty array for empty searchTerm', () => {
    expect(generateSuggestions('', sampleVenues)).toHaveLength(0);
  });

  test('returns empty array when venues list is empty', () => {
    expect(generateSuggestions('fire', [])).toHaveLength(0);
  });

  test('returns at most 5 suggestions', () => {
    const manyVenues = Array.from({ length: 20 }, (_, i) =>
      venue({ name: `Fire House ${i}` })
    );
    const suggestions = generateSuggestions('fire', manyVenues);
    expect(suggestions.length).toBeLessThanOrEqual(5);
  });

  test('deduplicates suggestions (case-insensitive)', () => {
    const duplicateVenues = [
      venue({ name: 'Fire Kitchen' }),
      venue({ name: 'fire kitchen' }),
    ];
    const suggestions = generateSuggestions('fire', duplicateVenues);
    const lower = suggestions.map(s => s.toLowerCase());
    expect(new Set(lower).size).toBe(lower.length);
  });
});
```

- [ ] **Step 2: Run tests — expect them to fail (module not found)**

```bash
cd /Users/krishmaharjan/Desktop/RestroNet/restronet-backend && npm test
```

Expected: `Cannot find module '../services/searchService'` error for all test suites.

### Step 2b — Implement searchService.js

- [ ] **Step 3: Create the searchService module**

Create `/Users/krishmaharjan/Desktop/RestroNet/restronet-backend/services/searchService.js`:

```js
const natural = require('natural');

const SEARCH_THRESHOLDS = {
  FUZZY_NAME_MIN: 0.88,
  SUGGESTION_NAME_MIN: 0.70,
  SUGGESTION_CUISINE_MIN: 0.75,
  FILTER_CONTEXT_SCORE: 0.35,
  TOKEN_MIN_LENGTH: 2,
  MAX_SUGGESTIONS: 5,
};

/**
 * Normalizes and splits a query string into tokens.
 * Tokens shorter than TOKEN_MIN_LENGTH are dropped.
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
    .filter(t => t.length > SEARCH_THRESHOLDS.TOKEN_MIN_LENGTH);
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
      tokens.some(t => t.length > 2 && cuisineText.includes(t)))
  ) {
    return { score: 0.50, matchedFields: ['cuisine'], matchReason: 'cuisine_match' };
  }

  // Tier 8: Category name
  const catName = (venue.category?.name || '').toLowerCase();
  if (
    catName &&
    (catName.includes(normalized) ||
      tokens.some(t => t.length > 2 && catName.includes(t)))
  ) {
    return { score: 0.40, matchedFields: ['category'], matchReason: 'category_match' };
  }

  // Tier 9: Tag names
  const tags = Array.isArray(venue.tags) ? venue.tags : [];
  const tagText = tags.map(t => (t.name || '').toLowerCase()).join(' ');
  if (
    tagText &&
    (tagText.includes(normalized) ||
      tokens.some(t => t.length > 2 && tagText.includes(t)))
  ) {
    return { score: 0.30, matchedFields: ['tag'], matchReason: 'tag_match' };
  }

  // Tier 10: Description
  const desc = (venue.description || '').toLowerCase();
  if (desc.includes(normalized)) {
    return { score: 0.20, matchedFields: ['description'], matchReason: 'description_exact' };
  }
  if (tokens.some(t => t.length > 3 && desc.includes(t))) {
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

module.exports = {
  tokenizeQuery,
  computeTextMatchScore,
  generateSuggestions,
  SEARCH_THRESHOLDS,
};
```

- [ ] **Step 4: Run tests — expect them all to pass**

```bash
cd /Users/krishmaharjan/Desktop/RestroNet/restronet-backend && npm test
```

Expected output:
```
PASS  tests/searchService.test.js
  tokenizeQuery
    ✓ lowercases and trims input
    ✓ splits multi-word query into tokens
    ✓ filters tokens of length <= TOKEN_MIN_LENGTH (2)
    ✓ handles empty string
    ✓ splits on hyphens and slashes
  computeTextMatchScore
    ✓ exact name match → score 1.0, reason exact_name
    ✓ name starts-with query → score 0.95, reason name_startswith
    ✓ name contains full query → score 0.90, reason name_contains
    ✓ all tokens present in name → score 0.85, reason name_all_tokens
    ✓ cuisine match → score 0.50, reason cuisine_match
    ✓ category match → score 0.40, reason category_match
    ✓ tag match → score 0.30, reason tag_match
    ✓ description exact match → score 0.20, reason description_exact
    ✓ completely unrelated venue → score 0, reason no_match
    ✓ empty query → score 0, reason no_query
  generateSuggestions
    ✓ returns suggestions whose names are similar to the search term
    ✓ does not suggest completely unrelated venues
    ✓ returns empty array for empty searchTerm
    ✓ returns empty array when venues list is empty
    ✓ returns at most 5 suggestions
    ✓ deduplicates suggestions (case-insensitive)

Test Suites: 1 passed, 1 total
Tests:       21 passed, 21 total
```

If any test fails, fix `searchService.js` to match the failing assertion before proceeding.

- [ ] **Step 5: Commit**

```bash
cd /Users/krishmaharjan/Desktop/RestroNet && git add restronet-backend/services/searchService.js restronet-backend/tests/searchService.test.js && git commit -m "feat: add searchService with tiered text matching and suggestion generation"
```

---

## Task 3: Integrate searchService into recommendationService.js

**Files:**
- Modify: `restronet-backend/services/recommendationService.js`

The changes are:
1. Import `tokenizeQuery`, `computeTextMatchScore`, `generateSuggestions`, `SEARCH_THRESHOLDS` from searchService
2. Tokenize the search term once before the venue scoring loop
3. In the scoring map: compute `textMatch` via `computeTextMatchScore`; enhance `nameScore` using `Math.max(nameScore, textMatch.score * 0.65)`; add `textMatchScore/matchedFields/matchReason` to scored data
4. Replace the broken `isVerySpecific` block with the new filter
5. Replace the sort to use `textMatchScore` as primary key when searching
6. Change return type from `array` to `{ results, suggestions, searchMeta }`
7. Update the `getCBFRecommendations` legacy wrapper to destructure `results`

- [ ] **Step 1: Add the import at the top of recommendationService.js**

Open `restronet-backend/services/recommendationService.js`. After the existing requires at lines 1–4, add:

```js
const { tokenizeQuery, computeTextMatchScore, generateSuggestions, SEARCH_THRESHOLDS } = require('./searchService');
```

- [ ] **Step 2: Tokenize the search term once before the scoring loop**

In `getSmartRecommendations`, find the line `const venues = await Venue.find(filterQuery)...lean();` (currently around line 94). Directly after the `venues` assignment (after the closing `.lean();`), add:

```js
  // Tokenize search term once — shared across all venue scorings
  const { normalized: searchNormalized, tokens: searchTokens } = tokenizeQuery(searchTerm || '');
```

- [ ] **Step 3: Replace the nameScore + add textMatch inside the scoredVenues.map**

Inside the `scoredVenues = venues.map(venue => { ... })` block, find and replace the entire `// Exact or strong name match boost` block (lines ~108–119 in the original file):

```js
    // ── OLD code to REMOVE ──────────────────────────────────────────────────
    // Exact or strong name match boost
    let nameScore = 0;
    if (searchTerm) {
      const sLower = searchTerm.toLowerCase();
      const vName = venue.name.toLowerCase();
      if (vName === sLower) nameScore = 1.0;
      else if (vName.includes(sLower) || sLower.includes(vName)) nameScore = 0.8;
      else {
        // Partial matches on words
        const terms = sLower.split(/\s+/).filter(t => t.length > 2);
        const matches = terms.filter(t => vName.includes(t)).length;
        if (matches > 0) nameScore = (matches / terms.length) * 0.5;
      }
    }
```

Replace with:

```js
    // ── NEW: tiered text match via searchService ─────────────────────────────
    const textMatch = searchTerm
      ? computeTextMatchScore(venue, searchNormalized, searchTokens)
      : { score: 0, matchedFields: [], matchReason: 'no_query' };

    let nameScore = 0;
    if (searchTerm) {
      const vName = venue.name.toLowerCase();
      if (vName === searchNormalized) nameScore = 1.0;
      else if (
        vName.startsWith(searchNormalized + ' ') ||
        (vName.startsWith(searchNormalized) && vName.length > searchNormalized.length)
      ) nameScore = 0.95;
      else if (vName.includes(searchNormalized)) nameScore = 0.85;
      else if (searchNormalized.includes(vName)) nameScore = 0.75;
      else {
        const matches = searchTokens.filter(t => vName.includes(t)).length;
        if (matches > 0) nameScore = (matches / searchTokens.length) * 0.6;
      }
      // Boost: cuisine/tag/description matches feed into nameScore so they rank above zero
      nameScore = Math.max(nameScore, textMatch.score * 0.65);
    }
```

- [ ] **Step 4: Add textMatchScore and matchReason to the returned scored object**

Inside the same `scoredVenues.map`, find the `return { venue, finalScore, distanceKm, scoreBreakdown: {...} }` at the end (around line 143). Replace it with:

```js
    return {
      venue,
      finalScore,
      textMatchScore: textMatch.score,
      matchedFields:  textMatch.matchedFields,
      matchReason:    textMatch.matchReason,
      distanceKm,
      scoreBreakdown: {
        name:          Math.round(nameScore     * 100),
        cuisine:       Math.round(cuisineScore  * 100),
        category:      Math.round(categoryScore * 100),
        tag:           Math.round(tagScore      * 100),
        price:         Math.round(priceScore    * 100),
        rating:        Math.round(ratingScore   * 100),
        distance:      Math.round(distanceScore * 100),
        mood:          Math.round(moodScore     * 100),
        textMatch:     Math.round(textMatch.score * 100),
        matchedFields: textMatch.matchedFields,
        matchReason:   textMatch.matchReason,
      },
    };
```

- [ ] **Step 5: Replace the broken `isVerySpecific` block**

Find and remove this block (around lines 164–168 in the original):

```js
  // Search filtering
  if (searchTerm) {
    const isVerySpecific = searchTerm.split(/\s+/).length > 1 || searchTerm.length > 5;
    if (isVerySpecific) {
        filtered = filtered.filter(s => s.scoreBreakdown.name > 0 || s.finalScore > 0.4);
    }
  }
```

Replace with:

```js
  // Search relevance filter: when a searchTerm is present, require actual text match
  // OR (when filter context exists) a meaningful combined score.
  if (searchTerm) {
    const hasFilterContext =
      cuisineIds.length > 0 || categoryIds.length > 0 ||
      tagIds.length > 0 || priceRanges.length > 0 || !!mood;

    filtered = filtered.filter(s =>
      s.textMatchScore > 0 ||
      (hasFilterContext && s.finalScore > SEARCH_THRESHOLDS.FILTER_CONTEXT_SCORE)
    );
  }
```

- [ ] **Step 6: Replace the sort block to use textMatchScore as primary key when searching**

Find the existing sort block (around lines 180–197). Replace the entire block:

```js
  // 4. Sort (Strictly by attribute if sortBy is present, else by relevance)
  if (sortBy) {
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price_desc':    return b.venue.priceRange - a.venue.priceRange;
        case 'price_asc':     return a.venue.priceRange - b.venue.priceRange;
        case 'rating_desc':   return b.venue.averageRating - a.venue.averageRating;
        case 'rating_asc':    return a.venue.averageRating - b.venue.averageRating;
        case 'distance_desc': return (b.distanceKm || 0) - (a.distanceKm || 0);
        case 'distance_asc':  
          const distA = a.distanceKm === null ? Infinity : a.distanceKm;
          const distB = b.distanceKm === null ? Infinity : b.distanceKm;
          return distA - distB;
        default:              return b.finalScore - a.finalScore;
      }
    });
  } else {
    filtered.sort((a, b) => b.finalScore - a.finalScore);
  }
```

With:

```js
  // 4. Sort
  if (searchTerm && !sortBy) {
    // Text match is the primary key; finalScore breaks ties
    filtered.sort((a, b) => {
      if (b.textMatchScore !== a.textMatchScore) return b.textMatchScore - a.textMatchScore;
      return b.finalScore - a.finalScore;
    });
  } else if (sortBy) {
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price_desc':    return b.venue.priceRange - a.venue.priceRange;
        case 'price_asc':     return a.venue.priceRange - b.venue.priceRange;
        case 'rating_desc':   return b.venue.averageRating - a.venue.averageRating;
        case 'rating_asc':    return a.venue.averageRating - b.venue.averageRating;
        case 'distance_desc': return (b.distanceKm || 0) - (a.distanceKm || 0);
        case 'distance_asc': {
          const distA = a.distanceKm === null ? Infinity : a.distanceKm;
          const distB = b.distanceKm === null ? Infinity : b.distanceKm;
          return distA - distB;
        }
        default:              return b.finalScore - a.finalScore;
      }
    });
  } else {
    filtered.sort((a, b) => b.finalScore - a.finalScore);
  }
```

- [ ] **Step 7: Change the return statement to `{ results, suggestions, searchMeta }`**

Find the final `return filtered.slice(0, limit).map(item => ({...}))` (around lines 199–206). Replace it:

```js
  const results = filtered.slice(0, limit).map(item => ({
    ...item.venue,
    recommendationScore: Math.min(1, Math.max(0, item.finalScore)),
    scoreBreakdown: item.scoreBreakdown,
    distanceKm: item.distanceKm,
    matchedMood: mood,
  }));

  // Generate clickable suggestions only when search yields zero results
  const suggestions = (searchTerm && results.length === 0)
    ? generateSuggestions(searchTerm, venues)
    : [];

  return {
    results,
    suggestions,
    searchMeta: {
      query:        searchTerm,
      totalScanned: venues.length,
      matched:      filtered.length,
      filteredOut:  venues.length - filtered.length,
    },
  };
```

- [ ] **Step 8: Fix the legacy getCBFRecommendations wrapper**

Find the `getCBFRecommendations` function near the bottom of the file:

```js
const getCBFRecommendations = async (userId, limit = 10, lat = null, lng = null) => {
  return getSmartRecommendations({ userId, limit, lat, lng });
};
```

Replace with:

```js
const getCBFRecommendations = async (userId, limit = 10, lat = null, lng = null) => {
  const { results } = await getSmartRecommendations({ userId, limit, lat, lng });
  return results;
};
```

- [ ] **Step 9: Run the existing test suite to confirm no regressions**

```bash
cd /Users/krishmaharjan/Desktop/RestroNet/restronet-backend && npm test
```

Expected: 21 tests pass, 0 fail. (The searchService tests should still pass; no new tests added here.)

- [ ] **Step 10: Commit**

```bash
cd /Users/krishmaharjan/Desktop/RestroNet && git add restronet-backend/services/recommendationService.js && git commit -m "feat: integrate searchService into recommendation engine, fix isVerySpecific bug"
```

---

## Task 4: Update recommendationController.js to forward new response fields

**Files:**
- Modify: `restronet-backend/controllers/recommendationController.js`

The `getSmartRecommendationsHandler` currently does:
```js
const recommendations = await getSmartRecommendations({...});
res.json({ success: true, count: recommendations.length, recommendations, ... });
```
It needs to destructure the new `{ results, suggestions, searchMeta }` shape.

- [ ] **Step 1: Update getSmartRecommendationsHandler**

Open `restronet-backend/controllers/recommendationController.js`. Find the handler body that calls `getSmartRecommendations` (around lines 80–104). Replace the call and `res.json(...)`:

```js
    // OLD:
    const recommendations = await getSmartRecommendations({...});
    res.json({
      success: true,
      count: recommendations.length,
      recommendations,
      availableMoods: Object.keys(MOOD_KEYWORDS),
      parsedIntent: parsedFilters ? { ...parsedFilters, mood } : null,
      aiExplanation,
    });
```

With:

```js
    const { results, suggestions, searchMeta } = await getSmartRecommendations({
      userId:         req.user?._id || null,
      searchTerm:     prompt      || null,
      cuisineIds,
      categoryIds,
      tagIds,
      priceRanges,
      mood:           mood        || null,
      city:           city        || null,
      sortBy:         aiSortBy    || null,
      lat:            lat         ? parseFloat(lat)         : null,
      lng:            lng         ? parseFloat(lng)         : null,
      maxDistanceKm:  maxDistance ? parseFloat(maxDistance) : (isNearMe ? 10 : 20),
      limit:          limit       ? parseInt(limit, 10)     : 12,
      isTopRated,
    });

    res.json({
      success:        true,
      count:          results.length,
      recommendations: results,
      suggestions,
      searchMeta,
      availableMoods: Object.keys(MOOD_KEYWORDS),
      parsedIntent:   parsedFilters ? { ...parsedFilters, mood } : null,
      aiExplanation,
    });
```

- [ ] **Step 2: Verify the server starts without errors**

```bash
cd /Users/krishmaharjan/Desktop/RestroNet/restronet-backend && node -e "require('./controllers/recommendationController')" && echo "OK"
```

Expected: `OK` printed, no errors.

- [ ] **Step 3: Manual smoke test — search for "fire"**

Make sure the backend is running (`npm run dev` in another terminal), then:

```bash
curl -s "http://localhost:5000/api/recommendations/smart?prompt=fire&limit=50" | node -e "
const d = JSON.parse(require('fs').readFileSync('/dev/stdin', 'utf8'));
console.log('count:', d.count);
console.log('suggestions:', d.suggestions);
console.log('searchMeta:', JSON.stringify(d.searchMeta));
if (d.recommendations.length > 0) {
  console.log('First result:', d.recommendations[0].name, '| textMatch:', d.recommendations[0].scoreBreakdown?.textMatch, '| reason:', d.recommendations[0].scoreBreakdown?.matchReason);
}
"
```

Expected:
- `count` is low (only restaurants with "fire" in name/description/tag/cuisine)
- `suggestions` is an array (may contain similar names if count is 0)
- `searchMeta.filteredOut` equals roughly `totalScanned - matched`
- No unrelated restaurants appear

- [ ] **Step 4: Commit**

```bash
cd /Users/krishmaharjan/Desktop/RestroNet && git add restronet-backend/controllers/recommendationController.js && git commit -m "feat: expose suggestions and searchMeta in smart recommendations response"
```

---

## Task 5: Fix Discover.jsx — setRecommendations → setResults

**Files:**
- Modify: `restronet-frontend/src/pages/Discover.jsx`

- [ ] **Step 1: Fix the one-line bug**

Open `restronet-frontend/src/pages/Discover.jsx`. Find line 91:

```js
        setRecommendations(res.data.recommendations || []);
```

Replace with:

```js
        setResults(res.data.recommendations || []);
```

- [ ] **Step 2: Verify the Discover page compiles without errors**

```bash
cd /Users/krishmaharjan/Desktop/RestroNet/restronet-frontend && npx vite build --mode development 2>&1 | tail -5
```

Expected: No TypeScript/JSX errors mentioning `setRecommendations`.

- [ ] **Step 3: Commit**

```bash
cd /Users/krishmaharjan/Desktop/RestroNet && git add restronet-frontend/src/pages/Discover.jsx && git commit -m "fix: correct setRecommendations → setResults in Discover page (results never rendered)"
```

---

## Task 6: Update Search.jsx — debounce + suggestion chips

**Files:**
- Modify: `restronet-frontend/src/pages/Search.jsx`

Changes:
1. Add `localQuery` state that mirrors the input; URL updates are debounced 500ms
2. Add `suggestions` state populated from `res.data.suggestions`
3. Replace the empty state with a smart empty state: suggestion chips when available
4. `handleSuggestionClick` replaces localQuery + immediately syncs URL
5. `clearFilters` also resets `localQuery`

- [ ] **Step 1: Replace the full Search.jsx**

Open `restronet-frontend/src/pages/Search.jsx` and replace the entire file content with:

```jsx
import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Search as SearchIcon, Map as MapIcon, List, Star } from 'lucide-react';
import api from '../services/api';
import RestaurantCard from '../components/RestaurantCard';
import { motion, AnimatePresence } from 'framer-motion';

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
let DefaultIcon = L.icon({ iconUrl, shadowUrl: iconShadow, iconAnchor: [12, 41] });
L.Marker.prototype.options.icon = DefaultIcon;

const MapUpdater = ({ venues, userCoords }) => {
  const map = useMap();
  useEffect(() => {
    if (venues.length > 0 || userCoords) {
      const points = venues.map(v => [v.location.coordinates[1], v.location.coordinates[0]]);
      if (userCoords) points.push([userCoords.lat, userCoords.lng]);
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [venues, userCoords, map]);
  return null;
};

const Search = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = searchParams.get('q') || '';

  // localQuery drives the input; URL is only updated after a 500ms pause
  const [localQuery, setLocalQuery] = useState(query);
  const [venues, setVenues]         = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [viewMode, setViewMode]     = useState('split');

  const [selectedCuisine, setSelectedCuisine] = useState('');
  const [selectedRating, setSelectedRating]   = useState('');
  const [cuisinesList, setCuisinesList]       = useState([]);
  const [coords, setCoords]                   = useState(null);

  // Keep localQuery in sync when URL changes externally (e.g., browser back/forward)
  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  // Debounce: update URL 500ms after the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      const trimmed = localQuery.trim();
      setSearchParams(trimmed ? { q: trimmed } : {});
    }, 500);
    return () => clearTimeout(timer);
  }, [localQuery]);

  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const res = await api.get('/metadata/cuisines');
        setCuisinesList(res.data.cuisines);
      } catch (err) { console.error(err); }
    };
    fetchMeta();

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        err => console.warn('Location denied', err)
      );
    }

    const handleResize = () => {
      if (window.innerWidth < 1024 && viewMode === 'split') setViewMode('list');
      else if (window.innerWidth >= 1024 && viewMode !== 'split') setViewMode('split');
    };
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch venues whenever the URL query (not localQuery) changes
  useEffect(() => {
    let active = true;

    const fetchVenues = async () => {
      setLoading(true);
      try {
        let endpoint = `/recommendations/smart?limit=50`;
        if (query) endpoint += `&prompt=${encodeURIComponent(query)}`;
        if (selectedCuisine) endpoint += `&cuisines=${selectedCuisine}`;
        if (coords) endpoint += `&lat=${coords.lat}&lng=${coords.lng}`;

        const res = await api.get(endpoint);
        if (!active) return;

        let results = res.data.recommendations || [];
        if (selectedRating) {
          results = results.filter(v => v.averageRating >= parseFloat(selectedRating));
        }

        setVenues(results);
        setSuggestions(res.data.suggestions || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchVenues();
    return () => { active = false; };
  }, [query, selectedCuisine, selectedRating, coords]);

  // Clicking a suggestion replaces the query in-place and triggers a new search immediately
  const handleSuggestionClick = (suggestion) => {
    setLocalQuery(suggestion);
    setSearchParams({ q: suggestion });
  };

  const clearFilters = () => {
    setSearchParams({});
    setSelectedCuisine('');
    setSelectedRating('');
    setLocalQuery('');
  };

  return (
    <div className="flex h-[calc(100vh-80px)] w-full bg-white relative overflow-hidden">

      {/* Mobile View Toggles */}
      <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex bg-gray-900 text-white rounded-full shadow-2xl overflow-hidden p-1">
        <button
          onClick={() => setViewMode('list')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-full transition-colors ${viewMode === 'list' ? 'bg-white text-gray-900 font-bold' : 'text-gray-300 font-medium'}`}
        >
          <List size={18} /> List
        </button>
        <button
          onClick={() => setViewMode('map')}
          className={`flex items-center gap-2 px-6 py-2.5 rounded-full transition-colors ${viewMode === 'map' ? 'bg-white text-gray-900 font-bold' : 'text-gray-300 font-medium'}`}
        >
          <MapIcon size={18} /> Map
        </button>
      </div>

      {/* ─── SIDEBAR (FILTERS & LIST) ─── */}
      <div className={`
        ${viewMode === 'split' ? 'w-[55%] xl:w-[45%]' : viewMode === 'list' ? 'w-full' : 'hidden'}
        h-full flex flex-col border-r border-gray-100 bg-white z-10 transition-all duration-300
      `}>

        {/* Filters Header (Sticky) */}
        <div className="bg-white/80 backdrop-blur-xl px-8 py-8 border-b border-gray-100 z-20">
          <div className="mb-8">
            <div className="relative w-full">
              <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Search places or dishes..."
                value={localQuery}
                onChange={(e) => setLocalQuery(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-gray-50 border-transparent rounded-2xl outline-none focus:bg-white focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all font-bold text-gray-800 placeholder-gray-400"
              />
            </div>
          </div>

          <div className="space-y-6">
            {/* Rating pills */}
            <div className="flex items-center gap-4 overflow-x-auto pb-1 scrollbar-hide">
              <span className="text-label shrink-0">Rating</span>
              <div className="flex gap-2">
                {[
                  { label: 'All', value: '' },
                  { label: '4.5+', value: '4.5' },
                  { label: '4.0+', value: '4.0' },
                  { label: '3.5+', value: '3.5' },
                ].map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedRating(opt.value)}
                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedRating === opt.value
                      ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cuisine pills */}
            {cuisinesList.length > 0 && (
              <div className="flex items-center gap-4 overflow-x-auto pb-1 scrollbar-hide">
                <span className="text-label shrink-0">Cuisine</span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedCuisine('')}
                    className={`whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedCuisine === ''
                      ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                      : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    All
                  </button>
                  {cuisinesList.map(c => (
                    <button
                      key={c._id}
                      onClick={() => setSelectedCuisine(c._id)}
                      className={`whitespace-nowrap px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${selectedCuisine === c._id
                        ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                        : 'bg-white text-gray-500 border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-8 scroll-smooth bg-gray-50/30">
          <div className="mb-8 flex justify-between items-center">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-[0.2em]">
              {loading ? 'Searching...' : `${venues.length} Curated Spots`}
            </h2>
            {(query || selectedCuisine || selectedRating) && (
              <button onClick={clearFilters} className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">
                Reset Filters
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="bg-white rounded-2xl h-80 animate-pulse border border-gray-100 p-4">
                  <div className="bg-gray-200 h-40 rounded-xl mb-4"></div>
                  <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : venues.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <SearchIcon size={40} className="text-gray-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {query ? `No results for "${query}"` : 'No restaurants found'}
              </h3>
              {suggestions.length > 0 ? (
                <>
                  <p className="text-gray-500 mb-5">Try one of these instead:</p>
                  <div className="flex flex-wrap justify-center gap-2 mb-6">
                    {suggestions.map(s => (
                      <button
                        key={s}
                        onClick={() => handleSuggestionClick(s)}
                        className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-full text-sm font-semibold hover:bg-primary hover:text-white transition-all"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <p className="text-gray-500 mb-6">Try changing or clearing your filters to see more results.</p>
                  <button onClick={clearFilters} className="btn-secondary-modern">Clear all filters</button>
                </>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-20 lg:pb-0">
              <AnimatePresence>
                {venues.map((venue, i) => (
                  <motion.div
                    key={venue._id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ delay: i * 0.05 }}
                  >
                    <RestaurantCard venue={venue} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>

      {/* ─── MAP VIEW ─── */}
      <div className={`
        ${viewMode === 'split' ? 'w-[45%] xl:w-[55%]' : viewMode === 'map' ? 'w-full' : 'hidden'}
        h-full bg-gray-200 relative z-0
      `}>
        <MapContainer
          center={[27.7172, 85.3240]}
          zoom={13}
          style={{ height: '100%', width: '100%' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <MapUpdater venues={venues} userCoords={coords} />

          {coords && (
            <Marker
              position={[coords.lat, coords.lng]}
              icon={L.divIcon({
                className: 'user-location-marker',
                html: `<div class="relative">
                  <div class="w-5 h-5 bg-blue-500 rounded-full border-4 border-white shadow-lg animate-pulse"></div>
                  <div class="absolute -inset-2 bg-blue-500 rounded-full opacity-20 animate-ping"></div>
                </div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
              })}
            >
              <Popup>You are here</Popup>
            </Marker>
          )}

          {venues.map(venue => (
            <Marker
              key={venue._id}
              position={[venue.location.coordinates[1], venue.location.coordinates[0]]}
            >
              <Popup className="custom-popup" closeButton={false}>
                <a href={`/restaurant/${venue.slug}`} className="block overflow-hidden rounded-lg min-w-[200px]">
                  {venue.logo && (
                    <img src={`http://localhost:5000${venue.logo}`} alt={venue.name} className="w-full h-24 object-cover" />
                  )}
                  <div className="p-3 bg-white">
                    <h4 className="font-bold text-gray-900 mb-1">{venue.name}</h4>
                    <div className="flex items-center gap-1 text-sm font-semibold text-green-700">
                      {venue.averageRating.toFixed(1)} <Star size={12} className="fill-current" />
                    </div>
                  </div>
                </a>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

    </div>
  );
};

export default Search;
```

- [ ] **Step 2: Verify frontend compiles**

```bash
cd /Users/krishmaharjan/Desktop/RestroNet/restronet-frontend && npx vite build --mode development 2>&1 | grep -E "error|warning|built" | head -10
```

Expected: `built in Xms` with no JSX/import errors.

- [ ] **Step 3: Manual test in browser**

Start both servers if not already running:
```bash
# Terminal 1
cd /Users/krishmaharjan/Desktop/RestroNet/restronet-backend && npm run dev
# Terminal 2
cd /Users/krishmaharjan/Desktop/RestroNet/restronet-frontend && npm run dev
```

Open `http://localhost:5173` and navigate to the search page. Verify:
1. Type `fire` slowly — the URL should NOT update on every keystroke (wait 500ms after you stop)
2. If no restaurants contain "fire", suggestion chips appear (e.g. "Fire and Ice", "Grill")
3. Clicking a chip immediately replaces the query and searches again
4. Type `momo` — only restaurants with "momo" in name/tags/cuisine/description appear
5. Type `pizza` or a cuisine that exists — matching restaurants appear
6. Navigate to `/discover` — results should now display (setResults bug fixed)

- [ ] **Step 4: Commit**

```bash
cd /Users/krishmaharjan/Desktop/RestroNet && git add restronet-frontend/src/pages/Search.jsx && git commit -m "feat: debounce search input + intelligent suggestion chips on empty state"
```

---

## Self-Review Checklist

**Spec coverage:**
- ✅ Strict search relevance: `textMatchScore > 0` gate in Task 3 Step 5
- ✅ Tiered text matching (exact → fuzzy → cuisine → tag → description): `computeTextMatchScore` in Task 2 Step 3
- ✅ Intelligent empty state with chips: Task 6 empty-state JSX
- ✅ Clicking suggestion replaces query in-place: `handleSuggestionClick` in Task 6
- ✅ Debounced input 500ms: Task 6 `useEffect` + `localQuery`
- ✅ `matchReason`, `matchedFields`, `textMatch` score in API: Task 3 Step 4
- ✅ `suggestions` and `searchMeta` in response: Task 3 Step 7 + Task 4 Step 1
- ✅ `generateSuggestions` pure function: Task 2 Step 3
- ✅ `tokenizeQuery` pure function: Task 2 Step 3
- ✅ `SEARCH_THRESHOLDS` configurable constants: Task 2 Step 3 top of file
- ✅ Discover.jsx `setRecommendations` bug: Task 5
- ✅ `getCBFRecommendations` legacy wrapper updated: Task 3 Step 8

**Type consistency across tasks:**
- `getSmartRecommendations` returns `{ results, suggestions, searchMeta }` — used in Task 3 Step 7, destructured in Task 4 Step 1 ✅
- `computeTextMatchScore` returns `{ score, matchedFields, matchReason }` — produced in Task 2, consumed in Task 3 Step 3 ✅
- `generateSuggestions(searchTerm, venues)` — defined in Task 2, called in Task 3 Step 7 ✅
- `tokenizeQuery(query)` returns `{ normalized, tokens }` — defined in Task 2, called in Task 3 Step 2 as `{ normalized: searchNormalized, tokens: searchTokens }` ✅
