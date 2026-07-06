# Phase 1 — Automation Backbone Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire up reservation reminder emails, post-visit review requests, opening hours validation on booking, and AI-powered review spam/toxicity detection.

**Architecture:** A new `emailService.js` wraps nodemailer into reusable send functions. A new `automationService.js` registers `node-cron` jobs at server startup. Guards are added directly in the reservation and review controllers. All AI calls fail open — if Gemini is unavailable the review is saved normally.

**Tech Stack:** Node.js/Express, Mongoose, nodemailer (already installed), node-cron (new), Gemini via existing `aiService.js`, Jest (new dev dependency for tests).

**Prerequisites:** `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `CLIENT_URL` must be set in `.env`.

---

## File Map

| Action | Path |
|--------|------|
| Create | `restronet-backend/services/emailService.js` |
| Create | `restronet-backend/services/automationService.js` |
| Create | `restronet-backend/tests/openingHours.test.js` |
| Modify | `restronet-backend/models/Reservation.js` |
| Modify | `restronet-backend/services/aiService.js` |
| Modify | `restronet-backend/controllers/reservationController.js` |
| Modify | `restronet-backend/controllers/reviewController.js` |
| Modify | `restronet-backend/server.js` |
| Modify | `restronet-backend/package.json` |

---

## Task 1: Install node-cron and Jest, scaffold emailService.js

**Files:**
- Modify: `restronet-backend/package.json`
- Create: `restronet-backend/services/emailService.js`

- [ ] **Step 1: Install dependencies**

```bash
cd restronet-backend
npm install node-cron
npm install --save-dev jest
```

- [ ] **Step 2: Add test script to package.json**

Open `restronet-backend/package.json`. In the `"scripts"` block, add:
```json
"test": "jest --testPathPattern=tests/"
```

- [ ] **Step 3: Create emailService.js**

Create `restronet-backend/services/emailService.js`:

```javascript
const nodemailer = require('nodemailer');
const logger = require('../config/logger');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const FROM = process.env.SMTP_FROM || 'RestroNet <noreply@restronet.com>';
const BASE_URL = process.env.CLIENT_URL || 'http://localhost:5173';

const send = async (mailOptions) => {
  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    logger.error(`Email send failed to ${mailOptions.to}: ${err.message}`);
  }
};

const sendReservationReminder = async (user, reservation, venue, hoursUntil) => {
  const isImminent = hoursUntil <= 2;
  const subject = isImminent
    ? `Your reservation at ${venue.name} is in about 2 hours`
    : `Reminder: Your table at ${venue.name} is tomorrow`;

  const dateStr = new Date(reservation.date).toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  await send({
    from: FROM,
    to: user.email,
    subject,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#222">
        <h2 style="color:#fa6500">RestroNet</h2>
        <p>Hi ${user.name},</p>
        <p>${isImminent ? "Your reservation is coming up soon!" : "Just a friendly reminder about your upcoming reservation."}</p>
        <div style="background:#f9f9f9;border-radius:8px;padding:16px;margin:16px 0">
          <strong>${venue.name}</strong><br/>
          ${venue.address?.street || ''}, ${venue.address?.city || ''}<br/>
          <strong>Date:</strong> ${dateStr}<br/>
          <strong>Time:</strong> ${reservation.time}<br/>
          <strong>Guests:</strong> ${reservation.guests}
        </div>
        ${reservation.specialRequests ? `<p><strong>Special requests:</strong> ${reservation.specialRequests}</p>` : ''}
        <p><a href="${BASE_URL}/my-reservations" style="color:#fa6500">View or manage your reservation</a></p>
        <p style="color:#999;font-size:12px">Bon appétit — RestroNet</p>
      </div>
    `,
  });
};

const sendReviewRequest = async (user, venue) => {
  await send({
    from: FROM,
    to: user.email,
    subject: `How was your experience at ${venue.name}?`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#222">
        <h2 style="color:#fa6500">RestroNet</h2>
        <p>Hi ${user.name},</p>
        <p>We hope you enjoyed your visit to <strong>${venue.name}</strong>. Your feedback helps other diners discover great restaurants.</p>
        <p>
          <a href="${BASE_URL}/restaurant/${venue.slug}?review=true"
             style="background:#fa6500;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;margin-top:8px">
            Leave a Review
          </a>
        </p>
        <p style="color:#999;font-size:12px">You're receiving this because you recently dined via RestroNet.</p>
      </div>
    `,
  });
};

const sendDailyDigest = async (user, venues) => {
  const venueCards = venues.map(v => `
    <div style="margin-bottom:16px;border:1px solid #eee;border-radius:8px;overflow:hidden">
      <div style="padding:12px">
        <strong style="font-size:16px">${v.name}</strong>
        <p style="margin:4px 0;color:#666;font-size:13px">
          ${(v.cuisines || []).map(c => c.name || c).join(', ')} · ${v.address?.city || 'Kathmandu'}
        </p>
        <p style="margin:4px 0;font-size:13px">⭐ ${(v.averageRating || 0).toFixed(1)}</p>
        <a href="${BASE_URL}/restaurant/${v.slug}"
           style="color:#fa6500;font-size:13px;text-decoration:none;font-weight:600">
          View Restaurant →
        </a>
      </div>
    </div>
  `).join('');

  await send({
    from: FROM,
    to: user.email,
    subject: `Your daily picks from RestroNet`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#222">
        <h2 style="color:#fa6500">Today's Picks For You</h2>
        <p>Hi ${user.name}, here are today's restaurant recommendations based on your taste:</p>
        ${venueCards}
        <p><a href="${BASE_URL}/discover" style="color:#fa6500">Explore more on RestroNet</a></p>
        <p style="color:#999;font-size:11px">
          <a href="${BASE_URL}/profile" style="color:#999">Manage email preferences</a>
        </p>
      </div>
    `,
  });
};

const sendOwnerWeeklyReport = async (owner, stats) => {
  await send({
    from: FROM,
    to: owner.email,
    subject: `Your weekly RestroNet report — ${stats.venueName}`,
    html: `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;color:#222">
        <h2 style="color:#fa6500">Weekly Report: ${stats.venueName}</h2>
        <p>Hi ${owner.name}, here's how your restaurant performed this week:</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0">
          <tr style="background:#f9f9f9">
            <td style="padding:10px;border:1px solid #eee"><strong>Reservations</strong></td>
            <td style="padding:10px;border:1px solid #eee">${stats.reservationCount}</td>
          </tr>
          <tr>
            <td style="padding:10px;border:1px solid #eee"><strong>New Reviews</strong></td>
            <td style="padding:10px;border:1px solid #eee">${stats.reviewCount}</td>
          </tr>
          <tr style="background:#f9f9f9">
            <td style="padding:10px;border:1px solid #eee"><strong>Avg Rating This Week</strong></td>
            <td style="padding:10px;border:1px solid #eee">${stats.avgRating ? stats.avgRating.toFixed(1) : 'N/A'} ⭐</td>
          </tr>
          <tr>
            <td style="padding:10px;border:1px solid #eee"><strong>Rating vs Last Week</strong></td>
            <td style="padding:10px;border:1px solid #eee">${stats.ratingDelta > 0 ? '+' : ''}${stats.ratingDelta ? stats.ratingDelta.toFixed(2) : '0'}</td>
          </tr>
          <tr style="background:#f9f9f9">
            <td style="padding:10px;border:1px solid #eee"><strong>Total Guests</strong></td>
            <td style="padding:10px;border:1px solid #eee">${stats.totalGuests}</td>
          </tr>
        </table>
        <p><a href="${BASE_URL}" style="color:#fa6500">Manage your listing on RestroNet</a></p>
      </div>
    `,
  });
};

const sendAdminStaleAlert = async (admin, staleVenues) => {
  const rows = staleVenues.map(v => `
    <tr>
      <td style="padding:8px;border:1px solid #eee">${v.name}</td>
      <td style="padding:8px;border:1px solid #eee">${v.staleFlag?.reason || 'Unknown'}</td>
      <td style="padding:8px;border:1px solid #eee">${v.staleFlag?.flaggedAt ? new Date(v.staleFlag.flaggedAt).toLocaleDateString() : ''}</td>
    </tr>
  `).join('');

  await send({
    from: FROM,
    to: admin.email,
    subject: `RestroNet: ${staleVenues.length} listing(s) need attention`,
    html: `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;color:#222">
        <h2 style="color:#fa6500">Listings Needing Attention</h2>
        <p>Hi ${admin.name}, the following venues have been flagged for review:</p>
        <table style="width:100%;border-collapse:collapse">
          <thead>
            <tr style="background:#f9f9f9">
              <th style="padding:8px;border:1px solid #eee;text-align:left">Venue</th>
              <th style="padding:8px;border:1px solid #eee;text-align:left">Reason</th>
              <th style="padding:8px;border:1px solid #eee;text-align:left">Flagged On</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
        <p><a href="${BASE_URL}/admin/restaurants" style="color:#fa6500">Review in Admin Dashboard</a></p>
      </div>
    `,
  });
};

module.exports = {
  sendReservationReminder,
  sendReviewRequest,
  sendDailyDigest,
  sendOwnerWeeklyReport,
  sendAdminStaleAlert,
};
```

- [ ] **Step 4: Verify the file exists**

```bash
ls restronet-backend/services/emailService.js
```
Expected: file path printed with no error.

---

## Task 2: Add reminder flags to Reservation model

**Files:**
- Modify: `restronet-backend/models/Reservation.js`

- [ ] **Step 1: Add reminderSent24h and reminderSent2h fields**

In `restronet-backend/models/Reservation.js`, add after the `contactPhone` field (before the closing `}`):

```javascript
    reminderSent24h: { type: Boolean, default: false },
    reminderSent2h:  { type: Boolean, default: false },
```

The updated fields section (showing context) should look like:
```javascript
    contactPhone: {
      type: String,
      required: true,
    },
    reminderSent24h: { type: Boolean, default: false },
    reminderSent2h:  { type: Boolean, default: false },
```

- [ ] **Step 2: Verify server still starts**

```bash
cd restronet-backend && node -e "require('./models/Reservation'); console.log('OK')"
```
Expected: `OK`

---

## Task 3: Create automationService.js — reservation reminder job

**Files:**
- Create: `restronet-backend/services/automationService.js`

- [ ] **Step 1: Create automationService.js**

Create `restronet-backend/services/automationService.js`:

```javascript
const cron = require('node-cron');
const logger = require('../config/logger');
const Reservation = require('../models/Reservation');
const Venue = require('../models/Venue');
const User = require('../models/User');
const { sendReservationReminder } = require('./emailService');

/**
 * Runs every hour. Finds confirmed reservations happening in ~24h or ~2h
 * and sends a reminder email if not already sent.
 */
const reservationReminderJob = async () => {
  try {
    const now = new Date();

    const window24Start = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const window24End   = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const window2Start  = new Date(now.getTime() + 1.5 * 60 * 60 * 1000);
    const window2End    = new Date(now.getTime() + 2.5 * 60 * 60 * 1000);

    // 24-hour reminders
    const due24 = await Reservation.find({
      status: 'confirmed',
      reminderSent24h: false,
      date: { $gte: window24Start, $lte: window24End },
    }).populate('user venue');

    for (const res of due24) {
      if (!res.user?.email || !res.venue) continue;
      await sendReservationReminder(res.user, res, res.venue, 24);
      await Reservation.findByIdAndUpdate(res._id, { reminderSent24h: true });
      logger.info(`24h reminder sent: reservation ${res._id}`);
    }

    // 2-hour reminders
    const due2 = await Reservation.find({
      status: 'confirmed',
      reminderSent2h: false,
      date: { $gte: window2Start, $lte: window2End },
    }).populate('user venue');

    for (const res of due2) {
      if (!res.user?.email || !res.venue) continue;
      await sendReservationReminder(res.user, res, res.venue, 2);
      await Reservation.findByIdAndUpdate(res._id, { reminderSent2h: true });
      logger.info(`2h reminder sent: reservation ${res._id}`);
    }
  } catch (err) {
    logger.error(`reservationReminderJob failed: ${err.message}`);
  }
};

/**
 * Runs daily at 10am. Finds reservations completed in the last 24h
 * that have not received a review request yet.
 */
const reviewRequestJob = async () => {
  try {
    const Review = require('../models/Review');
    const { sendReviewRequest } = require('./emailService');

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const completed = await Reservation.find({
      status: 'completed',
      updatedAt: { $gte: since },
    }).populate('user venue');

    for (const res of completed) {
      if (!res.user?.email || !res.venue) continue;

      const alreadyReviewed = await Review.exists({
        user: res.user._id,
        venue: res.venue._id,
      });

      if (!alreadyReviewed) {
        await sendReviewRequest(res.user, res.venue);
        logger.info(`Review request sent to ${res.user.email} for ${res.venue.name}`);
      }
    }
  } catch (err) {
    logger.error(`reviewRequestJob failed: ${err.message}`);
  }
};

const registerJobs = () => {
  cron.schedule('0 * * * *',  reservationReminderJob, { name: 'reservation-reminders' });
  cron.schedule('0 10 * * *', reviewRequestJob,       { name: 'review-requests' });
  logger.info('✅ Automation jobs registered (reminders + review requests)');
};

module.exports = { registerJobs, reservationReminderJob, reviewRequestJob };
```

- [ ] **Step 2: Verify it loads without errors**

```bash
cd restronet-backend && node -e "require('./services/automationService'); console.log('OK')"
```
Expected: `OK` (no crash; Mongoose models load fine without a live DB at require-time)

---

## Task 4: Write and run tests for opening hours validation logic

**Files:**
- Create: `restronet-backend/tests/openingHours.test.js`

- [ ] **Step 1: Extract the validation logic into a pure helper**

Create `restronet-backend/utils/openingHoursValidator.js`:

```javascript
/**
 * Checks whether a given HH:MM time string falls within a venue's
 * opening hours for a specific day.
 *
 * Returns null if the venue has no hours configured (caller should allow booking).
 * Returns { allowed: false, message: string } if the slot is invalid.
 * Returns { allowed: true } if the slot is valid.
 */
const validateBookingTime = (openingHours, date, timeStr) => {
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName  = dayNames[new Date(date).getDay()];
  const hours    = openingHours?.[dayName];

  if (!hours) return { allowed: true };

  if (hours.isClosed) {
    return { allowed: false, message: `The restaurant is closed on ${dayName}s.` };
  }

  if (!hours.open || !hours.close) return { allowed: true };

  const toMins = (hhmm) => {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  };

  const openMins  = toMins(hours.open);
  const closeMins = toMins(hours.close);
  const reqMins   = toMins(timeStr);

  // Overnight hours: e.g. open 22:00, close 02:00
  const isOpen = closeMins > openMins
    ? reqMins >= openMins && reqMins < closeMins
    : reqMins >= openMins || reqMins < closeMins;

  if (!isOpen) {
    return {
      allowed: false,
      message: `The restaurant is open ${hours.open}–${hours.close} on ${dayName}s. Please choose a time within opening hours.`,
    };
  }

  return { allowed: true };
};

module.exports = { validateBookingTime };
```

- [ ] **Step 2: Write the failing test**

Create `restronet-backend/tests/openingHours.test.js`:

```javascript
const { validateBookingTime } = require('../utils/openingHoursValidator');

// 2026-06-15 is a Monday
const MONDAY = '2026-06-15';

const hours = {
  monday: { open: '10:00', close: '22:00', isClosed: false },
  tuesday: { isClosed: true },
};

describe('validateBookingTime', () => {
  test('allows booking within opening hours', () => {
    expect(validateBookingTime(hours, MONDAY, '12:00')).toEqual({ allowed: true });
  });

  test('rejects booking before opening', () => {
    const result = validateBookingTime(hours, MONDAY, '09:00');
    expect(result.allowed).toBe(false);
    expect(result.message).toMatch(/10:00/);
  });

  test('rejects booking after closing', () => {
    const result = validateBookingTime(hours, MONDAY, '23:00');
    expect(result.allowed).toBe(false);
  });

  test('rejects booking on closed day', () => {
    // 2026-06-16 is a Tuesday
    const result = validateBookingTime(hours, '2026-06-16', '12:00');
    expect(result.allowed).toBe(false);
    expect(result.message).toMatch(/closed/i);
  });

  test('allows booking when venue has no hours configured', () => {
    expect(validateBookingTime(null, MONDAY, '12:00')).toEqual({ allowed: true });
  });

  test('handles overnight hours correctly', () => {
    const overnight = { monday: { open: '22:00', close: '02:00', isClosed: false } };
    expect(validateBookingTime(overnight, MONDAY, '23:30').allowed).toBe(true);
    expect(validateBookingTime(overnight, MONDAY, '01:00').allowed).toBe(true);
    expect(validateBookingTime(overnight, MONDAY, '10:00').allowed).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests — expect FAIL (file not yet created)**

```bash
cd restronet-backend && npm test
```
Expected: FAIL — `Cannot find module '../utils/openingHoursValidator'`

- [ ] **Step 4: Run tests again after creating the utility**

```bash
cd restronet-backend && npm test
```
Expected: All 6 tests PASS.

---

## Task 5: Apply opening hours validation in reservationController

**Files:**
- Modify: `restronet-backend/controllers/reservationController.js`

- [ ] **Step 1: Import the validator at the top of reservationController.js**

Add after the existing requires at the top of `restronet-backend/controllers/reservationController.js`:

```javascript
const { validateBookingTime } = require('../utils/openingHoursValidator');
```

- [ ] **Step 2: Add validation and capacity check in createReservation**

In `restronet-backend/controllers/reservationController.js`, find the `createReservation` function. After the `venue` existence check and before `Reservation.create(...)`, add:

```javascript
    // Opening hours validation
    const hoursCheck = validateBookingTime(venue.openingHours, date, time);
    if (!hoursCheck.allowed) {
      return res.status(400).json({ success: false, message: hoursCheck.message });
    }
```

The updated `createReservation` function body should read:

```javascript
  try {
    const { venueId, date, time, guests, specialRequests, contactPhone } = req.body;

    const venue = await Venue.findById(venueId);
    if (!venue) {
      return res.status(404).json({ success: false, message: 'Venue not found' });
    }

    // Opening hours validation
    const hoursCheck = validateBookingTime(venue.openingHours, date, time);
    if (!hoursCheck.allowed) {
      return res.status(400).json({ success: false, message: hoursCheck.message });
    }

    const reservation = await Reservation.create({
      venue: venueId,
      user: req.user._id,
      date,
      time,
      guests,
      specialRequests,
      contactPhone,
    });

    res.status(201).json({ success: true, reservation });
  } catch (error) {
    next(error);
  }
```

- [ ] **Step 3: Verify server starts cleanly**

```bash
cd restronet-backend && node -e "require('./controllers/reservationController'); console.log('OK')"
```
Expected: `OK`

---

## Task 6: Add moderateReview() to aiService.js

**Files:**
- Modify: `restronet-backend/services/aiService.js`

- [ ] **Step 1: Add moderateReview method**

In `restronet-backend/services/aiService.js`, add the following method inside the `AIService` class, after the `parseMenuImage` method and before the closing `}` of the class:

```javascript
  /**
   * Classifies a review comment as clean, spam, or toxic.
   * Returns { classification, confidence, reason } or null on failure.
   */
  async moderateReview(comment) {
    if (!this.genAI || !comment?.trim()) return null;

    const prompt = `You are a content moderator for a restaurant review platform.
Classify the following review comment. Be strict: only flag clear spam (fake/promotional/gibberish) or toxic content (hate speech, profanity, personal attacks).

Comment: "${comment.replace(/"/g, "'")}"

Return JSON ONLY — no markdown:
{
  "classification": "clean" | "spam" | "toxic",
  "confidence": 0.0,
  "reason": "brief reason"
}`;

    try {
      const result   = await this.model.generateContent(prompt);
      const text     = result.response.text().trim();
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) return JSON.parse(jsonMatch[0]);
      return null;
    } catch (error) {
      console.error('AI Moderation Error:', error.message);
      return null;
    }
  }
```

- [ ] **Step 2: Verify the method is accessible**

```bash
cd restronet-backend && node -e "const ai = require('./services/aiService'); console.log(typeof ai.moderateReview)"
```
Expected: `function`

---

## Task 7: Add AI moderation gate in reviewController.addReview

**Files:**
- Modify: `restronet-backend/controllers/reviewController.js`

- [ ] **Step 1: Add moderation gate in addReview**

In `restronet-backend/controllers/reviewController.js`, find the `addReview` function. Replace the `Review.create(...)` call with this version that adds a moderation gate:

```javascript
    const reviewData = {
      venue: req.params.venueId,
      user: req.user._id,
      rating: req.body.rating,
      title: req.body.title,
      comment: req.body.comment,
    };

    // AI moderation gate — fail open: if Gemini is unavailable review is saved normally
    if (req.body.comment?.trim()) {
      const modResult = await aiService.moderateReview(req.body.comment).catch(() => null);
      if (
        modResult &&
        ['spam', 'toxic'].includes(modResult.classification) &&
        modResult.confidence > 0.85
      ) {
        reviewData.isHidden = true;
        reviewData.moderationNote = `Auto-flagged: ${modResult.classification} (${Math.round(modResult.confidence * 100)}% confidence). Reason: ${modResult.reason}`;
      }
    }

    const review = await Review.create(reviewData);
```

The full updated `addReview` function should be:

```javascript
const addReview = async (req, res, next) => {
  try {
    const venueExists = await Venue.findById(req.params.venueId);
    if (!venueExists) {
      return res.status(404).json({ success: false, message: 'Venue not found' });
    }

    const existingReview = await Review.findOne({
      venue: req.params.venueId,
      user: req.user._id,
    });
    if (existingReview) {
      return res.status(400).json({ success: false, message: 'You have already reviewed this venue' });
    }

    const reviewData = {
      venue: req.params.venueId,
      user: req.user._id,
      rating: req.body.rating,
      title: req.body.title,
      comment: req.body.comment,
    };

    if (req.body.comment?.trim()) {
      const modResult = await aiService.moderateReview(req.body.comment).catch(() => null);
      if (
        modResult &&
        ['spam', 'toxic'].includes(modResult.classification) &&
        modResult.confidence > 0.85
      ) {
        reviewData.isHidden = true;
        reviewData.moderationNote = `Auto-flagged: ${modResult.classification} (${Math.round(modResult.confidence * 100)}% confidence). Reason: ${modResult.reason}`;
      }
    }

    const review = await Review.create(reviewData);

    buildRestaurantFeatureVector(req.params.venueId).catch(console.error);
    updateVenueAISummary(req.params.venueId).catch(console.error);

    res.status(201).json({ success: true, review });
  } catch (error) {
    next(error);
  }
};
```

- [ ] **Step 2: Verify the controller loads**

```bash
cd restronet-backend && node -e "require('./controllers/reviewController'); console.log('OK')"
```
Expected: `OK`

---

## Task 8: Register automationService in server.js

**Files:**
- Modify: `restronet-backend/server.js`

- [ ] **Step 1: Import and register automation jobs after DB connect**

In `restronet-backend/server.js`, add the import near the top with the other requires:

```javascript
const automationService = require('./services/automationService');
```

Then find the `connectDB()` call and update it to register jobs after the DB is ready. Replace:

```javascript
connectDB();
```

With:

```javascript
connectDB().then(() => {
  automationService.registerJobs();
});
```

- [ ] **Step 2: Check that connectDB returns a Promise**

Open `restronet-backend/config/db.js` and verify the function ends with `return mongoose.connect(...)` or equivalent that returns a Promise. If it does not return a promise, change the server.js registration to:

```javascript
connectDB();
setTimeout(() => automationService.registerJobs(), 2000);
```

(Only use setTimeout fallback if connectDB does not return a usable Promise.)

- [ ] **Step 3: Start the server and verify jobs are logged**

```bash
cd restronet-backend && npm run dev
```
Expected output includes:
```
✅ Automation jobs registered (reminders + review requests)
```

---

## Task 9: Expose manual cron trigger endpoint (dev only)

This endpoint lets you test cron jobs without waiting for the schedule.

**Files:**
- Modify: `restronet-backend/server.js`

- [ ] **Step 1: Add dev-only trigger route in server.js**

In `restronet-backend/server.js`, add after the health check route:

```javascript
if (process.env.NODE_ENV !== 'production') {
  app.post('/api/dev/run-job/:job', async (req, res) => {
    const { registerJobs, reservationReminderJob, reviewRequestJob } = require('./services/automationService');
    const jobs = { 'reservation-reminders': reservationReminderJob, 'review-requests': reviewRequestJob };
    const fn = jobs[req.params.job];
    if (!fn) return res.status(404).json({ success: false, message: 'Unknown job' });
    await fn();
    res.json({ success: true, message: `Job ${req.params.job} executed` });
  });
}
```

- [ ] **Step 2: Test it manually**

With the server running:
```bash
curl -X POST http://localhost:5000/api/dev/run-job/reservation-reminders
```
Expected: `{"success":true,"message":"Job reservation-reminders executed"}`

---

**Phase 1 complete.** Verify end-to-end by:
1. Creating a reservation for 24h from now with status `confirmed`
2. Calling `POST /api/dev/run-job/reservation-reminders`
3. Checking that the reminder email arrives and `reminderSent24h` is set to `true` in MongoDB
