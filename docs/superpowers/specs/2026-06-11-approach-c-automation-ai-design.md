# RestroNet — Approach C: Full Platform Automation & AI
**Date:** 2026-06-11
**Status:** Approved for implementation

---

## Overview

Three-phase expansion of RestroNet's AI and automation capabilities covering all user types: diners, restaurant owners, and platform admins. All 12 features ship incrementally — each phase is independently deployable.

**Stack constraints:** No new AI providers (Gemini only). One new dependency: `node-cron`. All email via existing nodemailer setup.

---

## Architecture

### New backend modules
| File | Purpose |
|------|---------|
| `services/emailService.js` | Reusable nodemailer wrapper with template rendering |
| `services/automationService.js` | node-cron scheduler — registers all cron jobs at server startup |
| `services/trendingService.js` | Review velocity computation, writes `isTrending` to Venue |
| `services/capacityService.js` | Slot availability logic per venue/date/time |

### Extended existing modules
| File | Changes |
|------|---------|
| `services/aiService.js` | Add `moderateReview()`, `generateVenueDescription()` |
| `services/recommendationService.js` | Add `buildDigest(userId)` using existing `buildImplicitProfile()` |
| `controllers/reservationController.js` | Opening hours validation + capacity check on create |
| `controllers/reviewController.js` | AI moderation gate before save |

### New frontend components
| Component | Used in |
|-----------|---------|
| `RecommendationBadge` | RestaurantCard — top 2 score factors as human-readable chips |
| `TrendingBadge` | RestaurantCard — "Trending this week" signal |
| `MenuSuggestions` | RestaurantDetail — AI-picked top 3 dishes for current user |
| `CapacityPicker` | RestaurantDetail reservation form — replaces free-text time input |

### Schema additions
| Model | New fields |
|-------|-----------|
| `Reservation` | `reminderSent24h: Boolean`, `reminderSent2h: Boolean` |
| `Venue` | `isTrending: Boolean`, `trendingScore: Number`, `staleFlag: { reason, flaggedAt }`, `maxCapacity: Number`, `slotDurationMinutes: Number` |
| `User` | `lastLoginAt: Date` (set on each login), `emailNotifications: Boolean` (default `true`) |
| `Admin` | `emailNotifications: Boolean` (default `true`) — note: `lastLogin` already exists |

---

## Phase 1 — Automation Backbone (Week 1–2)

### Feature 1: Reservation Reminders
- **Trigger:** Cron every hour
- **Logic:** Query `Reservation` where `status: confirmed`, `reminderSent24h: false`, and `date` is 23–25h from now. Send reminder email, set flag. Repeat for 2h window with `reminderSent2h`.
- **Email content:** Venue name, date, time, guest count, address, cancel link
- **Edge cases:** Cancelled reservations are skipped. Flags prevent double-send on cron overlap.

### Feature 2: Post-visit Review Request
- **Trigger:** Cron daily at 10am
- **Logic:** Find reservations where `status` changed to `completed` in last 24h. Check no existing `Review` for same `user+venue`. Send "How was your meal?" email with deep-link to `/restaurant/:slug?review=true`.
- **Edge cases:** Only one email per `user+venue` combination ever (check Review collection before sending).

### Feature 3: Opening Hours Validation
- **Trigger:** `POST /api/reservations` controller
- **Logic:** Parse venue `openingHours[dayOfWeek]`. If `isClosed: true` → reject. Parse `open` and `close` as HH:MM strings, compare against requested `time`. If outside range → reject with 400 and human-readable message.
- **Edge cases:** Venues with no `openingHours` set → skip validation (allow booking). Midnight-crossing hours (e.g. open: 22:00, close: 02:00) handled by treating close < open as next-day.

### Feature 4: AI Review Moderation
- **Trigger:** `POST /api/reviews` controller, before save
- **Logic:** Call `aiService.moderateReview(comment)` → Gemini classifies as `clean | spam | toxic` with confidence 0–1. If (`spam` or `toxic`) AND confidence > 0.85 → set `isHidden: true`, `moderationNote: "Auto-flagged: {classification}"`. Save regardless (admin can review).
- **Prompt design:** Short classification prompt, JSON output `{ classification, confidence, reason }`.
- **Edge cases:** If Gemini call fails → log warning, proceed with save as normal (fail open). Reviews with no comment text skip moderation.

---

## Phase 2 — Personalization Depth (Week 3–4)

### Feature 5: "Why We Recommend This" Explainability
- **Where:** Frontend only — `RestaurantCard` component
- **Logic:** Map `scoreBreakdown` (already returned by API) to chips using thresholds:
  - `cuisine > 70` → "Matches your taste"
  - `distance > 60` → "{X} km away"
  - `mood > 60` → "Great for {mood}"
  - `implicit > 60` → "Based on your history"
  - `rating > 80` → "Highly rated"
- **Display:** Show top 2 matching chips max. Hidden for guest users (no profile).

### Feature 6: Personalized Daily Digest Email
- **Trigger:** Cron daily at 8am
- **Logic:** For each `User` where `emailNotifications: true` and `lastLoginAt > 14 days ago`: call `buildImplicitProfile(userId)` → `getSmartRecommendations({ userId, limit: 3 })` → send digest email with 3 venue cards.
- **Email content:** Venue name, photo, cuisine, rating, distance, "Why recommended" label, booking CTA.
- **Edge cases:** Users with no implicit profile (new users) → send top-rated venues instead. Rate-limit: one digest per user per day maximum.

### Feature 7: Menu Item Recommendations
- **Trigger:** Client-side on `RestaurantDetail` page mount, authenticated users only
- **Endpoint:** `GET /api/venues/:id/menu-suggestions` (protected)
- **Logic:** Fetch venue's `Menu` items. Fetch user's `preferences` (cuisines, tags, dietaryFlags). Call Gemini: "Given this diner profile {profile}, from this menu {items}, recommend 3 dishes with a one-sentence reason each." Return `[{ itemName, reason }]`.
- **Caching:** Response cached in-memory (or a simple DB field) keyed by `userId+venueId`, TTL 24h.
- **Edge cases:** No menu items → skip entirely, don't render component. Gemini failure → silent fail, don't show component.

### Feature 8: Trending Detection
- **Trigger:** Cron nightly at 2am
- **Logic:** For each `Venue`, count `Review` documents created in last 7 days (`recentCount`) and prior 7 days (`prevCount`). Compute `velocityScore = (recentCount - prevCount) / max(prevCount, 1)`. If `velocityScore > 0.5` AND `recentCount >= 3` → set `isTrending: true`, `trendingScore: velocityScore`. Otherwise set `isTrending: false`.
- **Frontend:** `TrendingBadge` shown on `RestaurantCard` when `isTrending: true`. Also add "Trending" filter chip to Discover page.

---

## Phase 3 — Owner + Admin Intelligence (Week 5–8)

### Feature 9: Owner Weekly Analytics Report
- **Trigger:** Cron every Monday at 9am
- **Logic:** For each `Admin` with `role: owner`, aggregate last 7 days from `Reservation` (count, avg guests, new vs returning users) and `Review` (count, avg rating, rating delta vs prior week). Render and send HTML email report.
- **Edge cases:** Owners with no venues → skip. Owners with `emailNotifications: false` → skip.

### Feature 10: AI-Generated Venue Descriptions
- **Endpoint:** `POST /api/venues/:id/generate-description` (owner/admin only)
- **Logic:** Call `aiService.generateVenueDescription(venue)` — passes name, cuisines, tags, priceRange, mealTypes, address.city to Gemini. Returns 2-sentence polished description. Owner reviews in edit modal, clicks Accept or Dismiss.
- **UI:** "Generate with AI" button in venue edit form, shown when `description` is empty or < 50 chars. Renders generated text in an editable textarea for review before saving.
- **Edge cases:** Never auto-saves — owner must explicitly accept.

### Feature 11: Stale Listing Detection + Admin Alerts
- **Trigger:** Cron weekly on Sunday at 11pm
- **Stale conditions (any one triggers flag):**
  - No venue `updatedAt` change in 90+ days
  - Rating dropped > 0.5 stars compared to 30 days ago
  - Owner (`Admin`) `lastLogin` > 60 days ago (field already exists on Admin model)
- **Logic:** Write `staleFlag: { reason: string, flaggedAt: Date }` to Venue. Clear flag when owner updates the listing.
- **Admin UI:** New "Needs Attention" tab in `AdminRestaurants` page filtering `staleFlag` is not null. Weekly digest email to `role: superadmin` users listing all flagged venues.

### Feature 12: Smart Reservation Capacity Management
- **Schema:** `Venue.maxCapacity` (total seats), `Venue.slotDurationMinutes` (default 90).
- **Endpoint:** `GET /api/venues/:id/slots?date=YYYY-MM-DD` — returns array of time slots from opening to close, each with `available: boolean` and `remaining: number`.
- **Logic in `capacityService`:** Count confirmed reservations per slot (a reservation occupies its start slot + any overlapping slots within `slotDurationMinutes`). Sum `guests` per slot, compare to `maxCapacity`.
- **Frontend:** `CapacityPicker` replaces text input in reservation form. Grayed-out slots show "Full" tooltip. Only shown when venue has `maxCapacity` set.
- **Edge cases:** Venues without `maxCapacity` → fall back to existing free-text time input. Cancelled reservations excluded from count.

---

## Data Flow Summary

```
Cron Jobs (automationService.js)
  ├── hourly   → reservation reminders
  ├── daily    → post-visit review requests, digest emails (8am), menu suggestion cache bust
  ├── nightly  → trending detection (2am)
  └── weekly   → stale listing detection, owner analytics reports

API Request Flows
  ├── POST /reservations     → openingHours validation → capacity check → save
  ├── POST /reviews          → AI moderation gate → save (hidden or visible)
  ├── GET  /venues/:id/slots → capacityService → available slots
  ├── GET  /venues/:id/menu-suggestions → Gemini → cached response
  └── POST /venues/:id/generate-description → Gemini → return to owner for review
```

---

## Error Handling Philosophy

- **All Gemini calls:** Wrap in try/catch, fail open (proceed without AI result), log warning. Never block user actions on AI failure.
- **All cron jobs:** Each job catches its own errors, logs them, and continues to next iteration. One failing job must not crash others.
- **Email sends:** Fire-and-forget with error logging. Failed emails do not block API responses.

---

## Testing Notes

- Phase 1 features are testable with manual cron triggers (expose a `POST /api/admin/run-cron/:job` endpoint in dev only).
- Capacity logic needs unit tests for edge cases: midnight-crossing hours, overbooking boundary, slot overlap calculation.
- AI moderation needs a fixed test review set to verify threshold behavior.
