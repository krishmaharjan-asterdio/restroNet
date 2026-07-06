# Phase 3 — Owner & Admin Intelligence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build capacity-aware reservation slot management, weekly owner analytics emails, AI-generated venue descriptions, stale listing detection, and a "Needs Attention" admin tab.

**Architecture:** `capacityService.js` is a pure slot-calculation module — no DB writes, just reads. All cron jobs are added to the existing `automationService.js`. Admin UI changes are additive to `AdminRestaurants.jsx`. The AI description generator never auto-saves — the owner must explicitly accept.

**Tech Stack:** React 18 / Tailwind / Ant Design (frontend), Node.js / Mongoose / node-cron (backend), Gemini via existing `aiService.js`.

**Prerequisites:** Phase 1 (`emailService.js`, `automationService.js`) must be complete.

---

## File Map

| Action | Path |
|--------|------|
| Create | `restronet-backend/services/capacityService.js` |
| Create | `restronet-backend/tests/capacityService.test.js` |
| Create | `restronet-frontend/src/components/CapacityPicker.jsx` |
| Modify | `restronet-backend/models/Venue.js` |
| Modify | `restronet-backend/models/Admin.js` |
| Modify | `restronet-backend/services/aiService.js` |
| Modify | `restronet-backend/services/automationService.js` |
| Modify | `restronet-backend/controllers/venueController.js` |
| Modify | `restronet-backend/routes/venueRoutes.js` |
| Modify | `restronet-frontend/src/pages/AdminRestaurants.jsx` |
| Modify | `restronet-frontend/src/pages/RestaurantDetail.jsx` |
| Modify | `restronet-frontend/src/services/api.js` |

---

## Task 1: Add capacity and stale fields to Venue model

**Files:**
- Modify: `restronet-backend/models/Venue.js`

- [ ] **Step 1: Add new fields to Venue schema**

In `restronet-backend/models/Venue.js`, add after the `isTrending` field (added in Phase 2) or in the same area as other operational fields:

```javascript
    maxCapacity:        { type: Number, default: null },
    slotDurationMinutes:{ type: Number, default: 90 },
    staleFlag: {
      reason:    { type: String, default: null },
      flaggedAt: { type: Date,   default: null },
    },
```

- [ ] **Step 2: Verify**

```bash
cd restronet-backend && node -e "require('./models/Venue'); console.log('OK')"
```
Expected: `OK`

---

## Task 2: Add emailNotifications to Admin model

**Files:**
- Modify: `restronet-backend/models/Admin.js`

- [ ] **Step 1: Add emailNotifications field**

In `restronet-backend/models/Admin.js`, add after the `lastLogin` field:

```javascript
    emailNotifications: { type: Boolean, default: true },
```

- [ ] **Step 2: Verify**

```bash
cd restronet-backend && node -e "require('./models/Admin'); console.log('OK')"
```
Expected: `OK`

---

## Task 3: Build and test capacityService.js

**Files:**
- Create: `restronet-backend/services/capacityService.js`
- Create: `restronet-backend/tests/capacityService.test.js`

- [ ] **Step 1: Write the failing test**

Create `restronet-backend/tests/capacityService.test.js`:

```javascript
const { generateSlots, isSlotOccupied } = require('../services/capacityService');

describe('generateSlots', () => {
  test('generates correct slots between open and close', () => {
    const slots = generateSlots('10:00', '14:00', 60);
    expect(slots).toEqual(['10:00', '11:00', '12:00', '13:00']);
  });

  test('generates slots with 90-minute duration', () => {
    const slots = generateSlots('10:00', '13:00', 90);
    expect(slots).toEqual(['10:00', '11:30']);
  });

  test('returns empty array when open equals close', () => {
    expect(generateSlots('10:00', '10:00', 60)).toEqual([]);
  });

  test('returns empty array for invalid times', () => {
    expect(generateSlots(null, '14:00', 60)).toEqual([]);
  });
});

describe('isSlotOccupied', () => {
  // slotTime, reservationTime, slotDurationMinutes
  test('returns true when reservation is within slot window', () => {
    expect(isSlotOccupied('12:00', '12:30', 90)).toBe(true);
  });

  test('returns false when reservation is outside slot window', () => {
    expect(isSlotOccupied('12:00', '13:31', 90)).toBe(false);
  });

  test('returns true when reservation is exactly at slot start', () => {
    expect(isSlotOccupied('12:00', '12:00', 60)).toBe(true);
  });

  test('returns false when reservation is exactly at slot end', () => {
    expect(isSlotOccupied('12:00', '13:00', 60)).toBe(false);
  });
});
```

- [ ] **Step 2: Run — expect FAIL**

```bash
cd restronet-backend && npm test -- --testPathPattern=capacityService
```
Expected: FAIL — `Cannot find module '../services/capacityService'`

- [ ] **Step 3: Create capacityService.js**

Create `restronet-backend/services/capacityService.js`:

```javascript
const Reservation = require('../models/Reservation');

const toMins = (hhmm) => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

const toHHMM = (mins) => {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/**
 * Pure: generates slot start times from openTime to closeTime, stepping by slotDurationMinutes.
 */
const generateSlots = (openTime, closeTime, slotDurationMinutes) => {
  const openMins  = toMins(openTime);
  const closeMins = toMins(closeTime);
  if (openMins === null || closeMins === null || openMins >= closeMins) return [];

  const slots = [];
  for (let t = openMins; t + slotDurationMinutes <= closeMins; t += slotDurationMinutes) {
    slots.push(toHHMM(t));
  }
  return slots;
};

/**
 * Pure: returns true if a reservation at reservationTime falls within the slotTime window.
 */
const isSlotOccupied = (slotTime, reservationTime, slotDurationMinutes) => {
  const slotMins = toMins(slotTime);
  const resMins  = toMins(reservationTime);
  return resMins >= slotMins && resMins < slotMins + slotDurationMinutes;
};

/**
 * Returns available time slots for a venue on a given date.
 * Each slot: { time: 'HH:MM', available: boolean, remaining: number }
 */
const getAvailableSlots = async (venue, dateStr) => {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName  = dayNames[new Date(dateStr).getDay()];
  const hours    = venue.openingHours?.[dayName];

  if (!hours || hours.isClosed || !hours.open || !hours.close) {
    return [];
  }

  const slotDuration = venue.slotDurationMinutes || 90;
  const maxCapacity  = venue.maxCapacity;

  if (!maxCapacity) return [];

  const slotTimes = generateSlots(hours.open, hours.close, slotDuration);

  // Get all confirmed reservations for this venue on this date
  const startOfDay = new Date(dateStr);
  const endOfDay   = new Date(dateStr);
  endOfDay.setHours(23, 59, 59, 999);

  const reservations = await Reservation.find({
    venue:  venue._id,
    date:   { $gte: startOfDay, $lte: endOfDay },
    status: { $in: ['confirmed', 'pending'] },
  }).lean();

  return slotTimes.map(slotTime => {
    const occupying = reservations.filter(r => isSlotOccupied(slotTime, r.time, slotDuration));
    const usedCapacity = occupying.reduce((sum, r) => sum + (r.guests || 1), 0);
    const remaining    = Math.max(0, maxCapacity - usedCapacity);

    return {
      time:      slotTime,
      available: remaining > 0,
      remaining,
    };
  });
};

module.exports = { generateSlots, isSlotOccupied, getAvailableSlots };
```

- [ ] **Step 4: Run tests — expect PASS**

```bash
cd restronet-backend && npm test -- --testPathPattern=capacityService
```
Expected: All 8 tests PASS.

---

## Task 4: Add GET /api/venues/:id/slots endpoint

**Files:**
- Modify: `restronet-backend/controllers/venueController.js`
- Modify: `restronet-backend/routes/venueRoutes.js`

- [ ] **Step 1: Add getVenueSlots controller function**

In `restronet-backend/controllers/venueController.js`, add at the top:

```javascript
const { getAvailableSlots } = require('../services/capacityService');
```

Add this new controller before `module.exports`:

```javascript
/**
 * @desc    Get available time slots for a venue on a given date
 * @route   GET /api/venues/:id/slots?date=YYYY-MM-DD
 * @access  Public
 */
const getVenueSlots = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, message: 'date query param required (YYYY-MM-DD)' });
    }

    const venue = await Venue.findById(req.params.id).lean();
    if (!venue) {
      return res.status(404).json({ success: false, message: 'Venue not found' });
    }

    if (!venue.maxCapacity) {
      return res.json({ success: true, slots: [], hasCapacityManagement: false });
    }

    const slots = await getAvailableSlots(venue, date);
    res.json({ success: true, slots, hasCapacityManagement: true });
  } catch (error) {
    next(error);
  }
};
```

Add `getVenueSlots` to `module.exports`.

- [ ] **Step 2: Register the route in venueRoutes.js**

In `restronet-backend/routes/venueRoutes.js`, add:

```javascript
router.get('/:id/slots', getVenueSlots);
```

Make sure `getVenueSlots` is imported from the controller.

- [ ] **Step 3: Test the endpoint**

With the server running:
```bash
curl "http://localhost:5000/api/venues/SOME_VENUE_ID/slots?date=2026-06-20"
```
Expected: `{"success":true,"slots":[...],"hasCapacityManagement":true}` or `hasCapacityManagement: false` if venue has no `maxCapacity`.

---

## Task 5: Create CapacityPicker frontend component

**Files:**
- Create: `restronet-frontend/src/components/CapacityPicker.jsx`
- Modify: `restronet-frontend/src/services/api.js`
- Modify: `restronet-frontend/src/pages/RestaurantDetail.jsx`

- [ ] **Step 1: Add API call to api.js**

In `restronet-frontend/src/services/api.js`, add:

```javascript
export const getVenueSlots = (venueId, date) =>
  API.get(`/venues/${venueId}/slots`, { params: { date } });
```

- [ ] **Step 2: Create CapacityPicker.jsx**

Create `restronet-frontend/src/components/CapacityPicker.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';
import { getVenueSlots } from '../services/api';

/**
 * Replaces the free-text time input when a venue has capacity management enabled.
 * Shows time slots with availability status.
 */
const CapacityPicker = ({ venueId, date, value, onChange }) => {
  const [slots, setSlots]                       = useState([]);
  const [hasCapacity, setHasCapacity]           = useState(false);
  const [loading, setLoading]                   = useState(false);

  useEffect(() => {
    if (!venueId || !date) return;

    setLoading(true);
    getVenueSlots(venueId, date)
      .then(res => {
        setHasCapacity(res.data.hasCapacityManagement);
        setSlots(res.data.slots || []);
      })
      .catch(() => setHasCapacity(false))
      .finally(() => setLoading(false));
  }, [venueId, date]);

  // Fallback to regular time input when capacity management is not configured
  if (!hasCapacity) {
    return (
      <input
        type="time"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg bg-white dark:bg-neutral-800 text-sm"
        required
      />
    );
  }

  if (loading) {
    return (
      <div className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm text-neutral-400">
        Loading available times…
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      {slots.map(slot => (
        <button
          key={slot.time}
          type="button"
          disabled={!slot.available}
          onClick={() => slot.available && onChange(slot.time)}
          title={!slot.available ? 'Fully booked' : `${slot.remaining} seats available`}
          className={`flex flex-col items-center justify-center px-2 py-2.5 rounded-lg border text-xs font-medium transition-all duration-150 ${
            value === slot.time
              ? 'border-orange-500 bg-orange-500 text-white'
              : slot.available
              ? 'border-neutral-200 dark:border-neutral-700 hover:border-orange-400 hover:bg-orange-50 dark:hover:bg-orange-950/30 text-neutral-700 dark:text-neutral-300'
              : 'border-neutral-100 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900 text-neutral-300 dark:text-neutral-600 cursor-not-allowed'
          }`}
        >
          <Clock size={11} className="mb-1 opacity-70" />
          {slot.time}
          {!slot.available && (
            <span className="text-[9px] mt-0.5 opacity-60">Full</span>
          )}
        </button>
      ))}
      {slots.length === 0 && (
        <p className="col-span-3 text-sm text-neutral-400 py-2">No available slots for this date.</p>
      )}
    </div>
  );
};

export default CapacityPicker;
```

- [ ] **Step 3: Integrate CapacityPicker into RestaurantDetail reservation form**

In `restronet-frontend/src/pages/RestaurantDetail.jsx`:

Add import:
```jsx
import CapacityPicker from '../components/CapacityPicker';
```

Find the reservation form's time input field. It will look something like:
```jsx
<input type="time" value={time} onChange={e => setTime(e.target.value)} ... />
```

Replace it with:
```jsx
<CapacityPicker
  venueId={venue?._id}
  date={reservationDate}
  value={reservationTime}
  onChange={setReservationTime}
/>
```

(Use the correct state variable names as they appear in RestaurantDetail — read the file to confirm before editing.)

---

## Task 6: Add owner weekly analytics report cron job

**Files:**
- Modify: `restronet-backend/services/automationService.js`

- [ ] **Step 1: Add ownerWeeklyReportJob to automationService.js**

In `restronet-backend/services/automationService.js`, add this function before `registerJobs`:

```javascript
const ownerWeeklyReportJob = async () => {
  try {
    const Admin = require('../models/Admin');
    const Venue = require('../models/Venue');
    const Reservation = require('../models/Reservation');
    const Review = require('../models/Review');
    const { sendOwnerWeeklyReport } = require('./emailService');

    const owners = await Admin.find({ role: 'owner', isActive: true, emailNotifications: true });

    const now       = new Date();
    const weekStart = new Date(now - 7  * 24 * 60 * 60 * 1000);
    const prevStart = new Date(now - 14 * 24 * 60 * 60 * 1000);

    for (const owner of owners) {
      const venues = await Venue.find({ owner: owner._id, isActive: true }).lean();
      if (venues.length === 0) continue;

      for (const venue of venues) {
        const [reservations, thisWeekReviews, prevWeekReviews] = await Promise.all([
          Reservation.find({ venue: venue._id, date: { $gte: weekStart }, status: { $in: ['confirmed', 'completed'] } }).lean(),
          Review.find({ venue: venue._id, createdAt: { $gte: weekStart }, isHidden: false }).lean(),
          Review.find({ venue: venue._id, createdAt: { $gte: prevStart, $lt: weekStart }, isHidden: false }).lean(),
        ]);

        const avgRating = thisWeekReviews.length
          ? thisWeekReviews.reduce((sum, r) => sum + r.rating.overall, 0) / thisWeekReviews.length
          : null;

        const prevAvgRating = prevWeekReviews.length
          ? prevWeekReviews.reduce((sum, r) => sum + r.rating.overall, 0) / prevWeekReviews.length
          : null;

        const totalGuests = reservations.reduce((sum, r) => sum + (r.guests || 1), 0);

        await sendOwnerWeeklyReport(owner, {
          venueName:        venue.name,
          reservationCount: reservations.length,
          reviewCount:      thisWeekReviews.length,
          avgRating,
          ratingDelta:      avgRating !== null && prevAvgRating !== null ? avgRating - prevAvgRating : null,
          totalGuests,
        });

        logger.info(`Weekly report sent to ${owner.email} for ${venue.name}`);
      }
    }
  } catch (err) {
    logger.error(`ownerWeeklyReportJob failed: ${err.message}`);
  }
};
```

- [ ] **Step 2: Register the job and export it**

In `registerJobs`, add:
```javascript
cron.schedule('0 9 * * 1', ownerWeeklyReportJob, { name: 'owner-weekly-report' }); // Monday 9am
```

Add `ownerWeeklyReportJob` to the `module.exports` and to the dev trigger job map in `server.js`:
```javascript
'owner-weekly-report': ownerWeeklyReportJob,
```

---

## Task 7: Add generateVenueDescription() to aiService.js

**Files:**
- Modify: `restronet-backend/services/aiService.js`
- Modify: `restronet-backend/controllers/venueController.js`
- Modify: `restronet-backend/routes/venueRoutes.js`

- [ ] **Step 1: Add generateVenueDescription method to aiService.js**

In `restronet-backend/services/aiService.js`, add inside the `AIService` class after `moderateReview`:

```javascript
  /**
   * Generates a 2-sentence polished venue description from structured venue data.
   * Returns the description string or null on failure.
   */
  async generateVenueDescription(venue) {
    if (!this.genAI) return null;

    const cuisineNames  = (venue.cuisines  || []).map(c => c.name || c).join(', ') || 'Various';
    const tagNames      = (venue.tags      || []).map(t => t.name || t).slice(0, 5).join(', ') || '';
    const categoryName  = venue.category?.name || venue.category || '';
    const priceSymbols  = ['$', '$$', '$$$', '$$$$'][((venue.priceRange || 2) - 1)];
    const mealTypes     = (venue.mealTypes || []).join(', ') || 'all-day dining';
    const city          = venue.address?.city || 'Kathmandu';

    const prompt = `Write exactly 2 polished, inviting sentences describing this restaurant for a dining discovery platform. Be specific, evocative, and avoid clichés. Do NOT include the restaurant name in the description.

Restaurant facts:
- City: ${city}
- Category: ${categoryName}
- Cuisines: ${cuisineNames}
- Price tier: ${priceSymbols}
- Tags/ambience: ${tagNames}
- Meal service: ${mealTypes}

Return the description as plain text only — no quotes, no markdown.`;

    try {
      const result = await this.model.generateContent(prompt);
      const text   = result.response.text().trim();
      return text || null;
    } catch (error) {
      console.error('AI Description Generation Error:', error.message);
      return null;
    }
  }
```

- [ ] **Step 2: Add generateDescription endpoint to venueController.js**

In `restronet-backend/controllers/venueController.js`, add before `module.exports`:

```javascript
/**
 * @desc    Generate an AI description for a venue (owner/admin only)
 * @route   POST /api/venues/:id/generate-description
 * @access  Private (Admin)
 */
const generateVenueDescription = async (req, res, next) => {
  try {
    const venue = await Venue.findById(req.params.id).populate('cuisines tags category').lean();
    if (!venue) {
      return res.status(404).json({ success: false, message: 'Venue not found' });
    }

    const description = await aiService.generateVenueDescription(venue);
    if (!description) {
      return res.status(503).json({ success: false, message: 'AI description generation unavailable. Please try again.' });
    }

    res.json({ success: true, description });
  } catch (error) {
    next(error);
  }
};
```

Add `generateVenueDescription` to `module.exports`.

- [ ] **Step 3: Add admin-protected route in venueRoutes.js**

In `restronet-backend/routes/venueRoutes.js`, add (where other admin-protected venue routes are):

```javascript
const { protectAdmin } = require('../middleware/authMiddleware'); // or whatever the admin auth middleware is named — check existing protected admin routes in this file first
router.post('/:id/generate-description', protectAdmin, generateVenueDescription);
```

---

## Task 8: Add "Generate with AI" button to AdminRestaurants venue edit modal

**Files:**
- Modify: `restronet-frontend/src/pages/AdminRestaurants.jsx`
- Modify: `restronet-frontend/src/services/api.js`

- [ ] **Step 1: Add API call to api.js**

In `restronet-frontend/src/services/api.js`, add:

```javascript
export const generateVenueDescription = (venueId) =>
  API.post(`/venues/${venueId}/generate-description`);
```

- [ ] **Step 2: Add state and handler in AdminRestaurants.jsx**

In `restronet-frontend/src/pages/AdminRestaurants.jsx`, find the venue edit modal. Add imports if not already present:

```jsx
import { generateVenueDescription } from '../services/api';
```

Inside the component, add state for the AI generation:
```jsx
const [generatingDesc, setGeneratingDesc] = useState(false);
```

Add a handler function:
```jsx
const handleGenerateDescription = async (venueId) => {
  setGeneratingDesc(true);
  try {
    const res = await generateVenueDescription(venueId);
    // Set the description field value in the form to the generated text
    // The exact setter depends on your form state — use setFormData or equivalent
    setFormData(prev => ({ ...prev, description: res.data.description }));
    toast.success('Description generated — review and save when ready.');
  } catch (err) {
    toast.error('Could not generate description. Try again.');
  } finally {
    setGeneratingDesc(false);
  }
};
```

- [ ] **Step 3: Add the button in the edit modal**

In the venue edit modal, find the description textarea. Add the "Generate with AI" button directly above or below it, shown only when description is empty or short:

```jsx
{/* Only show when description is sparse */}
{(!formData.description || formData.description.length < 50) && editingVenue?._id && (
  <button
    type="button"
    onClick={() => handleGenerateDescription(editingVenue._id)}
    disabled={generatingDesc}
    className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-purple-600 hover:text-purple-700 disabled:opacity-50 transition-colors"
  >
    <span>{generatingDesc ? '⏳' : '✨'}</span>
    {generatingDesc ? 'Generating…' : 'Generate with AI'}
  </button>
)}
<textarea
  value={formData.description || ''}
  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
  className="w-full px-3 py-2 border border-neutral-200 dark:border-neutral-700 rounded-lg text-sm resize-none"
  rows={4}
  placeholder="Venue description…"
/>
```

---

## Task 9: Add stale listing detection cron job

**Files:**
- Modify: `restronet-backend/services/automationService.js`

- [ ] **Step 1: Add staleListingJob to automationService.js**

In `restronet-backend/services/automationService.js`, add this job function before `registerJobs`:

```javascript
const staleListingJob = async () => {
  try {
    const Venue = require('../models/Venue');
    const Admin = require('../models/Admin');
    const { sendAdminStaleAlert } = require('./emailService');

    const now             = new Date();
    const ninetyDaysAgo   = new Date(now - 90 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo    = new Date(now - 60 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo   = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const venues = await Venue.find({ isActive: true }).populate('owner').lean();
    const flagged = [];

    for (const venue of venues) {
      let reason = null;

      if (venue.updatedAt < ninetyDaysAgo) {
        reason = 'No listing updates in 90+ days';
      } else if (venue.owner?.lastLogin && venue.owner.lastLogin < sixtyDaysAgo) {
        reason = 'Owner has not logged in for 60+ days';
      } else {
        // Check for significant rating drop in last 30 days
        const Review = require('../models/Review');
        const [recentRatings, olderRatings] = await Promise.all([
          Review.find({ venue: venue._id, createdAt: { $gte: thirtyDaysAgo }, isHidden: false }).select('rating.overall').lean(),
          Review.find({ venue: venue._id, createdAt: { $lt: thirtyDaysAgo },  isHidden: false }).select('rating.overall').lean(),
        ]);

        if (recentRatings.length >= 2 && olderRatings.length >= 2) {
          const recentAvg = recentRatings.reduce((s, r) => s + r.rating.overall, 0) / recentRatings.length;
          const olderAvg  = olderRatings.reduce((s, r)  => s + r.rating.overall, 0) / olderRatings.length;
          if (olderAvg - recentAvg > 0.5) {
            reason = `Rating dropped ${(olderAvg - recentAvg).toFixed(1)} stars in the last 30 days`;
          }
        }
      }

      if (reason) {
        await Venue.findByIdAndUpdate(venue._id, {
          staleFlag: { reason, flaggedAt: now },
        });
        flagged.push({ ...venue, staleFlag: { reason, flaggedAt: now } });
      } else {
        // Clear stale flag if venue is now healthy
        await Venue.findByIdAndUpdate(venue._id, {
          staleFlag: { reason: null, flaggedAt: null },
        });
      }
    }

    if (flagged.length > 0) {
      const superadmins = await Admin.find({ role: 'superadmin', isActive: true, emailNotifications: true });
      for (const admin of superadmins) {
        await sendAdminStaleAlert(admin, flagged);
        logger.info(`Stale alert sent to superadmin ${admin.email}: ${flagged.length} venues`);
      }
    }

    logger.info(`Stale detection complete: ${flagged.length} venues flagged`);
  } catch (err) {
    logger.error(`staleListingJob failed: ${err.message}`);
  }
};
```

- [ ] **Step 2: Register the job**

In `registerJobs`, add:
```javascript
cron.schedule('0 23 * * 0', staleListingJob, { name: 'stale-listing-detection' }); // Sunday 11pm
```

Add `staleListingJob` to `module.exports` and to the dev trigger map in `server.js`:
```javascript
'stale-listing-detection': staleListingJob,
```

---

## Task 10: Add "Needs Attention" tab to AdminRestaurants page

**Files:**
- Modify: `restronet-frontend/src/pages/AdminRestaurants.jsx`
- Modify: `restronet-frontend/src/services/api.js`

- [ ] **Step 1: Add API call for stale venues**

In `restronet-frontend/src/services/api.js`, add:

```javascript
export const getStaleVenues = () =>
  API.get('/venues', { params: { stale: true, limit: 100 } });
```

- [ ] **Step 2: Add stale filter support to venues backend endpoint**

In `restronet-backend/controllers/venueController.js`, inside `getVenues`, find where `query` is built. Add:

```javascript
if (req.query.stale === 'true') {
  query['staleFlag.reason'] = { $ne: null };
}
```

- [ ] **Step 3: Add Needs Attention tab state in AdminRestaurants.jsx**

In `restronet-frontend/src/pages/AdminRestaurants.jsx`, find where tabs or view modes are managed. Add tab state:

```jsx
const [activeTab, setActiveTab] = useState('all'); // 'all' | 'attention'
const [staleVenues, setStaleVenues]   = useState([]);
const [staleLoading, setStaleLoading] = useState(false);
```

Add a fetch when the attention tab is selected:
```jsx
useEffect(() => {
  if (activeTab !== 'attention') return;
  setStaleLoading(true);
  getStaleVenues()
    .then(res => setStaleVenues(res.data.docs || res.data.results || []))
    .catch(() => {})
    .finally(() => setStaleLoading(false));
}, [activeTab]);
```

- [ ] **Step 4: Add tab switcher UI in AdminRestaurants.jsx**

Find the top of the restaurants table/list section. Add tab buttons before the table:

```jsx
<div className="flex gap-2 mb-4">
  <button
    onClick={() => setActiveTab('all')}
    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      activeTab === 'all'
        ? 'bg-orange-500 text-white'
        : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700'
    }`}
  >
    All Restaurants
  </button>
  <button
    onClick={() => setActiveTab('attention')}
    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
      activeTab === 'attention'
        ? 'bg-amber-500 text-white'
        : 'bg-white dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700'
    }`}
  >
    ⚠️ Needs Attention
    {staleVenues.length > 0 && (
      <span className="bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
        {staleVenues.length}
      </span>
    )}
  </button>
</div>
```

- [ ] **Step 5: Render stale venues list when attention tab is active**

Below the tab switcher, add conditional rendering:

```jsx
{activeTab === 'attention' && (
  <div className="space-y-3">
    {staleLoading && <p className="text-sm text-neutral-400">Loading…</p>}
    {!staleLoading && staleVenues.length === 0 && (
      <p className="text-sm text-neutral-400 py-8 text-center">No venues need attention right now.</p>
    )}
    {staleVenues.map(venue => (
      <div key={venue._id} className="flex items-center justify-between p-4 rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50/50 dark:bg-amber-950/20">
        <div>
          <p className="font-semibold text-sm text-neutral-800 dark:text-white">{venue.name}</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">{venue.staleFlag?.reason}</p>
          <p className="text-[10px] text-neutral-400 mt-0.5">
            Flagged: {venue.staleFlag?.flaggedAt ? new Date(venue.staleFlag.flaggedAt).toLocaleDateString() : '—'}
          </p>
        </div>
        <button
          onClick={() => {/* open edit modal for venue */}}
          className="text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors"
        >
          Review →
        </button>
      </div>
    ))}
  </div>
)}
```

Wire the "Review →" button to open the existing venue edit modal with the stale venue pre-selected (use the same handler already used for editing venues in the existing table).

---

**Phase 3 complete.** Verify end-to-end by:
1. Set `maxCapacity: 10` on a test venue via MongoDB/admin — visit its detail page and confirm CapacityPicker shows slots
2. Run `POST /api/dev/run-job/owner-weekly-report` — check email arrives for an owner account
3. Open a venue edit modal with a short description — confirm "Generate with AI" button appears and populates the field
4. Run `POST /api/dev/run-job/stale-listing-detection` — check AdminRestaurants "Needs Attention" tab shows flagged venues
