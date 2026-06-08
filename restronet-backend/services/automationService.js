const cron = require('node-cron');
const logger = require('../config/logger');
const { computeTrending } = require('./trendingService');
const Reservation = require('../models/Reservation');
const Venue = require('../models/Venue');
const User = require('../models/User');
const { sendReservationReminder, sendReviewRequest, sendDailyDigest } = require('./emailService');
const { buildDigest } = require('./recommendationService');
const Review = require('../models/Review');

const reservationReminderJob = async () => {
  try {
    const now = new Date();
    const window24Start = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const window24End   = new Date(now.getTime() + 25 * 60 * 60 * 1000);
    const window2Start  = new Date(now.getTime() + 1.5 * 60 * 60 * 1000);
    const window2End    = new Date(now.getTime() + 2.5 * 60 * 60 * 1000);

    const due24 = await Reservation.find({
      status: 'confirmed',
      reminderSent24h: false,
      date: { $gte: window24Start, $lte: window24End },
    }).populate('user venue');

    for (const res of due24) {
      if (!res.user?.email || !res.venue) continue;
      try {
        await sendReservationReminder(res.user, res, res.venue, 24);
        await Reservation.findByIdAndUpdate(res._id, { reminderSent24h: true });
        logger.info(`24h reminder sent: reservation ${res._id}`);
      } catch (err) {
        logger.error(`Failed 24h reminder for ${res._id}: ${err.message}`);
      }
    }

    const due2 = await Reservation.find({
      status: 'confirmed',
      reminderSent2h: false,
      date: { $gte: window2Start, $lte: window2End },
    }).populate('user venue');

    for (const res of due2) {
      if (!res.user?.email || !res.venue) continue;
      try {
        await sendReservationReminder(res.user, res, res.venue, 2);
        await Reservation.findByIdAndUpdate(res._id, { reminderSent2h: true });
        logger.info(`2h reminder sent: reservation ${res._id}`);
      } catch (err) {
        logger.error(`Failed 2h reminder for ${res._id}: ${err.message}`);
      }
    }
  } catch (err) {
    logger.error(`reservationReminderJob failed: ${err.message}`);
  }
};

const reviewRequestJob = async () => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const completed = await Reservation.find({
      status: 'completed',
      reviewRequestSent: false,
      updatedAt: { $gte: since },
    }).populate('user venue');

    for (const res of completed) {
      if (!res.user?.email || !res.venue) continue;
      try {
        const alreadyReviewed = await Review.exists({
          user: res.user._id,
          venue: res.venue._id,
        });

        if (!alreadyReviewed) {
          await sendReviewRequest(res.user, res.venue);
          await Reservation.findByIdAndUpdate(res._id, { reviewRequestSent: true });
          logger.info(`Review request sent to ${res.user.email} for ${res.venue.name}`);
        }
      } catch (err) {
        logger.error(`Failed review request for ${res._id}: ${err.message}`);
      }
    }
  } catch (err) {
    logger.error(`reviewRequestJob failed: ${err.message}`);
  }
};

const trendingDetectionJob = async () => {
  try {
    await computeTrending();
  } catch (err) {
    logger.error(`trendingDetectionJob failed: ${err.message}`);
  }
};

const dailyDigestJob = async () => {
  try {
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const users = await User.find({
      emailNotifications: true,
      lastLoginAt: { $gte: cutoff },
      isActive: true,
    });

    for (const user of users) {
      try {
        const venues = await buildDigest(user._id, 3);
        if (!venues?.length) continue;
        await sendDailyDigest(user, venues);
        logger.info(`Digest sent to ${user.email}`);
      } catch (err) {
        logger.error(`Digest failed for ${user.email}: ${err.message}`);
      }
    }
  } catch (err) {
    logger.error(`dailyDigestJob failed: ${err.message}`);
  }
};

const registerJobs = () => {
  cron.schedule('0 * * * *',  reservationReminderJob,  { name: 'reservation-reminders' });
  cron.schedule('0 10 * * *', reviewRequestJob,        { name: 'review-requests' });
  cron.schedule('0 2 * * *',  trendingDetectionJob,    { name: 'trending-detection' });
  cron.schedule('0 8 * * *',  dailyDigestJob,          { name: 'daily-digest' });
  logger.info('✅ Automation jobs registered (reminders, review requests, trending, digest)');
};

module.exports = { registerJobs, reservationReminderJob, reviewRequestJob, trendingDetectionJob, dailyDigestJob };
