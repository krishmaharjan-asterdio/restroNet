# RestroNet Search System — Production Overhaul
**Date:** 2026-05-14  
**Status:** Design (pending implementation)

---

## Problem Statement

When a user searches `"fire"`, every restaurant in the database is returned. The root causes are:

1. **`isVerySpecific` bug** (`recommendationService.js:165`) — the filter that would block irrelevant venues is skipped for any query that is a single word ≤ 5 characters. `"fire"` has 4 characters, so the filter is never applied.
2. **0.5 default scores inflate irrelevant venues** — when no filters match (empty cuisineIds, tagIds, etc.), every scoring function returns `0.5`. A restaurant with zero name relevance still gets `finalScore ≈ 0.35`, which would pass a threshold of `0.4` only if the threshold applied — but it doesn't (bug 1).
3. **Text matching limited to venue name only** — matches on cuisine names, category, tags, and description are never checked. Searching `"cafe"` when a restaurant's category is "Café" but its name is "Soulful Corner" would yield zero match.
4. **Discover.jsx shows nothing** — `setRecommendations(...)` is called on line 91 but the state variable is `results`/`setResults`. `setRecommendations` is undefined, so the results panel always renders the empty state.
5. **Search.jsx floods the API** — every keystroke updates the URL query param, which triggers a `useEffect`, which fires an API call. Typing `"fire"` sends 4 requests.

---

## Goals

- **Strict relevance**: only return restaurants genuinely related to the query
- **Tiered text matching**: exact → starts-with → tokens → fuzzy → cuisine/tag/category → description
- **Intelligent empty state**: when zero results, show suggestion chips derived from similar venue names, cuisines, and tags
- **Suggestions replace query in-place**: clicking a chip immediately replaces the current query and searches
- **Debounced input**: 500 ms delay, API called only when user pauses typing
- **Observability**: `matchReason`, `matchedFields`, `textMatchScore`, `finalScore` exposed per result
- **Clean architecture**: search logic extracted into a dedicated, testable module

---

## Architecture

### New file

```
restronet-backend/services/searchService.js
```

Exports four pure functions used by the recommendation engine:
- `tokenizeQuery(query)` — normalizes and splits into tokens
- `computeTextMatchScore(venue, normalized, tokens)` — tiered scoring against all text fields
- `generateSuggestions(searchTerm, allVenues)` — produces up to 5 suggestions when no results
- `rankSearchResults(scoredVenues)` — sorts by textMatchScore then finalScore

### Modified files

| File | Change |
|------|--------|
| `services/recommendationService.js` | Import searchService; remove `isVerySpecific`; use `computeTextMatchScore` for filtering and nameScore boosting; add `textMatchScore`, `matchedFields`, `matchReason` to response |
| `controllers/recommendationController.js` | Call `generateSuggestions` when count = 0; add `suggestions` and `searchMeta` to response |
| `pages/Search.jsx` | Add 500 ms debounce via local state + `useEffect`; suggestion chips in empty state; clicking chip replaces query |
| `pages/Discover.jsx` | Fix `setRecommendations` → `setResults` on line 91 |

---

## Data Flow (Search path)

```
User types "fire"
  → [500ms debounce]
  → URL params update: ?q=fire
  → GET /api/recommendations/smart?prompt=fire&limit=50
    → aiService.parseIntent("fire") → {cuisineIds:[], tagIds:[], ...}
    → parsePrompt fallback if AI fails
    → getSmartRecommendations({ searchTerm:"fire", cuisineIds:[], tagIds:[], ... })
      → Venue.find({ isActive:true }) → all venues (populated)
      → tokenizeQuery("fire") → { normalized:"fire", tokens:["fire"] }
      → for each venue:
          computeTextMatchScore(venue, "fire", ["fire"])
          computeNameScore(venue, "fire")  ← boosted by textMatchScore
          finalScore = weighted sum
      → filter: keep if textMatchScore > 0  (strict pure-search mode)
              OR if hasFilterContext && finalScore > 0.35
      → count === 0 → generateSuggestions("fire", allVenues)
      → sort by finalScore desc
      → slice to limit
    → return { recommendations, suggestions, searchMeta }
  → Frontend renders results or empty state with suggestion chips
    → clicking suggestion: setLocalQuery("Fire and Ice") → immediate search
```

---

## Text Match Scoring Tiers (`computeTextMatchScore`)

Returns `{ score: 0–1, matchedFields: string[], matchReason: string }`

| Priority | Condition | Score | matchReason |
|----------|-----------|-------|-------------|
| 1 | Name === query (exact) | 1.00 | `exact_name` |
| 2 | Name starts with query | 0.95 | `name_startswith` |
| 3 | Name contains full query | 0.90 | `name_contains` |
| 4 | All query tokens present in name | 0.85 | `name_all_tokens` |
| 5 | Some query tokens in name | 0.40–0.70 | `name_partial_tokens` |
| 6 | Fuzzy word match in name (JW > 0.88) | 0.40–0.50 | `name_fuzzy` |
| 7 | Cuisine name contains query/token | 0.50 | `cuisine_match` |
| 8 | Category name contains query/token | 0.40 | `category_match` |
| 9 | Tag name contains query/token | 0.30 | `tag_match` |
| 10 | Description contains full query | 0.20 | `description_exact` |
| 11 | Description contains a token (>3 chars) | 0.15 | `description_token` |
| 0 | No match anywhere | 0.00 | `no_match` |

**Token minimum length:** > 1 character (so `"fire"` is always included, unlike the current `> 2` filter that accidentally excluded 3-char words).

---

## Filter Logic (replacing `isVerySpecific`)

```js
// In getSmartRecommendations, after scoring:
if (searchTerm) {
  const hasFilterContext =
    cuisineIds.length > 0 || categoryIds.length > 0 ||
    tagIds.length > 0 || priceRanges.length > 0 || !!mood;

  filtered = filtered.filter(s =>
    s.textMatchScore > 0 ||
    (hasFilterContext && s.finalScore > 0.35)
  );
}
```

**Pure text search** (`searchTerm` + no filter context): only venues with `textMatchScore > 0` appear. "Spicy Momo" with no "fire" anywhere → excluded.

**Mixed search** (`searchTerm` + parsed cuisine/tag/mood): venues that got through the explicit cuisine strict-filter, plus any with meaningful finalScore from the filter context.

---

## nameScore Enhancement

Current `nameScore` only feeds `name: 0.4` weight. Extend it so non-name text matches also contribute:

```js
// After computing textMatchScore:
// If the text match was via cuisine/tag/description, boost nameScore proportionally
// so these venues rank above zero in the weighted final score
nameScore = Math.max(nameScore, textMatchScore * 0.65);
```

This ensures a venue matching via cuisine tag (`textMatchScore = 0.30`) gets `nameScore = 0.195` instead of 0, and ranks above a venue with `textMatchScore = 0.15`.

---

## Suggestion Generation (`generateSuggestions`)

Called only when `searchTerm` is present and `results.length === 0`:

1. For each venue, compute **Jaro-Winkler similarity** between each search token and each word in the venue name. Threshold: > 0.70 → candidate.
2. Also match cuisine names (threshold 0.75) and category names (0.75).
3. Collect all candidates, sort by similarity score desc.
4. Deduplicate (case-insensitive), take top 5.
5. Return as `string[]` (display names).

**Example:** query `"fires"` → candidates include `"Fire and Ice"` (JW("fires","fire") ≈ 0.97), `"Grill House"` (lower similarity) → suggestions: `["Fire and Ice", "Grill Station"]`.

---

## API Response Structure

### With results

```json
{
  "success": true,
  "count": 3,
  "recommendations": [
    {
      "name": "Fire and Ice",
      "...other venue fields...",
      "recommendationScore": 0.92,
      "distanceKm": 1.2,
      "scoreBreakdown": {
        "name": 95,
        "cuisine": 50,
        "category": 0,
        "tag": 0,
        "price": 50,
        "rating": 80,
        "distance": 70,
        "mood": 50,
        "textMatch": 95,
        "matchedFields": ["name"],
        "matchReason": "name_startswith"
      }
    }
  ],
  "suggestions": [],
  "searchMeta": {
    "query": "fire",
    "totalScanned": 45,
    "matched": 3,
    "filteredOut": 42
  },
  "parsedIntent": { "cuisineIds": [], "tagIds": [] },
  "aiExplanation": null
}
```

### With zero results

```json
{
  "success": true,
  "count": 0,
  "recommendations": [],
  "suggestions": ["Fire and Ice", "Grill House", "BBQ Garden"],
  "searchMeta": {
    "query": "fires",
    "totalScanned": 45,
    "matched": 0,
    "filteredOut": 45
  }
}
```

---

## Frontend: Search.jsx

### Debounce

Replace direct `setSearchParams` on `onChange` with a local state + delayed sync:

```jsx
const [localQuery, setLocalQuery] = useState(query);

// Debounce: update URL (and trigger API) only after 500ms pause
useEffect(() => {
  const timer = setTimeout(() => {
    setSearchParams(localQuery ? { q: localQuery } : {});
  }, 500);
  return () => clearTimeout(timer);
}, [localQuery]);

// Input uses localQuery (immediate) not query (URL-synced)
<input value={localQuery} onChange={e => setLocalQuery(e.target.value)} />
```

### Empty State with Suggestions

When `venues.length === 0 && !loading`:
- Show search icon + "No results for '{query}'"
- If `suggestions.length > 0`:
  - "Did you mean:" label
  - Horizontal row of suggestion chips
  - Clicking chip: `setLocalQuery(suggestion)` (replaces query, triggers debounce → search)

---

## Frontend: Discover.jsx Bug Fix

`Discover.jsx:91`: `setRecommendations(...)` → `setResults(...)`.

This is a one-line change that makes the entire Discover page functional.

---

## Ranking Priority (final sort order)

When `searchTerm` present:
1. `textMatchScore` desc (primary — ensures exact/starts-with appears first)
2. `finalScore` desc (secondary — breaks ties using rating, distance, etc.)

When no `searchTerm` (Discover / recommendation mode):
- `finalScore` desc only (unchanged behavior)

---

## Configurable Thresholds

Extracted as named constants at the top of `searchService.js`:

```js
const SEARCH_THRESHOLDS = {
  FUZZY_NAME_MIN: 0.88,        // Jaro-Winkler for fuzzy name match
  SUGGESTION_NAME_MIN: 0.70,   // JW threshold for generating suggestions
  FILTER_CONTEXT_SCORE: 0.35,  // finalScore needed when hasFilterContext
  TOKEN_MIN_LENGTH: 2,         // minimum token length (> this value)
  MAX_SUGGESTIONS: 5,
};
```

---

## Before vs After

| Scenario | Before | After |
|----------|--------|-------|
| Search `"fire"` | All 45 restaurants returned | Only restaurants with "fire" in name/description/cuisine/tag |
| Search `"cafe"` | All restaurants (if "cafe" ≤ 5 chars) | Only restaurants with cafe as category/name/tag |
| Search `"Italian food"` | All restaurants (AI may parse cuisine, but short fallback breaks) | Italian cuisine restaurants + name matches |
| Discover page | Always empty (setRecommendations bug) | Works correctly |
| Empty result | Nothing shown OR random restaurants | Smart suggestion chips: "Fire and Ice", "Grill" |
| Clicking suggestion | N/A | Replaces query and searches immediately |
| Typing fast | 1 API call per character | 1 API call after 500ms pause |

---

## Files Changed

| File | Type | Lines Changed (est.) |
|------|------|---------------------|
| `services/searchService.js` | New | ~130 |
| `services/recommendationService.js` | Modified | ~40 |
| `controllers/recommendationController.js` | Modified | ~15 |
| `pages/Search.jsx` | Modified | ~50 |
| `pages/Discover.jsx` | Modified | ~1 |

**Total: ~236 lines**. No schema changes. No new dependencies beyond what's already installed (`natural` is already in package.json).
