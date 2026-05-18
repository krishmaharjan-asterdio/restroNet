require('dotenv').config();
const mongoose = require('mongoose');
const Venue = require('../models/Venue');
const Review = require('../models/Review');
const { rebuildAllVectors } = require('../services/cbf-pipeline');

const resetRatingsAndReviews = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/restronet';
    console.log('🔄 Connecting to MongoDB to reset reviews and ratings...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB.');

    // 1. Delete all Review documents
    console.log('🧹 Deleting all Review documents...');
    const deleteReviewsResult = await Review.deleteMany({});
    console.log(`✅ Deleted ${deleteReviewsResult.deletedCount} reviews.`);

    // 2. Reset rating fields on all Venues
    console.log('✏️ Resetting averageRating and totalReviews to 0 on all Venues...');
    const updateVenuesResult = await Venue.updateMany(
      {},
      {
        $set: {
          averageRating: 0,
          totalReviews: 0
        }
      }
    );
    console.log(`✅ Reset rating fields for ${updateVenuesResult.modifiedCount} venues.`);

    // 3. Rebuild all recommendation CBF feature vectors
    console.log('🧠 Rebuilding Content-Based Filtering recommendation vectors...');
    await rebuildAllVectors();
    console.log('✅ Rebuilt all venue feature vectors.');

    console.log('🎉 Reset process completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to reset reviews and ratings:', error);
    process.exit(1);
  }
};

resetRatingsAndReviews();
