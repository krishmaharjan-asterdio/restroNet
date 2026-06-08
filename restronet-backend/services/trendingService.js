const Venue = require('../models/Venue');
const Review = require('../models/Review');
const logger = require('../config/logger');

const computeVelocityScore = (recentCount, prevCount) => {
  if (recentCount === 0) return 0;
  return (recentCount - prevCount) / Math.max(prevCount, 1);
};

const isTrendingByScore = (velocityScore, recentCount) => {
  return velocityScore > 0.5 && recentCount >= 3;
};

const computeTrending = async () => {
  try {
    const now        = new Date();
    const week1Start = new Date(now - 7  * 24 * 60 * 60 * 1000);
    const week2Start = new Date(now - 14 * 24 * 60 * 60 * 1000);

    const venues = await Venue.find({ isActive: true }).select('_id name').lean();
    let trendingCount = 0;

    for (const venue of venues) {
      try {
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
      } catch (venueErr) {
        logger.error(`computeTrending skipped venue ${venue._id}: ${venueErr.message}`);
      }
    }

    logger.info(`Trending detection complete: ${trendingCount}/${venues.length} venues trending`);
  } catch (err) {
    logger.error(`computeTrending failed: ${err.message}`);
  }
};

module.exports = { computeVelocityScore, isTrendingByScore, computeTrending };
