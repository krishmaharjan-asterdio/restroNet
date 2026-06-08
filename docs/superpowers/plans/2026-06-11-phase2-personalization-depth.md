# Phase 2 — Personalization Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Why We Recommend This" chips on restaurant cards, a nightly trending detection system, a daily personalized digest email, and AI-powered menu item suggestions on the venue detail page.

**Architecture:** Trending is computed nightly as a batch write to `Venue.isTrending`. Digest uses the existing `buildImplicitProfile` + `getSmartRecommendations`. Menu suggestions are served from a new protected endpoint with 24h in-memory cache. All new frontend components are purely additive — they don't change existing component contracts.

**Tech Stack:** React 18 / Tailwind (frontend), Node.js / Mongoose / node-cron (backend), Gemini via existing `aiService.js`.

**Prerequisites:** Phase 1 must be complete (`emailService.js`, `automationService.js`, `node-cron` installed).

---

## File Map

| Action | Path |
|--------|------|
| Create | `restronet-backend/services/trendingService.js` |
| Create | `restronet-backend/tests/trendingService.test.js` |
| Create | `restronet-frontend/src/components/RecommendationBadge.jsx` |
| Create | `restronet-frontend/src/components/TrendingBadge.jsx` |
| Create | `restronet-frontend/src/components/MenuSuggestions.jsx` |
| Modify | `restronet-backend/models/Venue.js` |
| Modify | `restronet-backend/models/User.js` |
| Modify | `restronet-backend/controllers/authController.js` |
| Modify | `restronet-backend/controllers/venueController.js` |
| Modify | `restronet-backend/routes/venueRoutes.js` |
| Modify | `restronet-backend/services/automationService.js` |
| Modify | `restronet-backend/services/recommendationService.js` |
| Modify | `restronet-frontend/src/components/RestaurantCard.jsx` |
| Modify | `restronet-frontend/src/pages/Discover.jsx` |
| Modify | `restronet-frontend/src/pages/RestaurantDetail.jsx` |
| Modify | `restronet-frontend/src/services/api.js` |

---

## Task 1: Add isTrending and trendingScore fields to Venue model

**Files:**
- Modify: `restronet-backend/models/Venue.js`

- [ ] **Step 1: Add fields to Venue schema**

In `restronet-backend/models/Venue.js`, find the `isFeatured` field (or any existing boolean flag). Add the following fields in the same section:

```javascript
    isTrending:   { type: Boolean, default: false },
    trendingScore: { type: Number, default: 0 },
```

- [ ] **Step 2: Verify**

```bash
cd restronet-backend && node -e "require('./models/Venue'); console.log('OK')"
```
Expected: `OK`

---

## Task 2: Add lastLoginAt and emailNotifications fields to User model

**Files:**
- Modify: `restronet-backend/models/User.js`

- [ ] **Step 1: Add fields to User schema**

In `restronet-backend/models/User.js`, add after the `isActive` field:

```javascript
    lastLoginAt:        { type: Date, default: null },
    emailNotifications: { type: Boolean, default: true },
```

- [ ] **Step 2: Verify**

```bash
cd restronet-backend && node -e "require('./models/User'); console.log('OK')"
```
Expected: `OK`

---

## Task 3: Update login controller to set lastLoginAt

**Files:**
- Modify: `restronet-backend/controllers/authController.js`

- [ ] **Step 1: Set lastLoginAt on successful login**

In `restronet-backend/controllers/authController.js`, find the `login` function. After `user.comparePassword` succeeds and before `generateToken`, add:

```javascript
    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });
```

The relevant section should look like:
```javascript
    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    const token = generateToken(user._id);
    // ... rest of response
```

- [ ] **Step 2: Verify controller loads**

```bash
cd restronet-backend && node -e "require('./controllers/authController'); console.log('OK')"
```
Expected: `OK`

---

## Task 4: Create trendingService.js with velocity computation

**Files:**
- Create: `restronet-backend/services/trendingService.js`
- Create: `restronet-backend/tests/trendingService.test.js`

- [ ] **Step 1: Write the failing test first**

Create `restronet-backend/tests/trendingService.test.js`:

```javascript
const { computeVelocityScore, isTrendingByScore } = require('../services/trendingService');

describe('computeVelocityScore', () => {
  test('returns 0 when no recent reviews', () => {
    expect(computeVelocityScore(0, 5)).toBe(0);
  });

  test('returns 1.0 when prev=0 and recent>=1', () => {
    expect(computeVelocityScore(3, 0)).toBe(3);
  });

  test('returns correct ratio', () => {
    // (10 - 5) / 5 = 1.0
    expect(computeVelocityScore(10, 5)).toBeCloseTo(1.0);
  });

  test('returns negative when activity dropped', () => {
    // (2 - 8) / 8 = -0.75
    expect(computeVelocityScore(2, 8)).toBeCloseTo(-0.75);
  });
});

describe('isTrendingByScore', () => {
  test('returns true when velocity > 0.5 and recentCount >= 3', () => {
    expect(isTrendingByScore(1.2, 5)).toBe(true);
  });

  test('returns false when recentCount < 3 even if velocity high', () => {
    expect(isTrendingByScore(2.0, 2)).toBe(false);
  });

  test('returns false when velocity <= 0.5', () => {
    expect(isTrendingByScore(0.4, 10)).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd restronet-backend && npm test -- --testPathPattern=trendingService
```
Expected: FAIL — `Cannot find module '../services/trendingService'`

- [ ] **Step 3: Create trendingService.js**

Create `restronet-backend/services/trendingService.js`:

```javascript
const Venue = require('../models/Venue');
const Review = require('../models/Review');
const logger = require('../config/logger');

/**
 * Pure: (recentCount - prevCount) / max(prevCount, 1)
 */
const computeVelocityScore = (recentCount, prevCount) => {
  return (recentCount - prevCount) / Math.max(prevCount, 1);
};

/**
 * Pure: a venue trends if velocity > 0.5 and it has at least 3 recent reviews.
 */
const isTrendingByScore = (velocityScore, recentCount) => {
  return velocityScore > 0.5 && recentCount >= 3;
};

/**
 * Batch job: computes review velocity for every venue and writes isTrending flag.
 * Called nightly at 2am via automationService.
 */
const computeTrending = async () => {
  try {
    const now   = new Date();
    const week1Start = new Date(now - 7  * 24 * 60 * 60 * 1000);
    const week2Start = new Date(now - 14 * 24 * 60 * 60 * 1000);

    const venues = await Venue.find({ isActive: true }).select('_id name').lean();
    let trendingCount = 0;

    for (const venue of venues) {
      const [recentCount, prevCount] = await Promise.all([
        Review.countDocuments({ venue: venue._id, createdAt: { $gte: week1Start }, isHidden: false }),
        Review.countDocuments({ venue: venue._id, createdAt: { $gte: week2Start, $lt: week1Start }, isHidden: false }),
      ]);

      const velocityScore = computeVelocityScore(recentCount, prevCount);
      const trending      = isTrendingByScore(velocityScore, recentCount);

      await Venue.findByIdAndUpdate(venue._id, {
        isTrending:    trending,
        trendingScore: Math.round(velocityScore * 100) / 100,
      });

      if (trending) trendingCount++;
    }

    logger.info(`Trending detection complete: ${trendingCount}/${venues.length} venues trending`);
  } catch (err) {
    logger.error(`computeTrending failed: ${err.message}`);
  }
};

module.exports = { computeVelocityScore, isTrendingByScore, computeTrending };
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd restronet-backend && npm test -- --testPathPattern=trendingService
```
Expected: All 6 tests PASS.

---

## Task 5: Register trending cron job + digest cron job in automationService.js

**Files:**
- Modify: `restronet-backend/services/automationService.js`
- Modify: `restronet-backend/services/recommendationService.js`

- [ ] **Step 1: Add buildDigest function to recommendationService.js**

In `restronet-backend/services/recommendationService.js`, add this function before `module.exports`:

```javascript
/**
 * Builds a personalised list of up to `limit` venues for a user's digest email.
 * Falls back to top-rated venues when the user has no implicit profile.
 */
const buildDigest = async (userId, limit = 3) => {
  const profile = await buildImplicitProfile(userId).catch(() => null);
  const hasProfile = profile && Object.keys(profile.cuisineAffinity).length > 0;

  const { results } = await getSmartRecommendations({
    userId: hasProfile ? userId : null,
    isTopRated: !hasProfile,
    limit,
  });

  return results;
};
```

Also add `buildDigest` to the `module.exports` at the bottom:

```javascript
module.exports = {
  getSmartRecommendations,
  getCBFRecommendations,
  buildImplicitProfile,
  buildFilterExplanation,
  buildDigest,
  MOOD_KEYWORDS,
};
```

- [ ] **Step 2: Register trending and digest jobs in automationService.js**

At the top of `restronet-backend/services/automationService.js`, add:

```javascript
const { computeTrending } = require('./trendingService');
```

Add two new job functions before `registerJobs`:

```javascript
const trendingDetectionJob = async () => {
  try {
    await computeTrending();
  } catch (err) {
    logger.error(`trendingDetectionJob failed: ${err.message}`);
  }
};

const dailyDigestJob = async () => {
  try {
    const User = require('../models/User');
    const { buildDigest } = require('./recommendationService');
    const { sendDailyDigest } = require('./emailService');

    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const users = await User.find({
      emailNotifications: true,
      lastLoginAt: { $gte: cutoff },
      isActive: true,
    });

    for (const user of users) {
      const venues = await buildDigest(user._id, 3).catch(() => []);
      if (venues.length === 0) continue;
      await sendDailyDigest(user, venues);
      logger.info(`Digest sent to ${user.email}`);
    }
  } catch (err) {
    logger.error(`dailyDigestJob failed: ${err.message}`);
  }
};
```

Update `registerJobs` to add the new schedules:

```javascript
const registerJobs = () => {
  cron.schedule('0 * * * *',  reservationReminderJob,  { name: 'reservation-reminders' });
  cron.schedule('0 10 * * *', reviewRequestJob,        { name: 'review-requests' });
  cron.schedule('0 2 * * *',  trendingDetectionJob,    { name: 'trending-detection' });
  cron.schedule('0 8 * * *',  dailyDigestJob,          { name: 'daily-digest' });
  logger.info('✅ Automation jobs registered (reminders, review requests, trending, digest)');
};
```

Also export the new jobs:

```javascript
module.exports = {
  registerJobs,
  reservationReminderJob,
  reviewRequestJob,
  trendingDetectionJob,
  dailyDigestJob,
};
```

- [ ] **Step 3: Add dev trigger for new jobs in server.js**

In `restronet-backend/server.js`, update the dev trigger job map:

```javascript
const { reservationReminderJob, reviewRequestJob, trendingDetectionJob, dailyDigestJob } = require('./services/automationService');
const jobs = {
  'reservation-reminders': reservationReminderJob,
  'review-requests':       reviewRequestJob,
  'trending-detection':    trendingDetectionJob,
  'daily-digest':          dailyDigestJob,
};
```

- [ ] **Step 4: Verify all services load**

```bash
cd restronet-backend && node -e "require('./services/automationService'); console.log('OK')"
```
Expected: `OK`

---

## Task 6: Create RecommendationBadge frontend component

**Files:**
- Create: `restronet-frontend/src/components/RecommendationBadge.jsx`
- Modify: `restronet-frontend/src/components/RestaurantCard.jsx`

- [ ] **Step 1: Create RecommendationBadge.jsx**

Create `restronet-frontend/src/components/RecommendationBadge.jsx`:

```jsx
const SCORE_RULES = [
  { key: 'cuisine',  threshold: 70, label: 'Matches your taste' },
  { key: 'implicit', threshold: 60, label: 'Based on your history' },
  { key: 'mood',     threshold: 60, label: (breakdown, venue) => venue.matchedMood ? `Great for ${venue.matchedMood.replace('-', ' ')}` : 'Mood match' },
  { key: 'distance', threshold: 60, label: (breakdown, venue) => venue.distanceKm != null ? `${venue.distanceKm} km away` : 'Nearby' },
  { key: 'rating',   threshold: 80, label: 'Highly rated' },
];

/**
 * Shows up to 2 "why we recommend this" chips based on scoreBreakdown.
 * Returns null for guest users or venues without a scoreBreakdown.
 */
const RecommendationBadge = ({ venue, isLoggedIn }) => {
  if (!isLoggedIn || !venue.scoreBreakdown) return null;

  const breakdown = venue.scoreBreakdown;
  const chips = [];

  for (const rule of SCORE_RULES) {
    if (chips.length >= 2) break;
    const score = breakdown[rule.key] || 0;
    if (score >= rule.threshold) {
      const label = typeof rule.label === 'function' ? rule.label(breakdown, venue) : rule.label;
      chips.push(label);
    }
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1.5">
      {chips.map((chip, i) => (
        <span
          key={i}
          className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50"
        >
          ✦ {chip}
        </span>
      ))}
    </div>
  );
};

export default RecommendationBadge;
```

- [ ] **Step 2: Add RecommendationBadge to RestaurantCard**

In `restronet-frontend/src/components/RestaurantCard.jsx`:

Add the import at the top:
```jsx
import RecommendationBadge from './RecommendationBadge';
```

In the bottom panel section, find where the location/mood chips are rendered (the `flex flex-wrap items-center gap-1.5 mb-3` div). Add `<RecommendationBadge>` directly after that div:

```jsx
            {/* Location + mood + match */}
            <div className="flex flex-wrap items-center gap-1.5 mb-3">
              {/* ... existing content unchanged ... */}
            </div>

            {/* Why we recommend this */}
            <RecommendationBadge venue={venue} isLoggedIn={!!user} />
```

---

## Task 7: Create TrendingBadge component and wire into RestaurantCard + Discover

**Files:**
- Create: `restronet-frontend/src/components/TrendingBadge.jsx`
- Modify: `restronet-frontend/src/components/RestaurantCard.jsx`
- Modify: `restronet-frontend/src/pages/Discover.jsx`

- [ ] **Step 1: Create TrendingBadge.jsx**

Create `restronet-frontend/src/components/TrendingBadge.jsx`:

```jsx
const TrendingBadge = ({ isTrending }) => {
  if (!isTrending) return null;

  return (
    <span className="inline-flex items-center gap-1 bg-rose-500/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide">
      🔥 Trending
    </span>
  );
};

export default TrendingBadge;
```

- [ ] **Step 2: Add TrendingBadge to RestaurantCard**

In `restronet-frontend/src/components/RestaurantCard.jsx`:

Add import:
```jsx
import TrendingBadge from './TrendingBadge';
```

In the top badge row's left cluster (where the "New" badge already lives), add TrendingBadge after the New badge:

```jsx
          <div className="flex flex-col gap-1.5">
            {venue.distanceKm !== undefined && venue.distanceKm !== null && (
              <span className="inline-flex items-center gap-1 bg-white/95 text-neutral-800 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm backdrop-blur-sm tracking-wide">
                <Navigation size={9} strokeWidth={2.5} />
                {venue.distanceKm} km
              </span>
            )}
            {isNew && (
              <span className="inline-flex items-center gap-1 bg-emerald-500/80 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-full tracking-wide">
                ✦ New
              </span>
            )}
            <TrendingBadge isTrending={venue.isTrending} />
          </div>
```

- [ ] **Step 3: Add Trending filter chip to Discover page**

In `restronet-frontend/src/pages/Discover.jsx`, find where filter chips/buttons are rendered (mood, price, etc.). Add a Trending toggle alongside the existing filters. Look for the filter state and add:

In the filter state section, add:
```jsx
const [showTrendingOnly, setShowTrendingOnly] = useState(false);
```

In the filter UI (where mood/price chips are), add:
```jsx
<button
  onClick={() => setShowTrendingOnly(prev => !prev)}
  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
    showTrendingOnly
      ? 'bg-rose-500 text-white border-rose-500'
      : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border-neutral-200 dark:border-neutral-700'
  }`}
>
  🔥 Trending
</button>
```

When passing filter params to the recommendation API, add `trending: showTrendingOnly` if true. In the backend `GET /api/recommendations`, check for `?trending=true` and filter results by `isTrending: true`. (If the recommendations route does not support this yet, add it in the next step.)

- [ ] **Step 4: Add trending filter support to the recommendation endpoint**

In `restronet-backend/controllers/recommendationController.js` (read it first), find where query params are destructured. Add `trending` to the destructured params and apply a post-filter:

```javascript
const { ..., trending } = req.query;

// after results are computed:
let finalResults = results;
if (trending === 'true') {
  finalResults = results.filter(v => v.isTrending);
}
```

---

## Task 8: Add menu suggestions endpoint to venueController

**Files:**
- Modify: `restronet-backend/controllers/venueController.js`
- Modify: `restronet-backend/routes/venueRoutes.js`

- [ ] **Step 1: Add in-memory suggestion cache and getMenuSuggestions controller**

In `restronet-backend/controllers/venueController.js`, add at the top:

```javascript
const Menu = require('../models/Menu');
const aiService = require('../services/aiService');
// Simple in-memory cache: key = `${userId}-${venueId}`, value = { suggestions, expiresAt }
const suggestionCache = new Map();
```

Add this new controller function before `module.exports`:

```javascript
/**
 * @desc    Get AI-powered menu item suggestions for a user at a specific venue
 * @route   GET /api/venues/:id/menu-suggestions
 * @access  Private (User)
 */
const getMenuSuggestions = async (req, res, next) => {
  try {
    const venueId = req.params.id;
    const userId  = req.user._id.toString();
    const cacheKey = `${userId}-${venueId}`;

    // Check cache
    const cached = suggestionCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json({ success: true, suggestions: cached.suggestions, cached: true });
    }

    const [menu, user] = await Promise.all([
      Menu.findOne({ venue: venueId }).lean(),
      req.user,
    ]);

    if (!menu?.items?.length) {
      return res.json({ success: true, suggestions: [] });
    }

    const profile = {
      cuisinePreferences: user.preferences?.cuisines || [],
      dietaryNote: [
        user.preferences?.tags?.length ? 'Has dietary preferences' : '',
      ].filter(Boolean).join(', ') || 'No special dietary requirements noted',
    };

    const menuSummary = menu.items.slice(0, 40).map(item =>
      `${item.name} (${item.category}, ${item.isVegetarian ? 'Veg' : ''} ${item.isVegan ? 'Vegan' : ''} ${item.isGlutenFree ? 'GF' : ''} — NPR ${item.price})`
    ).join('\n');

    const prompt = `You are a restaurant concierge. Given this diner's profile and the menu below, recommend exactly 3 dishes. Be specific and helpful.

Diner profile: ${JSON.stringify(profile)}

Menu:
${menuSummary}

Return JSON ONLY:
[
  { "itemName": "Dish Name", "reason": "One sentence why this suits the diner." },
  { "itemName": "Dish Name", "reason": "One sentence why this suits the diner." },
  { "itemName": "Dish Name", "reason": "One sentence why this suits the diner." }
]`;

    const suggestions = await aiService.model?.generateContent(prompt)
      .then(r => {
        const text = r.response.text().trim();
        const match = text.match(/\[[\s\S]*\]/);
        return match ? JSON.parse(match[0]) : [];
      })
      .catch(() => []);

    if (suggestions.length > 0) {
      suggestionCache.set(cacheKey, { suggestions, expiresAt: Date.now() + 24 * 60 * 60 * 1000 });
    }

    res.json({ success: true, suggestions });
  } catch (error) {
    next(error);
  }
};
```

Add `getMenuSuggestions` to `module.exports`.

- [ ] **Step 2: Add route in venueRoutes.js**

In `restronet-backend/routes/venueRoutes.js`, add the protected route. First read the file to understand the existing pattern, then add:

```javascript
const { protect } = require('../middleware/authMiddleware'); // already imported if other protected routes exist
// ...
router.get('/:id/menu-suggestions', protect, getMenuSuggestions);
```

Make sure `getMenuSuggestions` is imported from the controller.

- [ ] **Step 3: Verify the endpoint is registered**

```bash
cd restronet-backend && node -e "require('./routes/venueRoutes'); console.log('OK')"
```
Expected: `OK`

---

## Task 9: Create MenuSuggestions frontend component

**Files:**
- Create: `restronet-frontend/src/components/MenuSuggestions.jsx`
- Modify: `restronet-frontend/src/services/api.js`
- Modify: `restronet-frontend/src/pages/RestaurantDetail.jsx`

- [ ] **Step 1: Add API call to api.js**

In `restronet-frontend/src/services/api.js`, add:

```javascript
export const getMenuSuggestions = (venueId) =>
  API.get(`/venues/${venueId}/menu-suggestions`);
```

- [ ] **Step 2: Create MenuSuggestions.jsx**

Create `restronet-frontend/src/components/MenuSuggestions.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { getMenuSuggestions } from '../services/api';

const MenuSuggestions = ({ venueId }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    getMenuSuggestions(venueId)
      .then(res => setSuggestions(res.data.suggestions || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [venueId]);

  if (loading || suggestions.length === 0) return null;

  return (
    <div className="mb-8 p-5 rounded-2xl border border-amber-100 dark:border-amber-900/40 bg-amber-50/60 dark:bg-amber-950/20">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={16} className="text-amber-500" />
        <h3 className="font-semibold text-neutral-800 dark:text-white text-sm">
          Recommended For You
        </h3>
      </div>
      <div className="flex flex-col gap-3">
        {suggestions.map((s, i) => (
          <div key={i} className="flex items-start gap-3">
            <span className="w-5 h-5 rounded-full bg-amber-100 dark:bg-amber-900/50 text-amber-600 dark:text-amber-400 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
              {i + 1}
            </span>
            <div>
              <p className="text-sm font-semibold text-neutral-800 dark:text-white">{s.itemName}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{s.reason}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MenuSuggestions;
```

- [ ] **Step 3: Add MenuSuggestions to RestaurantDetail page**

In `restronet-frontend/src/pages/RestaurantDetail.jsx`:

Add import:
```jsx
import MenuSuggestions from '../components/MenuSuggestions';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
```

Inside the component, destructure `user` from `AuthContext`:
```jsx
const { user } = useContext(AuthContext);
```

Find where the menu section starts (where menu items are listed). Add `MenuSuggestions` before the menu heading, only for logged-in users:

```jsx
{user && venue?._id && (
  <MenuSuggestions venueId={venue._id} />
)}
```

---

**Phase 2 complete.** Verify end-to-end by:
1. Run `POST /api/dev/run-job/trending-detection` — check that a venue with recent reviews gets `isTrending: true`
2. Open a restaurant detail page while logged in — the MenuSuggestions card should appear above the menu
3. On a restaurant card, verify the RecommendationBadge chips appear for logged-in users with `scoreBreakdown` data
4. On Discover, toggle the Trending filter and confirm only `isTrending: true` venues show
